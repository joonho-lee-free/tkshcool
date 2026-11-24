// 파일 위치: /school/pages/api/stamp.ts
// 도장 그림 중계 — Firebase Storage 가 다른 사이트에서 그림을 "꺼내 쓰는 것"(PDF 그리기)을 막아서,
// 이 사이트 서버가 대신 받아 같은 주소로 돌려줘요. (거래명세표 출력 PDF 에 도장 넣기용)
// 보안: 우리 Firebase 저장소(tkhealth-30380) 주소만 허용. 다른 주소는 거절.
import type { NextApiRequest, NextApiResponse } from "next";

const ALLOWED_PREFIX = "https://firebasestorage.googleapis.com/v0/b/tkhealth-30380.firebasestorage.app/o/";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = String(req.query.url || "");
  if (!url.startsWith(ALLOWED_PREFIX)) {
    res.status(400).json({ error: "허용되지 않은 주소" });
    return;
  }
  try {
    const r = await fetch(url);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) {
      res.status(502).json({ error: `도장 그림을 못 받았어요 (${r.status})` });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.status(200).send(buf);
  } catch (e: any) {
    res.status(502).json({ error: String(e?.message ?? e) });
  }
}
