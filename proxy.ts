import { NextRequest, NextResponse } from "next/server";

// Optimistic auth gate: the login session is the httpOnly `nt_token` cookie.
// Presence-only check here (no API calls from the edge); validity is enforced
// again inside each API route and page data fetch.
const PROTECTED = ["/dashboard", "/settings"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();
  if (req.cookies.get("nt_token")?.value) return NextResponse.next();

  const login = new URL("/login", req.nextUrl);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
