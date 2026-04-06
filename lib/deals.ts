import type { Deal, DealCategory, DealSource, TelecomType } from "@/types/deal";
import { crawlAll, crawlAllConvenience } from "./crawlers";

// ─── 정적 데이터: 검증 가능한 항목만 (공식 사이트 바로가기) ─────

const staticDeals: Deal[] = [
  // 카드사는 크롤링 불가 (SPA) → 공식 사이트 바로가기
  { id: "samsung-official", source: "samsung", category: "etc", title: "삼성카드 이벤트 전체보기", description: "진행 중인 할인·적립 이벤트 확인", discount: "공식사이트", brand: "삼성카드", link: "https://www.samsungcard.com", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "shinhan-official", source: "shinhan", category: "etc", title: "신한카드 혜택 전체보기", description: "My혜택·이벤트 확인", discount: "공식사이트", brand: "신한카드", link: "https://www.shinhancard.com", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "hyundai-official", source: "hyundai", category: "etc", title: "현대카드 혜택 전체보기", description: "진행 중인 이벤트 확인", discount: "공식사이트", brand: "현대카드", link: "https://www.hyundaicard.com/benefit/event", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "kb-official", source: "kb", category: "etc", title: "KB국민카드 혜택 전체보기", description: "이벤트·할인 혜택 확인", discount: "공식사이트", brand: "KB국민", link: "https://card.kbcard.com/BON/DVIEW/HBBMCXHISBNC0004?mainCC=a", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "lotte-official", source: "lotte", category: "etc", title: "롯데카드 혜택 전체보기", description: "이벤트·할인 혜택 확인", discount: "공식사이트", brand: "롯데카드", link: "https://www.lottecard.co.kr/app/LPBNFBA_V100.lc", startDate: "2026-01-01", endDate: "2026-12-31" },

  // 정부/지자체 (공식 확인 가능)
  { id: "gov-culture", source: "government", category: "culture", title: "문화누리카드 월 11만원", description: "기초생활수급자·차상위 대상 문화비 지원", discount: "11만원", brand: "문화누리카드", link: "https://www.mnuri.kr", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "gov-youth", source: "government", category: "etc", title: "청년 문화예술패스", description: "만 19~34세 공연·전시 무료/할인", discount: "무료", brand: "문체부", link: "https://www.mcst.go.kr/kor/main.jsp", startDate: "2026-04-01", endDate: "2026-12-31" },
];

// ─── 크롤링 캐시 (6시간 TTL) ────────────────────────────────

let cachedAll: Deal[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

async function getCrawledDeals(): Promise<Deal[]> {
  const now = Date.now();
  if (cachedAll && now - cacheTimestamp < CACHE_TTL) {
    const age = Math.round((now - cacheTimestamp) / 1000);
    console.log(`[Cache HIT] 전체 ${cachedAll.length}개 (${age}초 전 캐시)`);
    return cachedAll;
  }
  console.log("[Cache MISS] 전체 크롤링 시작");
  try {
    cachedAll = await crawlAll();
    cacheTimestamp = now;
    console.log(`[Cache SET] 전체 ${cachedAll.length}개 저장`);
  } catch (e) {
    console.error("[Cache ERROR] 크롤링 실패:", e);
    if (!cachedAll) cachedAll = [];
  }
  return cachedAll;
}

// ─── 외부 API (async) ──────────────────────────────────────

export async function getAllDealsAsync(): Promise<Deal[]> {
  const crawled = await getCrawledDeals();
  return [...crawled, ...staticDeals];
}

export async function getTodayDealsAsync(): Promise<Deal[]> {
  const all = await getAllDealsAsync();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateStr = today.toISOString().slice(0, 10);

  return all.filter((d) => {
    if (d.startDate > dateStr || d.endDate < dateStr) return false;
    if (d.dayOfWeek && !d.dayOfWeek.includes(dayOfWeek)) return false;
    return true;
  });
}

export async function getConvenienceDealsAsync(): Promise<Deal[]> {
  const all = await getAllDealsAsync();
  return all.filter((d) => ["cu", "gs25", "seven"].includes(d.source));
}

// ─── 동기 API (정적 데이터만, 하위 호환) ───────────────────

export function getAllDeals(): Deal[] {
  return staticDeals;
}

export function getTodayDeals(): Deal[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateStr = today.toISOString().slice(0, 10);
  return staticDeals.filter((d) => {
    if (d.startDate > dateStr || d.endDate < dateStr) return false;
    if (d.dayOfWeek && !d.dayOfWeek.includes(dayOfWeek)) return false;
    return true;
  });
}

export function getDealsByCategory(category: DealCategory): Deal[] {
  return getTodayDeals().filter((d) => d.category === category);
}

export function getDealsBySource(source: DealSource): Deal[] {
  return getTodayDeals().filter((d) => d.source === source);
}

export function getDealsByTelecom(telecom: TelecomType): Deal[] {
  return getTodayDeals().filter((d) => d.source === telecom);
}

export function getWeeklyCalendar(): { day: number; label: string; deals: Deal[] }[] {
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  return dayLabels.map((label, day) => ({
    day,
    label,
    deals: staticDeals.filter((d) => d.dayOfWeek?.includes(day)),
  }));
}

export function getConvenienceDeals(): Deal[] {
  return staticDeals.filter((d) => ["cu", "gs25", "seven"].includes(d.source));
}
