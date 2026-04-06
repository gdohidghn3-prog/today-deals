#!/usr/bin/env node
/**
 * 통신사 3사 멤버십 혜택 크롤링 스크립트
 * GitHub Actions에서 매일 실행 → data/telecom.json 저장 → 자동 커밋
 */
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "telecom.json");

const now = new Date();
const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

function categorize(name) {
  const n = name.toLowerCase();
  if (/커피|카페|스타벅스|투썸|이디야|할리스|메가커피|메가mgc|공차|폴바셋|배스킨|던킨|뚜레쥬르|파리바게/.test(n)) return "cafe";
  if (/cgv|메가박스|롯데시네마|영화|공연|롯데월드|핑크퐁|아쿠아리움/.test(n)) return "culture";
  if (/버거킹|맥도날드|피자|bbq|bhc|아웃백|vips|롯데리아|샐러디|도미노/.test(n)) return "food";
  if (/이마트|롯데마트|올리브영|cj더마켓|면세점|플라워|11번가|마트/.test(n)) return "shopping";
  if (/cu$|gs25|세븐일레븐/.test(n)) return "convenience";
  return "etc";
}

// ── SKT (HTTP, 브라우저 불필요) ──
async function crawlSKT() {
  console.log("[SKT] 크롤링 시작...");
  const res = await fetch("https://sktmembership.tworld.co.kr/mps/pc-bff/benefitbrand/brandList.do", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const deals = [];

  $(".benefit-box").each((i, el) => {
    const brand = $(el).find(".brand").text().trim();
    if (!brand) return;
    const img = $(el).find(".logo img").attr("src") || "";
    const benefits = [];
    $(el).find(".bnf-info").first().find(".info").each((_, info) => {
      const grades = [];
      $(info).find(".badge-circle").each((_, g) => {
        const cls = $(g).attr("class") || "";
        if (cls.includes("vip")) grades.push("VIP");
        if (cls.includes("gold")) grades.push("골드");
        if (cls.includes("silver")) grades.push("실버");
      });
      $(info).find(".blind").remove();
      const text = $(info).text().replace(/\s+/g, " ").trim();
      if (text && grades.length) benefits.push({ grades, text });
    });
    if (!benefits.length) return;

    const main = benefits[0];
    const dm = main.text.match(/(\d+%)\s*할인/);
    const discount = dm ? dm[1] : main.text.split("(")[0].trim();
    const allGrades = [...new Set(benefits.flatMap((b) => b.grades))];

    deals.push({
      id: `skt-${i}`,
      source: "skt",
      category: categorize(brand),
      title: `${brand} ${discount.includes("%") ? discount + " 할인" : discount}`,
      description: benefits.map((b) => `[${b.grades.join("/")}] ${b.text}`).join(" | "),
      discount,
      brand,
      membershipGrade: allGrades.join("·"),
      imageUrl: img,
      link: "https://sktmembership.tworld.co.kr",
      startDate,
      endDate,
    });
  });

  console.log(`[SKT] ${deals.length}개 완료`);
  return deals;
}

// ── KT (Playwright) ──
async function crawlKT(browser) {
  console.log("[KT] 크롤링 시작...");
  const page = await browser.newPage();
  await page.goto("https://membership.kt.com/discount/partner/PartnerList.do", {
    waitUntil: "networkidle",
    timeout: 20000,
  }).catch(() => {});
  await page.waitForTimeout(5000);

  const partners = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    document.querySelectorAll("li, .item, [class*=card]").forEach((el) => {
      el.querySelectorAll("img").forEach((img) => {
        const alt = img.alt?.trim();
        const text = el.innerText?.trim() || "";
        if (!alt || alt.length < 2 || alt.length > 50 || seen.has(alt)) return;
        if (/로고|한국|인증|facebook|youtube|instagram|블로그|유심|에어컨|안심 QR|자세히/.test(alt)) return;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const grade = lines.find((l) => /전등급|VIP|VVIP|골드|실버/.test(l)) || "전등급";
        const desc = lines.find((l) => /할인|무료|쿠폰|%|원/.test(l)) || "";
        if (desc) {
          seen.add(alt);
          results.push({
            brand: alt.replace(/\(고객 보답\)/, "").trim(),
            grade,
            description: desc.substring(0, 150),
            img: img.src || "",
          });
        }
      });
    });
    return results;
  });

  await page.close();

  const deals = partners.map((p, i) => {
    const dm = p.description.match(/(\d+%)\s*할인/);
    const pm = p.description.match(/([\d,]+원)/);
    const discount = dm?.[1] || pm?.[1] || "혜택";
    return {
      id: `kt-${i}`,
      source: "kt",
      category: categorize(p.brand),
      title: `${p.brand} ${discount.includes("%") || discount.includes("원") ? discount + " 할인" : discount}`,
      description: p.description,
      discount,
      brand: p.brand,
      membershipGrade: p.grade,
      imageUrl: p.img,
      link: "https://membership.kt.com/discount/partner/PartnerList.do",
      startDate,
      endDate,
    };
  });

  console.log(`[KT] ${deals.length}개 완료`);
  return deals;
}

