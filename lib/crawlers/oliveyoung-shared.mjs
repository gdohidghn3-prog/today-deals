/**
 * 올리브영 크롤링 공통 모듈
 *
 * 두 진입점에서 동일하게 사용:
 *  - scripts/crawl-oliveyoung.mjs (GitHub Actions 배치)
 *  - lib/crawlers/oliveyoung.ts    (Vercel 런타임 fallback)
 *
 * 헤더/UA/파싱 규칙을 단일 소스로 유지해 한쪽만 깨지는 사고를 방지한다.
 *
 * Phase 1 진단 결과(2026-04-16):
 *   현재 UA(Chrome/124)로 home/rank 모두 403 차단.
 *   → 더 최신 UA + 풀 sec-* 헤더 + 모바일 UA fallback 필요.
 *
 * Phase 3 (2026-04-17):
 *   Cloudflare Managed Challenge 활성화로 Node.js fetch가 TLS 핑거프린트로 차단됨.
 *   → curl은 다른 TLS 스택이라 일반 데스크톱 UA로도 정상 통과.
 *   → curlFetch()로 HTTP 요청, 파싱은 기존 Cheerio 유지.
 */

import * as cheerio from "cheerio";

export const HOME_URL = "https://www.oliveyoung.co.kr/store/main/main.do";

export const PAGE_SIZE = 100;

export const DISP_CAT = "900000100100001"; // 전체 카테고리 통합

export function getBestUrl(pageIdx) {
  return `https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=${DISP_CAT}&prdSort=01&pageIdx=${pageIdx}&rowsPerPage=${PAGE_SIZE}`;
}

// 최신(2025-2026) Chrome UA
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const COMMON_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export function buildBrowserHeaders(opts = {}) {
  const mobile = opts.mobile === true;
  return {
    "User-Agent": mobile ? MOBILE_UA : DESKTOP_UA,
    ...COMMON_HEADERS,
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": mobile ? "?1" : "?0",
    "Sec-Ch-Ua-Platform": mobile ? '"Android"' : '"Windows"',
  };
}

// Set-Cookie 헤더에서 name=value 페어만 추출해 단일 Cookie 헤더로 조합
export function extractCookies(res) {
  const raw = res.headers?.getSetCookie?.() ?? [];
  const pairs = [];
  for (const line of raw) {
    const first = line.split(";", 1)[0]?.trim();
    if (first) pairs.push(first);
  }
  return pairs.join("; ");
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 베스트 리스트 HTML을 파싱해 아이템 배열을 반환.
 * @param {string} html
 * @param {number} startRank 1-based 시작 순위 (페이지네이션 시 (page-1)*PAGE_SIZE + 1)
 * @returns {Array<object>} OliveYoungItem[]
 */
export function parseListHtml(html, startRank = 1) {
  const $ = cheerio.load(html);
  const items = [];

  $(".cate_prd_list > li").each((idx, el) => {
    const $el = $(el);
    const brand = $el.find(".tx_brand").first().text().trim();
    const name = $el.find(".tx_name").first().text().trim();
    if (!name) return;

    const salePrice = parsePrice($el.find(".tx_cur .tx_num").first().text());
    const origPrice = parsePrice($el.find(".tx_org .tx_num").first().text());

    const flagSet = new Set();
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

    const link =
      $el.find(".prd_thumb").attr("href") || $el.find("a").attr("href") || "";

    const goodsMatch = link.match(/goodsNo=([A-Z0-9]+)/);
    const id = goodsMatch ? goodsMatch[1] : `oy-${startRank + idx}`;

    const discountRate =
      salePrice != null && origPrice != null && origPrice > salePrice
        ? Math.round(((origPrice - salePrice) / origPrice) * 100)
        : null;

    items.push({
      id,
      rank: startRank + idx,
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

/**
 * curl을 사용한 HTTP 요청.
 * Node.js fetch는 TLS 핑거프린트가 Cloudflare에 봇으로 분류되므로
 * curl(OpenSSL 기반 TLS)을 대신 사용한다.
 *
 * @param {string} url
 * @param {object} [headers] key-value 헤더
 * @returns {Promise<{status: number, body: string}>}
 */
export async function curlFetch(url, headers = {}) {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  const args = ["-s", "--compressed", "-w", "\n__HTTP_STATUS__:%{http_code}", "-L"];
  for (const [k, v] of Object.entries(headers)) {
    args.push("-H", `${k}: ${v}`);
  }
  args.push(url);

  try {
    const { stdout } = await execFileAsync("curl", args, {
      maxBuffer: 5 * 1024 * 1024,
      timeout: 15000,
    });
    const statusMatch = stdout.match(/__HTTP_STATUS__:(\d+)$/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    const body = stdout.replace(/\n__HTTP_STATUS__:\d+$/, "");
    return { status, body };
  } catch (e) {
    return { status: 0, body: "" };
  }
}

/**
 * 동일 id 또는 (brand+name) 중복 제거.
 * 페이지네이션 시 인접 페이지에 같은 상품이 중복 노출되는 케이스 방어.
 */
export function dedupeItems(items) {
  const seenIds = new Set();
  const seenKeys = new Set();
  const out = [];
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    const key = `${item.brand}::${item.name}`;
    if (seenKeys.has(key)) continue;
    seenIds.add(item.id);
    seenKeys.add(key);
    out.push(item);
  }
  return out;
}

/**
 * 정상 수집 최소 임계치.
 * 이보다 적으면 비정상 응답으로 간주 → 기존 데이터 보호.
 */
export const MIN_THRESHOLD = 30;

/** 배치(GitHub Actions) 최대 페이지 수 */
export const MAX_PAGES_BATCH = 3;

/** 런타임(Vercel) 최대 페이지 수 - 응답시간 보호 */
export const MAX_PAGES_RUNTIME = 1;
