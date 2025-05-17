// ✅ 파일명: pages/index.tsx
// ✅ 목적: 발주현황 달력 + 연월 선택 + 낙찰업체 필터 + 엑셀 다운로드 포함

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

const getShortName = (full: string) => {
  const paren = full.indexOf("(");
  return paren >= 0 ? full.substring(0, paren) : full;
};

const getKg = (수량: number, 규격: string) => {
  const match = 규격.match(/(\\d+(\\.\\d+)?)kg/);
  const unit = match ? parseFloat(match[1]) : 1;
  return (수량 * unit).toFixed(1);
};

export default function Home() {
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [selectedYM, setSelectedYM] = useState("2025-05");
  const [filterVendor, setFilterVendor] = useState("전체");
  const vendors = ["전체", "이가에프엔비", "에스에이치유통"];

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter((doc) => doc.id.startsWith(selectedYM.replace("-", "")));

      const temp: Record<string, any[]> = {};
      filtered.forEach((doc) => {
        const data = doc.data();
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
    };
    fetchData();
  }, [selectedYM]);

  const start = startOfMonth(parse(selectedYM + "-01", "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });

  const handleExcelDownload = () => {
    const rows: any[] = [];
    Object.entries(calendarData).forEach(([date, items]) => {
      items.forEach((i) => {
        if (filterVendor !== "전체" && i.낙찰기업 !== filterVendor) return;
        rows.push({ 날짜: date, 낙찰기업: i.낙찰기업, 발주처: i.발주처, 품목: i.식품명, 수량: i.수량 });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "발주현황");
    XLSX.writeFile(wb, `${selectedYM}_발주현황.xlsx`);
  };

  return (
    <div className="p-4 max-w-screen-lg mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <div>
          <select value={selectedYM} onChange={(e) => setSelectedYM(e.target.value)} className="border p-2 rounded">
            {[
              "2025-04",
              "2025-05",
              "2025-06",
              "2025-07",
              "2025-08"
            ].map((ym) => (
              <option key={ym} value={ym}>{ym}</option>
            ))}
          </select>
        </div>

        <div>
          <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} className="border p-2 rounded">
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <button onClick={handleExcelDownload} className="bg-blue-500 text-white px-4 py-2 rounded shadow">
          Excel 다운로드
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
      <div className="grid grid-cols-7 gap-2 text-sm font-medium text-center text-gray-700 mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="bg-gray-100 py-2 rounded">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs">
        {Array(getDay(start)).fill(null).map((_, i) => (<div key={`empty-${i}`} />))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const items = (calendarData[dateStr] || []).filter(
            (i) => filterVendor === "전체" || i.낙찰기업 === filterVendor
          );

          const grouped: Record<string, string[]> = {};
          items.forEach((i) => {
            const school = i.발주처;
            const short = getShortName(i.식품명);
            const kg = getKg(i.수량, i.규격);
            const line = `- ${short} (${kg}kg)`;
            if (!grouped[school]) grouped[school] = [];
            grouped[school].push(line);
          });

          const content = Object.entries(grouped).map(([school, lines]) => (
            <div key={school} className="mb-1">
              <span className="font-semibold">{school}</span>
              {lines.map((line, idx) => <div key={idx} className="pl-2">{line}</div>)}
            </div>
          ));

          return (
            <div
              key={dateStr}
              className="border border-gray-300 rounded p-2 h-40 overflow-auto shadow-sm"
            >
              <div className="font-bold mb-1">{format(day, "d")}</div>
              {getDay(day) === 6 ? null : content} {/* 토요일은 비워둠 */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
