import { NextResponse } from "next/server";

export function middleware(req) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "tz_auth";
  const auth = req.cookies.get(cookieName)?.value;

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/tag")) {
    if (auth !== "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tag/:path*"],
};
