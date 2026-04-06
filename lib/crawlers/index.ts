import type { Deal } from "@/types/deal";
import { crawlCU } from "./cu";
import { crawlGS25 } from "./gs25";
import { crawlSeven } from "./seven";
import { crawlSKT } from "./skt";
import telecomJson from "@/data/telecom.json";

export async function crawlAllConvenience(): Promise<Deal[]> {
  const [cu, gs25, seven] = await Promise.allSettled([
    crawlCU(),
    crawlGS25(),
    crawlSeven(),
  ]);

  const deals: Deal[] = [];
  if (cu.status === "fulfilled") deals.push(...cu.value);
  if (gs25.status === "fulfilled") deals.push(...gs25.value);
  if (seven.status === "fulfilled") deals.push(...seven.value);

  console.log(
    `[Crawl] CU: ${cu.status === "fulfilled" ? cu.value.length : "FAIL"}, ` +
    `GS25: ${gs25.status === "fulfilled" ? gs25.value.length : "FAIL"}, ` +
    `7-Eleven: ${seven.status === "fulfilled" ? seven.value.length : "FAIL"}`
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
