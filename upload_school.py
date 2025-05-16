# ✅ upload_school.py - 발주서 업로드 (H열부터 날짜 시작, G열 = 계약단가, 금액 포함)
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import datetime

cred = credentials.Certificate("C:/school/firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

upload_dir = Path("C:/school/upload")
print(f"\n=== 🏁 발주서 업로드 시작: {datetime.datetime.now()} ===\n")

total_files = 0
success_count = 0
fail_count = 0

for file_path in upload_dir.iterdir():
    if "발주서" not in file_path.name or file_path.suffix.lower() not in ['.xlsx', '.xls']:
        continue

    total_files += 1
    print(f"\n📂 처리 중: {file_path.name}")

    try:
        name_parts = file_path.stem.replace("-", "_").split("_")
        연월_raw = name_parts[0]
        발주처 = name_parts[1]
        낙찰기업 = name_parts[3] if len(name_parts) > 3 else "nan"
        연월 = f"20{연월_raw[:2]}-{연월_raw[2:]}"
        문서ID = f"{연월_raw}_{발주처}"

        df = pd.read_excel(file_path, header=None)
        header = df.iloc[3].tolist()

        날짜필드_인덱스 = []
        날짜필드_이름 = []

        for i, h in enumerate(header):
            if i < 7:
                continue
            if pd.isnull(h) or any(x in str(h) for x in ["합계", "총", "총액", "총량"]):
                continue
            날짜필드_인덱스.append(i)
            날짜필드_이름.append(str(h).strip())

        품목목록 = []
        for row_idx in range(4, len(df)):
            row = df.iloc[row_idx]
            if pd.isnull(row[1]):
                continue

            단가 = float(row[6]) if pd.notnull(row[6]) else 0.0

            항목 = {
                "no": str(row[0]).strip(),
                "발주처": 발주처,
                "식품명": str(row[1]).strip(),
                "규격": str(row[2]).strip(),
                "속성정보": str(row[5]).strip(),
                "단가": 단가,
                "납품": {}
            }

            for i, 날짜 in zip(날짜필드_인덱스, 날짜필드_이름):
                수량 = row[i]
                if pd.notnull(수량):
                    try:
                        날짜텍스트 = str(날짜).strip().replace(".", "").zfill(4)
                        일자 = 날짜텍스트[-2:]
                        full_date = f"{연월}-{일자}"
                        금액 = round(float(수량) * 단가)
                        항목["납품"][full_date] = {
                            "수량": 수량,
                            "단가": 단가,
                            "금액": 금액
                        }
                    except Exception as e:
                        print(f"⚠️ 날짜 변환 오류: {날짜} | {e}")

            if 항목["납품"]:
                품목목록.append(항목)

        if not 품목목록:
            print(f"⚠️ [누락] {발주처} | 품목 없음 → 저장 생략됨")
            fail_count += 1
            continue

        doc_ref = db.collection("school").document(문서ID)
        doc_ref.set({
            "발주처": 발주처,
            "낙찰기업": 낙찰기업,
            "연월": 연월,
            "품목": 품목목록
        }, merge=True)

        print(f"✅ [성공] {문서ID} | 품목수: {len(품목목록)}")
        success_count += 1

    except Exception as e:
        print(f"❌ [실패] {file_path.name} | {e}")
        fail_count += 1

print(f"\n=== ✅ 발주서 업로드 요약 ===")
print(f"📦 총 파일 수: {total_files}")
print(f"✅ 성공: {success_count}건")
print(f"❌ 실패: {fail_count}건")
input("\n📌 모든 발주서 업로드 작업 완료! 결과 확인 후 Enter 키를 누르세요.")
