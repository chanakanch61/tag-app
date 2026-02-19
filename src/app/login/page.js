"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => sp.get("next") || "/tag", [sp]);

  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p, next: nextPath }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setErr(data?.message || "Login failed");
      return;
    }

    router.replace(data.redirect || nextPath);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form onSubmit={onSubmit} style={{ width: 360, maxWidth: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Login</h2>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 800 }}>Username</label>
          <input value={u} onChange={(e) => setU(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 800 }}>Password</label>
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }} />
        </div>

        {err ? <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800, fontSize: 13 }}>{err}</div> : null}

        <button type="submit" style={{ marginTop: 14, width: "100%", padding: "10px 12px", borderRadius: 12, border: "none", background: "#ff6a00", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  // ✅ สำคัญ: useSearchParams ต้องอยู่ใน Suspense เพื่อให้ prerender ผ่าน
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
