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
  const match = 규격?.match(/(\d+(\.\d+)?)kg/);
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
  const [filterSchool, setFilterSchool] = useState("전체");
  const [filterItem, setFilterItem] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);
  const [schools, setSchools] = useState<string[]>(["전체"]);
  const [items, setItems] = useState<string[]>(["전체"]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter((doc) =>
        doc.id.startsWith(selectedYM.replace("-", "").slice(2))
      );

      const temp: Record<string, any[]> = {};
      const vendorSet = new Set<string>();
      const schoolSet = new Set<string>();
      const itemSet = new Set<string>();

      filtered.forEach((doc) => {
        const data = doc.data();
        const 발주처 = data.발주처 || "학교명없음";
        const 낙찰기업 = data.낙찰기업 || "업체미지정";
        vendorSet.add(낙찰기업);
        schoolSet.add(발주처);

        (data.식품명 || []).forEach((i) => {
          itemSet.add(i);
          // assume data.납품 structure remains same
        });

        Object.entries(data.품목 || []).forEach(([key, item]: [string, any]) => {
          Object.entries(item.납품 || {}).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처,
              식품명: item.식품명,
              규격: item.규격,
              낙찰기업,
              수량: delivery.수량,
              단가: item.단가,
            });
          });
        });
      });

      setCalendarData(temp);
      setVendors(["전체", ...Array.from(vendorSet)]);
      setSchools(["전체", ...Array.from(schoolSet)]);
      setItems(["전체", ...Array.from(itemSet)]);
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
        if (filterSchool !== "전체" && i.발주처 !== filterSchool) return;
        if (filterItem !== "전체" && i.식품명 !== filterItem) return;
        rows.push({
          날짜: date,
          발주처: i.발주처,
          낙찰기업: i.낙찰기업,
          식품명: i.식품명,
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
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        {/* 필터들 */}
        {/* ... */}
      </div>
      {/* 달력 렌더링 */}
    </div>
  );
}
