import type { Deal } from "@/types/deal";
import { crawlCU } from "./cu";
import { crawlGS25 } from "./gs25";
import { crawlSKT } from "./skt";
import telecomJson from "@/data/telecom.json";
import convenienceJson from "@/data/convenience.json";

/**
 * 편의점 4사 통합 (CU + GS25 + 세븐일레븐 + 이마트24)
 *
 * 1순위: data/convenience.json (GitHub Actions 매일 09:30 KST 배치)
 * 2순위: 런타임 fallback - JSON에 없는 source만 (Vercel 차단 위험으로 보조용)
 *
 * 배치 통합으로 4개 모두 안정적으로 수집되므로 보통 1순위만으로 충분.
 * convenience.json이 손상/누락이거나 특정 source가 비어있을 때만 fallback 동작.
 */
export async function crawlAllConvenience(): Promise<Deal[]> {
  const deals: Deal[] = [];
  const stats: Record<string, number> = {
    cu: 0,
    gs25: 0,
    seven: 0,
    emart24: 0,
  };

  // 1순위: 정적 JSON
  try {
    const cached = (convenienceJson.deals as unknown as Deal[]) ?? [];
    for (const d of cached) {
      if (d.source in stats) stats[d.source]++;
    }
    deals.push(...cached);
  } catch {
    console.log("[Crawl] convenience.json 로드 실패");
  }

  // 2순위: JSON에 없는 source만 런타임으로 보충
  const fallbackTasks: Promise<Deal[]>[] = [];
  if (stats.cu === 0) fallbackTasks.push(crawlCU().catch(() => []));
  if (stats.gs25 === 0) fallbackTasks.push(crawlGS25().catch(() => []));

  if (fallbackTasks.length > 0) {
    const fallbackResults = await Promise.all(fallbackTasks);
    for (const arr of fallbackResults) {
      for (const d of arr) {
        if (d.source in stats) stats[d.source]++;
      }
      deals.push(...arr);
    }
  }

  console.log(
    `[Crawl] convenience: CU=${stats.cu}, GS25=${stats.gs25}, ` +
      `seven=${stats.seven}, emart24=${stats.emart24} ` +
      `(JSON updatedAt=${convenienceJson.updatedAt})`
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
