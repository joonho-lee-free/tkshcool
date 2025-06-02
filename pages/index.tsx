import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
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

// Priority list for vendors
const vendorPriority = ["이가에프엔비", "에스에이치유통"];

// Calendar schedule item
type ScheduleObj = {
  발주처: string;
  낙찰기업: string;
  날짜: string;
  품목: string;
  수량: number;
  계약단가: number;
  공급가액: number;
};

// Firestore data for school document
type DocData = {
  연월: string;
  발주처: string;
  사업자등록번호: string;
  사업장주소: string;
  대표전화번호: string;
  낙찰기업: string;
  품목: Array<{
    식품명: string;
    납품: Record<string, { 수량: number; 계약단가: number; 공급가액: number }>;
  }>;
};

// Firestore data for vendor document
type VendorData = {
  상호명: string;
  대표자: string;
  대표전화번호: string;
  사업자번호?: string;
  사업자등록번호?: string;
  주소: string;
};

// Vendor color based on name
const getColorClass = (vendor: string) =>
  vendor.includes("에스에이치유통") ? "text-blue-600" : "text-gray-700";

export default function Index() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [selectedVendor, setSelectedVendor] = useState<string>("전체");

  // Calendar data: date → list of schedule items
  const [calendarData, setCalendarData] = useState<Record<string, ScheduleObj[]>>({});
  const [vendors, setVendors] = useState<string[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState<string>("");

  // Load calendar and vendor dropdown data whenever 연월 changes
  useEffect(() => {
    const ymCode = selectedYM.replace("-", "").slice(2);
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "school"));
      const temp: Record<string, ScheduleObj[]> = {};
      const vendorSet = new Set<string>();

      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(ymCode)) return;
        const data = docSnap.data() as any;
        const school = data.발주처;
        const vendor = data.낙찰기업 || data.납찰기업;
        vendorSet.add(vendor);

        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: school,
              낙찰기업: vendor,
              날짜: date,
              품목: item.식품명,
              수량: del.수량 || 0,
              계약단가: del.계약단가 || 0,
              공급가액: del.공급가액 || 0,
            });
          });
        });
      });

      setCalendarData(temp);
      // Sort vendors with priority then alphabetically
      const allVendors = Array.from(vendorSet);
      allVendors.sort((a, b) => {
        const ia = vendorPriority.indexOf(a);
        const ib = vendorPriority.indexOf(b);
        if (ia !== -1 || ib !== -1) {
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        }
        return a.localeCompare(b);
      });
      setVendors(["전체", ...allVendors]);
    };
    fetchData();
  }, [selectedYM]);

  // Handle click on a school in calendar → open modal
  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    const schoolSnap = await getDoc(doc(db, "school", `${ymCode}_${school}`));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    const vendorSnap = await getDoc(doc(db, "school", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const doPrint = () => window.print();

  // Calendar days calculation with full week (Sunday-Saturday)
  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const firstOfMonth = parse(`${selectedYM}-01`, "yyyy-MM-dd", now);
  const start = startOfMonth(firstOfMonth);
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const dow = getDay(firstOfMonth); // 0=Sun,1=Mon...
  const leadingEmpty = Array(dow).fill(null);

  // Filter items by selectedVendor if not "전체"
  const getItemsForDate = (dateStr: string) => {
    let items = calendarData[dateStr] || [];
    if (selectedVendor !== '전체') items = items.filter(it => it.낙찰기업 === selectedVendor);
    return items;
  };

  return (
    <>
      <Head>
        <style>{`
          @page { size: A4; margin: 20mm; }
          @media print {
            html, body { margin:0; padding:0; }
            .no-print { display: none !important; }
            .page-break { page-break-inside: avoid; }
            .modal-overlay { position: static !important; background: none !important; }
            .modal-container { margin-top: 0 !important; }
          }
        `}</style>
      </Head>

      {/* Controls: 연월, 발주처 드롭박스, 발주서보기, 인쇄하기 */}
      <div className="no-print p-4 max-w-screen-xl mx-auto flex gap-4">
        <select
          value={selectedYM}
          onChange={(e) => {
            setSelectedYM(e.target.value);
            setSelectedVendor('전체');
          }}
          className="border p-2 rounded"
        >
          {months.map((m) => (
            <option key={m} value={`${year}-${m}`}>{`${year}-${m}`}</option>
          ))}
        </select>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="border p-2 rounded"
        >
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <Link href={`/scaedule?month=${encodeURIComponent(selectedYM)}&vendor=${encodeURIComponent(selectedVendor)}`}>
          <button className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer">
            발주서 보기
          </button>
        </Link>
        <button
          onClick={doPrint}
          className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer"
        >
          인쇄하기
        </button>
      </div>

      {/* Calendar UI (Sun-Sat) */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-center font-semibold">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {leadingEmpty.map((_, idx) => <div key={idx} />)}
          {allDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const items = getItemsForDate(dateStr);
            items.sort((a, b) => {
              const ia = vendorPriority.indexOf(a.낙찰기업);
              const ib = vendorPriority.indexOf(b.낙찰기업);
              if (ia !== -1 || ib !== -1) {
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
              }
              return a.발주처.localeCompare(b.발주처);
            });
            const grouped: Record<string, ScheduleObj[]> = {};
            items.forEach(it => { (grouped[it.발주처] ||= []).push(it); });
            const orderedGroups = Object.entries(grouped);
            return (
              <div key={dateStr} className="border rounded p-2 min-h-[8rem] shadow-sm overflow-y-auto">
                <div className="font-bold mb-1">{format(day, 'd')}</div>
                {orderedGroups.map(([school, lines]) => {
                  const uniqueList = Array.from(new Set(lines.map(l => `${l.품목} (${getKg(l.수량)})`)));
                  return (
                    <div
                      key={school}
                      onClick={() => handleClick(school.trim(), lines[0].낙찰기업, dateStr)}
                      className={`mb-1 cursor-pointer ${getColorClass(lines[0].낙찰기업)}`}
                    >
                      <span className="font-semibold underline">{school.trim()}</span>
                      <ul className="pl-2 list-disc list-inside">
                        {uniqueList.map((text, i) => <li key={i}>{text}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Overlay */}
      {modalOpen && modalDoc && modalVendorDoc && (
        <div className="modal-overlay fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="modal-container bg-white w-full max-w-screen-md p-6 rounded shadow-lg relative page-break">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black no-print"
              onClick={() => setModalOpen(false)}
            >
              닫기
            </button>
            <h2 className="text-left text-xl font-bold mb-4">거래명세표 ({modalDate})</h2>
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
                  <th className="border px-2 py-1 text-left">품목</th>
                  <th className="border px-2 py-1 text-left">수량</th>
                  <th className="border px-2 py-1 text-left">계약단가</th>
                  <th className="border px-2 py-1 text-left">공급가액</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const items = modalDoc.품목.filter(it => it.납품[modalDate]);
                  const unique = Array.from(new Map(items.map(it => [it.식품명, it])).values());
                  return unique.map((it, idx) => {
                    const d = it.납품[modalDate];
                    return (
                      <tr key={idx}>
                        <td className="border px-2 py-1 text-left">{it.식품명}</td>
                        <td className="border px-2 py-1 text-left">{d.수량}</td>
                        <td className="border px-2 py-1 text-left">{d.계약단가}</td>
                        <td className="border px-2 py-1 text-left">{d.공급가액}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="border px-2 py-1 text-left font-bold">합계</td>
                  <td className="border px-2 py-1 text-left font-bold">
                    {modalDoc.품목
                      .filter(it => it.납품[modalDate])
                      .reduce((sum, it) => {
                        const d = it.납품[modalDate];
                        return sum + (d.공급가액 || 0);
                      }, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-start no-print">
              <button onClick={doPrint} className="px-4 py-2 bg-blue-500 text-white rounded">
                인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
