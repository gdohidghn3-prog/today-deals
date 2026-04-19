import { NextRequest, NextResponse } from "next/server";

// 서울 열린데이터광장 문화행사 API 프록시
// API 키가 없으면 sample 키 사용 (5건 제한)
export const revalidate = 21600; // 6시간 캐시

const API_KEY = process.env.SEOUL_OPENAPI_KEY || "sample";
const BASE = "http://openapi.seoul.go.kr:8088";
const PAGE_SIZE = 1000;

export type CultureEvent = {
  id: string;
  title: string;
  category: string;
  gu: string;
  place: string;
  date: string;
  startDate: string;
  endDate: string;
  isFree: boolean;
  fee: string;
  target: string;
  imageUrl: string;
  link: string;
  orgLink: string;
  lat: number | null;
  lng: number | null;
  time: string;
};

function parseEvent(row: Record<string, string>): CultureEvent {
  return {
    id: `${row.TITLE}-${row.STRTDATE}`.replace(/\s+/g, "-").slice(0, 80),
    title: row.TITLE || "",
    category: row.CODENAME || "",
    gu: row.GUNAME || "",
    place: row.PLACE || "",
    date: row.DATE || "",
    startDate: row.STRTDATE || "",
    endDate: row.END_DATE || "",
    isFree: row.IS_FREE === "무료",
    fee: row.USE_FEE || "",
    target: row.USE_TRGT || "",
    imageUrl: row.MAIN_IMG || "",
    link: row.HMPG_ADDR || "",
    orgLink: row.ORG_LINK || "",
    lat: row.LAT ? parseFloat(row.LAT) : null,
    lng: row.LOT ? parseFloat(row.LOT) : null,
    time: row.PRO_TIME || "",
  };
}

async function fetchAll(): Promise<CultureEvent[]> {
  const isSample = API_KEY === "sample";
  const size = isSample ? 5 : PAGE_SIZE;

  const events: CultureEvent[] = [];
  let start = 1;
  const maxPages = isSample ? 1 : 5; // 최대 5000건

  for (let page = 0; page < maxPages; page++) {
    const end = start + size - 1;
    const url = `${BASE}/${API_KEY}/json/culturalEventInfo/${start}/${end}/`;
    try {
      const res = await fetch(url, { next: { revalidate: 21600 } });
      if (!res.ok) break;
      const text = await res.text();
      const data = JSON.parse(text);
      const info = data.culturalEventInfo;
      if (!info || info.RESULT?.CODE !== "INFO-000") break;
      const rows = info.row || [];
      events.push(...rows.map(parseEvent));
      if (rows.length < size) break;
      start = end + 1;
    } catch {
      break;
    }
  }

  // 현재 진행중 또는 예정인 행사만 필터
  const now = new Date();
  return events.filter((e) => {
    try {
      const end = new Date(e.endDate);
      return end >= now;
    } catch {
      return false;
    }
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const freeOnly = sp.get("free") === "1";

  try {
    let events = await fetchAll();
    if (freeOnly) {
      events = events.filter((e) => e.isFree);
    }

    // 시작일 기준 정렬 (가까운 순)
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const categories = [...new Set(events.map((e) => e.category))].filter(Boolean);
    const gus = [...new Set(events.map((e) => e.gu))].filter(Boolean).sort();

    return NextResponse.json({
      events,
      total: events.length,
      categories,
      gus,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[culture api]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
