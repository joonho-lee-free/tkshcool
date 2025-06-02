import React, { useEffect, useState } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
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

  // 국제고가 포함된 모든 문서ID를 가져와서 데이터 합치기
  useEffect(() => {
    const fetchAllK 국제고 = async () => {
      setLoading(true);
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(excelCol);
        const intlDocs = snapshot.docs.filter(d => d.id.includes('_국제고'));
        const tempRows: ExcelRow[] = [];
        const datesSet = new Set<string>();
        for (const docSnap of intlDocs) {
          const data = docSnap.data() as any;
          const 발주처 = data.발주처 || '';
          const 낙찰기업 = data.낙찰기업 || '';
          const deliveries = data.납품;
          if (Array.isArray(deliveries)) {
            deliveries.forEach((entry: any) => {
              const dateObj = entry.납품 || {};
              Object.keys(dateObj).forEach(date => datesSet.add(date));
              let 합총량 = 0;
              let 계약단가 = 0;
              const rowDates: { [key: string]: any } = {};
              Object.entries(dateObj).forEach(([date, info]: any) => {
                rowDates[date] = info.수량 || '-';
                합총량 += info.수량 || 0;
                계약단가 = info.계약단가 || 0;
              });
              const totalInfo = (Object.values(dateObj)[0] as any) || {};
              const 식품명Val = totalInfo.식품명 || '';
              const 속성정보Val = totalInfo.속성정보 || '';
              const 총액 = 합총량 * 계약단가;
              tempRows.push({
                id: docSnap.id,
                발주처,
                낙찰기업,
                NO: entry.no || '',
                식품명: 식품명Val,
                규격: entry.규격 || '',
                속성정보: 속성정보Val,
                ...rowDates,
                총량: 합총량,
                계약단가,
                총액,
              });
            });
          }
        }
        const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setDateKeys(sortedDates);
        setRows(tempRows);
      } catch (error) {
        console.error('국제고 데이터 가져오기 실패:', error);
        setRows([]);
        setDateKeys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllK 국제고();
  }, []);

  // CSV 다운로드 함수
  const downloadCSV = () => {
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
      .join('
');
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
}() {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [dateKeys, setDateKeys] = useState<string[]>([]);

  // 현재 시간을 기준으로 YYMM 형식 반환
  const getCurrentYYMM = () => {
    const now = new Date();
    const year = now.getFullYear() % 100;
    const month = now.getMonth() + 1;
    return `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
  };

    // Firestore에서 '국제고'가 포함된 모든 문서ID 목록을 가져옴
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(excelCol);
        const allIds = snapshot.docs.map(d => d.id);
        // '국제고'를 포함하는 문서ID만 필터
        const filtered = allIds.filter(id => id.includes('_국제고')).sort();
        setAvailableDocs(filtered);
        if (filtered.length > 0) {
          setSelectedDoc(filtered[0]);
        }
      } catch (error) {
        console.error('국제고 문서ID 목록 가져오기 실패:', error);
      }
    };
    fetchDocs();
  }, []);

  // 선택한 문서ID에 맞춰 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDoc) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'school', selectedDoc);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setRows([]);
          setDateKeys([]);
          setLoading(false);
          return;
        }
        const data = docSnap.data() as any;
        const 발주처 = data.발주처 || '';
        const 낙찰기업 = data.낙찰기업 || '';
        const deliveries = data.납품;
        const tempRows: ExcelRow[] = [];
        const datesSet = new Set<string>();

        if (Array.isArray(deliveries)) {
          deliveries.forEach((entry: any) => {
            const dateObj = entry.납품 || {};
            Object.keys(dateObj).forEach(date => datesSet.add(date));
            let 합총량 = 0;
            let 계약단가 = 0;
            const rowDates: { [key: string]: any } = {};
            Object.entries(dateObj).forEach(([date, info]: any) => {
              rowDates[date] = info.수량 || '-';
              합총량 += info.수량 || 0;
              계약단가 = info.계약단가 || 0;
            });
            const totalInfo = (Object.values(dateObj)[0] as any) || {};
            const 식품명Val = totalInfo.식품명 || '';
            const 속성정보Val = totalInfo.속성정보 || '';
            const 총액 = 합총량 * 계약단가;
            tempRows.push({
              id: selectedDoc,
              발주처,
              낙찰기업,
              NO: entry.no || '',
              식품명: 식품명Val,
              규격: entry.규격 || '',
              속성정보: 속성정보Val,
              ...rowDates,
              총량: 합총량,
              계약단가,
              총액,
            });
          });
        }
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
  }, [selectedDoc]);

  // CSV 다운로드 함수
  const downloadCSV = () => {
    if (!selectedDoc) return;
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
    link.setAttribute('download', `${selectedDoc}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">문서별 납품 현황</h1>
      <div className="flex items-center mb-4 space-x-4">
        <label htmlFor="doc-select" className="font-medium">문서 선택:</label>
        <select
          id="doc-select"
          value={selectedDoc}
          onChange={e => setSelectedDoc(e.target.value)}
          className="border border-gray-300 rounded p-2 text-sm"
        >
          {availableDocs.map(docId => (
            <option key={docId} value={docId}>{docId}</option>
          ))}
        </select>
        <button
          onClick={downloadCSV}
          disabled={!selectedDoc || rows.length === 0}
          className={`ml-auto px-3 py-1 rounded text-white text-sm ${selectedDoc && rows.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
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
                  <td className="border border-gray-303 px-2 py-1">{row.총량}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.계약단가}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.총액}</td>
                </tr>  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
