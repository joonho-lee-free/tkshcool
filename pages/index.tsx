import { useEffect, useState } from "react";
import Head from "next/head";
import Calendar from "./components/Calendar";
import Modal from "./components/Modal";
import { ScheduleObj, DocData, VendorData } from "./types";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Index(): JSX.Element {
  const now = new Date();
  const defaultYM = now.toISOString().slice(0, 7);
  const [selectedYM, setSelectedYM] = useState<string>(defaultYM);
  const [selectedVendor, setSelectedVendor] = useState<string>("전체");

  const [calendarData, setCalendarData] = useState<Record<string, ScheduleObj[]>>({});
  const [vendors, setVendors] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState<string>("");

  useEffect(() => {
    const ymCode = selectedYM.replace("-", "").slice(2);
    const fetchData = async (): Promise<void> => {
      const snap = await getDocs(collection(db, "school"));
      const temp: Record<string, ScheduleObj[]> = {};
      const vendorSet = new Set<string>();

      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(ymCode)) return;
        const data = docSnap.data() as any;
        const school = data.발주처;
        const vendor = data.낙찰기업 || data.납찰기업;
        vendorSet.add(vendor);

        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: school,
              낙찰기업: vendor,
              날짜: date,
              품목: item.식품명,
              수량: del.수량 || 0,
              계약단가: del.계약단가 || 0,
              공급가액: del.공급가액 || 0,
            });
          });
        });
      });

      setCalendarData(temp);
      const allVendors: string[] = Array.from(vendorSet);
      allVendors.sort((a, b) => a.localeCompare(b));
      setVendors(["전체", ...allVendors]);
    };
    fetchData();
  }, [selectedYM]);

  const handleClick = async (school: string, vendor: string, date: string): Promise<void> => {
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    const schoolSnap = await getDoc(doc(db, "school", `${ymCode}_${school}`));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    const vendorSnap = await getDoc(doc(db, "vendor", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const handleExcelDownload = (): void => {
    const headers: string[] = [
      '연월', '발주처', '낙찰기업', '날짜', '품목', '수량', '계약단가', '공급가액'
    ];
    const rows: (string | number)[][] = [];
    Object.entries(calendarData).forEach(([date, items]) => {
      items.forEach((it) => {
        if (selectedVendor !== '전체' && it.낙찰기업 !== selectedVendor) return;
        rows.push([
          selectedYM, it.발주처, it.낙찰기업, it.날짜, it.품목, it.수량, it.계약단가, it.공급가액
        ]);
      });
    });
    const bom: string = '\uFEFF';
    const csvContent: string = bom + [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob: Blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = `${selectedYM}-${selectedVendor}-발주현황.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>발주 달력</title>
      </Head>
      <Calendar
        selectedYM={selectedYM}
        setSelectedYM={setSelectedYM}
        selectedVendor={selectedVendor}
        setSelectedVendor={setSelectedVendor}
        calendarData={calendarData}
        vendors={vendors}
        onItemClick={handleClick}
      />
      {modalOpen && modalDoc && modalVendorDoc && (
        <Modal
          modalDate={modalDate}
          modalDoc={modalDoc}
          modalVendorDoc={modalVendorDoc}
          onClose={() => setModalOpen(false)}
          handleExcelDownload={handleExcelDownload}
        />
      )}
    </>
  );
}
