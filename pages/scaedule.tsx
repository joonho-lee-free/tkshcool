import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExcelRow {
  id: string;
  발주처: string;
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
  const [dateKeys, setDateKeys] = useState<string[]>([]);

  // 현재 시간을 기준으로 YYMM 형식 반환
  const getCurrentYYMM = () => {
    const now = new Date();
    const year = now.getFullYear() % 100;
    const month = now.getMonth() + 1;
    return `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
  };

  // Firestore에서 사용 가능한 월을 가져옴
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(query(excelCol, orderBy('연월', 'desc')));
        const monthsSet = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any;
          if (data.연월) monthsSet.add(data.연월);
        });
        const monthsArray = Array.from(monthsSet).sort();
        setAvailableMonths(monthsArray);

        // 기본 연월: 현재 YYMM
        const defaultMonth = getCurrentYYMM();
        if (monthsArray.includes(defaultMonth)) {
          setSelectedMonth(defaultMonth);
        } else if (monthsArray.length > 0) {
          setSelectedMonth(monthsArray[0]);
        }
      } catch (error) {
        console.error('연월 목록 가져오기 실패:', error);
      }
    };
    fetchMonths();
  }, []);

  // 선택한 월에 맞춰 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedMonth) return;
      setLoading(true);
      try {
        const excelCol = collection(db, 'school');
        const q = query(
          excelCol,
          where('연월', '==', selectedMonth),
          orderBy('발주처', 'asc'),
          orderBy('낙찰기업', 'asc')
        );
        const snapshot = await getDocs(q);
        const tempRows: ExcelRow[] = [];
        const datesSet = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any;
          const 발주처 = data.발주처 || '';
          const 낙찰기업 = data.낙찰기업 || '';
          const deliveries = data.납품;
          if (Array.isArray(deliveries)) {
            deliveries.forEach((entry: any) => {
              const totalAmount = entry.총량 * entry.계약단가;
              Object.keys(entry.일자 || {}).forEach(date => datesSet.add(date));
              tempRows.push({
                id: doc.id,
                발주처,
                낙찰기업,
                NO: entry.NO,
                식품명: entry.식품명,
                규격: entry.규격,
                속성정보: entry.속성정보,
                ...entry.일자,
                총량: entry.총량,
                계약단가: entry.계약단가,
                총액: totalAmount,
              });
            });
          } else if (deliveries && typeof deliveries === 'object') {
            Object.values(deliveries).forEach((entry: any) => {
              const totalAmount = entry.총량 * entry.계약단가;
              Object.keys(entry.일자 || {}).forEach(date => datesSet.add(date));
              tempRows.push({
                id: doc.id,
                발주처,
                낙찰기업,
                NO: entry.NO,
                식품명: entry.식품명,
                규격: entry.규격,
                속성정보: entry.속성정보,
                ...entry.일자,
                총량: entry.총량,
                계약단가: entry.계약단가,
                총액: totalAmount,
              });
            });
          }
        });
        // 날짜 키 정렬
        const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setDateKeys(sortedDates);
        setRows(tempRows);
      } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        setRows([]);
        setDateKeys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  // CSV 다운로드 함수
  const downloadCSV = () => {
    if (!selectedMonth) return;
    const headers = [
      '문서ID', '발주처', '낙찰기업', 'NO', '식품명', '규격', '속성정보',
      ...dateKeys,
      '총량', '계약단가', '총액'
    ];
    const rowsData = rows.map(row => [
      row.id,
      row.발주처,
      row.낙찰기업,
      row.NO,
      row.식품명,
      row.규격,
      row.속성정보,
      ...dateKeys.map(date => row[date] || ''),
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
      <h1 className="text-xl font-semibold mb-4">월별 납품 현황 (문서ID 기준)</h1>
      <div className="flex items-center mb-4 space-x-4">
        <label htmlFor="month-select" className="font-medium">연월 선택:</label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded p-2 text-sm"
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <button
          onClick={downloadCSV}
          disabled={!selectedMonth || rows.length === 0}
          className={`ml-auto px-3 py-1 rounded text-white text-sm ${selectedMonth && rows.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          엑셀 다운로드
        </button>
      </div>

      {loading ? (
        <p className="text-sm">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto text-xs">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1">문서ID</th>
                <th className="border border-gray-300 px-2 py-1">발주처</th>
                <th className="border border-gray-300 px-2 py-1">낙찰기업</th>
                <th className="border border-gray-300 px-2 py-1">NO</th>
                <th className="border border-gray-300 px-2 py-1">식품명</th>
                <th className="border border-gray-300 px-2 py-1">규격</th>
                <th className="border border-gray-300 px-2 py-1">속성정보</th>
                {dateKeys.map(date => (
                  <th key={date} className="border border-gray-300 px-2 py-1">{date}</th>
                ))}
                <th className="border border-gray-300 px-2 py-1">총량</th>
                <th className="border border-gray-300 px-2 py-1">계약단가</th>
                <th className="border border-gray-300 px-2 py-1">총액</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.id}-${row.NO}`} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1">{row.id}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.발주처}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.낙찰기업}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.NO}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.식품명}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.규격}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.속성정보}</td>
                  {dateKeys.map(date => (
                    <td key={`row-${row.id}-${row.NO}-date-${date}`} className="border border-gray-300 px-2 py-1">{row[date] || '-'}</td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1">{row.총량}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.계약단가}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.총액}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7 + dateKeys.length + 3} className="border border-gray-300 px-2 py-1 text-center">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
