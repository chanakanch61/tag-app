import { NextResponse } from "next/server";

export async function POST() {
  const cookieName = process.env.AUTH_COOKIE_NAME || "tz_auth";
  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return res;
}
