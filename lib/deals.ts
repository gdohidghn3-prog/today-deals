import type { Deal, DealCategory, DealSource, TelecomType } from "@/types/deal";

// ─── 샘플 데이터 (실제 존재하는 혜택 기반) ──────────────────

const deals: Deal[] = [
  // ── SKT T멤버십 ──
  { id: "skt-twosome", source: "skt", category: "cafe", title: "투썸플레이스 50% 할인", description: "아메리카노 포함 전 음료 50%", discount: "50%", brand: "투썸플레이스", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [1, 2, 3, 4, 5] },
  { id: "skt-cgv", source: "skt", category: "culture", title: "CGV 영화 6,000원", description: "일반 2D 기준, 월 2회", discount: "6,000원", brand: "CGV", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "skt-cu", source: "skt", category: "convenience", title: "CU 바이원겟원", description: "도시락·삼각김밥 1+1", discount: "1+1", brand: "CU", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [2] },
  { id: "skt-burgerking", source: "skt", category: "food", title: "버거킹 세트 40% 할인", description: "와퍼 세트 기준", discount: "40%", brand: "버거킹", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [3] },
  { id: "skt-gs25", source: "skt", category: "convenience", title: "GS25 음료 50%", description: "냉장 음료 전 품목", discount: "50%", brand: "GS25", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [4] },

  // ── KT 멤버십 ──
  { id: "kt-starbucks", source: "kt", category: "cafe", title: "스타벅스 30% 할인", description: "음료 1잔 30% (월 1회)", discount: "30%", brand: "스타벅스", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kt-megabox", source: "kt", category: "culture", title: "메가박스 6,000원", description: "일반 2D, 월 2회", discount: "6,000원", brand: "메가박스", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kt-burgerking", source: "kt", category: "food", title: "버거킹 40% 할인", description: "와퍼 세트", discount: "40%", brand: "버거킹", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [1] },
  { id: "kt-domino", source: "kt", category: "food", title: "도미노피자 40% 할인", description: "라지 사이즈", discount: "40%", brand: "도미노피자", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [5] },

  // ── LGU+ 멤버십 ──
  { id: "lgu-ediya", source: "lgu", category: "cafe", title: "이디야 50% 할인", description: "아메리카노 포함 전 음료", discount: "50%", brand: "이디야", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lgu-lotte-cinema", source: "lgu", category: "culture", title: "롯데시네마 6,000원", description: "일반 2D, 월 2회", discount: "6,000원", brand: "롯데시네마", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lgu-bbq", source: "lgu", category: "food", title: "BBQ 30% 할인", description: "치킨 전 메뉴 (배달 제외)", discount: "30%", brand: "BBQ", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [4] },

  // ── 삼성카드 ──
  { id: "samsung-starbucks", source: "samsung", category: "cafe", title: "스타벅스 BOGO", description: "음료 2잔 주문 시 1잔 무료", discount: "1+1", brand: "스타벅스", startDate: "2026-04-01", endDate: "2026-04-30", dayOfWeek: [2] },
  { id: "samsung-baemin", source: "samsung", category: "food", title: "배달의민족 3,000원 할인", description: "15,000원 이상 주문 시", discount: "3,000원", brand: "배달의민족", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "samsung-coupang", source: "samsung", category: "shopping", title: "쿠팡 5% 할인", description: "5만원 이상 결제 시", discount: "5%", brand: "쿠팡", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 신한카드 ──
  { id: "shinhan-gs25", source: "shinhan", category: "convenience", title: "GS25 10% 할인", description: "5,000원 이상 결제 시", discount: "10%", brand: "GS25", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "shinhan-coupang", source: "shinhan", category: "shopping", title: "쿠팡 5% 할인", description: "3만원 이상 결제 시", discount: "5%", brand: "쿠팡", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "shinhan-oliveyoung", source: "shinhan", category: "shopping", title: "올리브영 10% 할인", description: "2만원 이상 결제 시", discount: "10%", brand: "올리브영", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 현대카드 ──
  { id: "hyundai-concert", source: "hyundai", category: "culture", title: "공연/전시 20% 할인", description: "인터파크 예매 시", discount: "20%", brand: "인터파크", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "hyundai-oliveyoung", source: "hyundai", category: "shopping", title: "올리브영 15% 할인", description: "3만원 이상 결제 시", discount: "15%", brand: "올리브영", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── KB국민카드 ──
  { id: "kb-baemin", source: "kb", category: "food", title: "배달의민족 2,000원 할인", description: "12,000원 이상 주문 시", discount: "2,000원", brand: "배달의민족", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "kb-netflix", source: "kb", category: "culture", title: "넷플릭스 캐시백", description: "월 결제 시 1,500원 캐시백", discount: "1,500원", brand: "넷플릭스", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 롯데카드 ──
  { id: "lotte-lotteria", source: "lotte", category: "food", title: "롯데리아 20% 할인", description: "세트 메뉴 기준", discount: "20%", brand: "롯데리아", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "lotte-lottemart", source: "lotte", category: "shopping", title: "롯데마트 5% 할인", description: "5만원 이상 결제 시", discount: "5%", brand: "롯데마트", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── CU 편의점 행사 ──
  { id: "cu-1plus1-cola", source: "cu", category: "convenience", title: "코카콜라 1.5L 1+1", description: "이번 주 한정", discount: "1+1", brand: "코카콜라", startDate: "2026-04-01", endDate: "2026-04-07" },
  { id: "cu-1plus1-ramen", source: "cu", category: "convenience", title: "신라면 멀티팩 2+1", description: "5개입 기준", discount: "2+1", brand: "신라면", startDate: "2026-04-01", endDate: "2026-04-07" },
  { id: "cu-1plus1-dosirak", source: "cu", category: "convenience", title: "백종원 도시락 500원 할인", description: "전 품목", discount: "500원", brand: "CU 도시락", startDate: "2026-04-01", endDate: "2026-04-07" },

  // ── GS25 행사 ──
  { id: "gs25-1plus1-water", source: "gs25", category: "convenience", title: "삼다수 2L 1+1", description: "이번 주 한정", discount: "1+1", brand: "삼다수", startDate: "2026-04-01", endDate: "2026-04-07" },
  { id: "gs25-1plus1-snack", source: "gs25", category: "convenience", title: "꼬깔콘 1+1", description: "전 맛 대상", discount: "1+1", brand: "꼬깔콘", startDate: "2026-04-01", endDate: "2026-04-07" },

  // ── 세븐일레븐 행사 ──
  { id: "seven-1plus1-ice", source: "seven", category: "convenience", title: "월드콘 1+1", description: "이번 주 한정", discount: "1+1", brand: "월드콘", startDate: "2026-04-01", endDate: "2026-04-07" },
  { id: "seven-sale-coffee", source: "seven", category: "convenience", title: "세븐카페 ���메리카노 1,000원", description: "레귤러 기준", discount: "1,000원", brand: "세븐카페", startDate: "2026-04-01", endDate: "2026-04-30" },

  // ── 정부/지자체 ──
  { id: "gov-culture", source: "government", category: "culture", title: "문화누리카드 월 11만원", description: "기초생활수급자·차상위 대상 문화비 지원", discount: "11만원", brand: "문화누리카드", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "gov-youth", source: "government", category: "etc", title: "청년 문화예술패스", description: "만 19~34세 공연·전시 무료/할인", discount: "무료", brand: "문체부", startDate: "2026-04-01", endDate: "2026-12-31" },
];

// ─── 유틸 함수 ───────────────────────────────────────────────

export function getAllDeals(): Deal[] {
  return deals;
}

export function getTodayDeals(): Deal[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateStr = today.toISOString().slice(0, 10);

  return deals.filter((d) => {
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
    deals: deals.filter((d) => d.dayOfWeek?.includes(day)),
  }));
}

export function getConvenienceDeals(): Deal[] {
  return deals.filter((d) => ["cu", "gs25", "seven"].includes(d.source));
}
