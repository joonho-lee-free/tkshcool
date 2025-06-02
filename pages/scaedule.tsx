import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DeliveryInfo {
  수량: number;
  계약단가: number;
  공급가액: number;
}

interface ItemData {
  no: string;
  식품명: string;
  단가: number;
  규격: string;
  총량: number;
  속성정보: string;
  납품: Record<string, DeliveryInfo>;
}

interface FirestoreDoc {
  연월: string;
  발주처: string;
  낙찰기업: string;
  품목: ItemData[]; // upload_school.py 에서 ArrayUnion으로 저장된 배열 구조를 반영합니다 fileciteturn3file5
  // PDF에서 읽어온 학교 정보
  대표?: string;
  사업자등록번호?: string;
  사업장주소?: string;
  대표전화번호?: string;
}

interface RowData {
  문서ID: string;
  연월: string;
  발주처: string;
  낙찰기업: string;
  NO: string;
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

  // 1일부터 31일까지 날짜 컬럼
  const dayCols = Array.from({ length: 31 }).map((_, idx) => (idx + 1).toString());

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, 'school'), where('연월', '==', month));
      const snapshot = await getDocs(q);
      const tempRows: RowData[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDoc;
        const docId = doc.id;

        // Firestore 문서 하나 안에 있는 배열 '품목' 각각을 row로 변환
        data.품목?.forEach((item) => {
          const baseRow: any = {
            문서ID: docId,
            연월: data.연월,
            발주처: data.발주처,
            낙찰기업: data.낙찰기업,
            NO: item.no,
            식품명: item.식품명,
            규격: item.규격,
            속성정보: item.속성정보,
            총량: item.총량,
            계약단가: item.단가,
            총계약액: item.총량 * item.단가,
          };
          // 날짜 컬럼 초기화
          dayCols.forEach((day) => {
            baseRow[day] = 0;
          });

          // 납품 객체에서 날짜별 수량을 해당 컬럼에 입력
          Object.entries(item.납품 || {}).forEach(([dateStr, info]) => {
            // '2025-06-04' 형태 → 일(day)만 추출
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const dayNum = parseInt(parts[2], 10).toString();
              if (baseRow.hasOwnProperty(dayNum)) {
                baseRow[dayNum] = info.수량;
              }
            }
          });

          tempRows.push(baseRow as RowData);
        });
      });

      setRows(tempRows);
    };
    fetchData();
  }, [month]);

  const handleDownload = () => {
    const headers = [
      '문서ID', '연월', '발주처', '낙찰기업', 'NO', '식품명', '규격', '속성정보',
      ...dayCols,
      '총량', '계약단가', '총계약액',
    ];

    const data: (string | number)[][] = rows.map((r) => [
      r.문서ID,
      r.연월,
      r.발주처,
      r.낙찰기업,
      r.NO,
      r.식품명,
      r.규격,
      r.속성정보,
      ...dayCols.map((d) => r[d] ?? 0),
      r.총량,
      r.계약단가,
      r.총계약액,
    ]);

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
        <table
          style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px', whiteSpace: 'nowrap' }}
          border={1}
          cellPadding={2}
        >
          <thead>
            <tr style={{ backgroundColor: '#e0e0e0' }}>
              <th>문서ID</th>
              <th>연월</th>
              <th>발주처</th>
              <th>낙찰기업</th>
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
                <td colSpan={8 + dayCols.length + 3} style={{ textAlign: 'center', padding: '16px' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                  <td>{r.문서ID}</td>
                  <td>{r.연월}</td>
                  <td>{r.발주처}</td>
                  <td>{r.낙찰기업}</td>
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
