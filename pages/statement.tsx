// 거래명세표 Excel 생성 모듈
import * as XLSX from "xlsx";

interface 품목 {
  번호: number;
  품명: string;
  규격: string;
  수량: number;
  단가: number;
  공급가액: number;
}

interface 거래명세표옵션 {
  date: string;
  발주처: any; // Firestore에서 받은 문서 객체
  낙찰기업: any;
  품목들: 품목[];
}

export async function generateTransactionExcel({
  date,
  발주처,
  낙찰기업,
  품목들,
}: 거래명세표옵션) {
  const rows = [];

  rows.push(["거래일자", date]);
  rows.push([]);
  rows.push(["공급자", 낙찰기업["상호"] || ""]);
  rows.push(["주소", 낙찰기업["주소"] || ""]);
  rows.push(["전화", 낙찰기업["전화"] || ""]);
  rows.push([]);
  rows.push(["공급받는자", 발주처["발주처"] || ""]);
  rows.push(["주소", 발주처["사업장주소"] || ""]);
  rows.push(["전화", 발주처["대표전화번호"] || ""]);
  rows.push([]);
  rows.push(["번호", "품명", "규격", "수량", "단가", "공급가액"]);

  품목들.forEach((item) => {
    rows.push([
      item.번호,
      item.품명,
      item.규격,
      item.수량,
      item.단가,
      item.공급가액,
    ]);
  });

  const total = 품목들.reduce((sum, item) => sum + item.공급가액, 0);
  rows.push([]);
  rows.push(["합계", "", "", "", "", total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "거래명세표");
  XLSX.writeFile(wb, `${발주처["발주처"]}_${date}_거래명세표.xlsx`);
}
