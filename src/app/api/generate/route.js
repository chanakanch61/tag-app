import archiver from "archiver";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { PassThrough, Readable } from "stream";

export const runtime = "nodejs";

/** ====== CONFIG ====== */
// ✅ เปลี่ยนชื่อไฟล์ตรงนี้ได้เลย
const FONT_FILE = "Kanit-Bold.ttf"; // หรือ "DBHelvethaicaXBdCond.ttf"
const FONT_WEIGHT = 700;            // Bold มาตรฐาน = 700
const FONT_FAMILY = "MyEmbed";      // ห้ามใช้ชื่อ Arial เพื่อไม่ชนระบบ

let FONT_B64 = null;

async function loadFontOnce() {
  if (FONT_B64) return;

  const fontPath = path.join(process.cwd(), "public", "fonts", FONT_FILE);

  let buf;
  try {
    buf = await fs.readFile(fontPath);
  } catch (e) {
    throw new Error(`Font not found: ${fontPath} (check file name / case-sensitive on Vercel)`);
  }

  if (!buf || buf.length < 1000) {
    throw new Error(`Font file looks invalid or too small: ${FONT_FILE}`);
  }

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

  // ปรับขนาดชื่อตามความยาว (เบา ๆ)
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

  <!-- เลขมุมขวา -->
  <text x="825" y="125"
    font-size="140"
    font-family="${FONT_FAMILY}"
    font-weight="${FONT_WEIGHT}"
    stroke="#000000"
    stroke-width="10"
    fill="#ffffff"
    opacity="0.92">
    ${esc(String(no).padStart(2, "0"))}
  </text>

  <!-- วันที่ -->
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

  <!-- แถบชื่อ -->
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

async function genOnePng(templateBuffer, payload) {
  const svg = makeSvg(payload);

  return sharp(templateBuffer)
    .resize(1028, 650, { fit: "fill" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export async function POST(req) {
  try {
    await loadFontOnce();

    const form = await req.formData();
    const templateFile = form.get("template");
    const travelDate = String(form.get("travel_date") || "");
    const namesJson = form.get("names_json");

    // ✅ อย่าใช้ instanceof File บน Vercel
    if (!templateFile || typeof templateFile.arrayBuffer !== "function") {
      return new Response(JSON.stringify({ ok: false, message: "template required" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    if (!namesJson) {
      return new Response(JSON.stringify({ ok: false, message: "names_json required" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    let names;
    try {
      names = JSON.parse(String(namesJson || "[]"));
      if (!Array.isArray(names)) names = [];
    } catch {
      return new Response(JSON.stringify({ ok: false, message: "names_json invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());

    // ✅ archiver ต้อง pipe ไป stream (วิธีนี้ชัวร์บน Vercel)
    const archive = archiver("zip", { zlib: { level: 9 } });
    const pass = new PassThrough();
    archive.pipe(pass);

    (async () => {
      try {
        for (const p of names) {
          const no = p?.no ?? "";
          const fullname = p?.fullname ?? "";

          const png = await genOnePng(templateBuffer, { no, fullname, travelDate });

          const fileSafe = String(fullname)
            .replace(/[\\/:*?"<>|]/g, "")
            .trim()
            .slice(0, 80);

          const fname = `${String(no).padStart(2, "0")}_${fileSafe || "NAME"}.png`;
          archive.append(png, { name: fname });
        }
        await archive.finalize();
      } catch (e) {
        archive.destroy(e);
      }
    })();

    const webStream = Readable.toWeb(pass);

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tags.zip"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}