// ── LGU+ (Playwright) ──
async function crawlLGU(browser) {
  console.log("[LGU+] 크롤링 시작...");
  const page = await browser.newPage();
  await page.goto("https://www.lguplus.com/benefit-membership", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const benefits = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const text = document.body.innerText || "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next1 = lines[i + 1] || "";
      const next2 = lines[i + 2] || "";
      if (/^(스타벅스|네이버플러스|CGV|배스킨라빈스|롯데월드|할리스|투썸|이디야|CU|GS25|BBQ|버거킹|도미노|메가박스|롯데시네마|올리브영|공차|뚜레쥬르)/.test(line)) {
        const brandName = line.split("|")[0].split("[")[0].trim();
        if (seen.has(brandName)) continue;
        const desc = [next1, next2].filter((l) => /할인|무료|쿠폰|%|원|제공|이용|예매/.test(l)).join(" | ");
        if (desc) {
          seen.add(brandName);
          const grade = [line, next1, next2].find((l) => /VVIP|VIP/.test(l)) || "VIP콕";
          results.push({ brand: brandName, grade, description: desc.substring(0, 150) });
        }
      }
    }
    return results;
  });

  await page.close();

  const deals = benefits.map((b, i) => {
    const dm = b.description.match(/(\d+%)\s*할인/);
    const free = /무료/.test(b.description);
    const discount = dm?.[1] || (free ? "무료" : "혜택");
    return {
      id: `lgu-${i}`,
      source: "lgu",
      category: categorize(b.brand),
      title: `${b.brand} ${discount.includes("%") ? discount + " 할인" : discount}`,
      description: b.description,
      discount,
      brand: b.brand,
      membershipGrade: b.grade.replace(/.*?(VVIP|VIP|전등급).*/, "$1").substring(0, 20),
      link: "https://www.lguplus.com/benefit-membership",
      startDate,
      endDate,
    };
  });

  console.log(`[LGU+] ${deals.length}개 완료`);
  return deals;
}

// ── 메인 ──
async function main() {
  console.log("=== 통신사 혜택 크롤링 시작 ===");
  const start = Date.now();

  // SKT는 HTTP만으로 가능
  const skt = await crawlSKT();

  // KT/LGU+는 Playwright 필요
  const browser = await chromium.launch({ headless: true });
  const kt = await crawlKT(browser);
  const lgu = await crawlLGU(browser);
  await browser.close();

  const all = [...skt, ...kt, ...lgu];
  const output = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    summary: { skt: skt.length, kt: kt.length, lgu: lgu.length },
    deals: all,
  };

  writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");

  const elapsed = Date.now() - start;
  console.log(`\n=== 완료: ${all.length}개 저장 (${elapsed}ms) ===`);
  console.log(`  SKT: ${skt.length}, KT: ${kt.length}, LGU+: ${lgu.length}`);
  console.log(`  파일: ${DATA_PATH}`);
}

main().catch(console.error);
