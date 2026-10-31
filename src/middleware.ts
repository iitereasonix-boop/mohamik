import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Multi-tenant isolation:
// - reserved host paths are always allowed through
// - firm subdomains (e.g. firmname.mohamik.com) are rewritten to /f/[subdomain]/...
// - security headers on every response

const RESERVED_HOSTS = ["mohamik.com", "www.mohamik.com", "localhost"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname.toLowerCase();

  // 1) platform subdomain resolution
  const subdomain = hostname.split(".").length > 2 ? hostname.split(".")[0] : null;
  const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
  const isReserved =
    !subdomain ||
    isIpAddress ||
    RESERVED_HOSTS.includes(hostname) ||
    hostname.endsWith(".railway.app") || // the platform's own hosting address, not a firm
    hostname.endsWith(".railway.app") || // the platform's own hosting address, not a firm
    ["www", "app", "api", "admin"].includes(subdomain);

  if (!isReserved && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/f/${subdomain}`;
    return NextResponse.rewrite(url);
  }
  if (!isReserved && pathname.startsWith("/client-portal")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace("/client-portal", `/f/${subdomain}/portal`);
    return NextResponse.rewrite(url);
  }

  const res = NextResponse.next();

  // 2) security headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
