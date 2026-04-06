import * as cheerio from "cheerio";
import type { Deal } from "@/types/deal";

export async function crawlSeven(): Promise<Deal[]> {
  const start = Date.now();
  const deals: Deal[] = [];
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

  const tabs: [string, string][] = [
    ["1+1", "1"],
    ["2+1", "2"],
  ];

  for (const [label, pTab] of tabs) {
    // Vercel 10초 타임아웃 고려: page 1~2
    for (let page = 1; page <= 2; page++) {
      try {
        const res = await fetch(
          "https://www.7-eleven.co.kr/product/listMoreAjax.asp",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0",
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
          const priceText = li.find(".price_list span").first().text().trim();
          const imgSrc = li.find(".pic_product img").attr("src") || "";
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

        // 더 이상 데이터가 없으면 다음 페이지 스킵
        if (pageCount === 0) break;
      } catch (e) {
        console.error(`7-Eleven ${label} page${page} crawl failed:`, e);
      }
    }
  }

  console.log(`[7-Eleven] ${deals.length}개 크롤링 완료 (${Date.now() - start}ms)`);
  return deals;
}
