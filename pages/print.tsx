import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parse,
} from "date-fns";

type ScheduleObj = {
  발주처: string;
  낙찰기업: string;
  날짜: string;
  품목: string;
  수량: number;
};

const getKg = (수량: number, 규격: string) => {
  const match = 규격?.match(/(\d+(\.\d+)?)kg/);
  const unit = match ? parseFloat(match[1]) : 1;
  return `${(수량 * unit).toFixed(1)}kg`;
};

// 에스에이치유통 낙찰받은 학교만 파란색 강조
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

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const temp: Record<string, ScheduleObj[]> = {};
      const vset = new Set<string>();
      const sset = new Set<string>();

      snapshot.docs.forEach((doc) => {
        if (!doc.id.startsWith(selectedYM.replace("-", "").slice(2))) return;
        const data = doc.data();
        const schoolName = data.발주처;
        const vendorName = data.낙찰기업;
        vset.add(vendorName);
        sset.add(schoolName);
        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: schoolName,
              낙찰기업: vendorName,
              날짜: date,
              품목: item.식품명,
              수량: delivery.수량,
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

  const year = selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", now));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        {/* 연월 선택: 2025-01 ~ 2025-12 */}
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
        {/* 벤더 필터 */}
        <select
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
          className="border p-2 rounded"
        >
          {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {/* 학교 필터 */}
        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="border p-2 rounded"
        >
          {schools.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="bg-blue-500 text-white px-4 py-2 rounded shadow">
          Excel 다운로드
        </button>
      </div>

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
          const items = (calendarData[dateStr] || []).filter(
            (i) => (filterVendor === "전체" || i.낙찰기업 === filterVendor)
                   && (filterSchool === "전체" || i.발주처 === filterSchool)
          );
          const grouped: Record<string, { 낙찰기업: string; lines: string[] }> = {};
          items.forEach((i) => {
            if (!grouped[i.발주처]) grouped[i.발주처] = { 낙찰기업: i.낙찰기업, lines: [] };
            grouped[i.발주처].lines.push(`${i.품목} (${getKg(i.수량, "kg")})`);
          });
          return (
            <div key={dateStr} className="border border-gray-300 rounded p-2 min-h-[10rem] shadow-sm overflow-hidden">
              <div className="font-bold mb-1">{format(day, 'd')}</div>
              {Object.entries(grouped).map(([school, obj], idx) => (
                <div key={idx} className={`mb-1 cursor-pointer ${getColorClass(obj.낙찰기업)}`}> 
                  <span className="font-semibold underline">{school}</span>
                  <ul className="pl-2 list-disc list-inside">
                    {obj.lines.map((line, li) => <li key={li}>{line}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
