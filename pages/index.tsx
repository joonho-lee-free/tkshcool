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

const getKg = (수량: number, 규격: string) => {
  const match = 규격?.match(/(\d+(\.\d+)?)kg/);
  const unit = match ? parseFloat(match[1]) : 1;
  return `${(수량 * unit).toFixed(1)}kg`;
};

export default function Home() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [calendarData, setCalendarData] = useState<Record<string, any[]>>({});

  const [filterVendor, setFilterVendor] = useState("전체");
  const [vendors, setVendors] = useState<string[]>(["전체"]);

  const [filterSchool, setFilterSchool] = useState("전체");
  const [schools, setSchools] = useState<string[]>(["전체"]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "school"));
      const filtered = snapshot.docs.filter((doc) =>
        doc.id.startsWith(selectedYM.replace("-", "").slice(2))
      );

      const temp: Record<string, any[]> = {};
      const vendorSet = new Set<string>();
      const schoolSet = new Set<string>();

      filtered.forEach((doc) => {
        const data = doc.data();
        const 발주처 = data.발주처 || "학교명없음";
        const 낙찰기업 = data.낙찰기업 || "업체미지정";
        vendorSet.add(낙찰기업);
        schoolSet.add(발주처);

        data.품목?.forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, delivery]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처,
              식품명: item.식품명,
              규격: item.규격,
              낙찰기업,
              수량: delivery.수량,
              단가: item.단가,
              날짜: date,
            });
          });
        });
      });

      setCalendarData(temp);
      setVendors(["전체", ...Array.from(vendorSet)]);
      setSchools(["전체", ...Array.from(schoolSet)]);
    };
    fetchData();
  }, [selectedYM]);

  const handleExcelDownload = () => {
    const rows: any[] = [];
    Object.entries(calendarData).forEach(([date, items]) => {
      items.forEach((i) => {
        if (filterVendor !== "전체" && i.낙찰기업 !== filterVendor) return;
        if (filterSchool !== "전체" && i.발주처 !== filterSchool) return;
        rows.push({
          날짜: date,
          낙찰기업: i.낙찰기업,
          발주처: i.발주처,
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

  // 날짜 계산 (월~금)
  const start = startOfMonth(parse(`${selectedYM}-01`, "yyyy-MM-dd", new Date()));
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) >= 1 && getDay(d) <= 5
  );
  const leadingEmpty = Array((getDay(start) + 6) % 7).fill(null);

  const handleClickSchool = async (school: string, vendor: string, date: string) => {
    const ym = selectedYM.replace("-", "").slice(2);
    const docId = `${ym}_${school}`;
    try {
      const schoolRef = doc(db, "school", docId);
      const vendorRef = doc(db, "school", vendor);
      const [schoolSnap, vendorSnap] = await Promise.all([
        getDoc(schoolRef),
        getDoc(vendorRef),
      ]);
      if (!schoolSnap.exists() || !vendorSnap.exists()) {
        alert("데이터 없음");
        return;
      }
      const schoolData = schoolSnap.data();
      const vendorData = vendorSnap.data();
      const matched = (schoolData.품목 || []).filter((item: any) =>
        item.납품?.[date]
      );
      const sheetData = matched.map((item: any, idx: number) => ({
        번호: idx + 1,
        품명: item.식품명,
        규격: item.규격,
        수량: item.납품[date].수량,
        단가: item.단가,
        공급가액: item.납품[date].수량 * item.단가,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${docId}_${date}.xlsx`);
    } catch {
      alert("❗ 오류 발생, 콘솔 확인");
    }
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        {/* 연월 */}
        <select
          value={selectedYM}
          onChange={(e) => setSelectedYM(e.target.value)}
          className="border p-2 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const m = new Date(now.getFullYear(), now.getMonth() - 6 + i);
            const ym = format(m, "yyyy-MM");
            return <option key={ym} value={ym}>{ym}</option>;
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

        <button
          onClick={handleExcelDownload}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow"
        >
          Excel 다운로드
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-3 text
