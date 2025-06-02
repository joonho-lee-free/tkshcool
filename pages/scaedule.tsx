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
  연월: string;
  발주처: string;
  낙찰기업: string;
  no: number;
  식품명: string;
  규격: string;
  속성정보: string;
  [date: string]: string | number;
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
      const q = query(collection(db, 'school'), where('연월', '==', month));
      const snapshot = await getDocs(q);
      const docs: FirestoreDoc[] = [];
      snapshot.forEach((doc) => {
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

      const daySet = new Set<string>();
      docs.forEach((d) => {
        const parts = d.납품일자.split('-');
        if (parts.length === 3) {
          daySet.add(parts[2]);
        }
      });
      const daysSorted = Array.from(daySet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      setDateCols(daysSorted);

      const grouping: { [key: string]: RowData } = {};
      docs.forEach((d) => {
        const key = `${d.발주처}|${d.no}|${d.식품명}|${d.규격}|${d.속성정보}|${d.계약단가}|${d.낙찰기업}`;
        if (!grouping[key]) {
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
          daysSorted.forEach((day) => {
            row[day] = 0;
          });
          grouping[key] = row;
        }
        const parts = d.납품일자.split('-');
        const day = parts[2];
        // 타입이 string | number 이므로 number로 캐스트 후 더하기
        grouping[key][day] = (grouping[key][day] as number) + d.수량;
        grouping[key].총량 = (grouping[key].총량 as number) + d.수량;
        grouping[key].총합계약단가 = (grouping[key].총량 as number) * d.계약단가;
      });

      setRows(Object.values(grouping));
    };
    fetchData();
  }, [month]);

  const handleDownload = () => {
    const headers = [
      '연월', '발주처', '낙찰기업', 'no', '식품명', '규격', '속성정보',
      ...dateCols, '총량', '계약단가', '총합계약단가'
    ];
    const data: (string | number)[][] = rows.map((r) => {
      const rowArr: (string | number)[] = [];
      headers.forEach((col) => {
        rowArr.push(r[col] !== undefined ? (r[col] as string | number) : '');
      });
      return rowArr;
    });

    const csvContent = [headers, ...data]
      .map((row) =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
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
    <div style={{ padding: 20 }}>
      <h2>발주서 조회 및 엑셀( CSV ) 다운로드</h2>
      <div style={{ marginBottom: 20 }}>
        <label>
          연월:&nbsp;
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
            {dateCols.map((day) => (
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
              {dateCols.map((day) => (
                <td key={day}>{r[day] ?? 0}</td>
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
