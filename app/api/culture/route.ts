import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 서울 열린데이터광장 + 한국관광공사 + 한국문화정보원 문화행사 통합 API
export const revalidate = 21600; // 6시간 캐시

const SEOUL_KEY = process.env.SEOUL_OPENAPI_KEY || "sample";
const TOUR_KEY = process.env.DATA_GO_KR_API_KEY || "";
const SEOUL_BASE = "http://openapi.seoul.go.kr:8088";
const TOUR_BASE = "https://apis.data.go.kr/B551011/KorService1";
const CULTURE_BASE = "https://apis.data.go.kr/B553457/cultureinfo";

export type CultureEvent = {
  id: string;
  title: string;
  category: string;
  region: string; // 시/도 또는 구
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
  source: "seoul" | "tour" | "culture"; // 데이터 출처
};

// ── 서울 열린데이터광장 ──────────────────────────────
function parseSeoulEvent(row: Record<string, string>): CultureEvent {
  return {
    id: `seoul-${row.TITLE}-${row.STRTDATE}`.replace(/\s+/g, "-").slice(0, 100),
    title: row.TITLE || "",
    category: row.CODENAME || "",
    region: row.GUNAME ? `서울 ${row.GUNAME}` : "서울",
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
    source: "seoul",
  };
}

async function fetchSeoul(): Promise<CultureEvent[]> {
  const isSample = SEOUL_KEY === "sample";
  const size = isSample ? 5 : 1000;
  const events: CultureEvent[] = [];
  let start = 1;
  const maxPages = isSample ? 1 : 5;

  for (let page = 0; page < maxPages; page++) {
    const end = start + size - 1;
    const url = `${SEOUL_BASE}/${SEOUL_KEY}/json/culturalEventInfo/${start}/${end}/`;
    try {
      const res = await fetch(url, { next: { revalidate: 21600 } });
      if (!res.ok) break;
      const text = await res.text();
      const data = JSON.parse(text);
      const info = data.culturalEventInfo;
      if (!info || info.RESULT?.CODE !== "INFO-000") break;
      const rows = info.row || [];
      events.push(...rows.map(parseSeoulEvent));
      if (rows.length < size) break;
      start = end + 1;
    } catch {
      break;
    }
  }
  return events;
}

// ── 한국관광공사 (전국 축제/행사) ─────────────────────
const TOUR_AREA_NAMES: Record<string, string> = {
  "1": "서울", "2": "인천", "3": "대전", "4": "대구", "5": "광주",
  "6": "부산", "7": "울산", "8": "세종", "31": "경기", "32": "강원",
  "33": "충북", "34": "충남", "35": "경북", "36": "경남", "37": "전북",
  "38": "전남", "39": "제주",
};

const TOUR_CAT_MAP: Record<string, string> = {
  A02070100: "축제-문화/예술", A02070200: "축제-자연/경관",
  A02080100: "공연/행사", A02080200: "전시/미술",
  A02080300: "축제-전통/역사", A02080400: "콘서트",
  A02080500: "뮤지컬/오페라", A02080600: "축제-시민화합",
  A02080700: "교육/체험", A02080800: "체육대회",
  A02080900: "기타",
};

type TourItem = {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  areacode?: string;
  eventstartdate?: string;
  eventenddate?: string;
  firstimage?: string;
  firstimage2?: string;
  cat2?: string;
  cat3?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
};

function parseTourEvent(item: TourItem): CultureEvent {
  const start = item.eventstartdate || "";
  const end = item.eventenddate || "";
  const fmtDate = (d: string) => d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "";
  const startFmt = fmtDate(start);
  const endFmt = fmtDate(end);
  const cat = TOUR_CAT_MAP[item.cat3 || ""] || TOUR_CAT_MAP[item.cat2 || ""] || "축제/행사";
  const region = TOUR_AREA_NAMES[item.areacode || ""] || "";

  return {
    id: `tour-${item.contentid || item.title}`,
    title: item.title || "",
    category: cat,
    region,
    place: (item.addr1 || "") + (item.addr2 ? ` ${item.addr2}` : ""),
    date: startFmt && endFmt ? `${startFmt}~${endFmt}` : startFmt,
    startDate: startFmt ? `${startFmt} 00:00:00.0` : "",
    endDate: endFmt ? `${endFmt} 23:59:59.0` : "",
    isFree: false, // 관광공사 API는 무료 여부 미제공 → 유료로 기본 설정
    fee: "",
    target: "",
    imageUrl: item.firstimage || item.firstimage2 || "",
    link: "",
    orgLink: "",
    lat: item.mapy ? parseFloat(item.mapy) : null,
    lng: item.mapx ? parseFloat(item.mapx) : null,
    time: "",
    source: "tour",
  };
}

