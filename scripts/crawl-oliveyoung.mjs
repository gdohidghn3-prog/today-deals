#!/usr/bin/env node
/**
 * 올리브영 랭킹 (베스트셀러) 크롤링 - 배치
 * GitHub Actions에서 매일 실행 → data/oliveyoung.json 저장 → 자동 커밋.
 *
 * 헤더/UA/파싱은 lib/crawlers/oliveyoung-shared.mjs와 단일 소스로 공유.
 *
 * Phase 2 강화:
 *  - 데스크톱 UA → 403/빈응답 시 모바일 UA로 전체 재시도
 *  - 페이지 1~MAX_PAGES_BATCH 순차 수집, 빈 페이지 즉시 break
 *  - id/(brand+name) 중복 제거
 *  - MIN_THRESHOLD 미달 시 기존 data/oliveyoung.json 보호 (덮어쓰지 않음)
 *  - 실패 시 debug HTML 파일로 저장 → CI artifact 업로드 대상
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  HOME_URL,
  getBestUrl,
  buildBrowserHeaders,
  extractCookies,
  parseListHtml,
  dedupeItems,
  curlFetch,
  OY_CATEGORIES,
  MAX_PAGES_BATCH,
  MIN_THRESHOLD,
} from "../lib/crawlers/oliveyoung-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data", "oliveyoung.json");
const DEBUG_DIR = join(ROOT, "debug");

// 페이지 간 사람처럼 보이게 약간 지연
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dumpDebug(name, content) {
  try {
    mkdirSync(DEBUG_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = join(DEBUG_DIR, `${name}-${ts}.html`);
    writeFileSync(path, content, "utf8");
    console.log(`[OliveYoung] 디버그 파일 저장: ${path}`);
  } catch (e) {
    console.warn("[OliveYoung] 디버그 파일 저장 실패:", e.message);
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.mobile]
 * @param {boolean} [opts.curl] - curl 사용 (Node.js fetch TLS 핑거프린트 차단 대비)
 */
