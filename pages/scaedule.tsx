import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
// lib 폴더 안에 firebase.ts가 위치하므로 아래와 같이 수정합니다:
import { db } from '../lib/firebase';

interface ExcelRow {
  id: string;
  낙찰기업: string;
  NO: string;
  식품명: string;
  규격: string;
  속성정보: string;
  [date: string]: any;
  총량: number;
  계약단가: number;
  총액: number;
}

export default function SchedulePage() {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const month = '2506';
        const excelCol = collection(db, 'school');
        const q = query(
          excelCol,
          where('연월', '==', month),
          orderBy('발주처', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetchedRows: ExcelRow[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          const totalAmount = data.총량 * data.계약단가;
          return {
            id: doc.id,
            낙찰기업: data.낙찰기업,
            NO: data.NO,
            식품명: data.식품명,
            규격: data.규격,
            속성정보: data.속성정보,
            ...data.일자,
            총량: data.총량,
            계약단가: data.계약단가,
            총액: totalAmount,
          };
        });
        setRows(fetchedRows);
      } catch (error) {
        console.error('데이터 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">06월 납품 현황 (문서ID 기준)</h1>
      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">문서ID</th>
                <th className="border border-gray-300 px-4 py-2">낙찰기업</th>
                <th className="border border-gray-300 px-4 py-2">NO</th>
                <th className="border border-gray-300 px-4 py-2">식품명</th>
                <th className="border border-gray-300 px-4 py-2">규격</th>
                <th className="border border-gray-300 px-4 py-2">속성정보</th>
                {Array.from({ length: 30 }, (_, i) => (
                  <th
                    key={`day-${i + 1}`}
                    className="border border-gray-300 px-4 py-2"
                  >
                    {i + 1}일
                  </th>
                ))}
                <th className="border border-gray-300 px-4 py-2">총량</th>
                <th className="border border-gray-300 px-4 py-2">계약단가</th>
                <th className="border border-gray-300 px-4 py-2">총액</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{row.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.낙찰기업}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.NO}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.식품명}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.규격}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.속성정보}</td>
                  {Array.from({ length: 30 }, (_, i) => (
                    <td
                      key={`row-${row.id}-day-${i + 1}`}
                      className="border border-gray-300 px-4 py-2"
                    >
                      {row[`${i + 1}일`] || '-'}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2">{row.총량}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.계약단가}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.총액}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={36} className="border border-gray-300 px-4 py-2 text-center">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
