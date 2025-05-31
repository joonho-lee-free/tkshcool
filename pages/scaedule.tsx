import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface SchoolDelivery {
  id: string;
  발주처: string;
  낙찰기업?: string;
  연월?: string;
  // 필요한 다른 필드 추가
}

export default function SchedulePage() {
  const [deliveries, setDeliveries] = useState<SchoolDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const schoolCol = collection(db, 'school');
        const q = query(schoolCol, orderBy('발주처', 'asc'));
        const snapshot = await getDocs(q);
        const data: SchoolDelivery[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<SchoolDelivery, 'id'>
        }));
        setDeliveries(data);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, []);

  // 특정 연월에 해당하는 데이터만 필터링
  const filteredDeliveries = selectedMonth
    ? deliveries.filter(item => item.연월 === selectedMonth)
    : deliveries;

  // CSV 형식으로 변환하여 다운로드
  const downloadCSV = () => {
    const headers = ['발주처', '낙찰기업', '연월'];
    const rows = filteredDeliveries.map(item => [
      item.발주처,
      item.낙찰기업 ?? '',
      item.연월 ?? ''
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(field => `"${field.replace(/"/g, '""')}"`).join(',') )
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `deliveries_${selectedMonth || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">납품 업데이트 목록</h1>
      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <>
          <div className="flex items-center mb-4 space-x-4">
            <label htmlFor="month-select" className="font-medium">문서 연월 선택:</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded p-2"
            >
              <option value="">전체</option>
              <option value="2504">2504</option>
              <option value="2505">2505</option>
              <option value="2026">2026</option>
            </select>
            <button
              onClick={downloadCSV}
              className="ml-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              엑셀 다운로드
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">문서 ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">발주처</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">낙찰기업</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">연월</th>
                  {/* 필요한 다른 헤더 추가 */}
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{item.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.발주처}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.낙찰기업 || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.연월 || '-'}</td>
                    {/* 필요한 다른 필드 추가 */}
                  </tr>
                ))}
                {filteredDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-4 py-2 text-center">
                      선택된 연월에 해당하는 발주처가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
