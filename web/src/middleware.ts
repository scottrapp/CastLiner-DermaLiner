import { NextResponse, type NextRequest } from "next/server";

// Pages require a session cookie; API routes check auth themselves (they also accept Bearer tokens).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/login") || pathname === "/activate" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/demo" || pathname.startsWith("/demo/") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  if (!req.cookies.get("cl_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
