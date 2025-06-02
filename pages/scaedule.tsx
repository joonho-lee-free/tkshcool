import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Schedule() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateKeys, setDateKeys] = useState<string[]>([]);

  useEffect(() => {
    const fetchAllKukjaego = async () => {
      setLoading(true);
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(excelCol);
        const intlDocs = snapshot.docs.filter(d => d.id.includes('_국제고'));
        const tempRows: any[] = [];
        const datesSet = new Set<string>();

        for (const docSnap of intlDocs) {
          const data = docSnap.data();
          const deliveries = data.납품 || [];
          deliveries.forEach((item: any) => {
            Object.keys(item.납품 || {}).forEach(date => {
              const deliveryData = item.납품[date];
              datesSet.add(date);
              tempRows.push({
                id: docSnap.id,
                발주처: data.발주처,
                낙찰기업: data.낙찰기업,
                NO: item.no,
                식품명: deliveryData.식품명,
                규격: item.규격,
                속성정보: deliveryData.속성정보,
                날짜: date,
                수량: deliveryData.수량,
                계약단가: deliveryData.계약단가,
                총액: (deliveryData.수량 || 0) * (deliveryData.계약단가 || 0)
              });
            });
          });
        }

        const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setDateKeys(sortedDates);
        setRows(tempRows);
      } catch (error) {
        console.error('국제고 데이터 가져오기 실패:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllKukjaego();
  }, []);

  const downloadCSV = () => {
    const headers = ['문서ID', '발주처', '낙찰기업', 'NO', '식품명', '규격', '속성정보', '날짜', '수량', '계약단가', '총액'];
    const rowsData = rows.map(row => [
      row.id,
      row.발주처,
      row.낙찰기업,
      row.NO,
      row.식품명,
      row.규격,
      row.속성정보,
      row.날짜,
      row.수량,
      row.계약단가,
      row.총액
    ]);

    const csvContent = [headers, ...rowsData]
      .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `국제고_전체.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">국제고 전체 납품 현황</h1>
      <button
        onClick={downloadCSV}
        disabled={rows.length === 0}
        className={`mb-4 px-3 py-1 rounded text-white text-sm ${rows.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
      >
        엑셀 다운로드
      </button>

      {loading ? (
        <p className="text-sm">로딩 중...</p>
      ) : (
        <div>
          {rows.length === 0 ? (
            <p className="text-sm">데이터가 없습니다.</p>
          ) : (
            <table className="table-auto w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1">문서ID</th>
                  <th className="border border-gray-300 px-2 py-1">발주처</th>
                  <th className="border border-gray-300 px-2 py-1">낙찰기업</th>
                  <th className="border border-gray-300 px-2 py-1">NO</th>
                  <th className="border border-gray-300 px-2 py-1">식품명</th>
                  <th className="border border-gray-300 px-2 py-1">규격</th>
                  <th className="border border-gray-300 px-2 py-1">속성정보</th>
                  <th className="border border-gray-300 px-2 py-1">날짜</th>
                  <th className="border border-gray-300 px-2 py-1">수량</th>
                  <th className="border border-gray-300 px-2 py-1">계약단가</th>
                  <th className="border border-gray-300 px-2 py-1">총액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1">{row.id}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.발주처}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.낙찰기업}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.NO}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.식품명}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.규격}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.속성정보}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.날짜}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.수량}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.계약단가}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.총액}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
