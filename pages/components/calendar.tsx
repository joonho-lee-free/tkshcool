// 파일 위치: pages/components/Calendar.tsx

import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import Link from "next/link";
// types.ts가 프로젝트 루트에 있으므로 상대경로는 "../../types"입니다
import { ScheduleObj } from "../../types";

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

export default function Calendar({
  selectedYM,
  setSelectedYM,
  selectedVendor,
  setSelectedVendor,
  calendarData,
  vendors,
  onItemClick,
}: CalendarProps) {
  const now = new Date();
  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const firstOfMonth = new Date(`${selectedYM}-01`);
  const start = startOfMonth(firstOfMonth);
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const dow = getDay(firstOfMonth);
  const leadingEmpty = Array(dow).fill(null);

  const getItemsForDate = (dateStr: string) => {
    let items = calendarData[dateStr] || [];
    if (selectedVendor !== "전체") items = items.filter(it => it.낙찰기업 === selectedVendor);
    return items;
  };

  return (
    <>
      <div className="no-print p-4 max-w-screen-xl mx-auto flex gap-4">
        <select
          value={selectedYM}
          onChange={(e) => { setSelectedYM(e.target.value); setSelectedVendor("전체"); }}
          className="border p-2 rounded"
        >
          {months.map((m) => (
            <option key={m} value={`${year}-${m}`}>{`${year}-${m}`}</option>
          ))}
        </select>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="border p-2 rounded"
        >
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <Link href={`/scaedule?month=${encodeURIComponent(selectedYM)}&vendor=${encodeURIComponent(selectedVendor)}`}>
          <button className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer">
            발주서 보기
          </button>
        </Link>
      </div>

      <div className="no-print p-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold mb-3 text-center">{selectedYM} 발주 달력</h2>
        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-center font-semibold">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="bg-gray-100 py-1 rounded">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {leadingEmpty.map((_, idx) => <div key={idx} />)}
          {allDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const items = getItemsForDate(dateStr);
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
            const grouped: Record<string, ScheduleObj[]> = {};
            items.forEach(it => { (grouped[it.발주처] ||= []).push(it); });
            const orderedGroups = Object.entries(grouped);
            return (
              <div key={dateStr} className="border rounded p-2 min-h-[8rem] shadow-sm overflow-y-auto">
                <div className="font-bold mb-1">{format(day, "d")}</div>
                {orderedGroups.map(([school, lines]) => {
                  const uniqueList = Array.from(new Set(lines.map(l => `${l.품목} (${getKg(l.수량)})`)));
                  return (
                    <div
                      key={school}
                      onClick={() => onItemClick(school.trim(), lines[0].낙찰기업, dateStr)}
                      className={`mb-1 cursor-pointer ${getColorClass(lines[0].낙찰기업)}`}
                    >
                      <span className="font-semibold underline">{school.trim()}</span>
                      <ul className="pl-2 list-disc list-inside">
                        {uniqueList.map((text, i) => <li key={i}>{text}</li>)}
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
}


//------------------------------------------------------------

// 파일 위치: pages/components/Modal.tsx

import React from "react";
// types.ts가 프로젝트 루트에 있으므로 상대경로는 "../../types"입니다
import { DocData, VendorData } from "../../types";

interface ModalProps {
  modalDate: string;
  modalDoc: DocData;
  modalVendorDoc: VendorData;
  onClose: () => void;
  handleExcelDownload: () => void;
}

export default function Modal({
  modalDate,
  modalDoc,
  modalVendorDoc,
  onClose,
  handleExcelDownload,
}: ModalProps) {
  return (
    <div className="modal-overlay fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="modal-container bg-white w-full max-w-screen-md p-6 rounded shadow-lg relative page-break">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black no-print"
          onClick={onClose}
        >
          닫기
        </button>
        <h2 className="text-left text-xl font-bold mb-4">거래명세표 ({modalDate})</h2>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <strong>공급받는자:</strong> {modalDoc.발주처}
            <p>사업자등록번호: {modalDoc.사업자등록번호}</p>
            <p>주소: {modalDoc.사업장주소}</p>
            <p>대표전화: {modalDoc.대표전화번호}</p>
          </div>
          <div>
            <strong>공급하는자:</strong> {modalVendorDoc.상호명}
            <p>대표자: {modalVendorDoc.대표자}</p>
            <p>사업자등록번호: {modalVendorDoc.사업자번호 || modalVendorDoc.사업자등록번호}</p>
            <p>대표전화: {modalVendorDoc.대표전화번호}</p>
            <p>주소: {modalVendorDoc.주소}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">품목</th>
              <th className="border px-2 py-1 text-left">수량</th>
              <th className="border px-2 py-1 text-left">계약단가</th>
              <th className="border px-2 py-1 text-left">공급가액</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const items = modalDoc.품목.filter(it => it.납품[modalDate]);
              const unique = Array.from(new Map(items.map(it => [it.식품명, it])).values());
              return unique.map((it, idx) => {
                const d = it.납품[modalDate];
                return (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-left">{it.식품명}</td>
                    <td className="border px-2 py-1 text-left">{d.수량}</td>
                    <td className="border px-2 py-1 text-left">{d.계약단가}</td>
                    <td className="border px-2 py-1 text-left">{d.공급가액}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border px-2 py-1 text-left font-bold">합계</td>
              <td className="border px-2 py-1 text-left font-bold">
                {modalDoc.품목
                  .filter(it => it.납품[modalDate])
                  .reduce((sum, it) => {
                    const d = it.납품[modalDate];
                    return sum + (d.공급가액 || 0);
                  }, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="flex justify-start no-print">
          <button onClick={handleExcelDownload} className="px-4 py-2 bg-blue-500 text-white rounded">
            Excel 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
