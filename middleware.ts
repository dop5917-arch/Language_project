import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_SESSION_COOKIE = "aicards_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);

  if (!hasSession && (pathname.startsWith("/decks") || pathname.startsWith("/review"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/decks/:path*", "/review/:path*"]
};
