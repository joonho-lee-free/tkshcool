// ✅ 파일명: pages/index.tsx
// ✅ 목적: 발주현황 달력 + 연월 선택 + 낙찰업체 필터 + 엑셀 다운로드 + 색상/표기 규칙 반영 + 발주처 누락 대응

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
import * as XLSX from "xlsx";

const getKg = (수량: number, 규격: string) => {
  const match = 규격.match(/(\d+(\.\d+)?)kg/);
  const unit = match ? parseFloat(match[1]) : 1;
  return `${(수량 * unit).toFixed(1)}kg`;
};

const getColorClass = (vendor: string) => {
  if (vendor.includes("에스에이치유통")) return "text-blue-600";
  if (vendor.includes("이가에프엔비")) return "text-black";
  return "text-gray-700";
};

export default function Home() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [filterVendor, setFilterVendor] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter((doc) =>
        doc.id.startsWith(selectedYM.replace("-", "").slice(2))
      );

      const temp: Record<string, any[]> = {};
      const vendorSet = new Set<string>();

      filtered.forEach((doc) => {
        const data = doc.data();
        vendorSet.add(data.낙찰기업);
        data.품목.forEach((item: any) => {
          Object.entries(item.납품).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: item.발주처,
              식품명: item.식품명,
              규격: item.규격,
              낙찰기업: data.낙찰기업,
              수량: delivery.수량,
              날짜: date,
            });
          });
        });
      });

      setCalendarData(temp);
      setVendors(["전체", ...Array.from(vendorSet)]);
    };
    fetchData();
  }, [selectedYM]);

  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  const handleExcelDownload = () => {
    const rows: any[] = [];
    Object.entries(calendarData).forEach(([date, items]) => {
      items.forEach((i) => {
        if (filterVendor !== "전체" && i.낙찰기업 !== filterVendor) return;
        rows.push({
          날짜: date,
          낙찰기업: i.낙찰기업,
          발주처: i.발주처 || "학교명없음",
          품목: i.식품명,
          수량: i.수량,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "발주현황");
    XLSX.writeFile(wb, `${selectedYM}_발주현황.xlsx`);
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <div>
          <select
            value={selectedYM}
            onChange={(e) => setSelectedYM(e.target.value)}
            className="border p-2 rounded"
          >
            {[
              "2025-04",
              "2025-05",
              "2025-06",
              "2025-07",
              "2025-08",
              "2025-09",
              "2025-10",
              "2025-11",
              "2025-12",
            ].map((ym) => (
              <option key={ym} value={ym}>
                {ym}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="border p-2 rounded"
          >
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExcelDownload}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow"
        >
          Excel 다운로드
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>

      <div className="grid grid-cols-5 gap-2 text-xs mb-2 text-center font-semibold">
        {["월", "화", "수", "목", "금"].map((day) => (
          <div key={day} className="bg-gray-100 py-1 rounded">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 text-xs">
        {leadingEmpty.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {allDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const items = (calendarData[dateStr] || []).filter(
            (i) => filterVendor === "전체" || i.낙찰기업 === filterVendor
          );

          const grouped: Record<string, { 낙찰기업: string; lines: string[] }> = {};
          items.forEach((i) => {
            const school = i.발주처 || "학교명없음";
            const kg = getKg(i.수량, i.규격);
            const line = `${i.식품명} (${kg})`;
            if (!grouped[school])
              grouped[school] = { 낙찰기업: i.낙찰기업, lines: [] };
            grouped[school].lines.push(line);
          });

          const content = Object.entries(grouped).map(([school, obj]) => (
            <div key={school} className={`mb-1 ${getColorClass(obj.낙찰기업)}`}>
              <span className="font-semibold">{school}</span>
              <ul className="pl-2">
                {obj.lines.map((line, idx) => (
                  <li key={idx}>- {line}</li>
                ))}
              </ul>
            </div>
          ));

          return (
            <div
              key={dateStr}
              className="border border-gray-300 rounded p-2 min-h-[10rem] shadow-sm whitespace-pre-wrap"
            >
              <div className="font-bold mb-1">{format(day, "d")}</div>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
