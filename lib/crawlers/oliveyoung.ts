import { readFileSync } from "fs";
import { join } from "path";
import {
  HOME_URL,
  getBestUrl,
  buildBrowserHeaders,
  extractCookies,
  parseListHtml,
  dedupeItems,
  curlFetch,
  MAX_PAGES_RUNTIME,
  MIN_THRESHOLD,
  type OliveYoungItem,
} from "./oliveyoung-shared.mjs";

export type { OliveYoungItem };

/**
 * 런타임(Vercel) 폴백 크롤링.
 * 정적 JSON이 없을 때 시도되는 보조 경로.
 *
 * 헤더/파싱은 oliveyoung-shared.mjs와 단일 소스로 공유.
 * 페이지 수는 MAX_PAGES_RUNTIME(1)로 제한 - 런타임 응답시간 보호.
 *
 * curl + 데스크톱 UA → curl 모바일 → fetch 데스크톱 → fetch 모바일 순으로 시도.
 */
export async function crawlOliveYoung(): Promise<OliveYoungItem[]> {
  // 1차: curl + 데스크톱 UA (Cloudflare TLS 핑거프린트 통과)
  let items = await tryCrawl({ curl: true });
  if (items.length > 0) return items;
  // 2차: curl + 모바일
  items = await tryCrawl({ curl: true, mobile: true });
  if (items.length > 0) return items;
  // 3차: fetch 데스크톱 (curl 없는 환경 대비)
  items = await tryCrawl({ mobile: false });
  if (items.length > 0) return items;
  // 4차: fetch 모바일
  items = await tryCrawl({ mobile: true });
  return items;
}

async function tryCrawl(opts: {
  mobile?: boolean;
  curl?: boolean;
}): Promise<OliveYoungItem[]> {
  const headers = buildBrowserHeaders({ mobile: opts.mobile });

  // curl 모드: Cloudflare TLS 핑거프린트 통과
  if (opts.curl) {
    const collected: OliveYoungItem[] = [];
    for (let page = 1; page <= MAX_PAGES_RUNTIME; page++) {
      try {
        const startRank = (page - 1) * 100 + 1;
        const { status, body } = await curlFetch(getBestUrl(page), {
          ...headers,
          Referer: HOME_URL,
        });
        if (status !== 200 || !body) break;
        const pageItems = parseListHtml(body, startRank);
        if (pageItems.length === 0) break;
        collected.push(...pageItems);
      } catch {
        break;
      }
    }
    const unique = dedupeItems(collected);
    if (unique.length < MIN_THRESHOLD) return [];
    return unique;
  }

  // Node.js fetch 모드 (폴백)
  let cookie = "";
  try {
    const homeRes = await fetch(HOME_URL, {
      headers: { ...headers, "Sec-Fetch-Site": "none" },
      cache: "no-store",
    });
    if (homeRes.ok) {
      cookie = extractCookies(homeRes);
    }
  } catch {
    // 쿠키 획득 실패 → 그래도 시도
  }

  const collected: OliveYoungItem[] = [];
  for (let page = 1; page <= MAX_PAGES_RUNTIME; page++) {
    try {
      const startRank = (page - 1) * 100 + 1;
      const res = await fetch(getBestUrl(page), {
        headers: {
          ...headers,
          "Sec-Fetch-Site": "same-origin",
          Referer: HOME_URL,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        next: { revalidate: 21600 },
      });
      if (!res.ok) break;
      const html = await res.text();
      const pageItems = parseListHtml(html, startRank);
      if (pageItems.length === 0) break;
      collected.push(...pageItems);
    } catch {
      break;
    }
  }

  const unique = dedupeItems(collected);
  if (unique.length < MIN_THRESHOLD) return [];
  return unique;
}

// ─── 정적 JSON (GitHub Actions 스케줄드 크롤 결과) ─────

type OliveYoungData = {
  updatedAt: string | null;
  count: number;
  items: OliveYoungItem[];
};

function readStaticJson(): OliveYoungData | null {
  try {
    const path = join(process.cwd(), "data", "oliveyoung.json");
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as OliveYoungData;
    if (data?.items?.length) return data;
    return null;
  } catch {
    return null;
  }
}

// ─── 캐시 ─────────────────────────────────────────────

let cached: OliveYoungData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function getOliveYoungCached(): Promise<OliveYoungData> {
  const now = Date.now();
  if (cached && now - cacheTimestamp < CACHE_TTL) {
    return cached;
  }

  // 1단계: 정적 JSON 우선 시도 (GitHub Actions가 생성)
  const staticData = readStaticJson();
  if (staticData) {
    cached = staticData;
    cacheTimestamp = now;
    console.log(
      `[OY] 정적 JSON 사용: ${staticData.count}개 (${staticData.updatedAt})`
    );
    return cached;
  }

  // 2단계: 런타임 크롤링 폴백
  try {
    console.log("[OY] 런타임 크롤링 (JSON 없음 또는 비어있음)");
    const items = await crawlOliveYoung();
    cached = {
      updatedAt: items.length > 0 ? new Date().toISOString() : null,
      count: items.length,
      items,
    };
    cacheTimestamp = now;
    return cached;
  } catch (e) {
    console.error("[OY] 런타임 크롤링 실패:", e);
    if (!cached) {
      cached = { updatedAt: null, count: 0, items: [] };
    }
    return cached;
  }
}
