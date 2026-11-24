// 파일 위치: /school/components/StatementExport.tsx
// "거래명세표 출력" 버튼 — 고른 달(예: 2026-12)의 학교별 거래명세표를 만들어요.
//   학교마다 zip 1개: {해당월}_{학교명}_{회사명}_거래명세표.zip  (예: 2612_대명여고_이가에프엔비_거래명세표.zip)
//   zip 안: 납품일마다 PDF 1장  {학교명}({날짜}).pdf  — 날짜별 거래명세표(modal)와 같은 내용
//   저장: Chrome/Edge 는 폴더를 고르면 그 안에 "output" 폴더를 만들어 저장. 안 되면 다운로드 폴더로 받음.
// 11월 말에 12월분을 미리 보내니까, 달력에서 다음 달을 고르고 누르면 돼요.

import React, { useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const ALLOWED = ["이가에프엔비", "에스에이치유통"];

type Item = { 식품명: string; 납품: Record<string, { 수량: number; 계약단가: number; 공급가액: number }> };
type SchoolDoc = { 발주처: string; 사업자등록번호?: string; 사업장주소?: string; 대표전화번호?: string; 낙찰기업?: string; 납찰기업?: string; 품목?: Item[] };
type Vendor = { 상호명?: string; 대표자?: string; 대표전화번호?: string; 사업자번호?: string; 사업자등록번호?: string; 주소?: string; 도장?: string };

const won = (v: number) => (Number(v) || 0).toLocaleString();
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();

// 도장 그림을 미리 data URL 로 (다른 주소 그림은 PDF 그릴 때 막히는 경우가 있어서)
async function toDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve("");
      r.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// 한 날짜 거래명세표 HTML (A4 세로, 794px 폭)
function statementHtml(date: string, s: SchoolDoc, v: Vendor, stamp: string) {
  const items = (s.품목 || []).filter(it => it.납품 && it.납품[date]);
  const uniq = Array.from(new Map(items.map(it => [it.식품명, it])).values());
  const total = uniq.reduce((a, it) => a + (Number(it.납품[date].공급가액) || 0), 0);
  const cell = "border:1px solid #333;padding:6px 8px;";
  const rows = uniq.map(it => {
    const d = it.납품[date];
    return `<tr><td style="${cell}">${esc(it.식품명)}</td><td style="${cell}text-align:right">${esc(d.수량)}</td>
      <td style="${cell}text-align:right">${won(d.계약단가)}</td><td style="${cell}text-align:right">${won(d.공급가액)}</td></tr>`;
  }).join("");
  return `
  <div style="width:794px;min-height:1123px;padding:60px 56px;box-sizing:border-box;background:#fff;color:#111;
    font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:14px;">
    <h2 style="font-size:24px;margin:0 0 20px;">거래명세표 (${esc(date)})</h2>
    <div style="display:flex;gap:24px;margin-bottom:20px;">
      <div style="flex:1;line-height:1.7;">
        <b>공급받는자:</b> ${esc(s.발주처)}<br/>
        사업자등록번호: ${esc(s.사업자등록번호)}<br/>
        주소: ${esc(s.사업장주소)}<br/>
        대표전화: ${esc(s.대표전화번호)}
      </div>
      <div style="flex:1;line-height:1.7;position:relative;">
        <b>공급하는자:</b> ${esc(v.상호명)}<br/>
        대표자: ${esc(v.대표자)}<br/>
        사업자등록번호: ${esc(v.사업자번호 || v.사업자등록번호)}<br/>
        대표전화: ${esc(v.대표전화번호)}<br/>
        주소: ${esc(v.주소)}
        ${stamp ? `<img src="${stamp}" style="position:absolute;top:0;right:8px;width:64px;height:64px;object-fit:contain;"/>` : ""}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${cell}text-align:left;background:#f3f4f6">품목</th><th style="${cell}background:#f3f4f6">수량</th>
        <th style="${cell}background:#f3f4f6">계약단가</th><th style="${cell}background:#f3f4f6">공급가액</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3" style="${cell}font-weight:bold">합계</td><td style="${cell}text-align:right;font-weight:bold">${won(total)}</td></tr></tfoot>
    </table>
  </div>`;
}

async function htmlToPdf(html: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;";
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    const page = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = 210, h = Math.min(297, (canvas.height * w) / canvas.width);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(host);
  }
}

