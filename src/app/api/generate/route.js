import archiver from "archiver";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { PassThrough, Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ====== CONFIG ======
const FONT_FILE = "Kanit-Bold.ttf"; // อยู่ที่ public/fonts/
const FONT_FAMILY = "MyEmbed";
const FONT_WEIGHT = 700;

const ZIP_LEVEL = 6;        // 9 ช้ามาก ลดลงช่วยเร็วขึ้นเยอะ
const CONCURRENCY = 4;      // ทำพร้อมกันทีละ 4 ใบ (พอดีสำหรับ serverless)
const MAX_ITEMS = 120;      // กันค้าง/timeout ถ้าเยอะเกิน

let FONT_B64 = null;

async function loadFontOnce() {
  if (FONT_B64) return;
  const fontPath = path.join(process.cwd(), "public", "fonts", FONT_FILE);

  const buf = await fs.readFile(fontPath); // ถ้าไม่เจอจะ throw → 500 พร้อม message
  if (!buf || buf.length < 1000) throw new Error(`Font invalid: ${FONT_FILE}`);

  FONT_B64 = buf.toString("base64");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

function makeSvg({ no, fullname, travelDate }) {
  const safeName = esc(fullname || "");
  const safeDate = esc(travelDate || "");

  let nameFontSize = 52;
  if (safeName.length > 30) nameFontSize = 38;
  else if (safeName.length > 24) nameFontSize = 42;
  else if (safeName.length > 20) nameFontSize = 45;

  return `
<svg width="1028" height="650" xmlns="http://www.w3.org/2000/svg">
  <style>
    @font-face {
      font-family: '${FONT_FAMILY}';
      src: url(data:font/ttf;base64,${FONT_B64}) format('truetype');
      font-weight: ${FONT_WEIGHT};
      font-style: normal;
    }
  </style>

  <text x="825" y="125"
    font-size="140"
    font-family="${FONT_FAMILY}"
    font-weight="${FONT_WEIGHT}"
    stroke="#000000"
    stroke-width="10"
    fill="#ffffff"
    opacity="0.92"
    style="paint-order:stroke; text-shadow:0 10px 30px rgba(0,0,0,.35)">
    ${esc(String(no).padStart(2, "0"))}
  </text>

  <text x="635" y="525"
    font-size="36"
    font-family="${FONT_FAMILY}"
    font-weight="${FONT_WEIGHT}"
    fill="#f0ff00"
    stroke="#000000"
    stroke-width="10"
    paint-order="stroke">
    ${safeDate}
  </text>

  <rect x="40" y="540" width="948" height="70" fill="#ffffff" />

  <text x="50%" y="580"
    font-size="${nameFontSize}"
    font-family="${FONT_FAMILY}"
    font-weight="${FONT_WEIGHT}"
    fill="#111827"
    text-anchor="middle"
    dominant-baseline="middle">
    ${safeName}
  </text>
</svg>`;
}

// ✅ เรนเดอร์ SVG ด้วย resvg ให้เป็น PNG overlay (ฟอนต์ขึ้นแน่นอน)
function renderOverlayPng(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: { loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}

async function genOnePng(templateBuffer, payload) {
  const svg = makeSvg(payload);
  const overlayPng = renderOverlayPng(svg);

  return sharp(templateBuffer)
    .resize(1028, 650, { fit: "fill" })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req) {
  try {
    await loadFontOnce();

    const form = await req.formData();
    const templateFile = form.get("template");
    const travelDate = String(form.get("travel_date") || "");
    const namesJson = form.get("names_json");

    // ✅ ไม่ใช้ instanceof File บน Vercel
    if (!templateFile || typeof templateFile.arrayBuffer !== "function") {
      return json(400, { ok: false, message: "template required (file)" });
    }
    if (!namesJson) {
      return json(400, { ok: false, message: "names_json required" });
    }

    let names = [];
    try {
      names = JSON.parse(String(namesJson || "[]")) || [];
      if (!Array.isArray(names)) names = [];
    } catch {
      return json(400, { ok: false, message: "names_json invalid JSON" });
    }

    // ✅ กันค้าง/timeout
    if (names.length > MAX_ITEMS) {
      return json(400, { ok: false, message: `Too many items (${names.length}). Limit=${MAX_ITEMS}` });
    }

    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
    if (!templateBuffer || templateBuffer.length < 1000) {
      return json(400, { ok: false, message: "template invalid/too small" });
    }

    // ✅ zip stream แบบถูกต้องสำหรับ archiver บน serverless
    const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });
    const pass = new PassThrough();
    archive.pipe(pass);

    (async () => {
      try {
        // ทำเป็น batch เพื่อเร็วขึ้น
        for (let i = 0; i < names.length; i += CONCURRENCY) {
          const chunk = names.slice(i, i + CONCURRENCY);

          const results = await Promise.all(
            chunk.map(async (p) => {
              const no = p?.no ?? "";
              const fullname = p?.fullname ?? "";
              const png = await genOnePng(templateBuffer, { no, fullname, travelDate });

              const fileSafe = String(fullname)
                .replace(/[\\/:*?"<>|]/g, "")
                .trim()
                .slice(0, 80);

              const fname = `${String(no).padStart(2, "0")}_${fileSafe || "NAME"}.png`;
              return { png, fname };
            })
          );

          for (const r of results) archive.append(r.png, { name: r.fname });
        }

        await archive.finalize();
      } catch (e) {
        console.error("ZIP generation failed:", e);
        archive.destroy(e);
      }
    })();

    return new Response(Readable.toWeb(pass), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tags.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("API crashed:", e);
    return json(500, { ok: false, message: String(e?.message || e) });
  }
}