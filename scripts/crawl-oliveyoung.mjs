#!/usr/bin/env node
/**
 * 올리브영 랭킹 (베스트셀러) 크롤링
 * GitHub Actions에서 매일 실행 → data/oliveyoung.json 저장 → 자동 커밋
 *
 * Vercel 런타임에서 Cloudflare _cfuvid 쿠키 기반 2단계 요청 필요.
 * 런타임 실패 시를 대비해 정적 JSON을 사전 생성.
 */
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "oliveyoung.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HOME_URL = "https://www.oliveyoung.co.kr/store/main/main.do";
const BEST_URL =
  "https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&prdSort=01&pageIdx=1&rowsPerPage=100";

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const pairs = [];
  for (const line of raw) {
    const first = line.split(";", 1)[0]?.trim();
    if (first) pairs.push(first);
  }
  return pairs.join("; ");
}

async function crawl() {
  console.log("[OliveYoung] 홈페이지 방문하여 쿠키 획득...");
  let cookie = "";

  const browserHeaders = {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  try {
    const homeRes = await fetch(HOME_URL, { headers: browserHeaders });
    cookie = extractCookies(homeRes);
    console.log(
      `[OliveYoung] home=${homeRes.status} 쿠키=${cookie ? "획득" : "없음"}`
    );
  } catch (e) {
    console.warn("[OliveYoung] 홈페이지 요청 실패:", e.message);
  }

  // 약간의 대기 (봇 탐지 완화)
  await new Promise((r) => setTimeout(r, 500));

  console.log("[OliveYoung] 랭킹 페이지 크롤링...");
  const res = await fetch(BEST_URL, {
    headers: {
      ...browserHeaders,
      "Sec-Fetch-Site": "same-origin",
      Referer: HOME_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  console.log(`[OliveYoung] rank=${res.status}`);
  if (!res.ok) throw new Error(`oliveyoung ${res.status}`);
  const html = await res.text();
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

async function main() {
  try {
    const items = await crawl();
    if (items.length === 0) {
      throw new Error("크롤링 결과가 비어있음. 페이지 구조 변경 의심.");
    }

    const saleCount = items.filter((i) => i.flags.includes("세일")).length;
    const couponCount = items.filter((i) => i.flags.includes("쿠폰")).length;

    const payload = {
      updatedAt: new Date().toISOString(),
      count: items.length,
      summary: {
        total: items.length,
        sale: saleCount,
        coupon: couponCount,
      },
      items,
    };

    writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf8");
    console.log(
      `[OliveYoung] ${items.length}개 저장 완료 (세일 ${saleCount}, 쿠폰 ${couponCount})`
    );
  } catch (e) {
    console.error("[OliveYoung] 크롤링 실패:", e.message);
    process.exit(1);
  }
}

main();
