#!/usr/bin/env node
/**
 * 편의점(CU + GS25 + 세븐일레븐 + 이마트24) 1+1·2+1 행사 크롤링
 * GitHub Actions에서 매일 실행 → data/convenience.json 저장 → 자동 커밋
 *
 * 4개 모두 배치로 통합:
 *  - Vercel 런타임 크롤은 차단/타임아웃 위험 → 배치가 안정적
 *  - 한 곳 실패해도 나머지는 정상 저장 (Promise.allSettled)
 *  - 기존 데이터 보호: 정상 결과 0건일 때만 보존, 일부라도 수집되면 갱신
 */
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { stableId } from "./lib/stable-id.mjs";
import { pickBest, scoreConvenience } from "./lib/best-picks.mjs";
import { trackHistory } from "./lib/history-tracker.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "convenience.json");

const now = new Date();
const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ─── 세븐일레븐 ──────────────────────────────────────────────
async function crawlSeven() {
  console.log("[7-Eleven] 크롤링 시작...");
  const deals = [];
  const tabs = [
    ["1+1", "1"],
    ["2+1", "2"],
  ];

  for (const [label, pTab] of tabs) {
    for (let page = 1; page <= 4; page++) {
      try {
        const res = await fetch(
          "https://www.7-eleven.co.kr/product/listMoreAjax.asp",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": UA,
            },
            body: `intPageSize=100&intCurrPage=${page}&pTab=${pTab}`,
          }
        );
        const html = await res.text();
        const $ = cheerio.load(html);
        let pageCount = 0;

        $(".tit_product").each((i, el) => {
          const name = $(el).text().trim();
          const li = $(el).closest("li");
          const priceText =
            li.find(".infowrap .price span").first().text().trim() ||
            li.find(".price_list span").first().text().trim();
          const imgSrc = li.find(".pic_product img").first().attr("src") || "";
          const imageUrl = imgSrc
            ? imgSrc.startsWith("http")
              ? imgSrc
              : `https://www.7-eleven.co.kr${imgSrc}`
            : "";

          if (!name) return;
          pageCount++;

          deals.push({
            id: stableId("seven", name, `${name} ${label}`, label),
            source: "seven",
            category: "convenience",
            title: `${name} ${label}`,
            description: `${priceText ? priceText + "원 · " : ""}${label} 행사`,
            discount: label,
            brand: name,
            price: priceText ? `${priceText}원` : undefined,
            imageUrl,
            startDate,
            endDate,
          });
        });

        if (pageCount === 0) break;
      } catch (e) {
        console.error(`  ${label} page${page} 실패:`, e.message);
      }
    }
  }

  console.log(`[7-Eleven] ${deals.length}개 완료`);
  return deals;
}

// ─── 이마트24 ────────────────────────────────────────────────
async function crawlEmart24() {
  console.log("[이마트24] 크롤링 시작...");
  const deals = [];
  const tabs = [
    ["1+1", "1"],
    ["2+1", "2"],
  ];

  for (const [label, categorySeq] of tabs) {
    for (let page = 1; page <= 10; page++) {
      try {
        const res = await fetch(
          `https://www.emart24.co.kr/goods/event?page=${page}&category_seq=${categorySeq}`,
          {
            headers: { "User-Agent": UA },
          }
        );
        const html = await res.text();
        const $ = cheerio.load(html);
        let pageCount = 0;

        $(".itemWrap").each((i, el) => {
          const name = $(el).find(".itemtitle p a").text().trim();
          const priceText = $(el)
            .find(".itemTxtWrap .price")
            .text()
            .replace(/원|\s/g, "")
            .trim();
          const imgSrc = $(el).find(".itemSpImg img").attr("src") || "";
          const tag = $(el).find(".itemTit .twopl, .itemTit .onepl").text().trim();

          if (!name) return;
          if (label === "1+1" && tag && !/1\s*\+\s*1/.test(tag)) return;
          if (label === "2+1" && tag && !/2\s*\+\s*1/.test(tag)) return;

          pageCount++;

          deals.push({
            id: stableId("emart24", name, `${name} ${label}`, label),
            source: "emart24",
            category: "convenience",
            title: `${name} ${label}`,
            description: `${priceText ? priceText + "원 · " : ""}${label} 행사`,
            discount: label,
            brand: name,
            price: priceText ? `${priceText}원` : undefined,
            imageUrl: imgSrc,
            startDate,
            endDate,
          });
        });

        if (pageCount === 0) break;
      } catch (e) {
        console.error(`  ${label} page${page} 실패:`, e.message);
      }
    }
  }

  console.log(`[이마트24] ${deals.length}개 완료`);
  return deals;
}

