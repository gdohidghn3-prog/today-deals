import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { join } from "path";

export type OliveYoungItem = {
  id: string;
  rank: number;
  brand: string;
  name: string;
  salePrice: number | null;
  origPrice: number | null;
  discountRate: number | null; // 0~100
  imageUrl: string;
  link: string;
  flags: string[]; // 세일, 쿠폰, 증정, 오늘드림 등
};

const HOME_URL = "https://www.oliveyoung.co.kr/store/main/main.do";
const BEST_URL =
  "https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&prdSort=01&pageIdx=1&rowsPerPage=100";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return isFinite(n) && n > 0 ? n : null;
}

// Set-Cookie 헤더들에서 name=value 페어만 추출해 하나의 Cookie 헤더로 조합
function extractCookies(res: Response): string {
  const raw =
    // Node 18+: getSetCookie() 지원
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  const pairs: string[] = [];
  for (const line of raw) {
    const first = line.split(";", 1)[0]?.trim();
    if (first) pairs.push(first);
  }
  return pairs.join("; ");
}

export async function crawlOliveYoung(): Promise<OliveYoungItem[]> {
  // 1단계: 메인 페이지 방문 → Cloudflare _cfuvid 쿠키 획득
  let cookie = "";
  try {
    const homeRes = await fetch(HOME_URL, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });
    cookie = extractCookies(homeRes);
  } catch {
    // 쿠키 획득 실패해도 시도는 계속
  }

  // 2단계: 쿠키 + Referer로 랭킹 페이지 요청
  const res = await fetch(BEST_URL, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      Referer: HOME_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    next: { revalidate: 21600 },
  });
  if (!res.ok) throw new Error(`oliveyoung ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const items: OliveYoungItem[] = [];

  $(".cate_prd_list > li").each((idx, el) => {
    const $el = $(el);
    const brand = $el.find(".tx_brand").first().text().trim();
    const name = $el.find(".tx_name").first().text().trim();
    if (!name) return;

    const salePrice = parsePrice($el.find(".tx_cur .tx_num").first().text());
    const origPrice = parsePrice($el.find(".tx_org .tx_num").first().text());

    // 루트 flags 컨테이너 1개만 사용 (중복 방지)
    const flagSet = new Set<string>();
    $el
      .find(".prd_flag, .icon_flag, .thumb_flag")
      .children()
      .each((_, f) => {
        const t = $(f).text().trim();
        if (t && t.length < 12) flagSet.add(t);
      });
    const flags = Array.from(flagSet);

    const img =
      $el.find(".prd_thumb img").attr("src") ||
      $el.find(".prd_thumb img").attr("data-src") ||
      "";

    const link = $el.find(".prd_thumb").attr("href") || $el.find("a").attr("href") || "";

    const goodsMatch = link.match(/goodsNo=([A-Z0-9]+)/);
    const id = goodsMatch ? goodsMatch[1] : `oy-${idx}`;

    const discountRate =
      salePrice != null && origPrice != null && origPrice > salePrice
        ? Math.round(((origPrice - salePrice) / origPrice) * 100)
        : null;

    items.push({
      id,
      rank: idx + 1,
      brand,
      name,
      salePrice,
      origPrice,
      discountRate,
      imageUrl: img,
      link: link.startsWith("http")
        ? link
        : `https://www.oliveyoung.co.kr${link}`,
      flags,
    });
  });

  return items;
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
      updatedAt: new Date().toISOString(),
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
