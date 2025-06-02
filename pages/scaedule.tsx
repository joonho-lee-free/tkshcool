// 파일 경로: pages/scaedule.tsx

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
  연월필드: string;
  발주처필드: string;
  낙찰기업필드: string;
  no필드: number;
  식품명필드: string;
  규격필드: string;
  속성정보필드: string;
  // 'MM.DD' 형식의 날짜 컬럼들
  [date: string]: string | number;
  총량: number;
  계약단가: number;
  '총량*계약단가': number;
}

const Schedule: React.FC = () => {
  // 기본 연월(YYYY-MM) 상태
  const [month, setMonth] = useState<string>('2025-06');
  // 테이블용 데이터 배열
  const [rows, setRows] = useState<RowData[]>([]);

  // 예제 시트처럼 “MM.DD” 형식으로 1일부터 말일까지 (자동으로 01~30 혹은 31)
  // 실제로 6월은 30일까지이므로, 나중에 로직에서 6월 30까지만 체크하여 셀에 값을 채웁니다.
  const dayCols = (() => {
    // month 예: '2025-06'
    const parts = month.split('-');
    if (parts.length !== 2) return [];
    const mm = parts[1]; // ex: '06'
    // 해당 월의 마지막 일자를 알기 위해 Date 객체 사용
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1; // JS Date의 월은 0~11
    // 다음 달 1일을 구한 뒤 하루 전으로 마지막 일을 구함
    const lastDay = new Date(yearNum, monthNum + 1, 0).getDate();
    return Array.from({ length: lastDay }).map((_, idx) => {
      const day = (idx + 1).toString().padStart(2, '0'); // '01', '02', ...
      return `${mm}.${day}`; // '06.01', '06.02', ...
    });
  })();

  useEffect(() => {
    const fetchData = async () => {
      // 1) Firestore에서 ‘연월’ == month인 문서만 조회
      const q = query(collection(db, 'school'), where('연월', '==', month));
      const snapshot = await getDocs(q);

      // 2) RowData를 담을 임시 배열
      const tempRows: RowData[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDoc;

        // 3) 기본 RowData 형태 생성
        const baseRow: any = {
          문서ID: doc.id,
          연월필드: data.연월,
          발주처필드: data.발주처,
          낙찰기업필드: data.낙찰기업,
          no필드: data.no,
          식품명필드: data.식품명,
          규격필드: data.규격,
          속성정보필드: data.속성정보,
          총량: data.수량,
          계약단가: data.계약단가,
          '총량*계약단가': data.수량 * data.계약단가,
        };

        // 4) 날짜 컬럼(“MM.DD”)을 모두 0으로 초기화
        dayCols.forEach((col) => {
          baseRow[col] = 0;
        });

        // 5) data.납품일자 예: '2025-06-04' → “MM.DD” = '06.04'
        const parts = data.납품일자.split('-');
        if (parts.length === 3) {
          const mm = parts[1].padStart(2, '0'); // ex: '06'
          const dd = parts[2].padStart(2, '0'); // ex: '04'
          const dateKey = `${mm}.${dd}`; // '06.04'
          // 해당 컬럼이 dayCols에 있다면 수량을 대입
          if (baseRow.hasOwnProperty(dateKey)) {
            baseRow[dateKey] = data.수량;
          }
        }

        tempRows.push(baseRow as RowData);
      });

      setRows(tempRows);
    };

    fetchData();
  }, [month]);

  // CSV 다운로드 함수 (엑셀 호환용 CSV)
  const handleDownload = () => {
    // 1) 헤더 배열: 예제 시트 필드명 순서 그대로
    const headers = [
      '문서ID',
      '연월필드',
      '발주처필드',
      '낙찰기업필드',
      'no필드',
      '식품명필드',
      '규격필드',
      '속성정보필드',
      ...dayCols,
      '총량',
      '계약단가',
      '총량*계약단가',
    ];

    // 2) rows 배열을 헤더 순서에 맞춰 2차원 배열로 변환
    const data: (string | number)[][] = rows.map((r) => {
      return [
        r.문서ID,
        r.연월필드,
        r.발주처필드,
        r.낙찰기업필드,
        r.no필드,
        r.식품명필드,
        r.규격필드,
        r.속성정보필드,
        ...dayCols.map((col) => r[col] ?? 0),
        r.총량,
        r.계약단가,
        r['총량*계약단가'],
      ];
    });

    // 3) CSV 문자열 생성 (Double-quote 처리, 쉼표로 필드 구분, 줄바꿈으로 행 구분)
    const csvContent = [headers, ...data]
      .map((row) =>
        row.map((field) => `\"${String(field).replace(/\"/g, '\"\"')}\"`).join(',')
      )
      .join('\n');

    // 4) Blob → URL → 다운로드 태그 생성 → 클릭 → URL 해제
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
      <h2 style={{ fontSize: '16px', marginBottom: 8 }}>월별 납품 현황 (문서ID 기준)</h2>

      {/* 연월 선택 + 엑셀 다운로드 버튼 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 12 }}>
          연월 선택:&nbsp;
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {/* 예시: 2025-01 ~ 2025-12 */}
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

      {/* 가로 스크롤이 필요하면 스크롤바 표시 */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
          border={1}
          cellPadding={2}
        >
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th>문서ID</th>
              <th>연월필드</th>
              <th>발주처필드</th>
              <th>낙찰기업필드</th>
              <th>no필드</th>
              <th>식품명필드</th>
              <th>규격필드</th>
              <th>속성정보필드</th>
              {dayCols.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th>총량</th>
              <th>계약단가</th>
              <th>총량*계약단가</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7 + dayCols.length + 3}
                  style={{ textAlign: 'center', padding: '16px' }}
                >
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.문서ID}</td>
                  <td>{r.연월필드}</td>
                  <td>{r.발주처필드}</td>
                  <td>{r.낙찰기업필드}</td>
                  <td>{r.no필드}</td>
                  <td>{r.식품명필드}</td>
                  <td>{r.규격필드}</td>
                  <td>{r.속성정보필드}</td>
                  {dayCols.map((col) => (
                    <td key={col}>{r[col] ?? 0}</td>
                  ))}
                  <td>{r.총량}</td>
                  <td>{r.계약단가}</td>
                  <td>{r['총량*계약단가']}</td>
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
