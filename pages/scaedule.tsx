import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Schedule() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllKukjaego = async () => {
      setLoading(true);
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(excelCol);
        const intlDocs = snapshot.docs.filter(d => d.id.includes('_국제고'));
        const tempRows: any[] = [];

        for (const docSnap of intlDocs) {
          const data = docSnap.data();
          const deliveries = data.납품 || [];
          deliveries.forEach((item: any) => {
            Object.keys(item.납품 || {}).forEach(date => {
              const deliveryData = item.납품[date];
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">국제고 전체 납품 현황</h1>
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
                  <th className="border border-gray-300 px-2 py-1">문서 ID</th>
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
