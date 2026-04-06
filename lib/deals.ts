import type { Deal, DealCategory, DealSource, TelecomType } from "@/types/deal";
import { crawlAllConvenience } from "./crawlers";

// ─── 정적 데이터: 통신사 / 카드 / 정부 (월 1회 수동 업데이트) ─────
// ※ 통신사 혜택은 등급·시기에 따라 변동 — 공식 사이트에서 최신 정보 확인 권장

const staticDeals: Deal[] = [
  // ── SKT T멤버십 ──
  { id: "skt-twosome", source: "skt", category: "cafe", title: "투썸플레이스 할인", description: "음료 할인 (VIP 50% / 골드 40%)", discount: "최대 50%", brand: "투썸플레이스", membershipGrade: "VIP·골드", link: "https://sktmembership.tworld.co.kr", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "skt-cgv", source: "skt", category: "culture", title: "CGV 영화 할인", description: "일반 2D 기준 (VIP 6,000원 / 골드 7,000원)", discount: "6,000원~", brand: "CGV", membershipGrade: "VIP·골드", link: "https://sktmembership.tworld.co.kr", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "skt-cu", source: "skt", category: "convenience", title: "CU·세븐일레븐 할인", description: "1천원당 VIP·골드 100원 / 실버 50원 할인", discount: "최대 10%", brand: "CU", membershipGrade: "전 등급", link: "https://sktmembership.tworld.co.kr", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "skt-burgerking", source: "skt", category: "food", title: "버거킹 세트 할인", description: "와퍼 세트 기준 (등급별 상이)", discount: "최대 40%", brand: "버거킹", membershipGrade: "VIP·골드", link: "https://sktmembership.tworld.co.kr", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [3] },
  { id: "skt-paris", source: "skt", category: "food", title: "파리바게뜨 할인", description: "오후 8시~자정, 1만원 이상 시 4,000원 할인", discount: "4,000원", brand: "파리바게뜨", membershipGrade: "VIP", link: "https://sktmembership.tworld.co.kr", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── KT 멤버십 ──
  { id: "kt-lotte-cinema", source: "kt", category: "culture", title: "롯데시네마 무료/할인", description: "VVIP 무료 3매 / VIP·골드 할인", discount: "무료~", brand: "롯데시네마", membershipGrade: "VVIP·VIP", link: "https://membership.kt.com", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kt-starbucks", source: "kt", category: "cafe", title: "스타벅스 할인", description: "VIP 이상 초이스 혜택 쿠폰 제공", discount: "쿠폰", brand: "스타벅스", membershipGrade: "VIP 이상", link: "https://membership.kt.com", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kt-millie", source: "kt", category: "culture", title: "밀리의 서재 무료 구독", description: "VIP 1개월 / VVIP 3개월 무료", discount: "무료", brand: "밀리의 서재", membershipGrade: "VIP·VVIP", link: "https://membership.kt.com", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kt-abc", source: "kt", category: "shopping", title: "ABC마트 1만원 할인", description: "VIP 이상 초이스 혜택", discount: "10,000원", brand: "ABC마트", membershipGrade: "VIP 이상", link: "https://membership.kt.com", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── LGU+ 멤버십 ──
  { id: "lgu-starbucks", source: "lgu", category: "cafe", title: "스타벅스 아메리카노", description: "VIP콕 월 1회 무료 (VIP/VVIP 전용)", discount: "무료", brand: "스타벅스", membershipGrade: "VIP·VVIP", link: "https://www.lguplus.com/benefit-membership", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lgu-hallis", source: "lgu", category: "cafe", title: "할리스 음료 할인", description: "VIP콕 혜택 (2026.04 변경)", discount: "쿠폰", brand: "할리스", membershipGrade: "VIP·VVIP", link: "https://www.lguplus.com/support/service/notice/membership/2446", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lgu-naver", source: "lgu", category: "etc", title: "네이버 프리미엄 멤버십", description: "VIP콕 월 1회 선택 가능", discount: "무료", brand: "네이버", membershipGrade: "VIP·VVIP", link: "https://www.lguplus.com/benefit-membership", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lgu-data", source: "lgu", category: "etc", title: "데이터 1GB 쿠폰", description: "VIP콕 또는 2년 이상 이용 시", discount: "1GB", brand: "LGU+", membershipGrade: "VIP·VVIP", link: "https://www.lguplus.com/benefit-membership/rank-info", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 삼성카드 ──
  { id: "samsung-starbucks", source: "samsung", category: "cafe", title: "스타벅스 BOGO", description: "음료 2잔 주문 시 1잔 무료 (카드별 상이)", discount: "1+1", brand: "스타벅스", link: "https://www.samsungcard.com", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [2] },
  { id: "samsung-baemin", source: "samsung", category: "food", title: "배달의민족 할인", description: "15,000원 이상 주문 시 3,000원 (카드별 상이)", discount: "3,000원", brand: "배달의민족", link: "https://www.samsungcard.com", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "samsung-coupang", source: "samsung", category: "shopping", title: "쿠팡 할인", description: "5만원 이상 결제 시 5% (카드별 상이)", discount: "5%", brand: "쿠팡", link: "https://www.samsungcard.com", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 신한카드 ──
  { id: "shinhan-gs25", source: "shinhan", category: "convenience", title: "GS25 할인", description: "5,000원 이상 결제 시 10% (카드별 상이)", discount: "10%", brand: "GS25", link: "https://www.shinhancard.com/pconts/html/benefit/event/1231241_2207.html", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "shinhan-coupang", source: "shinhan", category: "shopping", title: "쿠팡 할인", description: "3만원 이상 결제 시 5% (카드별 상이)", discount: "5%", brand: "쿠팡", link: "https://www.shinhancard.com/pconts/html/benefit/event/1231241_2207.html", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "shinhan-oliveyoung", source: "shinhan", category: "shopping", title: "올리브영 할인", description: "2만원 이상 결제 시 10% (카드별 상이)", discount: "10%", brand: "올리브영", link: "https://www.shinhancard.com/pconts/html/benefit/event/1231241_2207.html", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 현대카드 ──
  { id: "hyundai-concert", source: "hyundai", category: "culture", title: "공연/전시 할인", description: "인터파크 예매 시 20% (카드별 상이)", discount: "20%", brand: "인터파크", link: "https://www.hyundaicard.com/benefit/event", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "hyundai-oliveyoung", source: "hyundai", category: "shopping", title: "올리브영 할인", description: "3만원 이상 결제 시 15% (카드별 상이)", discount: "15%", brand: "올리브영", link: "https://www.hyundaicard.com/benefit/event", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── KB국민카드 ──
  { id: "kb-baemin", source: "kb", category: "food", title: "배달의민족 할인", description: "12,000원 이상 주문 시 2,000원 (카드별 상이)", discount: "2,000원", brand: "배달의민족", link: "https://card.kbcard.com/BON/DVIEW/HBBMCXHISBNC0004?mainCC=a", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kb-netflix", source: "kb", category: "culture", title: "넷플릭스 캐시백", description: "월 결제 시 1,500원 캐시백 (카드별 상이)", discount: "1,500원", brand: "넷플릭스", link: "https://card.kbcard.com/BON/DVIEW/HBBMCXHISBNC0004?mainCC=a", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 롯데카드 ──
  { id: "lotte-lotteria", source: "lotte", category: "food", title: "롯데리아 할인", description: "세트 메뉴 20% (카드별 상이)", discount: "20%", brand: "롯데리아", link: "https://www.lottecard.co.kr/app/LPBNFBA_V100.lc", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lotte-lottemart", source: "lotte", category: "shopping", title: "롯데마트 할인", description: "5만원 이상 결제 시 5% (카드별 상이)", discount: "5%", brand: "롯데마트", link: "https://www.lottecard.co.kr/app/LPBNFBA_V100.lc", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 정부/지자체 ──
  { id: "gov-culture", source: "government", category: "culture", title: "문화누리카드 월 11만원", description: "기초생활수급자·차상위 대상 문화비 지원", discount: "11만원", brand: "문화누리카드", link: "https://www.mnuri.kr", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "gov-youth", source: "government", category: "etc", title: "청년 문화예술패스", description: "만 19~34세 공연·전시 무료/할인", discount: "무료", brand: "문체부", link: "https://www.mcst.go.kr/kor/main.jsp", startDate: "2026-04-01", endDate: "2026-12-31" },
];

// ─── 캐시 (6시간 TTL) ──────────────────────────────────────────

let cachedConvenience: Deal[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

async function getConvenienceCrawled(): Promise<Deal[]> {
  const now = Date.now();
  if (cachedConvenience && now - cacheTimestamp < CACHE_TTL) {
    const age = Math.round((now - cacheTimestamp) / 1000);
    console.log(`[Cache HIT] 편의점 ${cachedConvenience.length}개 (${age}초 전 캐시)`);
    return cachedConvenience;
  }
  console.log("[Cache MISS] 편의점 크롤링 시작");
  try {
    cachedConvenience = await crawlAllConvenience();
    cacheTimestamp = now;
    console.log(`[Cache SET] 편의점 ${cachedConvenience.length}개 저장`);
  } catch (e) {
    console.error("[Cache ERROR] 편의점 크롤링 실패:", e);
    if (!cachedConvenience) cachedConvenience = [];
  }
  return cachedConvenience;
}

// ─── 외부 API (async) ──────────────────────────────────────────

export async function getAllDealsAsync(): Promise<Deal[]> {
  const crawled = await getConvenienceCrawled();
  return [...staticDeals, ...crawled];
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

// ─── 동기 API (정적 데이터만, 하위 호환) ───────────────────────

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
