// 파일 경로: pages/scaedule - 복사본.tsx

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveAs } from 'file-saver';

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
      // 1) Firestore에서 연월이 'month'인 문서들만 조회
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

      // 2) 각 문서의 '납품일자'에서 '일(DD)'만 추출하여 컬럼으로 사용
      const daySet = new Set<string>();
      docs.forEach((d) => {
        const parts = d.납품일자.split('-');
        if (parts.length === 3) {
          daySet.add(parts[2]); // 예: '2025-06-04' → '04'
        }
      });
      const daysSorted = Array.from(daySet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      setDateCols(daysSorted);

      // 3) 발주처, no, 식품명, 규격, 속성정보, 계약단가, 낙찰기업 단위로 그룹핑
      const grouping: { [key: string]: RowData } = {};

      docs.forEach((d) => {
        const key = `${d.발주처}|${d.no}|${d.식품명}|${d.규격}|${d.속성정보}|${d.계약단가}|${d.낙찰기업}`;

        if (!grouping[key]) {
          // 새 그룹 생성 시 기본값 0으로 초기화
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
          // 날짜 컬럼마다 0으로 초기화
          daysSorted.forEach((day) => {
            row[day] = 0;
          });
          grouping[key] = row;
        }

        // 이미 존재하는 그룹이면 해당 날짜에 수량 누적 및 총량/총합계약단가 업데이트
        const parts = d.납품일자.split('-');
        const day = parts[2]; // 예: '04'
        grouping[key][day] += d.수량;
        grouping[key].총량 += d.수량;
        grouping[key].총합계약단가 = grouping[key].총량 * d.계약단가;
      });

      // 그룹핑 결과를 배열로 변환하여 상태에 저장
      setRows(Object.values(grouping));
    };

    fetchData();
  }, [month]);

  // 'Excel 다운' 버튼 클릭 시 호출
  const handleDownload = () => {
    // 1) 헤더 배열 생성
    const headers = [
      '연월',
      '발주처',
      '낙찰기업',
      'no',
      '식품명',
      '규격',
      '속성정보',
      ...dateCols,
      '총량',
      '계약단가',
      '총합계약단가',
    ];

    // 2) RowData를 헤더 순서대로 2차원 배열로 변환
    const data: (string | number)[][] = rows.map((r) => {
      const rowArr: (string | number)[] = [];
      headers.forEach((col) => {
        rowArr.push(r[col] !== undefined ? (r[col] as string | number) : '');
      });
      return rowArr;
    });

    // 3) CSV 문자열 생성
    const csvContent = [headers, ...data]
      .map((row) =>
        row
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',')   // 1) 필드마다 쉼표로 구분
      )
      .join('\n');    // 2) 각 행(row)을 '\n'으로 구분 — (여기서 작은따옴표로 문자열을 정확히 닫아 주어야 빌드 오류가 사라집니다)

    // 4) Blob 생성 후 파일-세이버로 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${month}-발주서.csv`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>발주서 조회 및 엑셀( CSV ) 다운로드</h2>

      {/* 연월 선택 드롭다운 + Excel 다운로드 버튼 */}
      <div style={{ marginBottom: 20 }}>
        <label>
          연월:&nbsp;
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
        &nbsp;&nbsp;
        <button onClick={handleDownload}>Excel 다운</button>
      </div>

      {/* Firestore에서 가져온 데이터를 표 형태로 화면에 출력 */}
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
