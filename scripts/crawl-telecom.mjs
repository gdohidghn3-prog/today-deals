#!/usr/bin/env node
/**
 * 통신사 3사 멤버십 혜택 크롤링 스크립트
 * GitHub Actions에서 매일 실행 → data/telecom.json 저장 → 자동 커밋
 *
 * 모두 HTTP 직접 호출 (Playwright 제거):
 *  - SKT: sktmembership.tworld.co.kr 공개 페이지 파싱
 *  - KT:  membership.kt.com 내부 AJAX (PartnerListHtml.json + 세션 쿠키)
 *  - LGU+: www.lguplus.com/uhdc/fo/prdv/mebfjnco/v1/jnco (REST JSON)
 */
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "telecom.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const now = new Date();
const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

function categorize(name) {
  const n = (name || "").toLowerCase();
  if (/커피|카페|스타벅스|투썸|이디야|할리스|메가커피|메가mgc|공차|폴바셋|배스킨|던킨|뚜레쥬르|파리바게/.test(n)) return "cafe";
  if (/cgv|메가박스|롯데시네마|영화|공연|롯데월드|핑크퐁|아쿠아리움|놀이공원/.test(n)) return "culture";
  if (/버거킹|맥도날드|피자|bbq|bhc|아웃백|vips|롯데리아|샐러디|도미노|kfc|뚜레/.test(n)) return "food";
  if (/이마트|롯데마트|올리브영|cj더마켓|면세점|플라워|11번가|마트|gs the fresh|쇼핑/.test(n)) return "shopping";
  if (/cu$|gs25|세븐일레븐|편의점/.test(n)) return "convenience";
  return "etc";
}

