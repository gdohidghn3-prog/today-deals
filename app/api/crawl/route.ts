import { NextResponse } from "next/server";
import { crawlAll } from "@/lib/crawlers";

export async function POST() {
  const startTime = Date.now();
  console.log("[API] POST /api/crawl 시작");

  const deals = await crawlAll();
  const elapsed = Date.now() - startTime;

  const summary = {
    skt: deals.filter((d) => d.source === "skt").length,
    kt: deals.filter((d) => d.source === "kt").length,
    lgu: deals.filter((d) => d.source === "lgu").length,
    cu: deals.filter((d) => d.source === "cu").length,
    gs25: deals.filter((d) => d.source === "gs25").length,
    seven: deals.filter((d) => d.source === "seven").length,
    emart24: deals.filter((d) => d.source === "emart24").length,
  };

  console.log(`[API] POST /api/crawl 완료 → SKT:${summary.skt} KT:${summary.kt} LGU:${summary.lgu} CU:${summary.cu} GS25:${summary.gs25} 7E:${summary.seven} EM24:${summary.emart24} (${elapsed}ms)`);

  return NextResponse.json({
    success: true,
    total: deals.length,
    summary,
    updatedAt: new Date().toISOString(),
    elapsed: `${elapsed}ms`,
  });
}
