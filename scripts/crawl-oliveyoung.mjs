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
    for (let page = 1; page <= MAX_PAGES_BATCH; page++) {
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
      if (page < MAX_PAGES_BATCH) await sleep(500);
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

async function main() {
  // 1차: curl + 데스크톱 UA (Cloudflare TLS 핑거프린트 통과)
  let result = await tryCrawl({ curl: true });

  // 2차: curl + 모바일 UA
  if (result.items.length === 0) {
    console.log("\n[OliveYoung] curl 데스크톱 결과 0개 → curl 모바일로 재시도");
    result = await tryCrawl({ curl: true, mobile: true });
  }

  // 3차: Node.js fetch 데스크톱 (curl 없는 환경 대비)
  if (result.items.length === 0) {
    console.log("\n[OliveYoung] curl 실패 → Node.js fetch 데스크톱으로 재시도");
    result = await tryCrawl({ mobile: false });
  }

  // 4차: Node.js fetch 모바일
  if (result.items.length === 0) {
    console.log("\n[OliveYoung] fetch 데스크톱 실패 → fetch 모바일로 재시도");
    result = await tryCrawl({ mobile: true });
  }

  const items = result.items;

  if (items.length === 0) {
    console.error(
      `[OliveYoung] 크롤링 실패 (last status=${result.lastStatus}). data 파일 보호 (덮어쓰지 않음).`
    );
    process.exit(1);
  }

  if (items.length < MIN_THRESHOLD) {
    console.error(
      `[OliveYoung] 수집 ${items.length}개 < 최소 임계치 ${MIN_THRESHOLD}개. 비정상 응답으로 간주, data 파일 보호.`
    );
    process.exit(1);
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
    `\n[OliveYoung] ${items.length}개 저장 완료 (세일 ${saleCount}, 쿠폰 ${couponCount}, via ${result.label})`
  );
}

main().catch((e) => {
  console.error("[OliveYoung] 예기치 못한 오류:", e);
  process.exit(1);
});
