import { NextResponse } from "next/server";
import { crawlAllConvenience } from "@/lib/crawlers";

export async function POST() {
  const startTime = Date.now();
  console.log("[API] POST /api/crawl 시작");

  const deals = await crawlAllConvenience();
  const elapsed = Date.now() - startTime;

  const summary = {
    cu: deals.filter((d) => d.source === "cu").length,
    gs25: deals.filter((d) => d.source === "gs25").length,
    seven: deals.filter((d) => d.source === "seven").length,
  };

  console.log(`[API] POST /api/crawl 완료 → CU:${summary.cu} GS25:${summary.gs25} 7E:${summary.seven} (${elapsed}ms)`);

  return NextResponse.json({
    success: true,
    total: deals.length,
    summary,
    elapsed: `${elapsed}ms`,
    deals,
  });
}