async function tryCrawl({ mobile, curl: useCurl }) {
  const label = useCurl
    ? mobile ? "CURL_MOBILE" : "CURL_DESKTOP"
    : mobile ? "MOBILE" : "DESKTOP";
  const baseHeaders = buildBrowserHeaders({ mobile });

  // curl 모드: 쿠키/홈 방문 불필요 → curlFetch로 직접 랭킹 요청
  if (useCurl) {
    console.log(`\n[OliveYoung][${label}] curl로 랭킹 직접 요청...`);
    const collected = [];
    let lastStatus = 0;
    const maxPages = useCurl ? 1 : MAX_PAGES_BATCH; // curl 모드: 1페이지만 (카테고리별 수집이 메인)
    for (let page = 1; page <= maxPages; page++) {
      const startRank = (page - 1) * 100 + 1;
      console.log(`[OliveYoung][${label}] 랭킹 페이지 ${page} 요청...`);

      const { status, body } = await curlFetch(getBestUrl(page), {
        ...baseHeaders,
        Referer: HOME_URL,
      });
      lastStatus = status;
      console.log(`[OliveYoung][${label}] page=${page} status=${status}`);

      if (status !== 200 || !body) {
        if (body) dumpDebug(`rank-${label}-p${page}-${status}`, body.slice(0, 50000));
        break;
      }

      const pageItems = parseListHtml(body, startRank);
      if (pageItems.length === 0) {
        console.log(`[OliveYoung][${label}] page=${page} 결과 0개 → 종료`);
        if (page === 1) dumpDebug(`rank-${label}-p1-empty`, body.slice(0, 50000));
        break;
      }

      collected.push(...pageItems);
      console.log(
        `[OliveYoung][${label}] page=${page} 수집=${pageItems.length}개 (누적 ${collected.length})`
      );
      if (page < MAX_PAGES_BATCH) await sleep(3000);
    }
    return { items: dedupeItems(collected), lastStatus, label };
  }

  // Node.js fetch 모드 (폴백)
  console.log(`\n[OliveYoung][${label}] 홈페이지 방문...`);
  let cookie = "";
  let homeStatus = 0;
  try {
    const homeRes = await fetch(HOME_URL, {
      headers: { ...baseHeaders, "Sec-Fetch-Site": "none" },
    });
    homeStatus = homeRes.status;
    if (homeRes.ok) {
      cookie = extractCookies(homeRes);
    } else {
      const text = await homeRes.text().catch(() => "");
      dumpDebug(`home-${label}-${homeRes.status}`, text.slice(0, 50000));
    }
  } catch (e) {
    console.warn(`[OliveYoung][${label}] 홈페이지 요청 실패:`, e.message);
  }
  console.log(
    `[OliveYoung][${label}] home=${homeStatus} 쿠키=${cookie ? "획득" : "없음"}`
  );
  if (homeStatus !== 200) {
    console.log(
      `[OliveYoung][${label}] home 차단됨, best 페이지 직접 시도 (Referer만)`
    );
  }
  await sleep(700);

  const collected = [];
  let lastStatus = 0;
  for (let page = 1; page <= MAX_PAGES_BATCH; page++) {
    const startRank = (page - 1) * 100 + 1;
    console.log(`[OliveYoung][${label}] 랭킹 페이지 ${page} 요청...`);

    let res;
    try {
      res = await fetch(getBestUrl(page), {
        headers: {
          ...baseHeaders,
          "Sec-Fetch-Site": "same-origin",
          Referer: HOME_URL,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
    } catch (e) {
      console.warn(`[OliveYoung][${label}] page=${page} 네트워크 오류:`, e.message);
      break;
    }
    lastStatus = res.status;
    console.log(`[OliveYoung][${label}] page=${page} status=${res.status}`);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      dumpDebug(`rank-${label}-p${page}-${res.status}`, text.slice(0, 50000));
      break;
    }

    const html = await res.text();
    const pageItems = parseListHtml(html, startRank);

    if (pageItems.length === 0) {
      console.log(`[OliveYoung][${label}] page=${page} 결과 0개 → 종료`);
      if (page === 1) {
        dumpDebug(`rank-${label}-p1-empty`, html.slice(0, 50000));
      }
      break;
    }

    collected.push(...pageItems);
    console.log(
      `[OliveYoung][${label}] page=${page} 수집=${pageItems.length}개 (누적 ${collected.length})`
    );

    if (page < MAX_PAGES_BATCH) {
      await sleep(500);
    }
  }

  return { items: dedupeItems(collected), lastStatus, label };
}

/**
 * curl + 데스크톱 UA로 카테고리 1페이지(100개) 수집.
 * 403 시 1회 재시도(5초 백오프). 실패 시 빈 배열 반환.
 */
async function crawlCategory(catCode, catLabel) {
  const headers = buildBrowserHeaders({});
  const url = getBestUrl(1, catCode);

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log(`[OliveYoung][CAT] ${catLabel} 재시도 (5초 대기)...`);
      await sleep(5000);
    }
    console.log(`[OliveYoung][CAT] ${catLabel}(${catCode}) 요청...`);

    const { status, body } = await curlFetch(url, {
      ...headers,
      Referer: "https://www.oliveyoung.co.kr/store/main/getBestList.do",
    });

    if (status === 200 && body) {
      const items = parseListHtml(body, 1);
      for (const item of items) {
        item.category = catLabel;
      }
      console.log(`[OliveYoung][CAT] ${catLabel}: ${items.length}개`);
      return items;
    }

    if (status !== 403) {
      console.warn(`[OliveYoung][CAT] ${catLabel} status=${status} → 스킵`);
      return [];
    }
    // 403 → 재시도
  }

  console.warn(`[OliveYoung][CAT] ${catLabel} 2회 실패 → 스킵`);
  return [];
}

