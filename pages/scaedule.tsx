import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FirestoreDoc {
  연월: string;
  발주처: string;
  낙찰기업: string;
  no: number;
  식품명: string;
  규격: string;
  속성정보: string;
  수량: number;
  납품일자: string; // ex: '2025-06-04'
  계약단가: number;
}

interface RowData {
  문서ID: string;
  연월: string;
  발주처: string;
  NO: number;
  식품명: string;
  규격: string;
  속성정보: string;
  [day: string]: string | number; // '1'부터 '31'
  총량: number;
  계약단가: number;
  총계약액: number;
}

const Schedule: React.FC = () => {
  const [month, setMonth] = useState<string>('2025-06');
  const [rows, setRows] = useState<RowData[]>([]);

  // 고정된 1일부터 31일까지 날짜 컬럼 배열 생성
  const dayCols = Array.from({ length: 31 }).map((_, idx) => (idx + 1).toString());

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, 'school'), where('연월', '==', month));
      const snapshot = await getDocs(q);
      const tempRows: RowData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDoc;
        // 기본 row 객체 생성
        const baseRow: any = {
          문서ID: doc.id,
          연월: data.연월,
          발주처: data.발주처,
          NO: data.no,
          식품명: data.식품명,
          규격: data.규격,
          속성정보: data.속성정보,
          총량: data.수량,
          계약단가: data.계약단가,
          총계약액: data.수량 * data.계약단가,
        };
        // 1~31일까지 0으로 초기화
        dayCols.forEach((day) => {
          baseRow[day] = 0;
        });
        // 납품일자에서 일(day) 추출하여 해당 열에 수량 입력
        const parts = data.납품일자.split('-');
        if (parts.length === 3) {
          const dayStr = parseInt(parts[2], 10).toString();
          if (baseRow.hasOwnProperty(dayStr)) {
            baseRow[dayStr] = data.수량;
          }
        }
        tempRows.push(baseRow as RowData);
      });
      setRows(tempRows);
    };
    fetchData();
  }, [month]);

  const handleDownload = () => {
    // CSV 헤더
    const headers = ['문서ID', '연월', '발주처', 'NO', '식품명', '규격', '속성정보', ...dayCols, '총량', '계약단가', '총계약액'];
    // 데이터 배열 생성
    const data: (string | number)[][] = rows.map((r) => {
      return [
        r.문서ID,
        r.연월,
        r.발주처,
        r.NO,
        r.식품명,
        r.규격,
        r.속성정보,
        ...dayCols.map((d) => r[d] ?? 0),
        r.총량,
        r.계약단가,
        r.총계약액,
      ];
    });
    // CSV 문자열 생성
    const csvContent = [headers, ...data]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${month}-발주서.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 10, fontSize: '12px' }}>
      <h2 style={{ fontSize: '16px' }}>월별 납품 현황 (문서ID 기준)</h2>
      <div style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 8 }}>
          연월 선택:&nbsp;
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }).map((_, idx) => {
              const m = (idx + 1).toString().padStart(2, '0');
              return (
                <option key={m} value={`2025-${m}`}>
                  2025-{m}
                </option>
              );
            })}
          </select>
        </label>
        <button onClick={handleDownload} style={{ padding: '4px 8px', fontSize: '12px' }}>
          엑셀 다운로드
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }} border={1} cellPadding={2}>
          <thead>
            <tr>
              <th>문서ID</th>
              <th>연월</th>
              <th>발주처</th>
              <th>NO</th>
              <th>식품명</th>
              <th>규격</th>
              <th>속성정보</th>
              {dayCols.map((day) => (
                <th key={day}>{day}일</th>
              ))}
              <th>총량</th>
              <th>계약단가</th>
              <th>총계약액</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7 + dayCols.length + 3} style={{ textAlign: 'center' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.문서ID}</td>
                  <td>{r.연월}</td>
                  <td>{r.발주처}</td>
                  <td>{r.NO}</td>
                  <td>{r.식품명}</td>
                  <td>{r.규격}</td>
                  <td>{r.속성정보}</td>
                  {dayCols.map((day) => (
                    <td key={day}>{r[day] ?? 0}</td>
                  ))}
                  <td>{r.총량}</td>
                  <td>{r.계약단가}</td>
                  <td>{r.총계약액}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Schedule;
