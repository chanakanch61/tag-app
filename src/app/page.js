"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoBox}>
          <div style={styles.logo}>
            <span
              className="material-symbols-outlined icon"
              style={{
                fontSize: 32,
                color: "#fff",
                verticalAlign: "middle",
              }}
            >
              loyalty
            </span>
          </div>
        </div>

        <h1 style={styles.title}>Tag Generator</h1>
        <p style={styles.subtitle}>
          ระบบสร้างป้าย Tag ใส่กระเป๋า
          <br />
          รองรับ Export ZIP หลายรายชื่อในคลิกเดียว
        </p>

        <button style={styles.primaryBtn} onClick={() => router.push("/login")}>
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial',
  },
  card: {
    background: "#ffffff",
    padding: "48px 40px",
    borderRadius: 18,
    width: "100%",
    maxWidth: 460,
    textAlign: "center",
    boxShadow: "0 25px 60px rgba(0,0,0,.25)",
  },
  logoBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 18,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    background: "linear-gradient(135deg,#ff6a00,#ff8a3d)",
    boxShadow: "0 15px 30px rgba(255,106,0,.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 12,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 30,
    lineHeight: 1.6,
  },
  primaryBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#ff6a00",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    transition: "all .2s ease",
  },
};