// ─── CU ──────────────────────────────────────────────────────
async function crawlCU() {
  console.log("[CU] 크롤링 시작...");
  const deals = [];
  // searchCondition: 23=1+1, 24=2+1 (CU 사이트 내부 코드)
  const types = [
    ["1+1", "23"],
    ["2+1", "24"],
  ];

  for (const [label, condition] of types) {
    for (let page = 1; page <= 5; page++) {
      try {
        const res = await fetch(
          "https://cu.bgfretail.com/event/plusAjax.do",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": UA,
              Referer: "https://cu.bgfretail.com/event/plus.do",
            },
            body: `searchCondition=${condition}&pageIndex=${page}&pageSize=100`,
          }
        );
        if (!res.ok) {
          console.error(`  CU ${label} page${page} status=${res.status}`);
          break;
        }
        const html = await res.text();
        const $ = cheerio.load(html);
        let pageCount = 0;

        $("li.prod_list").each((i, el) => {
          const name = $(el).find(".name p").text().trim();
          const priceText = $(el).find(".price strong").text().trim();
          const imgSrc = $(el).find("img.prod_img").attr("src") || "";
          const imageUrl = imgSrc.startsWith("//")
            ? `https:${imgSrc}`
            : imgSrc;

          if (!name) return;
          pageCount++;

          deals.push({
            id: stableId("cu", name, `${name} ${label}`, label),
            source: "cu",
            category: "convenience",
            title: `${name} ${label}`,
            description: `${priceText ? priceText + "원 · " : ""}${label} 행사`,
            discount: label,
            brand: name,
            price: priceText ? `${priceText}원` : undefined,
            imageUrl,
            startDate,
            endDate,
          });
        });

        if (pageCount === 0) break;
      } catch (e) {
        console.error(`  CU ${label} page${page} 실패:`, e.message);
        break;
      }
    }
  }

  console.log(`[CU] ${deals.length}개 완료`);
  return deals;
}

// ─── GS25 ────────────────────────────────────────────────────
async function crawlGS25() {
  console.log("[GS25] 크롤링 시작...");
  const deals = [];

  try {
    // Step 1: CSRF 토큰 + JSESSIONID 확보
    const pageRes = await fetch(
      "http://gs25.gsretail.com/gscvs/ko/products/event-goods",
      {
        headers: { "User-Agent": UA },
        redirect: "follow",
      }
    );
    if (!pageRes.ok) {
      console.error(`  GS25 페이지 진입 실패 status=${pageRes.status}`);
      return deals;
    }
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // CSRF 토큰: meta name="_token" 또는 input[name=CSRFToken] 둘 다 시도
    let csrf = $('meta[name="_token"]').attr("content") || "";
    if (!csrf) csrf = $("input[name=CSRFToken]").val() || "";

    // 쿠키
    const setCookies = pageRes.headers.getSetCookie?.() ?? [];
    const jsessionid = setCookies
      .map((c) => c.match(/JSESSIONID=([^;]+)/))
      .find(Boolean)?.[1];

    if (!csrf || !jsessionid) {
      console.error(
        `  GS25 CSRF/JSESSIONID 획득 실패 (csrf=${!!csrf}, sid=${!!jsessionid})`
      );
      return deals;
    }

    // Step 2: 상품 API 호출
    const types = [
      ["1+1", "ONE_TO_ONE"],
      ["2+1", "TWO_TO_ONE"],
    ];

    for (const [label, param] of types) {
      try {
        const res = await fetch(
          "http://gs25.gsretail.com/gscvs/ko/products/event-goods-search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Cookie: `JSESSIONID=${jsessionid}`,
              "User-Agent": UA,
              Referer:
                "http://gs25.gsretail.com/gscvs/ko/products/event-goods",
            },
            body: `CSRFToken=${csrf}&parameterList=${param}&pageNum=1&pageSize=200`,
          }
        );
        if (!res.ok) {
          console.error(`  GS25 ${label} 응답 status=${res.status}`);
          continue;
        }

        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
          if (typeof data === "string") data = JSON.parse(data);
        } catch {
          console.error(`  GS25 ${label} JSON 파싱 실패`);
          continue;
        }

        const products = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : Object.values(data ?? {});

        products.forEach((item, i) => {
          const name = item?.goodsNm;
          if (!name) return;
          const price = typeof item.price === "number" ? item.price : null;

          deals.push({
            id: stableId("gs25", name, `${name} ${label}`, label),
            source: "gs25",
            category: "convenience",
            title: `${name} ${label}`,
            description: `${price !== null ? price.toLocaleString() + "원 · " : ""}${label} 행사`,
            discount: label,
            brand: name,
            price: price !== null ? `${price.toLocaleString()}원` : undefined,
            imageUrl: item.attFileNm || "",
            startDate,
            endDate,
          });
        });
      } catch (e) {
        console.error(`  GS25 ${label} 요청 실패:`, e.message);
      }
    }
  } catch (e) {
    console.error("  GS25 진입 단계 실패:", e.message);
  }

  console.log(`[GS25] ${deals.length}개 완료`);
  return deals;
}

