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
 * 통신사 혜택: SKT/KT/LGU+ 통합
 *
 * 1순위: data/telecom.json (GitHub Actions 매일 09:00 KST 배치)
 * 2순위: 런타임 fallback - JSON에 없는 source만 (SKT만 HTTP 가능)
 */
export async function crawlAllTelecom(): Promise<Deal[]> {
  const deals: Deal[] = [];
  const stats: Record<string, number> = { skt: 0, kt: 0, lgu: 0 };

  // 1순위: 정적 JSON (GH Actions 매일 09:00 KST)
  try {
    const cached = (telecomJson.deals as unknown as Deal[]) ?? [];
    for (const d of cached) {
      if (d.source in stats) stats[d.source as keyof typeof stats]++;
    }
    deals.push(...cached);
  } catch {
    console.log("[Crawl] telecom.json 로드 실패");
  }

  // 2순위: JSON에 없는 source만 런타임으로 보충
  if (stats.skt === 0) {
    try {
      const skt = await crawlSKT();
      deals.push(...skt);
      stats.skt = skt.length;
    } catch (e) {
      console.error("[SKT] 런타임 fallback 실패:", e);
    }
  }

  console.log(
    `[Crawl] telecom: SKT=${stats.skt}, KT=${stats.kt}, LGU+=${stats.lgu} ` +
    `(JSON updatedAt=${telecomJson.updatedAt})`
  );

  return deals;
}

export async function crawlAll(): Promise<Deal[]> {
  const [convenience, telecom] = await Promise.all([
    crawlAllConvenience(),
    crawlAllTelecom(),
  ]);
  return [...telecom, ...convenience];
}
