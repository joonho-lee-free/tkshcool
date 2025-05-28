import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import * as XLSX from "xlsx";

// 단위 변환 유틸
const getKg = (수량: number, 규격: string) => {
  const match = 규격?.match(/(\d+(\.\d+)?)kg/);
  const unit = match ? parseFloat(match[1]) : 1;
  return `${(수량 * unit).toFixed(1)}kg`;
};

// 낙찰기업에 따라 컬러 결정
const getVendorColor = (vendor: string) => {
  const norm = (vendor || "").replace(/\s+/g, "").toLowerCase();
  if (norm.includes("에스에이치유통") || norm.includes("에스에이치")) return "blue";
  if (norm.includes("이가에프엔비")) return "black";
  return "gray";
};

// Tailwind 텍스트 클래스
const getColorClass = (vendor: string) => {
  const c = getVendorColor(vendor);
  if (c === "blue") return "text-blue-600";
  if (c === "black") return "text-black";
  return "text-gray-700";
};

export default function Home() {
  // 현재 날짜 기준 기본 월
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  // 2025-04 ~ 2025-12
  const months = Array.from({ length: 9 }, (_, i) => {
    const m = 4 + i;
    return `2025-${String(m).padStart(2, "0")}`;
  });

  const [selectedYM, setSelectedYM] = useState<string>(
    months.includes(defaultYM) ? defaultYM : months[0]
  );
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});
  const [filterVendor, setFilterVendor] = useState("전체");
  const [filterSchool, setFilterSchool] = useState("전체");
  const [filterItem, setFilterItem] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);
  const [schools, setSchools] = useState<string[]>(["전체"]);
  const [items, setItems] = useState<string[]>(["전체"]);

  // 우선순위 배열 (이가에프엔비, 에스에이치유통)
  const vendorPriority = ["이가에프엔비", "에스에이치유통"];

  // Firestore 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const prefix = selectedYM.replace("-", "").slice(2);
      const filteredDocs = snapshot.docs.filter(doc => doc.id.startsWith(prefix));

      const temp: Record<string, any[]> = {};
      const vendorSet = new Set<string>();
      const schoolSet = new Set<string>();
      const itemSet = new Set<string>();

      filteredDocs.forEach(doc => {
        const data = doc.data();
        const 발주처 = data.발주처 || "학교명없음";
        const 낙찰기업 = data.낙찰기업 || "업체미지정";
        vendorSet.add(낙찰기업);
        schoolSet.add(발주처);

        (data.품목 || []).forEach((item: any) => {
          itemSet.add(item.식품명);
          Object.entries(item.납품 || {}).forEach(
            ([date, delivery]: [string, any]) => {
              temp[date] = temp[date] || [];
              temp[date].push({
                발주처,
                낙찰기업,
                식품명: item.식품명,
                규격: item.규격,
                수량: delivery.수량,
                단가: item.단가,
              });
            }
          );
        });
      });

      // 낙찰기업 별 정렬: 우선순위에 없는 업체는 이름순
      const sortedVendors = [...vendorSet].sort((a, b) => {
        const ia = vendorPriority.indexOf(a);
        const ib = vendorPriority.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        return a.localeCompare(b);
      });

      setCalendarData(temp);
      setVendors(["전체", ...sortedVendors]);
      setSchools(["전체", ...Array.from(schoolSet).sort()]);
      setItems(["전체", ...Array.from(itemSet).sort()]);
    };
    fetchData();
  }, [selectedYM]);

  // 달력 날짜 계산 (월~금)
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    d => [1,2,3,4,5].includes(getDay(d))
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const rows: any[] = [];
    Object.entries(calendarData).forEach(([date, items]) => {
      items.forEach(i => {
        if (filterVendor !== "전체" && i.낙찰기업 !== filterVendor) return;
        if (filterSchool !== "전체" && i.발주처 !== filterSchool) return;
        if (filterItem !== "전체" && i.식품명 !== filterItem) return;
        rows.push({ 날짜: date, 발주처: i.발주처, 낙찰기업: i.낙찰기업, 식품명: i.식품명, 수량: i.수량 });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "발주현황");
    XLSX.writeFile(wb, `${selectedYM}_발주현황.xlsx`);
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      {/* 필터 영역 */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <select value={selectedYM} onChange={e => setSelectedYM(e.target.value)} className="border p-2 rounded">
          {months.map(ym => <option key={ym} value={ym}>{ym}</option>)}
        </select>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className="border p-2 rounded">
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="border p-2 rounded">
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterItem} onChange={e => setFilterItem(e.target.value)} className="border p-2 rounded">
          {items.map(it => <option key={it} value={it}>{it}</option>)}
        </select>
        <button onClick={handleExcelDownload} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Excel 다운로드</button>
      </div>

      <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-5 gap-2 text-xs mb-2 text-center font-semibold">
        {['월','화','수','목','금'].map(d => <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>)}
      </div>

      {/* 날짜 칸 */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        {leadingEmpty.map((_, i) => <div key={i} />)}
        {allDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const list = calendarData[dateStr] || [];
          const filtered = list
            .filter(i => (filterVendor==='전체'||i.낙찰기업===filterVendor)
                      &&(filterSchool==='전체'||i.발주처===filterSchool)
                      &&(filterItem==='전체'||i.식품명===filterItem))
            .sort((a,b)=>{
              const pa=vendorPriority.indexOf(a.낙찰기업);
              const pb=vendorPriority.indexOf(b.낙찰기업);
              return (pa===-1?Infinity:pa)-(pb===-1?Infinity:pb);
            });
          const grouped:Record<string,any> = {};
          filtered.forEach(i=>{
            const key=`${i.발주처}__${i.낙찰기업}`;
            const line=`${i.식품명} (${getKg(i.수량,i.규격)})`;
            if(!grouped[key])grouped[key]={발주처:i.발주처,낙찰기업:i.낙찰기업,lines:[]};
            grouped[key].lines.push(line);
          });
          return (
            <div key={dateStr} className="border p-2 min-h-[10rem] shadow-sm overflow-hidden">
              <div className="font-bold mb-1">{format(day,'d')}</div>
              {Object.values(grouped).map((g:any,idx:number)=>(
                <div key={idx} className={`${getColorClass(g.낙찰기업)} mb-1`}>
                  <div className="font-semibold">{g.발주처}</div>
                  {g.lines.map((l:string,i2:number)=><div key={i2} className="pl-2">- {l}</div>)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
