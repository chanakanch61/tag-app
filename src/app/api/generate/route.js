import archiver from "archiver";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs"; // กันเผลอไปรัน edge

let FONT_REG_B64 = null;
let FONT_BOLD_B64 = null;

async function loadFontsOnce() {
  if (FONT_REG_B64 && FONT_BOLD_B64) return;

  const regPath = path.join(process.cwd(), "public", "fonts", "ARIAL.ttf");
  const boldPath = path.join(process.cwd(), "public", "fonts", "ARIAL.ttf");

  const [regBuf, boldBuf] = await Promise.all([
    fs.readFile(regPath),
    fs.readFile(boldPath),
  ]);
  FONT_REG_B64 = regBuf.toString("base64");
  FONT_BOLD_B64 = boldBuf.toString("base64");
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
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
      font-family: 'MyEmbed';
      src: url(data:font/ttf;base64,${FONT_BOLD_B64}) format('truetype');
      font-weight: 700;
      font-style: normal;
    }
  </style>

  <!-- ✅ DEBUG: ถ้ากรอบแดงไม่ขึ้น แปลว่า overlay svg ไม่ได้ถูก composite -->
  <rect x="0" y="0" width="1028" height="650" fill="none"/>

  <text x="825" y="125"
    font-size="140"
    font-family="MyEmbed"
    font-weight="700"
    stroke="#000000"
    stroke-width="10"
    fill="#ffffff"
    opacity="0.92">
    ${esc(String(no).padStart(2, "0"))}
  </text>

  <text x="635" y="525"
    font-size="36"
    font-family="MyEmbed"
    font-weight="700"
    fill="#f0ff00"
    stroke="#000000"
    stroke-width="10"
    paint-order="stroke">
    ${safeDate}
  </text>

  <rect x="40" y="540" width="948" height="70" fill="#ffffff" />

  <text x="50%" y="580"
    font-size="${nameFontSize}"
    font-family="MyEmbed"
    font-weight="700"
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
  await loadFontsOnce();
  const form = await req.formData();

  const templateFile = form.get("template");
  const travelDate = form.get("travel_date") || "";
  const namesJson = form.get("names_json"); // JSON string [{no,fullname},...]

  if (!templateFile || !(templateFile instanceof File)) {
    return new Response(
      JSON.stringify({ ok: false, message: "template required" }),
      { status: 400 },
    );
  }
  if (!namesJson) {
    return new Response(
      JSON.stringify({ ok: false, message: "names_json required" }),
      { status: 400 },
    );
  }

  const names = JSON.parse(String(namesJson || "[]")) || [];
  const templateBuffer = Buffer.from(await templateFile.arrayBuffer());

  const archive = archiver("zip", { zlib: { level: 9 } });

  const stream = new ReadableStream({
    start(controller) {
      archive.on("data", (chunk) => controller.enqueue(chunk));
      archive.on("end", () => controller.close());
      archive.on("error", (err) => controller.error(err));
    },
    async pull() {},
    cancel() {
      archive.abort();
    },
  });

  (async () => {
    try {
      for (const p of names) {
        const no = p.no ?? "";
        const fullname = p.fullname ?? "";
        const png = await genOnePng(templateBuffer, {
          no,
          fullname,
          travelDate,
        });

        const fileSafe = String(fullname)
          .replace(/[\\/:*?"<>|]/g, "")
          .trim()
          .slice(0, 80);
        const fname = `${String(no).padStart(2, "0")}_${fileSafe || "NAME"}.png`;

        archive.append(png, { name: fname });
      }
      await archive.finalize();
    } catch (e) {
      archive.emit("error", e);
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="tags.zip"`,
    },
  });
}
