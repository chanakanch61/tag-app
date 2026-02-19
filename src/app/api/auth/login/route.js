import { NextResponse } from "next/server";

export async function POST(req) {
  const { username, password } = await req.json();

  const u = process.env.FIXED_USERNAME || "";
  const p = process.env.FIXED_PASSWORD || "";
  const cookieName = process.env.AUTH_COOKIE_NAME || "tz_auth";

  if (username !== u || password !== p) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 ชม.
  });

  return res;
}
