"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/tag";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "Login failed");
      }

      router.push(next);
      router.refresh();
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo} />
          <div>
            <div style={s.title}>Tag Generator</div>
            <div style={s.sub}>Login with fixed username/password</div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <label style={s.label}>Username</label>
          <input
            style={s.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="travelzeed"
          />

          <label style={{ ...s.label, marginTop: 12 }}>Password</label>
          <input
            style={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            type="password"
            placeholder="••••"
          />

          {err ? <div style={s.err}>{err}</div> : null}

          <button style={s.btn} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={s.note}>
          ตั้งค่าใน <code>.env.local</code>: FIXED_USERNAME / FIXED_PASSWORD
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7fb", padding: 18, fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial' },
  card: { width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,.06)", padding: 18 },
  header: { display: "flex", gap: 12, alignItems: "center" },
  logo: { width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#ff6a00,#ff8a3d)", boxShadow: "0 10px 18px rgba(255,106,0,.25)" },
  title: { fontWeight: 900, fontSize: 18, color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", fontWeight: 700 },
  label: { display: "block", fontWeight: 800, fontSize: 13, marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", outline: "none" },
  btn: { width: "100%", marginTop: 14, background: "#ff6a00", color: "#fff", border: "none", borderRadius: 12, padding: "10px 12px", fontWeight: 900, cursor: "pointer" },
  err: { marginTop: 10, fontSize: 12, color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", padding: "8px 10px", borderRadius: 12, fontWeight: 800 },
  note: { marginTop: 12, fontSize: 12, color: "#6b7280", lineHeight: 1.4 },
};
