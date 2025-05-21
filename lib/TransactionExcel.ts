import * as XLSX from "xlsx";

export const generateTransactionExcel = async ({
  date,
  발주처,
  낙찰기업,
  품목들,
}: {
  date: string;
  발주처: any;
  낙찰기업: any;
  품목들: {
    번호: number;
    품명: string;
    규격: string;
    수량: number;
    단가: number;
    공급가액: number;
  }[];
}) => {
  const res = await fetch("/거래명세표.xlsx");
  if (!res.ok) {
    alert("❌ 거래명세표 템플릿 불러오기 실패");
    return;
  }

  const buffer = await res.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // 수신자/공급자 정보 채우기
  ws["C5"].v = 발주처.발주처 || "";
  ws["C6"].v = 발주처.사업장주소 || "";
  ws["C7"].v = 발주처.대표전화번호 || "";
  ws["C8"].v = 낙찰기업.상호명 || 낙찰기업.상호 || "";
  ws["C9"].v = 낙찰기업.주소 || "";
  ws["F5"].v = 낙찰기업.대표자 || "";
  ws["F6"].v = 낙찰기업.대표전화 || 낙찰기업.대표전화번호 || "";

  // 품목 채우기
  let 합계 = 0;
  품목들.forEach((item, i) => {
    const r = 12 + i;
    ws[`A${r}`] = { v: item.번호 };          // 번호
    ws[`B${r}`] = { v: date.split("-")[1] }; // 월
    ws[`C${r}`] = { v: date.split("-")[2] }; // 일
    ws[`D${r}`] = { v: item.품명 };
    ws[`E${r}`] = { v: item.규격 };
    ws[`F${r}`] = { v: item.수량 };
    ws[`G${r}`] = { v: item.단가 };
    ws[`H${r}`] = { v: item.공급가액 };
    합계 += item.공급가액;
  });

  ws["F4"].v = 합계;

  const filename = `${발주처.발주처}_${date}_거래명세표.xlsx`;
  XLSX.writeFile(wb, filename);
};
