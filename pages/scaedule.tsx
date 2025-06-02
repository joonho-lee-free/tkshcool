import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RawRow {
  id: string;
  발주처: string;
  낙찰기업: string;
  NO: string;
  식품명: string;
  규격: string;
  속성정보: string;
  날짜: string;
  수량: number;
  계약단가: number;
}

interface PivotRow {
  id: string;
  발주처: string;
  낙찰기업: string;
  NO: string;
  식품명: string;
  규격: string;
  속성정보: string;
  // 날짜별 필드는 useMemo 안에서 동적으로 붙임
  총수량: number;
  계약단가: number;
  총액: number;
  [key: string]: string | number; // 날짜별 키를 동적으로 추가하기 위해
}

export default function Schedule() {
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateKeys, setDateKeys] = useState<string[]>([]);

  useEffect(() => {
    const fetchAllKukjaego = async () => {
      setLoading(true);
      try {
        // 'school' 컬렉션에서 '_국제고'가 포함된 문서만 가져오기
        const excelCol = collection(db, 'school');
        const snapshot = await getDocs(excelCol);
        const intlDocs = snapshot.docs.filter((d) => d.id.includes('_국제고'));

        const tempRows: RawRow[] = [];
        const datesSet = new Set<string>();

        for (const docSnap of intlDocs) {
          const data = docSnap.data();
          const deliveries = data.납품 || []; // 납품 배열

          deliveries.forEach((item: any) => {
            // item.납품 객체의 키가 날짜
            Object.keys(item.납품 || {}).forEach((date) => {
              const deliveryData = item.납품[date];
              datesSet.add(date);

              tempRows.push({
                id: docSnap.id,
                발주처: data.발주처,
                낙찰기업: data.낙찰기업,
                NO: String(item.no),
                식품명: deliveryData.식품명,
                규격: item.규격,
                속성정보: deliveryData.속성정보,
                날짜: date,
                수량: Number(deliveryData.수량 || 0),
                계약단가: Number(deliveryData.계약단가 || 0),
              });
            });
          });
        }

        // 날짜를 오름차순(숫자 비교 포함) 정렬
        const sortedDates = Array.from(datesSet).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
        setDateKeys(sortedDates);
        setRawRows(tempRows);
      } catch (error) {
        console.error('국제고 데이터 가져오기 실패:', error);
        setRawRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllKukjaego();
  }, []);

  /**
   * rawRows를 ‘id+NO’ 조합 별로 묶어서,
   * 각 날짜 컬럼에 수량을 할당한 형태로 변환
   */
  const pivotedRows: PivotRow[] = useMemo(() => {
    type Key = string; // id + "_" + NO를 한 조합으로 사용

    // 1) 그룹핑을 위한 Map 생성
    const groupMap = new Map<Key, PivotRow>();

    rawRows.forEach((r) => {
      // 고유 키: 문서ID + "_" + NO
      const key: Key = `${r.id}_${r.NO}`;

      // 그룹이 없으면 새로 만들고, 날짜별 필드는 0으로 초기화
      if (!groupMap.has(key)) {
        const base: PivotRow = {
          id: r.id,
          발주처: r.발주처,
          낙찰기업: r.낙찰기업,
          NO: r.NO,
          식품명: r.식품명,
          규격: r.규격,
          속성정보: r.속성정보,
          총수량: 0,
          계약단가: r.계약단가,
          총액: 0,
        };
        // dateKeys 길이만큼 날짜별 컬럼을 0으로 미리 세팅
        dateKeys.forEach((d) => {
          base[d] = 0;
        });
        groupMap.set(key, base);
      }

      // 이미 만들어둔 그룹 객체 가져오기
      const pivotObj = groupMap.get(key)!;

      // 해당 날짜 컬럼에 수량을 합산
      const prevQty: number = Number(pivotObj[r.날짜] || 0);
      pivotObj[r.날짜] = prevQty + r.수량;

      // 총수량 업데이트
      pivotObj.총수량 += r.수량;

      // 계약단가는 동일한 NO 내에서는 동일하다고 가정
      pivotObj.계약단가 = r.계약단가;

      // 총액 = 계약단가 * 총수량 (추후 값이 갱신될 때마다 덮어쓰기)
      pivotObj.총액 = pivotObj.총수량 * pivotObj.계약단가;
    });

    // Map의 값만 배열로 변환
    return Array.from(groupMap.values());
  }, [rawRows, dateKeys]);

  // CSV 다운로드 함수 (피벗된 형태를 CSV로)
  const downloadCSV = () => {
    // CSV 헤더: 고정 컬럼 + 날짜별 컬럼 + 총수량, 계약단가, 총액
    const headers = [
      '문서ID',
      '발주처',
      '낙찰기업',
      'NO',
      '식품명',
      '규격',
      '속성정보',
      ...dateKeys,
      '총수량',
      '계약단가',
      '총액',
    ];

    // 각 PivotRow를 순회하며 CSV row 배열 생성
    const rowsData: (string | number)[][] = pivotedRows.map((pr) => {
      const line: (string | number)[] = [
        pr.id,
        pr.발주처,
        pr.낙찰기업,
        pr.NO,
        pr.식품명,
        pr.규격,
        pr.속성정보,
        // 날짜별 컬럼 값을 순서대로 넣기
        ...dateKeys.map((d) => pr[d] as number),
        pr.총수량,
        pr.계약단가,
        pr.총액,
      ];
      return line;
    });

    // CSV 문자열 생성
    const csvContent = [headers, ...rowsData]
      .map((row) =>
        row
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `국제고_피벗_납품현황.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">월별·발주처별 피벗 테이블</h1>

      <button
        onClick={downloadCSV}
        disabled={pivotedRows.length === 0}
        className={`mb-4 px-3 py-1 rounded text-white text-sm ${
          pivotedRows.length > 0
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        엑셀 다운로드
      </button>

      {loading ? (
        <p className="text-sm">로딩 중...</p>
      ) : pivotedRows.length === 0 ? (
        <p className="text-sm">데이터가 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-auto w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-100">
                {/* 고정 헤더 */}
                <th className="border border-gray-300 px-2 py-1">문서ID</th>
                <th className="border border-gray-300 px-2 py-1">발주처</th>
                <th className="border border-gray-300 px-2 py-1">낙찰기업</th>
                <th className="border border-gray-300 px-2 py-1">NO</th>
                <th className="border border-gray-300 px-2 py-1">식품명</th>
                <th className="border border-gray-300 px-2 py-1">규격</th>
                <th className="border border-gray-300 px-2 py-1">속성정보</th>

                {/* 동적 날짜 헤더 */}
                {dateKeys.map((date) => (
                  <th
                    key={date}
                    className="border border-gray-300 px-2 py-1"
                  >
                    {date}
                  </th>
                ))}

                {/* 요약 헤더 */}
                <th className="border border-gray-300 px-2 py-1">총수량</th>
                <th className="border border-gray-300 px-2 py-1">계약단가</th>
                <th className="border border-gray-300 px-2 py-1">총액</th>
              </tr>
            </thead>

            <tbody>
              {pivotedRows.map((pr, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {/* 고정 값 */}
                  <td className="border border-gray-300 px-2 py-1">{pr.id}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {pr.발주처}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {pr.낙찰기업}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{pr.NO}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {pr.식품명}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {pr.규격}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {pr.속성정보}
                  </td>

                  {/* 날짜별 값 */}
                  {dateKeys.map((date) => (
                    <td
                      key={date}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      {pr[date] || 0}
                    </td>
                  ))}

                  {/* 요약 값 */}
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {pr.총수량}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {pr.계약단가}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {pr.총액}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
