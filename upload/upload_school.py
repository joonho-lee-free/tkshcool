import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import datetime
import fitz
import re
import os

# PDF 정보 추출

def extract_school_info_from_pdf_text(text: str, pdf_name: str):
    info = {}
    lines = text.replace("\uFFFD", "").replace("�", "").splitlines()
    lines = [line.strip() for line in lines if line.strip()]

    def find_pattern(pattern):
        for line in lines:
            m = re.search(pattern, line)
            if m:
                return m.group(1).strip()
        return ""

    def extract_address():
        joined = " ".join(lines)
        joined = re.sub(r"[^\w가-힣0-9\s\-()]", " ", joined)
        m = re.search(r"(부산광역시.*?학교)", joined)
        return m.group(1).strip() if m else ""

    info["대표"] = "학교장"
    info["사업자등록번호"] = find_pattern(r"([0-9]{3}-[0-9]{2}-[0-9]{5})")
    info["사업장주소"] = extract_address()
    info["대표전화번호"] = find_pattern(r"(0\d{1,2}-\d{3,4}-\d{4})")
    return info


# 계약단가 매칭 함수

def parse_qty(val):
    try:
        if pd.isna(val): return 0.0
        s = re.sub(r"[^\d.]", "", str(val))
        return float(s) if s else 0.0
    except:
        return 0.0


def safe_date(raw, ym):
    try:
        r = re.sub(r"[^0-9.]", ".", str(raw))
        parts = [p for p in r.split('.') if p]
        if len(parts) >= 2:
            m, d = parts[:2]
            return f"{ym[:4]}-{m.zfill(2)}-{d.zfill(2)}"
        return None
    except:
        return None


def load_pdf_info_map(pdf_dir: Path):
    info_map = {}
    for pdf in pdf_dir.glob("*학교정보.pdf"):
        key = "_".join(pdf.stem.split("_")[:2])
        try:
            doc = fitz.open(pdf)
            text = "".join(page.get_text() for page in doc)
            info = extract_school_info_from_pdf_text(text, pdf.name)
            print(f"📑 PDF 파싱 완료: {pdf.name} → {info}")
            info_map[key] = info
        except Exception as e:
            print(f"❌ PDF 파싱 실패: {pdf.name} | {e}")
    return info_map


def main():
    # Firebase 초기화
    cred = credentials.Certificate("C:/school/key/firebase-key.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    base = Path(__file__).parent
    excel_dir = base / "excel"
    pdf_map = load_pdf_info_map(excel_dir)

    logs, school_logs = [], []

    # 업로드용 엑셀 파일 패턴 수정
    for file in excel_dir.glob("*_업로드용*.xlsx"):
        try:
            print(f"📄 처리: {file.name}")
            parts = file.stem.split("_")
            ym_raw, school, _, bidder = parts[:4]
            ym = f"20{ym_raw[:2]}-{ym_raw[2:]}"
            doc_id = f"{ym_raw}_{school}"

            df = pd.read_excel(file, header=None)
            hi = df[df.iloc[:,0].astype(str).str.contains("NO", na=False)].index[0]
            header = df.iloc[hi].tolist()
            data = df.iloc[hi+1:].copy()
            data.columns = header

            # 식품명 및 날짜열 추출
            name_col = next(c for c in data.columns if "식품명" in str(c) or "품명" in str(c))
            date_idxs, date_names = [], []
            for i, h in enumerate(header):
                if i < 6 or pd.isnull(h): continue
                s = str(h)
                if any(x in s for x in ["합계","총량","총액"]): continue
                date_idxs.append(i); date_names.append(h)

            # 품목 목록 구성
            items = []
            for _, row in data.iterrows():
                if pd.isnull(row.get("NO")): continue
                name = str(row[name_col]).strip()
                # 단가 매칭
                try:
                    price = float(str(row.get("계약단가",0)).replace(",",""))
                    if price < 1000: price *= 1000
                except:
                    price = 0.0
                    msg = f"⚠️ 단가 없음: {name} ({file.name})"
                    print(msg); logs.append(msg); school_logs.append(msg)

                # 납품 정보 수집
                deliver, total = {}, 0.0
                for idx, dn in zip(date_idxs, date_names):
                    qty = parse_qty(row[idx])
                    if qty <= 0: continue
                    dt = safe_date(dn, ym)
                    if not dt: continue
                    deliver[dt] = {"수량":qty, "단가":price, "금액":round(qty*price)}
                    total += qty

                if deliver:
                    items.append({
                        "no": str(row["NO"]).strip(),
                        "식품명": name,
                        "규격": str(row.get("규격/단위","")),
                        "단가": price,
                        "총량": round(total,2),
                        "속성정보": str(row.get("속성정보","")),
                        "납품": deliver
                    })

            if not items:
                msg = f"❌ 아이템 없음: {file.name}"
                print(msg); logs.append(msg); school_logs.append(msg)
                continue

            data_to = {"연월": ym, "발주처": school, "낙찰기업": bidder, "품목": items}
            if doc_id in pdf_map:
                data_to.update(pdf_map[doc_id])
            else:
                msg = f"⚠️ PDF 없음: {doc_id}"
                print(msg); logs.append(msg); school_logs.append(msg)

            ref = db.collection("school").document(doc_id)
            if ref.get().exists:
                msg = f"✅ ArrayUnion: {doc_id}"
                print(msg); logs.append(msg); school_logs.append(msg)
                ref.update({"품목": firestore.ArrayUnion(items)})
            else:
                msg = f"🔥 신규 저장: {doc_id}"
                print(msg); logs.append(msg); school_logs.append(msg)
                ref.set(data_to)

        except Exception as e:
            msg = f"❌ 예외: {file.name} | {e}"
            print(msg); logs.append(msg); school_logs.append(msg)

    with open(base/"업로드_log.txt","w",encoding="utf-8") as f:
        f.write("\n".join(logs))
    with open(base/"학교별_업로드결과.txt","w",encoding="utf-8") as f:
        f.write("\n".join(school_logs))

    print("\n🎉 완료. 로그 저장")
    input("엔터 종료…")

if __name__ == "__main__":
    main()