async function fetchTour(): Promise<CultureEvent[]> {
  if (!TOUR_KEY) return [];

  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const events: CultureEvent[] = [];

  for (let page = 1; page <= 5; page++) {
    try {
      const params = new URLSearchParams({
        serviceKey: TOUR_KEY,
        numOfRows: "1000",
        pageNo: String(page),
        MobileOS: "ETC",
        MobileApp: "TodayDeals",
        _type: "json",
        listYN: "Y",
        arrange: "A",
        eventStartDate: yyyymmdd,
      });
      const url = `${TOUR_BASE}/searchFestival1?${params}`;
      const res = await fetch(url, {
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(`[tour api] page ${page}: HTTP ${res.status}`);
        break;
      }
      const data = await res.json();
      const items = data?.response?.body?.items?.item;
      if (!items || !Array.isArray(items)) break;
      events.push(...items.map(parseTourEvent));
      const totalCount = data?.response?.body?.totalCount || 0;
      if (page * 1000 >= totalCount) break;
    } catch (e) {
      console.warn("[tour api] fetch failed:", e instanceof Error ? e.message : e);
      break;
    }
  }
  return events;
}

// ── 한국문화정보원 (전국 공연/전시) ───────────────────
const CULTURE_CAT_MAP: Record<string, string> = {
  "미술": "전시/미술",
  "서양음악(클래식)": "클래식",
  "한국음악(국악)": "국악",
  "대중음악": "콘서트",
};

async function fetchCulture(): Promise<CultureEvent[]> {
  if (!TOUR_KEY) return []; // data.go.kr 키 공용

  const now = new Date();
  const from = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const future = new Date(now);
  future.setMonth(future.getMonth() + 3);
  const to = `${future.getFullYear()}${String(future.getMonth() + 1).padStart(2, "0")}${String(future.getDate()).padStart(2, "0")}`;

  const events: CultureEvent[] = [];

  for (let page = 1; page <= 5; page++) {
    try {
      const params = new URLSearchParams({
        serviceKey: TOUR_KEY,
        from,
        to,
        PageNo: String(page),
        numOfrows: "100",
      });
      const url = `${CULTURE_BASE}/period2?${params}`;
      const res = await fetch(url, {
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(`[culture-kr api] page ${page}: HTTP ${res.status}`);
        break;
      }
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = $("item");
      if (items.length === 0) break;

      items.each((_, el) => {
        const $el = $(el);
        const startRaw = $el.find("startDate").text();
        const endRaw = $el.find("endDate").text();
        const fmtDate = (d: string) =>
          d && d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "";
        const startFmt = fmtDate(startRaw);
        const endFmt = fmtDate(endRaw);
        const price = $el.find("price").text();
        const area = $el.find("area").text();
        const realm = $el.find("realmName").text();
        const category = CULTURE_CAT_MAP[realm] || realm || "공연/전시";

        events.push({
          id: `culture-${$el.find("seq").text()}`,
          title: $el.find("title").text(),
          category,
          region: area || "",
          place: $el.find("place").text(),
          date: startFmt && endFmt ? `${startFmt}~${endFmt}` : startFmt,
          startDate: startFmt ? `${startFmt} 00:00:00.0` : "",
          endDate: endFmt ? `${endFmt} 23:59:59.0` : "",
          isFree: /무료/.test(price),
          fee: price,
          target: "",
          imageUrl: $el.find("thumbnail").text(),
          link: $el.find("url").text(),
          orgLink: "",
          lat: $el.find("gpsY").text().trim() ? parseFloat($el.find("gpsY").text().trim()) : null,
          lng: $el.find("gpsX").text().trim() ? parseFloat($el.find("gpsX").text().trim()) : null,
          time: "",
          source: "culture",
        });
      });

      // totalCount 기반 종료 또는 결과 부족 시 종료
      const totalCount = parseInt($("totalCount").text() || "0", 10);
      if (totalCount > 0 && page * 100 >= totalCount) break;
      if (items.length < 100) break;
    } catch (e) {
      console.warn("[culture-kr api] fetch failed:", e instanceof Error ? e.message : e);
      break;
    }
  }
  return events;
}

// ── 통합 ─────────────────────────────────────────────
async function fetchAll(): Promise<CultureEvent[]> {
  const [seoul, tour, culture] = await Promise.allSettled([
    fetchSeoul(),
    fetchTour(),
    fetchCulture(),
  ]);
  const seoulEvents = seoul.status === "fulfilled" ? seoul.value : [];
  const tourEvents = tour.status === "fulfilled" ? tour.value : [];
  const cultureEvents = culture.status === "fulfilled" ? culture.value : [];

  // 서울 열린데이터와 중복 가능 → 서울 지역 제외 (관광공사 + 문화정보원)
  const tourFiltered = tourEvents.filter((e) => !e.region.startsWith("서울"));
  const cultureFiltered = cultureEvents.filter((e) => !e.region.startsWith("서울"));
  const all = [...seoulEvents, ...tourFiltered, ...cultureFiltered];

  // 현재 진행중 또는 예정인 행사만
  const now = new Date();
  return all.filter((e) => {
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
  const regionFilter = sp.get("region") || "";

  try {
    let events = await fetchAll();
    if (freeOnly) events = events.filter((e) => e.isFree);
    if (regionFilter) events = events.filter((e) => e.region.includes(regionFilter));

    // 시작일 기준 정렬 (가까운 순)
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const categories = [...new Set(events.map((e) => e.category))].filter(Boolean).sort();
    const regions = [...new Set(events.map((e) => e.region.split(" ")[0]))].filter(Boolean).sort();

    return NextResponse.json({
      events,
      total: events.length,
      categories,
      regions,
      sources: {
        seoul: events.filter((e) => e.source === "seoul").length,
        tour: events.filter((e) => e.source === "tour").length,
        culture: events.filter((e) => e.source === "culture").length,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[culture api]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
