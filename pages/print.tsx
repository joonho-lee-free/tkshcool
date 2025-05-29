import { useEffect, useState } from "react";
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

const getKg = (수량: number, _규격: string) => `${수량}kg`;

type ScheduleObj = {
  발주처: string;
  낙찰기업: string;
  날짜: string;
  품목: string;
  수량: number;
  단가: number;
};

const getColorClass = (vendor: string) =>
  vendor.includes("에스에이치유통") ? "text-blue-600" : "text-gray-700";

export default function Print() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);

  const [calendarData, setCalendarData] = useState<Record<string, ScheduleObj[]>>({});
  const [filterVendor, setFilterVendor] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);
  const [filterSchool, setFilterSchool] = useState("전체");
  const [schools, setSchools] = useState<string[]>(["전체"]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<any>(null);
  const [modalDate, setModalDate] = useState<string>("");
  const [modalSchool, setModalSchool] = useState<string>("");
  const [modalVendor, setModalVendor] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "school"));
      const temp: Record<string, ScheduleObj[]> = {};
      const vset = new Set<string>();
      const sset = new Set<string>();

      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(selectedYM.replace("-", "").slice(2))) return;
        const data = docSnap.data();
        const schoolName = data.발주처;
        const vendorName = data.낙찰기업;
        vset.add(vendorName);
        sset.add(schoolName);
        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: schoolName,
              낙찰기업: vendorName,
              날짜: date,
              품목: item.식품명,
              수량: del.수량,
              단가: item.단가,
            });
          });
        });
      });

      setCalendarData(temp);
      setVendors(["전체", ...Array.from(vset)]);
      setSchools(["전체", ...Array.from(sset)]);
    };
    fetchData();
  }, [selectedYM]);

  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalSchool(school);
    setModalVendor(vendor);
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    const docId = `${ymCode}_${school}`;
    const docRef = doc(db, "school", docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setModalDoc(docSnap.data());
      setModalOpen(true);
    } else {
      alert("데이터 없음");
    }
  };

  const doPrint = () => window.print();

  const year = selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", now));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  return (
    <>
      <div className="p-4 max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <select value={selectedYM} onChange={(e) => setSelectedYM(e.target.value)} className="border p-2 rounded">
            {months.map((m) => {
              const ym = `${year}-${m}`;
              return <option key={ym} value={ym}>{ym}</option>;
            })}
          </select>
          <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} className="border p-2 rounded">
            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="border p-2 rounded">
            {schools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={doPrint} className="bg-blue-500 text-white px-4 py-2 rounded shadow">
            Excel/PDF 프린트
          </button>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-5 gap-2 text-xs mb-2 text-center font-semibold">
          {['월','화','수','목','금'].map((d) => <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>)}
        </div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {leadingEmpty.map((_, i) => <div key={i} />)}
          {allDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const items = (calendarData[dateStr] || []).filter(
              (i) => (filterVendor === "전체" || i.낙찰기업 === filterVendor) &&
                     (filterSchool === "전체" || i.발주처 === filterSchool)
            );
            const grouped: Record<string, { 낙찰기업: string; lines: ScheduleObj[] }> = {};
            items.forEach((i) => {
              if (!grouped[i.발주처]) grouped[i.발주처] = { 낙찰기업: i.낙찰기업, lines: [] };
              grouped[i.발주처].lines.push(i);
            });
            return (
              <div key={dateStr} className="border border-gray-300 rounded p-2 min-h-[10rem] shadow-sm overflow-hidden">
                <div className="font-bold mb-1">{format(day, 'd')}</div>
                {Object.entries(grouped).map(([school, obj], idx) => (
                  <div key={idx} onClick={() => handleClick(school, obj.낙찰기업, dateStr)} className={`mb-1 cursor-pointer ${getColorClass(obj.낙찰기업)}`}> 
                    <span className="font-semibold underline">{school}</span>
                    <ul className="pl-2 list-disc list-inside">
                      {Array.from(new Set(obj.lines.map(l => `${l.품목} (${getKg(l.수량, "kg")})`))).map((text, li) => (
                        <li key={li}>{text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {modalOpen && modalDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-screen-md p-6 rounded shadow-lg overflow-auto" style={{ maxHeight: '90vh' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">거래명세표 ({modalDate})</h3>
              <button onClick={() => setModalOpen(false)} className="text-red-500">닫기</button>
            </div>
            <div className="mb-4">
              <p><strong>발주처:</strong> {modalDoc.발주처}</p>
              <p><strong>사업자등록번호:</strong> {modalDoc.사업자등록번호}</p>
              <p><strong>주소:</strong> {modalDoc.사업장주소}</p>
              <p><strong>대표전화:</strong> {modalDoc.대표전화번호}</p>
              <p><strong>낙찰기업:</strong> {modalDoc.낙찰기업}</p>
            </div>
            <table className="w-full table-auto border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border p-1">품목</th>
                  <th className="border p-1">수량</th>
                  <th className="border p-1">단가</th>
                  <th className="border p-1">공급가액</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Map(
                  modalDoc.품목
                    .filter((item: any) => item.납품 && item.납품[modalDate])
                    .map((item: any) => [item.식품명, item])
                ).values()).map((item: any, i: number) => {
                  const qty = item.납품[modalDate].수량;
                  const price = item.단가;
                  return (
                    <tr key={i}>
                      <td className="border p-1">{item.식품명}</td>
                      <td className="border p-1 text-right">{qty}</td>
                      <td className="border p-1 text-right">{price}</td>
                      <td className="border p-1 text-right">{qty * price}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <button onClick={doPrint} className="bg-blue-500 text-white px-4 py-2 rounded">인쇄하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
