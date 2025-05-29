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

type ScheduleObj = {
  품목: string;
  납품: Record<string, { 수량: number; 단가: number; 금액: number }>;
};

type DocData = {
  발주처: string;
  사업자등록번호: string;
  사업장주소: string;
  대표전화번호: string;
  낙찰기업: string;
  품목: ScheduleObj[];
};

type VendorData = {
  상호명: string;
  대표자: string;
  대표전화번호: string;
  사업자번호?: string;
  사업자등록번호?: string;
  주소: string;
};

const getColorClass = (vendor: string) =>
  vendor.includes("에스에이치유통") ? "text-blue-600" : "text-gray-700";

export default function Print() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);

  const [calendarData, setCalendarData] = useState<Record<string, { 발주처: string; 낙찰기업: string }[]>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState("");

  useEffect(() => {
    getDocs(collection(db, "school")).then((snap) => {
      const temp: Record<string, { 발주처: string; 낙찰기업: string }[]> = {};
      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(selectedYM.replace("-", "").slice(2))) return;
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

  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalDate(date);
    // 학교 문서 로드
    const ymCode = selectedYM.replace("-", "").slice(2);
    const schoolDocId = `${ymCode}_${school}`;
    const schoolSnap = await getDoc(doc(db, "school", schoolDocId));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    // 벤더 문서 로드
    const vendorSnap = await getDoc(doc(db, "school", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const doPrint = () => window.print();

  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", now));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
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
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        {/* 월 셀렉트만 */}
        <select
          value={selectedYM}
          onChange={(e) => setSelectedYM(e.target.value)}
          className="border p-2 rounded"
        >
          {months.map((m) => {
            const ym = `${year}-${m}`;
            return (
              <option key={ym} value={ym}>
                {ym}
              </option>
            );
          })}
        </select>
      </div>

      {modalOpen && modalDoc && modalVendorDoc && (
        <div className="p-4 page-break max-w-screen-md mx-auto">
          <h2 className="text-center text-xl font-bold mb-4">
            거래명세표 ({modalDate})
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p><strong>공급받는자:</strong> {modalDoc.발주처}</p>
              <p><strong>사업자등록번호:</strong> {modalDoc.사업자등록번호}</p>
              <p><strong>주소:</strong> {modalDoc.사업장주소}</p>
              <p><strong>대표전화:</strong> {modalDoc.대표전화번호}</p>
            </div>
            <div>
              <p><strong>공급하는자:</strong> {modalVendorDoc.상호명}</p>
              <p><strong>대표자:</strong> {modalVendorDoc.대표자}</p>
              <p><strong>사업자등록번호:</strong> {modalVendorDoc.사업자번호 || modalVendorDoc.사업자등록번호}</p>
              <p><strong>대표전화:</strong> {modalVendorDoc.대표전화번호}</p>
              <p><strong>주소:</strong> {modalVendorDoc.주소}</p>
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
                const items = modalDoc.품목.filter((it) => it.납품[modalDate]);
                const unique = Array.from(
                  new Map(items.map((it) => [it.품목, it])).values()
                );
                unique.forEach((it) => {
                  it.납품[modalDate].금액 = it.납품[modalDate].수량 * it.납품[modalDate].단가;
                });
                return unique.map((it, idx) => {
                  const del = it.납품[modalDate];
                  return (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{it.품목}</td>
                      <td className="border px-2 py-1 text-right">{del.수량}</td>
                      <td className="border px-2 py-1 text-right">{del.단가}</td>
                      <td className="border px-2 py-1 text-right">{del.금액}</td>
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
                    .filter((it) => it.납품[modalDate])
                    .reduce(
                      (sum, it) => sum + it.납품[modalDate].수량 * it.납품[modalDate].단가,
                      0
                    )}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-center no-print">
            <button
              onClick={doPrint}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              인쇄하기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
