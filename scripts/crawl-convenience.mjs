#!/usr/bin/env node
/**
 * 편의점(세븐일레븐 + 이마트24) 1+1·2+1 행사 크롤링
 * GitHub Actions에서 매일 실행 → data/convenience.json 저장 → 자동 커밋
 *
 * 세븐일레븐: Vercel 런타임에서 차단/타임아웃되어 GH Actions로 이관
 * 이마트24: 신규 추가
 */
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "convenience.json");

const now = new Date();
const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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
          // 가격: infowrap 우선, fallback price_list
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
            id: `seven-${label.replace("+", "")}-p${page}-${i}`,
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
          // 행사 태그 검증 (1+1 / 2+1)
          const tag = $(el).find(".itemTit .twopl, .itemTit .onepl").text().trim();

          if (!name) return;
          // 카테고리에 맞지 않는 항목 스킵
          if (label === "1+1" && tag && !/1\s*\+\s*1/.test(tag)) return;
          if (label === "2+1" && tag && !/2\s*\+\s*1/.test(tag)) return;

          pageCount++;

          deals.push({
            id: `emart24-${label.replace("+", "")}-p${page}-${i}`,
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

// ─── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log("=== 편의점 혜택 크롤링 시작 ===");
  const start = Date.now();

  const [sevenRes, emart24Res] = await Promise.allSettled([
    crawlSeven(),
    crawlEmart24(),
  ]);

  const seven = sevenRes.status === "fulfilled" ? sevenRes.value : [];
  const emart24 = emart24Res.status === "fulfilled" ? emart24Res.value : [];

  // 중복 제거 (같은 source+brand+discount 조합)
  const seen = new Set();
  const dedup = (arr) =>
    arr.filter((d) => {
      const key = `${d.source}|${d.brand}|${d.discount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const sevenU = dedup(seven);
  seen.clear();
  const emart24U = dedup(emart24);

  const all = [...sevenU, ...emart24U];
  const output = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    summary: { seven: sevenU.length, emart24: emart24U.length },
    deals: all,
  };

  writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");

  const elapsed = Date.now() - start;
  console.log(`\n=== 완료: ${all.length}개 저장 (${elapsed}ms) ===`);
  console.log(`  세븐일레븐: ${sevenU.length}, 이마트24: ${emart24U.length}`);
  console.log(`  파일: ${DATA_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