async function main() {
  // ── 1단계: 전체 랭킹 (기존 로직) ──
  let result = await tryCrawl({ curl: true });

  if (result.items.length === 0) {
    console.log("\n[OliveYoung] curl 데스크톱 결과 0개 → curl 모바일로 재시도");
    result = await tryCrawl({ curl: true, mobile: true });
  }

  if (result.items.length === 0) {
    console.log("\n[OliveYoung] curl 실패 → Node.js fetch 데스크톱으로 재시도");
    result = await tryCrawl({ mobile: false });
  }

  if (result.items.length === 0) {
    console.log("\n[OliveYoung] fetch 데스크톱 실패 → fetch 모바일로 재시도");
    result = await tryCrawl({ mobile: true });
  }

  // 전체 랭킹 아이템에 category: "전체" 태깅
  for (const item of result.items) {
    item.category = "전체";
  }

  if (result.items.length === 0) {
    console.error(
      `[OliveYoung] 전체 랭킹 크롤링 실패 (last status=${result.lastStatus}). data 파일 보호.`
    );
    process.exit(1);
  }

  if (result.items.length < MIN_THRESHOLD) {
    console.error(
      `[OliveYoung] 전체 랭킹 ${result.items.length}개 < 임계치 ${MIN_THRESHOLD}개. data 파일 보호.`
    );
    process.exit(1);
  }

  // ── 2단계: 카테고리별 랭킹 (각 100개 × 20개) ──
  console.log(`\n[OliveYoung] 카테고리별 랭킹 수집 시작 (${OY_CATEGORIES.length}개)...`);

  const allCategoryItems = [];
  for (let i = 0; i < OY_CATEGORIES.length; i++) {
    const cat = OY_CATEGORIES[i];
    const items = await crawlCategory(cat.code, cat.label);
    allCategoryItems.push(...items);
    if (i < OY_CATEGORIES.length - 1) await sleep(3000); // Cloudflare rate limit 방지
  }

  console.log(`\n[OliveYoung] 카테고리별 수집 합계: ${allCategoryItems.length}개`);

  // ── 3단계: 통합 + 중복 처리 ──
  // 전체 랭킹 아이템이 카테고리에도 있으면 category 정보를 보강
  const catMap = new Map(); // id → category
  for (const item of allCategoryItems) {
    if (!catMap.has(item.id)) {
      catMap.set(item.id, item.category);
    }
  }

  // 전체 랭킹 아이템에 카테고리 정보 보강
  for (const item of result.items) {
    if (catMap.has(item.id)) {
      item.category = catMap.get(item.id);
    }
  }

  // 카테고리에만 있는 아이템 추가 (전체 랭킹에 없는 것)
  const existingIds = new Set(result.items.map((i) => i.id));
  const categoryOnly = allCategoryItems.filter((i) => !existingIds.has(i.id));
  const uniqueCategoryOnly = dedupeItems(categoryOnly);

  const allItems = [...result.items, ...uniqueCategoryOnly];

  const saleCount = allItems.filter((i) => i.flags.includes("세일")).length;
  const couponCount = allItems.filter((i) => i.flags.includes("쿠폰")).length;

  // 카테고리별 통계
  const catStats = {};
  for (const item of allItems) {
    const c = item.category || "미분류";
    catStats[c] = (catStats[c] || 0) + 1;
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    count: allItems.length,
    summary: {
      total: allItems.length,
      sale: saleCount,
      coupon: couponCount,
      categories: catStats,
    },
    categories: OY_CATEGORIES.map((c) => c.label),
    items: allItems,
  };

  writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `\n[OliveYoung] 총 ${allItems.length}개 저장 완료 (전체=${result.items.length}, 카테고리=${uniqueCategoryOnly.length}추가)`
  );
  console.log(`[OliveYoung] 카테고리별:`, JSON.stringify(catStats));
}

main().catch((e) => {
  console.error("[OliveYoung] 예기치 못한 오류:", e);
  process.exit(1);
});