// ─── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log("=== 편의점 혜택 크롤링 시작 ===");
  const start = Date.now();

  const [cuRes, gs25Res, sevenRes, emart24Res] = await Promise.allSettled([
    crawlCU(),
    crawlGS25(),
    crawlSeven(),
    crawlEmart24(),
  ]);

  const cu = cuRes.status === "fulfilled" ? cuRes.value : [];
  const gs25 = gs25Res.status === "fulfilled" ? gs25Res.value : [];
  const seven = sevenRes.status === "fulfilled" ? sevenRes.value : [];
  const emart24 = emart24Res.status === "fulfilled" ? emart24Res.value : [];

  // 같은 source 안에서 (brand+discount) 중복 제거
  const dedupBySource = (arr) => {
    const seen = new Set();
    return arr.filter((d) => {
      const key = `${d.source}|${d.brand}|${d.discount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const cuU = dedupBySource(cu);
  const gs25U = dedupBySource(gs25);
  const sevenU = dedupBySource(seven);
  const emart24U = dedupBySource(emart24);

  const all = [...cuU, ...gs25U, ...sevenU, ...emart24U];

  // 정상 결과가 전부 0건이면 기존 데이터 보호 (덮어쓰지 않음)
  if (all.length === 0) {
    console.error("\n=== 모든 편의점 크롤링 실패. 기존 data/convenience.json 보호 ===");
    process.exit(1);
  }

  // 부분 실패 시 기존 데이터 일부 보존:
  // - 한 곳이라도 0건이면 같은 source의 기존 데이터를 유지 (회귀 방지)
  let preserved = { cu: 0, gs25: 0, seven: 0, emart24: 0 };
  try {
    const prev = JSON.parse(readFileSync(DATA_PATH, "utf8"));
    const prevDeals = Array.isArray(prev?.deals) ? prev.deals : [];
    if (cuU.length === 0) {
      const p = prevDeals.filter((d) => d.source === "cu");
      all.push(...p);
      preserved.cu = p.length;
    }
    if (gs25U.length === 0) {
      const p = prevDeals.filter((d) => d.source === "gs25");
      all.push(...p);
      preserved.gs25 = p.length;
    }
    if (sevenU.length === 0) {
      const p = prevDeals.filter((d) => d.source === "seven");
      all.push(...p);
      preserved.seven = p.length;
    }
    if (emart24U.length === 0) {
      const p = prevDeals.filter((d) => d.source === "emart24");
      all.push(...p);
      preserved.emart24 = p.length;
    }
  } catch {
    // 기존 파일 없거나 파싱 실패 → 보존 없이 진행
  }

  const summary = {
    cu: cuU.length || preserved.cu,
    gs25: gs25U.length || preserved.gs25,
    seven: sevenU.length || preserved.seven,
    emart24: emart24U.length || preserved.emart24,
  };

  const best = pickBest(all, scoreConvenience);

  // 이력 추적 (JSON 저장 전에 이전 데이터와 비교)
  trackHistory(DATA_PATH, all, "convenience");

  const output = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    summary,
    best,
    deals: all,
  };

  writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");

  const elapsed = Date.now() - start;
  console.log(`\n=== 완료: ${all.length}개 저장 (${elapsed}ms) ===`);
  console.log(
    `  CU: ${cuU.length}${preserved.cu ? ` (보존 ${preserved.cu})` : ""}, ` +
      `GS25: ${gs25U.length}${preserved.gs25 ? ` (보존 ${preserved.gs25})` : ""}, ` +
      `세븐일레븐: ${sevenU.length}${preserved.seven ? ` (보존 ${preserved.seven})` : ""}, ` +
      `이마트24: ${emart24U.length}${preserved.emart24 ? ` (보존 ${preserved.emart24})` : ""}`
  );
  console.log(`  파일: ${DATA_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
