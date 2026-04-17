import * as cheerio from "cheerio";
import type { Deal } from "@/types/deal";
import { stableId } from "./stable-id";

export async function crawlCU(): Promise<Deal[]> {
  const start = Date.now();
  const deals: Deal[] = [];
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

  const types: [string, string][] = [
    ["1+1", "23"],
    ["2+1", "24"],
  ];

  for (const [label, condition] of types) {
    try {
      const res = await fetch("https://cu.bgfretail.com/event/plusAjax.do", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
        body: `searchCondition=${condition}&pageIndex=1&pageSize=100`,
      });

      const html = await res.text();
      const $ = cheerio.load(html);

      $("li.prod_list").each((i, el) => {
        const name = $(el).find(".name p").text().trim();
        const priceText = $(el).find(".price strong").text().trim();
        const imgSrc = $(el).find("img.prod_img").attr("src") || "";
        const imageUrl = imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc;

        if (!name) return;

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
    } catch (e) {
      console.error(`CU ${label} crawl failed:`, e);
    }
  }

  console.log(`[CU] ${deals.length}개 크롤링 완료 (${Date.now() - start}ms)`);
  return deals;
}
