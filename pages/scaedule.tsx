import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExcelRow {
  id: string;
  발주처?: string;
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
  const [loading, setLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Helper: get current YYMM format
  const getCurrentYYMM = () => {
    const now = new Date();
    const year = now.getFullYear() % 100;
    const month = now.getMonth() + 1;
    return `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
  };

  // Fetch distinct '연월' values
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(query(excelCol, orderBy('연월', 'desc')));
        const monthsSet = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any;
          if (data.연월) {
            monthsSet.add(data.연월);
          }
        });
        const monthsArray = Array.from(monthsSet).sort();
        setAvailableMonths(monthsArray);
        const currentYM = getCurrentYYMM();
        if (monthsArray.includes(currentYM)) {
          setSelectedMonth(currentYM);
        } else if (monthsArray.length > 0) {
          setSelectedMonth(monthsArray[0]);
        }
      } catch (error) {
        console.error('연월 목록 가져오기 실패:', error);
      }
    };
    fetchMonths();
  }, []);

  // Fetch rows when selectedMonth changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedMonth) return;
      setLoading(true);
      try {
        const excelCol = collection(db, 'school');
        const q = query(
          excelCol,
          orderBy('발주처', 'asc')
        );
        const snapshot = await getDocs(q);
        const filteredRows: ExcelRow[] = snapshot.docs
          .filter(doc => {
            const data = doc.data() as any;
            return data.연월 === selectedMonth;
          })
          .map(doc => {
            const data = doc.data() as any;
            const totalAmount = data.총량 * data.계약단가;
            return {
              id: doc.id,
              발주처: data.발주처,
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
        setRows(filteredRows);
      } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const downloadCSV = () => {
    if (!selectedMonth) return;
    const headers = [
      '문서ID', '발주처', '낙찰기업', 'NO', '식품명', '규격', '속성정보',
      ...Array.from({ length: 31 }, (_, i) => `${i + 1}일`),
      '총량', '계약단가', '총액'
    ];
    const rowsData = rows.map(row => [
      row.id,
      row.발주처 || '',
      row.낙찰기업,
      row.NO,
      row.식품명,
      row.규격,
      row.속성정보,
      ...Array.from({ length: 31 }, (_, i) => row[`${i + 1}일`] || ''),
      row.총량,
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
    link.setAttribute('download', `deliveries_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">월별 납품 현황 (문서ID 기준)</h1>
      <div className="flex items-center mb-4 space-x-4">
        <label htmlFor="month-select" className="font-medium">연월 선택:</label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <button
          onClick={downloadCSV}
          disabled={!selectedMonth || rows.length === 0}
          className={`ml-auto px-4 py-2 rounded text-white ${selectedMonth && rows.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          엑셀 다운로드
        </button>
      </div>

      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">문서ID</th>
                <th className="border border-gray-300 px-4 py-2">발주처</th>
                <th className="border border-gray-300 px-4 py-2">낙찰기업</th>
                <th className="border border-gray-300 px-4 py-2">NO</th>
                <th className="border border-gray-300 px-4 py-2">식품명</th>
                <th className="border border-gray-300 px-4 py-2">규격</th>
                <th className="border border-gray-300 px-4 py-2">속성정보</th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={`day-${i + 1}`} className="border border-gray-300 px-4 py-2">{i + 1}일</th>
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
                  <td className="border border-gray-300 px-4 py-2">{row.발주처}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.낙찰기업}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.NO}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.식품명}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.규격}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.속성정보}</td>
                  {Array.from({ length: 31 }, (_, i) => (
                    <td key={`row-${row.id}-day-${i + 1}`} className="border border-gray-300 px-4 py-2">{row[`${i + 1}일`] || '-'}</td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2">{row.총량}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.계약단가}</td>
                  <td className="border border-gray-300 px-4 py-2">{row.총액}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={40} className="border border-gray-300 px-4 py-2 text-center">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
