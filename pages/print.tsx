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

// 프린트용 페이지: index.tsx 내용 복사
export default function Print() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter((doc) =>
        doc.id.startsWith(selectedYM.replace("-", "").slice(2))
      );
      const temp: Record<string, any[]> = {};
      filtered.forEach((doc) => {
        const data = doc.data();
        data.품목?.forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: data.발주처,
              품목: item.식품명,
              수량: delivery.수량,
            });
          });
        });
      });
      setCalendarData(temp);
    };
    fetchData();
  }, [selectedYM]);

  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Print View: {selectedYM} 발주 달력</h1>
      <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-center font-semibold">
        {['월','화','수','목','금','토','일'].map((d) => (
          <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs">
        {leadingEmpty.map((_, i) => <div key={i} />)}
        {allDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const items = calendarData[dateStr] || [];
          return (
            <div key={dateStr} className="border border-gray-300 rounded p-2 min-h-[6rem]">
              <div className="font-bold mb-1">{format(day, 'd')}</div>
              <ul className="list-disc list-inside text-left">
                {items.map((i, idx) => (
                  <li key={idx}>{i.발주처}: {i.품목} ({i.수량})</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
