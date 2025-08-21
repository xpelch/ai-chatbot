import { NextResponse, NextRequest } from "next/server";

const COOKIE_NAME = "app_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  const isPublic =
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/assets/") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|txt|json)$/);

  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === "ok") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/:path*",
};
