import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30;
const WINDOW = 60_000;
const MAX_ENTRIES = 10_000;

function evictExpired() {
  if (hitMap.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [ip, entry] of hitMap) {
    if (now > entry.resetAt) hitMap.delete(ip);
  }
}

export function proxy(req: NextRequest) {
  // /api/crawl → 시크릿 키 검증
  if (req.nextUrl.pathname === "/api/crawl") {
    const key = req.headers.get("x-api-key");
    if (key !== process.env.CRAWL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // /api/gas, /api/nearby-stores → rate limit
  if (
    req.nextUrl.pathname.startsWith("/api/gas") ||
    req.nextUrl.pathname.startsWith("/api/nearby-stores")
  ) {
    evictExpired();
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const entry = hitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      hitMap.set(ip, { count: 1, resetAt: now + WINDOW });
    } else {
      entry.count++;
      if (entry.count > LIMIT) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
