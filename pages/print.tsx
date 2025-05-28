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
import * as XLSX from "xlsx";

type ScheduleObj = {
  낙찰기업: string;
  발주처: string;
  날짜: string;
  품목: string;
  수량: string;
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
  const [schedule, setSchedule] = useState<ScheduleObj[]>([]);
  const [filterVendor, setFilterVendor] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);
  const [filterSchool, setFilterSchool] = useState("전체");
  const [schools, setSchools] = useState<string[]>(["전체"]);

  useEffect(() => {
    const fetchSchedule = async () => {
      const col = collection(db, "schedules");
      const q = collection(db, "schedules");
      const snapshot = await getDocs(col);
      const data = snapshot.docs.map((doc) => doc.data() as ScheduleObj);
      setSchedule(data);

      const vs = new Set(data.map((d) => d.낙찰기업));
      const ss = new Set(data.map((d) => d.발주처));
      setVendors(["전체", ...Array.from(vs)]);
      setSchools(["전체", ...Array.from(ss)]);
    };
    fetchSchedule();
  }, []);

  const year = "2025";
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  const handleClick = (school: string, vendor: string, date: string) => {
    console.log(school, vendor, date);
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        {/* 연월 선택: 2025년 1월~12월, 디폴트 현재 월 */}
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

        {/* 벤더 필터 */}
        <select
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
          className="border p-2 rounded"
        >
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        {/* 학교 필터 */}
        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="border p-2 rounded"
        >
          {schools.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
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
        {leadingEmpty.map((_, i) => (
          <div key={i} />
        ))}
        {allDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const items = schedule.filter(
            (s) =>
              s.날짜 === dateStr &&
              (filterVendor === '전체' || s.낙찰기업 === filterVendor) &&
              (filterSchool === '전체' || s.발주처 === filterSchool)
          );
          const grouped: Record<string, { 낙찰기업: string; lines: string[] }> = {};
          items.forEach((i) => {
            if (!grouped[i.발주처]) grouped[i.발주처] = { 낙찰기업: i.낙찰기업, lines: [] };
            grouped[i.발주처].lines.push(`${i.품목} (${i.수량})`);
          });
          return (
            <div
              key={dateStr}
              className="border border-gray-300 rounded p-2 min-h-[10rem] shadow-sm overflow-hidden"
            >
              <div className="font-bold mb-1">{format(day, 'd')}</div>
              {Object.entries(grouped).map(([school, obj], idx) => (
                <div
                  key={idx}
                  className={`mb-1 cursor-pointer ${getColorClass(obj.낙찰기업)}`}
                  onClick={() => handleClick(school, obj.낙찰기업, dateStr)}
                >
                  <span className="font-semibold underline">{school}</span>
                  <ul className="pl-2 list-disc list-inside">
                    {obj.lines.map((line, li) => (
                      <li key={li}>{line}</li>
                    ))}
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
