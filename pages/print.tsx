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

// Utility to render kilogram string
const getKg = (수량: number) => `${수량}kg`;

// Schedule item with full detail for calendar
type ScheduleObj = {
  발주처: string;
  낙찰기업: string;
  날짜: string;
  품목: string;
  수량: number;
  단가: number;
};

// Firestore document data for school
type DocData = {
  발주처: string;
  사업자등록번호: string;
  사업장주소: string;
  대표전화번호: string;
  낙찰기업: string;
  품목: Array<{
    식품명: string;
    납품: Record<string, { 수량: number; 단가: number }>;
  }>;
};

// Firestore document data for vendor
type VendorData = {
  상호명: string;
  대표자: string;
  대표전화번호: string;
  사업자번호?: string;
  사업자등록번호?: string;
  주소: string;
};

// 색상 결정
const getColorClass = (vendor: string) =>
  vendor.includes("에스에이치유통") ? "text-blue-600" : "text-gray-700";

export default function Print() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);

  // dateStr -> calendar items
  const [calendarData, setCalendarData] = useState<Record<string, ScheduleObj[]>>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState<string>("");

  // Load calendar data when month changes
  useEffect(() => {
    const ymCode = selectedYM.replace("-", "").slice(2);
    getDocs(collection(db, "school")).then((snap) => {
      const temp: Record<string, ScheduleObj[]> = {};
      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(ymCode)) return;
        const data = docSnap.data() as any;
        const school = data.발주처;
        const vendor = data.낙찰기업 || data.납찰기업;
        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: school,
              낙찰기업: vendor,
              날짜: date,
              품목: item.식품명,
              수량: del.수량,
              단가: del.단가,
            });
          });
        });
      });
      setCalendarData(temp);
    });
  }, [selectedYM]);

  // Handle click on calendar cell
  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    // Load school document
    const schoolSnap = await getDoc(doc(db, "school", `${ymCode}_${school}`));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    // Load vendor document
    const vendorSnap = await getDoc(doc(db, "school", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const doPrint = () => window.print();

  // Calendar calculation
  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", now));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter((d) => getDay(d) >= 1 && getDay(d) <= 5);
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

      {/* Month selector */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <select
          value={selectedYM}
          onChange={(e) => setSelectedYM(e.target.value)}
          className="border p-2 rounded"
        >
          {months.map((m) => {
            const ym = `${year}-${m}`;
            return <option key={ym} value={ym}>{ym}</option>;
          })}
        </select>
      </div>

      {/* Calendar UI */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-5 gap-2 text-xs mb-2 text-center font-semibold">
          {['월','화','수','목','금'].map((d) => (
            <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {leadingEmpty.map((_, i) => <div key={i} />)}
          {allDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const items = calendarData[dateStr] || [];
            // Group by school
            const grouped: Record<string, { 낙찰기업: string; lines: ScheduleObj[] }> = {};
            items.forEach((it) => {
              if (!grouped[it.발주처]) grouped[it.발주처] = { 낙찰기업: it.낙찰기업, lines: [] };
              grouped[it.발주처].lines.push(it);
            });
            return (
              <div key={dateStr} className="border border-gray-300 rounded p-2 min-h-[10rem] shadow-sm overflow-y-auto">
                <div className="font-bold mb-1">{format(day, 'd')}</div>
                {Object.entries(grouped).map(([school, obj], idx) => (
                  <div
                    key={idx}
                    onClick={() => handleClick(school, obj.낙찰기업, dateStr)}
                    className={`mb-1 cursor-pointer ${getColorClass(obj.낙찰기업)}`}
                  >
                    <span className="font-semibold underline">{school}</span>
                    <ul className="pl-2 list-disc list-inside">
                      {obj.lines.map((line, li) => (
                        <li key={li}>{`${line.품목} (${getKg(line.수량)})`}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for invoice */}
      {modalOpen && modalDoc && modalVendorDoc && (
        <div className="p-4 page-break max-w-screen-md mx-auto">
          <h2 className="text-center text-xl font-bold mb-4">거래명세표 ({modalDate})</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <strong>공급받는자:</strong> {modalDoc.발주처}
              <p>사업자등록번호: {modalDoc.사업자등록번호}</p>
              <p>주소: {modalDoc.사업장주소}</p>
              <p>대표전화: {modalDoc.대표전화번호}</p>
            </div>
            <div>
              <strong>공급하는자:</strong> {modalVendorDoc.상호명}
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
                const unique = Array.from(new Map(items.map(it => [it.식품명, it])).values());
                unique.forEach((it) => {
                  const d = it.납품[modalDate];
                  (d as any).금액 = d.수량 * d.단가;
                });
                return unique.map((it, i) => {
                  const d = it.납품[modalDate];
                  return (
                    <tr key={i}>
                      <td className="border px-2 py-1">{it.식품명}</td>
                      <td className="border px-2 py-1 text-right">{d.수량}</td>
                      <td className="border px-2 py-1 text-right">{d.단가}</td>
                      <td className="border px-2 py-1 text-right">{(d as any).금액}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr>
                <td className="border px-2 py-1 text-right font-bold" colSpan={3}>합계</td>
                <td className="border px-2 py-1 text-right font-bold">
                  {modalDoc.품목.filter(it => it.납품[modalDate]).reduce((sum, it) => sum + it.납품[modalDate].수량 * it.납품[modalDate].단가, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-center no-print">
            <button onClick={doPrint} className="px-4 py-2 bg-blue-500 text-white rounded">인쇄하기</button>
          </div>
        </div>
      )}
    </>
  );
}