// HTML/엔티티 정리
function cleanText(s) {
  if (!s) return "";
  return String(s)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDiscount(text) {
  const t = cleanText(text);
  const pct = t.match(/(\d{1,3}%)\s*할인/);
  if (pct) return pct[1];
  const won = t.match(/([\d,]+원)\s*(?:할인)?/);
  if (won) return won[1];
  if (/무료/.test(t)) return "무료";
  if (/쿠폰/.test(t)) return "쿠폰";
  return "혜택";
}

// ── SKT (HTTP) ────────────────────────────────────────
async function crawlSKT() {
  console.log("[SKT] 크롤링 시작...");
  const res = await fetch(
    "https://sktmembership.tworld.co.kr/mps/pc-bff/benefitbrand/brandList.do",
    { headers: { "User-Agent": UA } }
  );
  const html = await res.text();
  const $ = cheerio.load(html);
  const deals = [];

  $(".benefit-box").each((i, el) => {
    const brand = $(el).find(".brand").text().trim();
    if (!brand) return;
    const img = $(el).find(".logo img").attr("src") || "";
    const benefits = [];
    $(el)
      .find(".bnf-info")
      .first()
      .find(".info")
      .each((_, info) => {
        const grades = [];
        $(info)
          .find(".badge-circle")
          .each((_, g) => {
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

// ── KT (HTTP, 세션 쿠키 + 페이지네이션) ──────────────
async function crawlKT() {
  console.log("[KT] 크롤링 시작...");

  // 1) 세션 쿠키 발급
  const init = await fetch(
    "https://membership.kt.com/discount/partner/PartnerList.do",
    { headers: { "User-Agent": UA }, redirect: "follow" }
  );
  const cookieHdr = init.headers.getSetCookie?.() || [];
  const cookies = cookieHdr.map((c) => c.split(";")[0]).join("; ");
  if (!cookies) {
    console.warn("[KT] 세션 쿠키 발급 실패 — 빈 결과 반환");
    return [];
  }

  async function fetchPage(page) {
    const res = await fetch(
      "https://membership.kt.com/discount/partner/PartnerListHtml.json",
      {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://membership.kt.com/discount/partner/PartnerList.do",
          Cookie: cookies,
        },
        body: `daeCode=&pageNo=${page}&searchName=&jungCode=`,
      }
    );
    return await res.text();
  }

  // 2) 첫 페이지 → pageTotal 추출
  const html1 = await fetchPage(1);
  const $1 = cheerio.load(html1);
  const pageTotal = parseInt($1("#pageTotal").val() || "1", 10);
  const itemTotal = parseInt($1("#itemTotal").val() || "0", 10);
  console.log(`[KT] itemTotal=${itemTotal}, pageTotal=${pageTotal}`);

  // 3) 페이지별 파싱
  function parsePage(html) {
    const $ = cheerio.load(html);
    const items = [];
    $("li[data-daecode]").each((_, el) => {
      const $li = $(el);
      const brand =
        $li.find("img").attr("alt")?.trim() ||
        $li.find(".sec-cont-tit").text().trim();
      if (!brand) return;
      const imgRaw = $li.find("img").attr("src") || "";
      const img = imgRaw
        ? imgRaw.startsWith("http")
          ? imgRaw
          : `https://membership.kt.com${imgRaw}`
        : "";
      const benefits = [];
      $li.find(".sec-cont-list > li").each((_, b) => {
        const grade = $(b).find("em").text().trim();
        const desc = $(b).find("span").text().trim();
        if (desc) benefits.push({ grade, desc });
      });
      if (!benefits.length) return;
      items.push({ brand, img, benefits, daeCode: $li.attr("data-daecode") });
    });
    return items;
  }

  const all = parsePage(html1);
  for (let p = 2; p <= pageTotal; p++) {
    try {
      const html = await fetchPage(p);
      all.push(...parsePage(html));
    } catch (e) {
      console.warn(`[KT] page ${p} 실패:`, e.message);
    }
  }

  // 중복 제거 (brand + 첫 혜택 desc 기준)
  const seen = new Set();
  const dedup = all.filter((x) => {
    const key = `${x.brand}|${x.benefits[0]?.desc?.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 변환
  const deals = dedup.map((p, i) => {
    const main = p.benefits[0];
    const discount = extractDiscount(main.desc);
    const allGrades = [...new Set(p.benefits.map((b) => b.grade).filter(Boolean))];
    return {
      id: `kt-${i}`,
      source: "kt",
      category: categorize(p.brand),
      title: `${p.brand} ${discount.includes("%") || discount.includes("원") ? discount + " 할인" : discount}`,
      description: p.benefits
        .map((b) => `[${b.grade || "전등급"}] ${cleanText(b.desc)}`)
        .join(" | "),
      discount,
      brand: p.brand,
      membershipGrade: allGrades.join("·") || "전등급",
      imageUrl: p.img,
      link: "https://membership.kt.com/discount/partner/PartnerList.do",
      startDate,
      endDate,
    };
  });

  console.log(`[KT] ${deals.length}개 완료`);
  return deals;
}

// ── LGU+ (HTTP, 내부 REST API) ───────────────────────
async function crawlLGU() {
  console.log("[LGU+] 크롤링 시작...");

  // urcMbspBnftDivsCd: 01=VIP콕, 02=U+멤버십
  // urcMbspDivsCd: 01=일반
  async function fetchAll(bnftDivsCd) {
    const url = `https://www.lguplus.com/uhdc/fo/prdv/mebfjnco/v1/jnco?urcMbspDivsCd=01&urcMbspBnftDivsCd=${bnftDivsCd}&urcMbspCatgNo=&pageNo=1&rowSize=1000`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[LGU+] BnftDivsCd=${bnftDivsCd} HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  const [vipKok, uplusM] = await Promise.all([fetchAll("01"), fetchAll("02")]);
  console.log(`[LGU+] VIP콕: ${vipKok.length}, U+멤버십: ${uplusM.length}`);

  const merged = [...vipKok, ...uplusM];

  // 중복 제거 (urcMbspJncoNo 기준)
  const seen = new Set();
  const dedup = merged.filter((x) => {
    const id = x.urcMbspJncoNo;
    if (id == null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const deals = dedup.map((p, i) => {
    const brand = p.urcMbspJncoNm || "";
    const thum = cleanText(p.jncoBnftThumCntn);
    const detl = cleanText(p.jncoBnftDetlCntn);
    const description = [thum, detl].filter(Boolean).join(" | ");
    const discount = extractDiscount(thum || detl);

    // 등급 추출 (VVIP/VIP/우수)
    const grades = [];
    const gradeText = `${thum} ${detl}`;
    if (/VVIP/i.test(gradeText)) grades.push("VVIP");
    if (/(?<!V)VIP/i.test(gradeText)) grades.push("VIP");
    if (/우수/.test(gradeText)) grades.push("우수");
    const isVipKok = p.urcMbspBnftDivsCd === "01";
    if (grades.length === 0) grades.push(isVipKok ? "VIP콕" : "전등급");

    return {
      id: `lgu-${p.urcMbspJncoNo || i}`,
      source: "lgu",
      category: categorize(brand),
      title: `${brand} ${discount.includes("%") || discount.includes("원") ? discount + " 할인" : discount}`,
      description: description.slice(0, 200),
      discount,
      brand,
      membershipGrade: grades.join("·"),
      imageUrl: p.pcImgeUrl || "",
      link: "https://www.lguplus.com/benefit-membership",
      startDate,
      endDate,
    };
  });

  console.log(`[LGU+] ${deals.length}개 완료`);
  return deals;
}

// ── 메인 ─────────────────────────────────────────────
async function main() {
  console.log("=== 통신사 혜택 크롤링 시작 (HTTP 전용) ===");
  const start = Date.now();

  const results = await Promise.allSettled([crawlSKT(), crawlKT(), crawlLGU()]);
  const skt = results[0].status === "fulfilled" ? results[0].value : [];
  const kt = results[1].status === "fulfilled" ? results[1].value : [];
  const lgu = results[2].status === "fulfilled" ? results[2].value : [];

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[${["SKT", "KT", "LGU+"][i]}] 실패:`, r.reason);
    }
  });

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
