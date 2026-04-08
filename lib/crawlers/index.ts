import type { Deal } from "@/types/deal";
import { crawlCU } from "./cu";
import { crawlGS25 } from "./gs25";
import { crawlSKT } from "./skt";
import telecomJson from "@/data/telecom.json";
import convenienceJson from "@/data/convenience.json";

export async function crawlAllConvenience(): Promise<Deal[]> {
  // CU/GS25: 런타임 HTTP 크롤링 (Vercel에서 동작 확인됨)
  // 세븐일레븐/이마트24: GitHub Actions가 매일 크롤 → data/convenience.json
  //   (Vercel 런타임에서는 차단/타임아웃 빈번)
  const [cu, gs25] = await Promise.allSettled([crawlCU(), crawlGS25()]);

  const deals: Deal[] = [];
  if (cu.status === "fulfilled") deals.push(...cu.value);
  if (gs25.status === "fulfilled") deals.push(...gs25.value);

  // 세븐일레븐 + 이마트24 JSON 로드
  let cachedCount = 0;
  try {
    const cached = (convenienceJson.deals as unknown as Deal[]).filter(
      (d) => d.source === "seven" || d.source === "emart24"
    );
    deals.push(...cached);
    cachedCount = cached.length;
  } catch {
    console.log("[Crawl] convenience.json 로드 실패");
  }

  console.log(
    `[Crawl] CU: ${cu.status === "fulfilled" ? cu.value.length : "FAIL"}, ` +
    `GS25: ${gs25.status === "fulfilled" ? gs25.value.length : "FAIL"}, ` +
    `7/이마트24 JSON: ${cachedCount} (${convenienceJson.updatedAt})`
  );

  return deals;
}

/**
 * 통신사 혜택: SKT는 HTTP 크롤링, KT/LGU+는 data/telecom.json에서 로드
 * (GitHub Actions가 매일 Playwright로 크롤링 → JSON 커밋)
 */
export async function crawlAllTelecom(): Promise<Deal[]> {
  const deals: Deal[] = [];

  // SKT: HTTP로 실시간 크롤링 (항상 가능)
  try {
    const skt = await crawlSKT();
    deals.push(...skt);
  } catch (e) {
    console.error("[SKT] 크롤링 실패:", e);
  }

  // KT/LGU+: data/telecom.json에서 로드 (GitHub Actions가 매일 업데이트)
  try {
    const ktLgu = (telecomJson.deals as unknown as Deal[]).filter(
      (d) => d.source === "kt" || d.source === "lgu"
    );
    deals.push(...ktLgu);
    console.log(
      `[Crawl] KT/LGU+ JSON 로드: ${ktLgu.length}개 (${telecomJson.updatedAt})`
    );
  } catch {
    console.log("[Crawl] KT/LGU+ JSON 로드 실패");
  }

  return deals;
}

export async function crawlAll(): Promise<Deal[]> {
  const [convenience, telecom] = await Promise.all([
    crawlAllConvenience(),
    crawlAllTelecom(),
  ]);
  return [...telecom, ...convenience];
}
