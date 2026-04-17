import * as cheerio from "cheerio";
import type { Deal } from "@/types/deal";
import { stableId } from "./stable-id";

interface GS25Product {
  goodsNm: string;
  price: number;
  eventTypeNm: string;
  attFileNm?: string;
}

export async function crawlGS25(): Promise<Deal[]> {
  const start = Date.now();
  const deals: Deal[] = [];
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

  try {
    // Step 1: Get CSRF token + session cookie
    const pageRes = await fetch(
      "http://gs25.gsretail.com/gscvs/ko/products/event-goods",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const html = await pageRes.text();
    const $ = cheerio.load(html);
    const csrf = $("input[name=CSRFToken]").val() as string;
    const cookies = pageRes.headers.get("set-cookie") || "";
    const jsessionid = cookies.match(/JSESSIONID=([^;]+)/)?.[1] || "";

    if (!csrf || !jsessionid) return deals;

    // Step 2: Fetch products via JSON API
    const types: [string, string][] = [
      ["1+1", "ONE_TO_ONE"],
      ["2+1", "TWO_TO_ONE"],
    ];

    for (const [label, param] of types) {
      const res = await fetch(
        "http://gs25.gsretail.com/gscvs/ko/products/event-goods-search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: `JSESSIONID=${jsessionid}`,
          },
          body: `CSRFToken=${csrf}&parameterList=${param}&pageNum=1&pageSize=100`,
        }
      );

      const rawText = await res.text();
      let data = JSON.parse(rawText);
      if (typeof data === "string") data = JSON.parse(data);

      const products: GS25Product[] = data.results || Object.values(data);

      products.forEach((item: GS25Product, i: number) => {
        if (!item.goodsNm) return;

        deals.push({
          id: stableId("gs25", item.goodsNm, `${item.goodsNm} ${label}`, label),
          source: "gs25",
          category: "convenience",
          title: `${item.goodsNm} ${label}`,
          description: `${item.price?.toLocaleString() || ""}원 · ${label} 행사`,
          discount: label,
          brand: item.goodsNm,
          price: item.price ? `${item.price.toLocaleString()}원` : undefined,
          imageUrl: item.attFileNm || "",
          startDate,
          endDate,
        });
      });
    }
  } catch (e) {
    console.error("GS25 crawl failed:", e);
  }

  console.log(`[GS25] ${deals.length}개 크롤링 완료 (${Date.now() - start}ms)`);
  return deals;
}
