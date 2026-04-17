import * as cheerio from "cheerio";
import type { Deal } from "@/types/deal";
import { stableId } from "./stable-id";

export async function crawlSKT(): Promise<Deal[]> {
  const start = Date.now();
  const deals: Deal[] = [];
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

  try {
    const res = await fetch(
      "https://sktmembership.tworld.co.kr/mps/pc-bff/benefitbrand/brandList.do",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".benefit-box").each((i, el) => {
      const brandName = $(el).find(".brand").text().trim();
      if (!brandName) return;

      const imgSrc = $(el).find(".logo img").attr("src") || "";
      const badges: string[] = [];
      $(el).find(".badge-bg-radius").each((_, b) => { badges.push($(b).text().trim()); });

      // 할인형 혜택만 추출 (적립/사용 제외)
      const benefits: { grades: string[]; text: string }[] = [];
      $(el)
        .find(".bnf-info")
        .first()
        .find(".info")
        .each((_, info) => {
          const grades: string[] = [];
          $(info)
            .find(".badge-circle")
            .each((_, g) => {
              const cls = $(g).attr("class") || "";
              if (cls.includes("vip")) grades.push("VIP");
              if (cls.includes("gold")) grades.push("골드");
              if (cls.includes("silver")) grades.push("실버");
            });
          // 텍스트에서 blind 텍스트 제거
          $(info).find(".blind").remove();
          const text = $(info).text().replace(/\s+/g, " ").trim();
          if (text && grades.length > 0) {
            benefits.push({ grades, text });
          }
        });

      if (benefits.length === 0) return;

      // 대표 혜택 (첫 번째)
      const mainBenefit = benefits[0];
      const allGrades = [...new Set(benefits.flatMap((b) => b.grades))];
      const description = benefits
        .map((b) => `[${b.grades.join("/")}] ${b.text}`)
        .join(" | ");

      // 할인율 추출
      const discountMatch = mainBenefit.text.match(/(\d+%)\s*할인/);
      const discount = discountMatch ? discountMatch[1] : mainBenefit.text.split("(")[0].trim();

      // 카테고리 추정
      let category: Deal["category"] = "etc";
      const n = brandName.toLowerCase();
      if (/커피|카페|스타벅스|투썸|이디야|할리스|배스킨|파리바게뜨/.test(n)) category = "cafe";
      else if (/cgv|메가박스|롯데시네마|영화/.test(n)) category = "culture";
      else if (/CU|GS25|세븐일레븐|편의점/.test(n)) category = "convenience";
      else if (/버거킹|맥도날드|피자|BBQ|BHC|아웃백|배달/.test(n)) category = "food";
      else if (/이마트|롯데마트|올리브영|마트/.test(n)) category = "shopping";

      deals.push({
        id: stableId("skt", brandName, `${brandName} ${discount.includes("%") ? discount + " 할인" : discount}`, discount),
        source: "skt",
        category,
        title: `${brandName} ${discount.includes("%") ? discount + " 할인" : discount}`,
        description,
        discount,
        brand: brandName,
        membershipGrade: allGrades.join("·"),
        imageUrl: imgSrc,
        link: "https://sktmembership.tworld.co.kr",
        startDate,
        endDate,
      });
    });
  } catch (e) {
    console.error("SKT crawl failed:", e);
  }

  console.log(`[SKT] ${deals.length}개 크롤링 완료 (${Date.now() - start}ms)`);
  return deals;
}
