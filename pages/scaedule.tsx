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
          tempRows.push({
            id: docSnap.id,
            ...data
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
            <ul>
              {rows.map((row, index) => (
                <li key={index} className="border-b border-gray-300 py-2">
                  <strong>문서 ID:</strong> {row.id} <br />
                  <strong>발주처:</strong> {row.발주처} <br />
                  <strong>낙찰기업:</strong> {row.낙찰기업}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
