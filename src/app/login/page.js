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
  <div
    style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#f6f7fb",
      padding: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial'
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        boxShadow: "0 12px 30px rgba(0,0,0,.06)",
        padding: 20
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg,#ff6a00,#ff8a3d)",
            boxShadow: "0 10px 18px rgba(255,106,0,.25)",
            display: "flex",
            alignItems : "center",
            justifyContent: "center"
        
          }}>
             <span
              className="material-symbols-outlined icon"
              style={{
                fontSize: 24,
                color: "#fff",
                verticalAlign: "middle",
              }}
            >
              loyalty
            </span>
        </div>
       
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>
            Login
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
            Sign in to continue
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
          Username
        </label>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          autoComplete="username"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            outline: "none",
            maxWidth: '390px'
          }}
        />

        <label
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: 13,
            marginTop: 12,
            marginBottom: 6
          }}
        >
          Password
        </label>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          autoComplete="current-password"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            outline: "none",
            maxWidth: '390px'
          }}
        />

        {err ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#991b1b",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              padding: "8px 10px",
              borderRadius: 12,
              fontWeight: 800
            }}
          >
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          style={{
            width: "100%",
            marginTop: 14,
            background: "#ff6a00",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          Sign in
        </button>
      </form>
    </div>
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
