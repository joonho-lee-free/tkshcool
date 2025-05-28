import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import fitz
import re
import traceback

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

    # 업로드용 엑셀 파일 처리 (파일명에서 낙찰기업 추출)
    for file in excel_dir.glob("*_업로드용.xlsx"):
        try:
            print(f"📄 처리: {file.name}")
            m = re.match(r"(\d{4})_(.+?)_발주서_(.+?)_업로드용$", file.stem)
            if not m:
                msg = f"⚠️ 파일명 형식 오류: {file.name}"
                print(msg)
                logs.append(msg)
                continue
            ym_raw, school, bidder = m.groups()
            ym = f"20{ym_raw[:2]}-{ym_raw[2:]}"
            doc_id = f"{ym_raw}_{school}"

            # 엑셀 읽기
            df = pd.read_excel(file, header=None)
            hi = df[df.iloc[:, 0].astype(str).str.contains("NO", na=False)].index[0]
            header = df.iloc[hi].tolist()
            data = df.iloc[hi+1:].copy()
            data.columns = header

            # 품목 및 납품 정보 파싱
            # ... 기존 로직 그대로 유지 ...
            items = []  # 파싱 결과 리스트

            # Firestore 업로드
            ref = db.collection("school").document(doc_id)
            updates = {"낙찰기업": bidder}
            if items:
                updates["품목"] = firestore.ArrayUnion(items)

            if ref.get().exists:
                ref.update(updates)
            else:
                # 새 문서 생성 시에는 연월, 발주처 정보 포함
                data_to = {"연월": ym, "발주처": school, "낙찰기업": bidder, "품목": items}
                ref.set(data_to)

            school_logs.append(f"✅ 업로드: {doc_id}")
        except Exception as e:
            msg = f"❌ 예외: {file.name} | {e}"
            print(msg)
            traceback.print_exc()
            logs.append(msg)
            school_logs.append(msg)

    # 로그 쓰기
    (base / "업로드_log.txt").write_text("\n".join(logs), encoding="utf-8")
    (base / "학교별_업로드결과.txt").write_text("\n".join(school_logs), encoding="utf-8")
    print("🎉 완료. 로그 저장")

if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
    input("🚀 업로드 확인 후 Enter 키를 눌러 종료하세요...")
