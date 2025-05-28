import React, { useState } from "react";
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
  발주처: Record<string, any>;
  낙찰기업: Record<string, any>;
  품목들: 품목[];
}

// Excel 생성 함수는 페이지 컴포넌트 바깥으로 분리
export function generateTransactionExcel(
  opts: 거래명세표옵션
) {
  const { date, 발주처, 낙찰기업, 품목들 } = opts;
  const supplier = String(낙찰기업.상호 || "").replace(/\s+/g, "_");
  const client   = String(발주처.발주처 || "").replace(/\s+/g, "_");
  const safeDate = date.replace(/[^0-9\-]/g, "");
  const fileName = `${client}_${safeDate}_거래명세표.xlsx`;

  const rows: (string | number)[][] = [
    ["거래일자", date],
    [],
    ["공급자", 낙찰기업.상호 || ""],
    ["주소", 낙찰기업.주소 || ""],
    ["전화", 낙찰기업.전화 || ""],
    [],
    ["공급받는자", 발주처.발주처 || ""],
    ["주소", 발주처.사업장주소 || ""],
    ["전화", 발주처.대표전화번호 || ""],
    [],
    ["번호", "품명", "규격", "수량", "단가", "공급가액"],
    ...품목들.map((item) => [
      item.번호,
      item.품명,
      item.규격,
      item.수량,
      item.단가.toLocaleString(),
      item.공급가액.toLocaleString(),
    ]),
    [],
    [
      "합계",
      "",
      "",
      "",
      "",
      품목들
        .reduce((sum, i) => sum + i.공급가액, 0)
        .toLocaleString(),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "거래명세표");
  XLSX.writeFile(wb, fileName);
}

// Next.js 페이지 컴포넌트: 기본 export 필수
const StatementPage: React.FC = () => {
  const [품목들, set품목들] = useState<품목[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleDownload = () => {
    // 예시 데이터를 넣거나 실제 API 호출 후 전달
    generateTransactionExcel({ date, 발주처: {}, 낙찰기업: {}, 품목들 });
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>거래명세표 생성</h1>
      <label>
        거래일자: 
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button onClick={handleDownload} style={{ marginLeft: 8 }}>
        Excel 다운로드
      </button>
    </div>
  );
};

export default StatementPage;
