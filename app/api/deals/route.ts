import { NextResponse } from "next/server";
import { getTodayDealsAsync, getAllDealsAsync, getConvenienceDealsAsync } from "@/lib/deals";

export const revalidate = 21600; // 6시간 캐시

export async function GET(request: Request) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");

  let deals;
  switch (filter) {
    case "convenience":
      deals = await getConvenienceDealsAsync();
      break;
    case "all":
      deals = await getAllDealsAsync();
      break;
    default:
      deals = await getTodayDealsAsync();
  }

  const elapsed = Date.now() - start;
  console.log(`[API] GET /api/deals?filter=${filter || "today"} → ${deals.length}건 (${elapsed}ms)`);

  return NextResponse.json({
    deals,
    count: deals.length,
    updatedAt: new Date().toISOString(),
  });
}
