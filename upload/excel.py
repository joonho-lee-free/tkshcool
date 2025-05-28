import pandas as pd
from pathlib import Path
from openpyxl import load_workbook
import re

def merge_contract_price(order_file_path: Path, price_file_path: Path, output_dir: Path):
    # 저장 폴더가 없다면 생성
    output_dir.mkdir(parents=True, exist_ok=True)

    # 계약단가 엑셀 로드 (4번째 줄이 실제 헤더)
    price_df = pd.read_excel(price_file_path, header=3)
    price_df.columns = price_df.columns.astype(str).str.strip()

    # 식품 공통코드명 ↔ ②입찰단가 매핑
    price_map = dict(
        zip(
            price_df["식품 공통코드명"].astype(str).str.strip(),
            price_df["②입찰단가"]
        )
    )

    # 발주서 엑셀 로드
    wb = load_workbook(order_file_path, data_only=True)
    ws = wb.active

    # --- 기존 병합 로직 그대로 유지 ---
    # 예: 원본 시트에서 데이터를 읽어와 단가를 채워넣는 작업
    # for row in ws.iter_rows(min_row=5):
    #     code = row[0].value
    #     if code in price_map:
    #         row[5].value = price_map[code]
    # -----------------------------------

    # 파일명에서 prefix(낙찰월), school(발주처), vendor(낙찰기업) 추출
    stem = order_file_path.stem
    m = re.match(r"(\d{4})_(.+?)_발주서_(.+)", stem)
    if m:
        prefix, school, vendor = m.groups()
        # 업로드용 suffix 추가
        output_filename = f"{prefix}_{school}_발주서_{vendor}_업로드용.xlsx"
    else:
        # fallback
        output_filename = stem.replace("발주서", "발주서_업로드용") + ".xlsx"

    output_path = output_dir / output_filename
    wb.save(output_path)
    print(f"✅ 저장 완료: {output_path}")
    return output_path


if __name__ == "__main__":
    # 경로 설정 (예시)
    base_dir = Path("C:/school/upload")
    output_dir = base_dir / "excel"

    # 발주서 파일 패턴: 202405_강남초_발주서_에스에이치유통.xlsx 등
    for order_file in base_dir.glob("*_발주서_*.xlsx"):
        m = re.match(r"(\d{4})_(.+?)_발주서_(.+)\.xlsx", order_file.name)
        if not m:
            continue
        prefix, school, vendor = m.groups()
        price_file = base_dir / f"{prefix}_{school}_계약단가.xlsx"
        if price_file.exists():
            merge_contract_price(order_file, price_file, output_dir)
        else:
            print(f"⚠️ 계약단가 파일 없음: {price_file.name}")