export default function StatementExport({ selectedYM, selectedVendor }: { selectedYM: string; selectedVendor: string }) {
  const [busy, setBusy] = useState("");

  const run = async () => {
    const ym = selectedYM.replace("-", "").slice(2);          // "2026-12" → "2612"
    try {
      setBusy("학교 자료 불러오는 중…");
      const snap = await getDocs(collection(db, "school"));
      const schools = snap.docs
        .filter(d => d.id.startsWith(`${ym}_`))
        .map(d => d.data() as SchoolDoc)
        .map(s => ({ ...s, vendor: String(s.낙찰기업 || s.납찰기업 || "").trim() }))
        .filter(s => ALLOWED.includes(s.vendor) && (selectedVendor === "전체" || s.vendor === selectedVendor))
        .filter(s => (s.품목 || []).some(it => it.납품 && Object.keys(it.납품).some(dt => dt.startsWith(selectedYM))));
      if (!schools.length) { alert(`${selectedYM} 에 납품할 학교가 없어요. 업로드가 끝났는지 확인해 주세요.`); return; }

      // 저장할 곳: 폴더 고르기 (Chrome·Edge) → 그 안에 output 폴더
      let outDir: any = null;
      const picker = (window as any).showDirectoryPicker;
      if (picker && confirm(`${selectedYM} 거래명세표 ${schools.length}개 학교를 만들어요.\n\n[확인] 저장할 폴더 고르기 (그 안에 output 폴더를 만들어요)\n[취소] 다운로드 폴더로 받기`)) {
        try {
          const base = await picker({ id: "tkschool-statement", mode: "readwrite" });
          outDir = await base.getDirectoryHandle("output", { create: true });
        } catch { outDir = null; }
      }

      const JSZip = (await import("jszip")).default;
      const vendorCache: Record<string, { v: Vendor; stamp: string }> = {};
      let n = 0;
      for (const s of schools) {
        n++;
        if (!vendorCache[s.vendor]) {
          const vs = await getDoc(doc(db, "school", s.vendor));
          const v = (vs.exists() ? vs.data() : {}) as Vendor;
          vendorCache[s.vendor] = { v, stamp: await toDataUrl(v.도장 || "") };
        }
        const { v, stamp } = vendorCache[s.vendor];
        const school = String(s.발주처 || "").trim();
        const dates = Array.from(new Set((s.품목 || []).reduce((a: string[], it) => a.concat(Object.keys(it.납품 || {})), [])))
          .filter(dt => dt.startsWith(selectedYM)).sort();
        const zip = new JSZip();
        for (let i = 0; i < dates.length; i++) {
          setBusy(`${n}/${schools.length} ${school} — ${dates[i]} (${i + 1}/${dates.length})`);
          zip.file(`${safeName(school)}(${dates[i]}).pdf`, await htmlToPdf(statementHtml(dates[i], s, v, stamp)));
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const name = `${ym}_${safeName(school)}_${s.vendor}_거래명세표.zip`;
        if (outDir) {
          const fh = await outDir.getFileHandle(name, { create: true });
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 5000);
          await new Promise(r => setTimeout(r, 400));
        }
      }
      alert(`끝났어요. ${schools.length}개 학교 거래명세표 zip 을 ${outDir ? "고른 폴더의 output 폴더" : "다운로드 폴더"}에 저장했어요.`);
    } catch (e: any) {
      alert(`거래명세표 만들기 실패: ${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <button onClick={run} disabled={!!busy} title="고른 달의 학교별 거래명세표(납품일별 PDF)를 학교마다 zip 으로 만들어요"
        className="px-4 py-2 bg-indigo-600 text-white rounded cursor-pointer disabled:opacity-60">
        {busy ? "만드는 중…" : "거래명세표 출력"}
      </button>
      {busy && <span className="text-sm text-gray-600">{busy}</span>}
    </>
  );
}
