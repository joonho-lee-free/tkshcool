// 파일 위치: /school/components/Calendar.tsx

import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import Link from "next/link";
import { ScheduleObj } from "../types";

const getKg = (수량: number) => `${수량}kg`;
const vendorPriority = ["이가에프엔비", "에스에이치유통"];
const getColorClass = (vendor: string) =>
  vendor.includes("에스에이치유통") ? "text-blue-600" : "text-gray-700";

interface CalendarProps {
  selectedYM: string;
  setSelectedYM: React.Dispatch<React.SetStateAction<string>>;
  selectedVendor: string;
  setSelectedVendor: React.Dispatch<React.SetStateAction<string>>;
  calendarData: Record<string, ScheduleObj[]>;
  vendors: string[];
  onItemClick: (school: string, vendor: string, date: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedYM,
  setSelectedYM,
  selectedVendor,
  setSelectedVendor,
  calendarData,
  vendors,
  onItemClick,
}) => {
  const now = new Date();
  const years = ["2025", "2026"]; // 필요시 2027, 2028 계속 추가
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const firstOfMonth = new Date(`${selectedYM}-01`);
  const start = startOfMonth(firstOfMonth);
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const dow = getDay(firstOfMonth); // 0=Sun,1=Mon...
  const leadingEmpty = Array(dow).fill(null);

  const getItemsForDate = (dateStr: string) => {
    let items = calendarData[dateStr] || [];
    if (selectedVendor !== "전체") {
      items = items.filter((it) => it.낙찰기업 === selectedVendor);
    }
    return items;
  };

  return (
    <>
      {/* Controls: 연월, 발주처 드롭박스, 발주서보기 */}
      <div className="no-print p-4 max-w-screen-xl mx-auto flex gap-4">
        <select
          value={selectedYM}
          onChange={(e) => {
            setSelectedYM(e.target.value);
            setSelectedVendor("전체");
          }}
          className="border p-2 rounded"
        >
          {years.flatMap((y) =>
            months.map((m) => {
              const ym = `${y}-${m}`;
              return (
               <option key={ym} value={ym}>
                {ym}
            </option>
            );
          })
        )}
        </select>

        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="border p-2 rounded"
        >
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <Link href={`/scaedule?month=${encodeURIComponent(selectedYM)}&vendor=${encodeURIComponent(selectedVendor)}`}>
          <button className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer">
            발주서 보기
          </button>
        </Link>
      </div>

      {/* Calendar UI (Sun-Sat) */}
      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-center font-semibold">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="bg-gray-100 py-1 rounded">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {leadingEmpty.map((_, idx) => (
            <div key={idx} />
          ))}

          {allDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const items = getItemsForDate(dateStr);

            // 우선순위 정렬: vendorPriority 배열 순서 → 학교 이름 오름차순
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

            // 발주처별로 그룹핑
            const grouped: Record<string, ScheduleObj[]> = {};
            items.forEach((it) => {
              (grouped[it.발주처] ||= []).push(it);
            });
            const orderedGroups = Object.entries(grouped);

            return (
              <div
                key={dateStr}
                className="border rounded p-2 min-h-[8rem] shadow-sm overflow-y-auto"
              >
                <div className="font-bold mb-1">{format(day, "d")}</div>
                {orderedGroups.map(([school, lines]) => {
                  const uniqueList = Array.from(
                    new Set(lines.map((l) => `${l.품목} (${getKg(l.수량)})`))
                  );
                  return (
                    <div
                      key={school}
                      onClick={() => onItemClick(school.trim(), lines[0].낙찰기업, dateStr)}
                      className={`mb-1 cursor-pointer ${getColorClass(lines[0].낙찰기업)}`}
                    >
                      <span className="font-semibold underline">{school.trim()}</span>
                      <ul className="pl-2 list-disc list-inside">
                        {uniqueList.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Calendar;
