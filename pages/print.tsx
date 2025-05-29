import { useEffect, useState } from "react";
import Head from "next/head";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parse,
} from "date-fns";

type ScheduleEntry = { 발주처: string; 낙찰기업: string };
type ScheduleObj = { 품목: string; 납품: Record<string, { 수량: number; 단가: number; 금액: number }> };
type DocData = { 발주처: string; 사업자등록번호: string; 사업장주소: string; 대표전화번호: string; 낙찰기업: string; 품목: ScheduleObj[] };
type VendorData = { 상호명: string; 대표자: string; 대표전화번호: string; 사업자번호?: string; 사업자등록번호?: string; 주소: string };

export default function Print() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [calendarData, setCalendarData] = useState<Record<string, ScheduleEntry[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState<string>("");

  // 로드 일정 데이터
  useEffect(() => {
    getDocs(collection(db, "school")).then((snap) => {
      const temp: Record<string, ScheduleEntry[]> = {};
      const ymCode = selectedYM.replace("-", "").slice(2);
      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(ymCode)) return;
        const data = docSnap.data() as any;
        const school = data.발주처;
        const vendor = data.낙찰기업 || data.납찰기업;
        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            temp[date] = temp[date] || [];
            temp[date].push({ 발주처: school, 낙찰기업: vendor });
          });
        });
      });
      setCalendarData(temp);
    });
  }, [selectedYM]);

  // 클릭 시 모달 로드
  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    // 학교 문서
    const schoolSnap = await getDoc(doc(db, "school", `${ymCode}_${school}`));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    // 벤더 문서
    const vendorSnap = await getDoc(doc(db, "school", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const doPrint = () => window.print();

  // 달력 계산
  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", now));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(d => getDay(d) >= 1 && getDay(d) <= 5);
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  return (
    <>
      <Head>
        <style>{`
          @page { size: A4; margin: 20mm; }
          @media print {
            html, body { margin:0; padding:0; }
            .no-print { display: none !important; }
            .page-break { page-break-inside: avoid; }
          }
        `}</style>
      </Head>

      {/* 상단 드롭다운 */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <select
          value={selectedYM}
          onChange={e => setSelectedYM(e.target.value)}
          className="border p-2 rounded"
        >
          {months.map(m => {
            const ym = `${year}-${m}`;
            return <option key={ym} value={ym}>{ym}</option>;
          })}
        </select>
      </div>

      {/* 달력 표시 */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-5 gap-2 text-xs mb-2 text-center font-semibold">
          {['월','화','수','목','금'].map(d => <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>)}
        </div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {leadingEmpty.map((_,i) => <div key={i} />)}
          {allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const entries = calendarData[dateStr] || [];
            // 중복 제거
            const unique = Array.from(new Map(entries.map(e => [e.발주처, e])).values());
            return (
              <div key={dateStr} className="border border-gray-300 rounded p-2 min-h-[8rem] overflow-hidden">
                <div className="font-bold mb-1">{format(day,'d')}</div>
                {unique.map((e,idx) => (
                  <div
                    key={idx}
                    onClick={() => handleClick(e.발주처, e.낙찰기업, dateStr)}
                    className={e.낙찰기업.includes('에스에이치유통') ? 'text-blue-600 mb-1 cursor-pointer' : 'text-gray-700 mb-1 cursor-pointer'}
                  >
                    <span className="underline font-semibold">{e.발주처}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 모달: 거래명세표 출력 */}
      {modalOpen && modalDoc && modalVendorDoc && (
        <div className="p-4 page-break max-w-screen-md mx-auto">
          <h2 className="text-center text-xl font-bold mb-4">거래명세표 ({modalDate})</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <strong>공급받는자</strong>
              <p>{modalDoc.발주처}</p>
              <p>사업자등록번호: {modalDoc.사업자등록번호}</p>
              <p>주소: {modalDoc.사업장주소}</p>
              <p>대표전화: {modalDoc.대표전화번호}</p>
            </div>
            <div>
              <strong>공급하는자</strong>
              <p>{modalVendorDoc.상호명}</p>
              <p>대표자: {modalVendorDoc.대표자}</p>
              <p>사업자등록번호: {modalVendorDoc.사업자번호 || modalVendorDoc.사업자등록번호}</p>
              <p>대표전화: {modalVendorDoc.대표전화번호}</p>
              <p>주소: {modalVendorDoc.주소}</p>
            </div>
          </div>
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">품목</th>
                <th className="border px-2 py-1">수량</th>
                <th className="border px-2 py-1">단가</th>
                <th className="border px-2 py-1">공급가액</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const items = modalDoc.품목.filter(it => it.납품[modalDate]);
                const uniqueItems = Array.from(new Map(items.map(it => [it.품목, it])).values());
                uniqueItems.forEach(it => {
                  const d = it.납품[modalDate];
                  d.금액 = d.수량 * d.단가;
                });
                return uniqueItems.map((it, i) => {
                  const d = it.납품[modalDate];
                  return (
                    <tr key={i}>
                      <td className="border px-2 py-1">{it.품목}</td>
                      <td className="border px-2 py-1 text-right">{d.수량}</td>
                      <td className="border px-2 py-1 text-right">{d.단가}</td>
                      <td className="border px-2 py-1 text-right">{d.금액}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr>
                <td className="border px-2 py-1 text-right font-bold" colSpan={3}>합계</td>
                <td className="border px-2 py-1 text-right font-bold">
                  {modalDoc.품목
                    .filter(it => it.납품[modalDate])
                    .reduce((sum, it) => sum + it.납품[modalDate].수량 * it.납품[modalDate].단가, 0)
                  }
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-center no-print">
            <button onClick={doPrint} className="px-4 py-2 bg-blue-500 text-white rounded">
              인쇄하기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
