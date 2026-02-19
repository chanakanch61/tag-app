"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import styles from "./tag.module.css";

export default function TagPage() {
  const router = useRouter();

  const [mode, setMode] = useState("manual"); // manual | excel
  const [templateFile, setTemplateFile] = useState(null);
  const [travelDate, setTravelDate] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // manual rows
  const [rows, setRows] = useState([{ no: "1", fullname: "" }]);

  // excel rows preview
  const [excelRows, setExcelRows] = useState([]);
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTemplateFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };
  const activeRows = mode === "manual" ? rows : excelRows;
  const canExport = useMemo(() => {
    if (!templateFile) return false;
    if (!travelDate.trim()) return false;
    const okNames = activeRows.filter(
      (r) => String(r.fullname || "").trim().length > 0,
    );
    return okNames.length > 0;
  }, [templateFile, travelDate, activeRows]);

  function addRow() {
    setRows((r) => [...r, { no: String(r.length + 1), fullname: "" }]);
  }
  function delRow(idx) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function setField(idx, key, val) {
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function onPickExcel(file) {
    try {
      // ✅ dynamic import (กันเงียบ/กันพังจาก bundler)
      const XLSX = await import("xlsx");

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // อ่านเป็น array ก่อน เพื่อดูหัวตารางได้ชัวร์
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (!rows || rows.length < 2) {
        alert("ไฟล์นี้ไม่มีข้อมูล (ต้องมีหัวตาราง + อย่างน้อย 1 แถว)");
        setExcelRows([]);
        return;
      }

      // หัวตารางแถวแรก
      const header = rows[0].map((x) => String(x).trim());
      // ทำ map ชื่อคอลัมน์ -> index
      const colIndex = {};
      header.forEach((h, i) => (colIndex[h] = i));

      // รองรับ header หลายแบบ
      const getIdx = (keys) => {
        for (const k of keys) if (colIndex[k] !== undefined) return colIndex[k];
        return -1;
      };

      const idxNo = getIdx(["No", "no", "NO"]);
      const idxTitle = getIdx(["title", "Title", "TITLE"]);
      const idxFn = getIdx(["first_name", "firstname", "first", "First Name"]);
      const idxLn = getIdx(["family_name", "lastname", "family", "Last Name"]);

      if (idxFn === -1 && idxLn === -1) {
        alert("ไม่พบคอลัมน์ชื่อ (first_name / family_name) ในไฟล์");
        setExcelRows([]);
        return;
      }

      const mapped = rows
        .slice(1) // ข้าม header
        .map((r, i) => {
          const no = idxNo >= 0 ? r[idxNo] : i + 1;
          const title = idxTitle >= 0 ? r[idxTitle] : "";
          const fn = idxFn >= 0 ? r[idxFn] : "";
          const ln = idxLn >= 0 ? r[idxLn] : "";
          const fullname = `${title}. ${fn} ${ln}`.replace(/\s+/g, " ").trim();
          return { no: String(no).trim() || String(i + 1), fullname };
        })
        .filter((x) => x.fullname);

      setExcelRows(mapped);
      alert(`อ่านไฟล์สำเร็จ: ${mapped.length} รายชื่อ`);
    } catch (err) {
      console.error(err);
      alert("อ่านไฟล์ Excel ไม่สำเร็จ (ดู Console เพิ่มเติม)");
      setExcelRows([]);
    }
  }

  async function exportZip() {
    if (!canExport) return;

    const names = activeRows
      .map((r) => ({ no: r.no, fullname: (r.fullname || "").trim() }))
      .filter((r) => r.fullname);

    const fd = new FormData();
    fd.append("template", templateFile);
    fd.append("travel_date", travelDate);
    fd.append("names_json", JSON.stringify(names));

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("Export ไม่สำเร็จ: " + txt);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tags.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className={styles.logo}> <span
              className="material-symbols-outlined icon"
              style={{
                fontSize: 24,
                color: "#fff",
                verticalAlign: "middle",
              }}
            >
              loyalty
            </span></div>
          <div>
            <div style={{ fontWeight: 900 }}>Tag Generator</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
              1028×650 • Export ZIP
            </div>
          </div>
        </div>
        <button onClick={logout} className={styles.ghostBtn}>
          Logout
        </button>
      </div>

      <div className={styles.grid}>
        {/* LEFT */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.h1}>สร้าง Tag ใส่กระเป๋า</div>
              <div className={styles.sub}>
                เลือก template + ใส่วันเดินทาง + เพิ่มรายชื่อ แล้ว Export ZIP
              </div>
            </div>
            <div className={styles.badge}>
              {mode === "manual" ? "Manual" : "Excel"}
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.row2}>
              <div>
                <label className={styles.label}>
                  Template Image (1028×650)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                />
                <div className={styles.hint}>รองรับ .png/.jpg</div>
              </div>
              <div>
                <label className={styles.label}>วันเดินทาง *ตัวอย่าง 26 Feb - 02 Mar 2026</label>
                <input
                  className={styles.inputText}
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  placeholder="26 Feb - 02 Mar 2026"
                />
                <div className={styles.hint}>
                  แสดงบนภาพ (มี stroke ดำ + fill #f0ff00)
                </div>
              </div>
            </div>

            <div className={styles.tabs}>
              <button
                onClick={() => setMode("manual")}
                style={{ ...s.tab, ...(mode === "manual" ? s.tabOn : {}) }}
              >
                พิมพ์รายชื่อเอง
              </button>
              <button
                onClick={() => setMode("excel")}
                style={{ ...s.tab, ...(mode === "excel" ? s.tabOn : {}) }}
              >
                อัปโหลด Excel + Preview
              </button>
            </div>

            {mode === "excel" ? (
              <div style={{ marginTop: 12 }}>
                <div className={styles.drop}>
                  <div style={{ fontWeight: 900 }}>อัปโหลดไฟล์ .xlsx</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    คอลัมน์: No | title | first_name | family_name
                  </div>
                  <input
                    type="file"
                    accept=".xlsx"
                    style={{ marginTop: 10 }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickExcel(f);
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className={styles.sectionHead}>
              <div style={{ fontWeight: 900 }}>รายชื่อลูกค้า</div>
              {mode === "manual" ? (
                <button onClick={addRow} className={styles.ghostBtn}>
                  + เพิ่มลูกค้า
                </button>
              ) : (
                <div
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}
                >
                  {excelRows.length
                    ? `พบ ${excelRows.length} รายชื่อ`
                    : "ยังไม่มีข้อมูลจาก Excel"}
                </div>
              )}
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 120 }}>No</th>
                  <th className={styles.th}>ชื่อ-นามสกุล</th>
                  <th style={{ ...s.th, width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {activeRows.length ? (
                  activeRows.map((r, idx) => (
                    <tr key={idx}>
                      <td className={styles.td}>
                        <input
                          className={styles.cellInput}
                          value={r.no}
                          disabled={mode === "excel"}
                          onChange={(e) => setField(idx, "no", e.target.value)}
                        />
                      </td>
                      <td className={styles.td}>
                        <input
                          className={styles.cellInput}
                          value={r.fullname}
                          disabled={mode === "excel"}
                          placeholder="MR. NOT NAJA"
                          onChange={(e) =>
                            setField(idx, "fullname", e.target.value)
                          }
                        />
                      </td>
                      <td className={styles.td}>
                        {mode === "manual" ? (
                          <button
                            onClick={() => delRow(idx)}
                            className={styles.dangerBtn}
                          >
                            ลบ
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#9ca3af",
                              fontWeight: 800,
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={styles.td} colSpan={3}>
                      <div style={{ color: "#6b7280", fontWeight: 800 }}>
                        ไม่มีรายชื่อ
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className={styles.actions}>
              <button
                className={styles.primaryBtn}
                disabled={!canExport}
                onClick={exportZip}
              >
                Export ZIP
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.h1}>Preview</div>
              <div className={styles.sub}>
                ตัวอย่างแถบชื่อเต็ม width + วันเดินทาง + เลขลำดับ
              </div>
            </div>
            <div className={styles.badge}>Mock</div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.preview}>
              {!previewUrl ? (
                <span style={{ color: "#9ca3af" }}>No template yet</span>
              ) : (
                <img
                  src={previewUrl}
                  alt="template preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
              <div className={styles.previewNo}>
                {String(activeRows?.[0]?.no || "01").padStart(2, "0")}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 45,
                  right: 18,
                  fontSize: 16,
                  color: "#000",
                  fontWeight: 800,
                  WebkitTextStroke: "1px #f0ff00",
                }}
              >
                {travelDate || "26 Feb - 02 Mar 2026"}
              </div>

              <div className={styles.nameBar}>
                <div style={{ fontWeight: 1000, textAlign: "center" }}>
                  {activeRows?.[0]?.fullname || "MR. NOT NAJA"}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#6b7280",
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              • Export จะสร้างไฟล์ตามจำนวนลูกค้า
              <br />
              • ชื่อไฟล์: No_Fullname.png
              <br />• หากชื่อยาวมาก ให้แจ้ง Support
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: 18,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial',
  },
  top: {
    maxWidth: 1180,
    margin: "0 auto 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "linear-gradient(135deg,#ff6a00,#ff8a3d)",
    boxShadow: "0 10px 18px rgba(255,106,0,.25)",
  },
  grid: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.45fr .9fr",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,.06)",
    overflow: "hidden",
  },
  cardHead: {
    padding: 16,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },
  cardBody: { padding: 16 },
  h1: { fontWeight: 1000, fontSize: 16, color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", fontWeight: 800, marginTop: 4 },
  badge: {
    fontSize: 12,
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff",
    fontWeight: 900,
    height: "fit-content",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6 },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 6, fontWeight: 700 },
  inputText: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginTop: 14,
    border: "1px solid #e5e7eb",
    padding: 10,
    borderRadius: 14,
    background: "#fff",
  },
  tab: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    color: "#6b7280",
  },
  tabOn: {
    background: "rgba(255,106,0,.10)",
    borderColor: "rgba(255,106,0,.35)",
    color: "#111827",
  },
  drop: {
    border: "1.5px dashed #cbd5e1",
    borderRadius: 14,
    padding: 14,
    background: "linear-gradient(180deg,#fff,#fbfbfd)",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
  },
  th: {
    background: "#f3f4f6",
    textAlign: "left",
    padding: 10,
    fontSize: 13,
    fontWeight: 1000,
    borderBottom: "1px solid #e5e7eb",
  },
  td: { padding: 10, borderBottom: "1px solid #e5e7eb" },
  cellInput: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  ghostBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "none",
    background: "#ff6a00",
    color: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    opacity: 1,
  },
  dangerBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 1000,
    cursor: "pointer",
  },
  preview: {
    aspectRatio: "1028/650",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#0b1220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  previewNo: {
    position: "absolute",
    top: 14,
    left: 14,
    color: "#fff",
    fontSize: 42,
    fontWeight: 1000,
    opacity: 0.9,
  },
  nameBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    background: "#fff",
    margin: "15px",
  },
};
