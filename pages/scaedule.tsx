import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';

interface FirestoreDoc {
  연월: string;
  발주처: string;
  낙찰기업: string;
  no: number;
  식품명: string;
  규격: string;
  속성정보: string;
  수량: number;
  납품일자: string; // 'YYYY-MM-DD'
  계약단가: number;
}

interface RowData {
  연월: string;
  발주처: string;
  낙찰기업: string;
  no: number;
  식품명: string;
  규격: string;
  속성정보: string;
  [date: string]: string | number; // dynamic date columns
  총량: number;
  계약단가: number;
  총합계약단가: number;
}

const Schedule: React.FC = () => {
  const [month, setMonth] = useState<string>('2025-06');
  const [rows, setRows] = useState<RowData[]>([]);
  const [dateCols, setDateCols] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Query Firestore for docs matching selected month
      const q = query(collection(db, 'school'), where('연월', '==', month));
      const snapshot = await getDocs(q);
      const docs: FirestoreDoc[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        docs.push({
          연월: data.연월,
          발주처: data.발주처,
          낙찰기업: data.낙찰기업,
          no: data.no,
          식품명: data.식품명,
          규격: data.규격,
          속성정보: data.속성정보,
          수량: data.수량,
          납품일자: data.납품일자,
          계약단가: data.계약단가,
        });
      });

      // 2. Collect unique days (MM-DD) in month
      const daySet = new Set<string>();
      docs.forEach(d => {
        const parts = d.납품일자.split('-');
        if (parts.length === 3) {
          const day = parts[2];
          daySet.add(day);
        }
      });
      const daysSorted = Array.from(daySet).sort((a, b) => parseInt(a) - parseInt(b));
      setDateCols(daysSorted);

      // 3. Group docs by key
      const grouping: { [key: string]: RowData } = {};
      docs.forEach(d => {
        const key = `${d.발주처}|${d.no}|${d.식품명}|${d.규격}|${d.속성정보}|${d.계약단가}|${d.낙찰기업}`;
        if (!grouping[key]) {
          // Initialize fields and date columns to 0
          const row: any = {
            연월: d.연월,
            발주처: d.발주처,
            낙찰기업: d.낙찰기업,
            no: d.no,
            식품명: d.식품명,
            규격: d.규격,
            속성정보: d.속성정보,
            계약단가: d.계약단가,
            총량: 0,
            총합계약단가: 0,
          };
          daysSorted.forEach(day => {
            row[day] = 0;
          });
          grouping[key] = row;
        }
        const parts = d.납품일자.split('-');
        const day = parts[2];
        grouping[key][day] += d.수량;
        grouping[key].총량 += d.수량;
        grouping[key].총합계약단가 = grouping[key].총량 * d.계약단가;
      });

      setRows(Object.values(grouping));
    };
    fetchData();
  }, [month]);

  const handleDownload = () => {
    // Build header row
    const headers = [
      '연월', '발주처', '낙찰기업', 'no', '식품명', '규격', '속성정보',
      ...dateCols, '총량', '계약단가', '총합계약단가'
    ];
    // Build data rows
    const data: (string | number)[][] = rows.map(r => {
      const rowArr: (string | number)[] = [];
      headers.forEach(col => {
        rowArr.push(r[col] !== undefined ? r[col] as (string | number) : '');
      });
      return rowArr;
    });

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Write workbook and trigger download
    XLSX.writeFile(wb, `${month}-발주서.xlsx`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>발주서 조회 및 엑셀 다운로드</h2>
      <div style={{ marginBottom: 20 }}>
        <label>
          연월:&nbsp;
          <select value={month} onChange={e => setMonth(e.target.value)}>
            {/* 예시로 2025년 01월부터 12월까지 */}
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
        &nbsp;&nbsp;
        <button onClick={handleDownload}>Excel 다운</button>
      </div>

      <table border={1} cellPadding={5} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>연월</th>
            <th>발주처</th>
            <th>낙찰기업</th>
            <th>no</th>
            <th>식품명</th>
            <th>규격</th>
            <th>속성정보</th>
            {dateCols.map(day => (
              <th key={day}>{day}</th>
            ))}
            <th>총량</th>
            <th>계약단가</th>
            <th>총합계약단가</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td>{r.연월}</td>
              <td>{r.발주처}</td>
              <td>{r.낙찰기업}</td>
              <td>{r.no}</td>
              <td>{r.식품명}</td>
              <td>{r.규격}</td>
              <td>{r.속성정보}</td>
              {dateCols.map(day => (
                <td key={day}>{r[day] || 0}</td>
              ))}
              <td>{r.총량}</td>
              <td>{r.계약단가}</td>
              <td>{r.총합계약단가}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Schedule;
