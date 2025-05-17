// ✅ 파일명: pages/index.tsx
// ✅ 목적: 2025년 5월 학교 발주 현황을 달력 형태로 표시

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

type Delivery = {
  수량: number;
  금액: number;
  단가: number;
};

type Item = {
  발주처: string;
  식품명: string;
  납품: Record<string, Delivery>;
};

export default function Home() {
  const [calendarData, setCalendarData] = useState<Record<string, Item[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter(doc => doc.id.startsWith("2505_"));

      const temp: Record<string, Item[]> = {};

      filtered.forEach(doc => {
        const data = doc.data();
        data.품목.forEach((item: any) => {
          Object.entries(item.납품).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: item.발주처,
              식품명: item.식품명,
              납품: { [date]: delivery }
            });
          });
        });
      });

      setCalendarData(temp);
    };

    fetchData();
  }, []);

  const yearMonth = "2025-05";
  const start = startOfMonth(new Date(`${yearMonth}-01`));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="p-4 max-w-screen-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">📅 2025년 5월 발주 달력</h1>

      <div className="grid grid-cols-7 gap-2 text-sm font-medium text-center text-gray-700 mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map(day => (
          <div key={day} className="bg-gray-100 py-2 rounded">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs">
        {Array(getDay(start)).fill(null).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const items = calendarData[dateStr] || [];

          return (
            <div
              key={dateStr}
              className="border border-gray-300 rounded p-2 h-36 overflow-auto shadow-sm hover:shadow-md transition"
            >
              <div className="font-semibold mb-1">{format(day, "d")}</div>
              {items.map((item, idx) => (
                <div key={idx} className="text-gray-800">
                  🏫 {item.발주처} - {item.식품명} ({item.납품[dateStr].수량})
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
