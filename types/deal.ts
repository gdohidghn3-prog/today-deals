export type DealSource =
  | "skt" | "kt" | "lgu"
  | "samsung" | "shinhan" | "hyundai" | "kb" | "lotte"
  | "cu" | "gs25" | "seven"
  | "government";

export type DealCategory = "cafe" | "food" | "culture" | "shopping" | "convenience" | "etc";

export interface Deal {
  id: string;
  source: DealSource;
  category: DealCategory;
  title: string;
  description: string;
  discount: string;
  brand: string;
  link?: string;
  imageUrl?: string;
  price?: string;
  membershipGrade?: string;  // VIP, 골드, 실버, 일반 등
  startDate: string;
  endDate: string;
  dayOfWeek?: number[];   // 0=일, 1=월, ... 6=토
}

export const SOURCE_LABELS: Record<DealSource, string> = {
  skt: "T멤버십",
  kt: "KT멤버십",
  lgu: "U+멤버십",
  samsung: "삼성카드",
  shinhan: "신한카드",
  hyundai: "현대카드",
  kb: "KB국민",
  lotte: "롯데카드",
  cu: "CU",
  gs25: "GS25",
  seven: "세븐일레븐",
  government: "정부/지자체",
};

export const SOURCE_COLORS: Record<DealSource, string> = {
  skt: "#E4002B",
  kt: "#000000",
  lgu: "#E6007E",
  samsung: "#1428A0",
  shinhan: "#0046FF",
  hyundai: "#003DA5",
  kb: "#FFBC00",
  lotte: "#ED1C24",
  cu: "#652D90",
  gs25: "#0088CE",
  seven: "#00875A",
  government: "#2563EB",
};

export const CATEGORY_LABELS: Record<DealCategory, { label: string; emoji: string }> = {
  cafe: { label: "카페/음식", emoji: "☕" },
  food: { label: "배달/외식", emoji: "🍽️" },
  culture: { label: "문화/여가", emoji: "🎬" },
  shopping: { label: "쇼핑", emoji: "🛒" },
  convenience: { label: "편의점", emoji: "🏪" },
  etc: { label: "기타", emoji: "🎁" },
};

export type TelecomType = "skt" | "kt" | "lgu";
