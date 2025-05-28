import pandas as pd
from pathlib import Path
from openpyxl import load_workbook
import datetime
import re

def merge_contract_price(order_file_path, price_file_path, output_dir, log_lines):
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        price_df = pd.read_excel(price_file_path, header=3)
        price_df.columns = price_df.columns.astype(str).str.strip()

        price_map = dict(
            zip(
                price_df["식품 공통코드명"].astype(str).str.strip(),
                price_df["②입찰단가"]
            )
        )

        wb = load_workbook(order_file_path)
        ws = wb.active

        header_row = None
        for i, row in enumerate(ws.iter_rows(min_row=1, max_row=20), 1):
            if row[0].value == "NO":
                header_row = i
                break
        if header_row is None:
            raise ValueError("❌ 헤더 행을 찾을 수 없습니다 (NO 기준)")

        식품명_col = None
        for cell in ws[header_row]:
            if cell.value and "식품명" in str(cell.value):
                식품명_col = cell.col_idx
                break
        if 식품명_col is None:
            raise ValueError("❌ '식품명' 여름 찾을 수 없습니다.")

        last_col = ws.max_column
        계약단가_col = last_col + 1
        ws.cell(row=header_row, column=계약단가_col, value="계약단가")

        for row in range(header_row + 1, ws.max_row + 1):
            식품명 = ws.cell(row=row, column=식품명_col).value
            if 식품명 and str(식품명).strip().lower() not in ["nan", ""]:
                matched_price = price_map.get(str(식품명).strip(), "")
                ws.cell(row=row, column=계약단가_col, value=matched_price)

        output_filename = order_file_path.stem.replace("발주서", "발주서_업로드용") + ".xlsx"
        output_path = output_dir / output_filename
        wb.save(output_path)

        msg = f"✅ 발주서 버전 저장 완료: {output_path.name}"
        print(msg)
        log_lines.append(msg)
    except Exception as e:
        msg = f"❌ 오류: {order_file_path.name} | {e}"
        print(msg)
        log_lines.append(msg)

if __name__ == "__main__":
    base_dir = Path("C:/school/upload")
    output_dir = base_dir / "excel"
    log_lines = [f"🕒 실행 시간: {datetime.datetime.now()}\n"]

    order_files = sorted(base_dir.glob("*_발주서_*.xlsx"))

    for order_file in order_files:
        match = re.match(r"(\d{4})_(.+?)_발주서", order_file.stem)
        if not match:
            continue
        prefix, school = match.groups()
        price_file = base_dir / f"{prefix}_{school}_계약단가.xlsx"
        if price_file.exists():
            merge_contract_price(order_file, price_file, output_dir, log_lines)
        else:
            msg = f"⚠️ 계약단가 파일 없음: {price_file.name}"
            print(msg)
            log_lines.append(msg)

    with open(base_dir / "병합_log.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))

    print("\n📄 로그 저장 완료 → 병합_log.txt")
    input("\n⏎ Enter 키를 누르면 종료됩니다.")
