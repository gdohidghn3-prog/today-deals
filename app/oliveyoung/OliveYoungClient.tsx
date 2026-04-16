"use client";

import { memo, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { OliveYoungItem } from "@/lib/crawlers/oliveyoung";

type FilterKey = "all" | "sale" | "coupon" | "today";
type SortKey = "rank" | "discount" | "price";
type CategoryKey =
  | "all"
  | "skincare"
  | "mask"
  | "cleansing"
  | "suncare"
  | "makeup"
  | "body_hair"
  | "perfume";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "sale", label: "세일" },
  { key: "coupon", label: "쿠폰" },
  { key: "today", label: "오늘드림" },
];

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "skincare", label: "스킨케어" },
  { key: "mask", label: "마스크팩" },
  { key: "cleansing", label: "클렌징" },
  { key: "suncare", label: "선케어" },
  { key: "makeup", label: "메이크업" },
  { key: "body_hair", label: "바디/헤어" },
  { key: "perfume", label: "향수" },
];

// 상품명 키워드 → 카테고리 매핑 (순서대로 매칭: 앞에 있을수록 우선)
const CATEGORY_RULES: { key: CategoryKey; keywords: RegExp }[] = [
  // 선케어 먼저: "선에센스" 같은 걸 스킨케어로 잡지 않게
  {
    key: "suncare",
    keywords: /선크림|선스틱|선블록|썬크림|썬블록|자외선|SPF|스킨[\s]*아쿠아/i,
  },
  {
    key: "mask",
    keywords: /마스크[\s]*팩|마스크팩|시트[\s]*마스크|패치|부직포|슬리핑[\s]*마스크|\b팩\b|100매|5매|10매/i,
  },
  {
    key: "cleansing",
    keywords: /클렌저|클렌징|클린징|폼[\s]*클|리무버|페이스워시|세안|필링/i,
  },
  {
    key: "makeup",
    keywords:
      /립[\s]*스틱|립[\s]*글|립[\s]*밤|립[\s]*틴트|립[\s]*플럼|립라이너|립|틴트|쿠션|파운데이션|파데|컨실러|섀도우|아이라이너|브로우|블러셔|블러셔|치크|하이라이터|프라이머|래커|글로스|메이크업|MLBB/i,
  },
  {
    key: "body_hair",
    keywords:
      /샴푸|린스|컨디셔너|트리트먼트|헤어|두피|염색|바디|핸드|풋|각질|데오|제모|발[\s]*크림|입욕/i,
  },
  {
    key: "perfume",
    keywords: /향수|퍼퓸|오[\s]*드[\s]*(뚜왈렛|퍼퓸|코롱)|EDT|EDP|프래그런스|바디[\s]*미스트/i,
  },
  // 스킨케어는 가장 포괄적이라 마지막
  {
    key: "skincare",
    keywords:
      /에센스|세럼|앰플|토너|스킨|로션|크림|모이스처|부스터|아이크림|아이케어|수분|보습|미스트|에멀션|밤|패드|리들샷|콜라겐|비타민/i,
  },
];

function classifyCategory(name: string, brand: string): CategoryKey {
  const text = `${brand} ${name}`;
  for (const { key, keywords } of CATEGORY_RULES) {
    if (keywords.test(text)) return key;
  }
  return "all"; // 미분류
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "랭킹순" },
  { key: "discount", label: "할인율순" },
  { key: "price", label: "저가순" },
];

const BRAND = "#13A538";

function fmt(n: number | null): string {
  if (n == null) return "-";
  return n.toLocaleString("ko-KR");
}

export default function OliveYoungClient({
  initialItems,
  updatedAt,
}: {
  initialItems: OliveYoungItem[];
  updatedAt: string | null;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 각 상품에 카테고리 라벨 한 번만 계산 (memo)
  const classified = useMemo(
    () =>
      initialItems.map((i) => ({
        ...i,
        _cat: classifyCategory(i.name, i.brand),
      })),
    [initialItems]
  );

  // 카테고리별 개수 (탭 옆 숫자 표시용)
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: classified.length,
      skincare: 0,
      mask: 0,
      cleansing: 0,
      suncare: 0,
      makeup: 0,
      body_hair: 0,
      perfume: 0,
    };
    for (const i of classified) {
      if (i._cat !== "all") counts[i._cat]++;
    }
    return counts;
  }, [classified]);

  const items = useMemo(() => {
    let list = classified.slice();

    if (filter === "sale") list = list.filter((i) => i.flags.includes("세일"));
    else if (filter === "coupon")
      list = list.filter((i) => i.flags.includes("쿠폰"));
    else if (filter === "today")
      list = list.filter((i) => i.flags.includes("오늘드림"));

    if (category !== "all") {
      list = list.filter((i) => i._cat === category);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q)
      );
    }

    if (sort === "discount") {
      list.sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
    } else if (sort === "price") {
      list.sort(
        (a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity)
      );
    } else {
      list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  }, [classified, filter, category, sort, search]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">올리브영 랭킹</h1>
        <p className="text-sm text-[#64748B] mt-1">
          실시간 인기 상품 TOP {initialItems.length}개
          {updatedAt && (
            <span className="text-[#CBD5E1]">
              {" · "}
              {format(new Date(updatedAt), "M월 d일 HH시", { locale: ko })} 기준
            </span>
          )}
        </p>
      </div>

      {initialItems.length === 0 && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 mb-4 text-sm text-[#92400E]">
          <p className="font-semibold mb-1">데이터를 불러오지 못했습니다</p>
          <p className="text-xs leading-relaxed">
            일시적인 연결 문제로 올리브영 랭킹을 가져올 수 없습니다. 잠시 후 다시
            시도해주세요.
          </p>
        </div>
      )}

      {/* 검색 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="상품명/브랜드 검색 (예: 리들샷, VT)"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#94A3B8] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 혜택 필터 탭 */}
      <div className="flex gap-2 mb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? "text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
            style={filter === f.key ? { backgroundColor: BRAND } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 종류 카테고리 탭 (가로 스크롤) */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((c) => {
          const count = categoryCounts[c.key];
          const active = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
              }`}
            >
              {c.label}
              <span
                className={`ml-1 text-[10px] ${
                  active ? "opacity-70" : "text-[#94A3B8]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 정렬 */}
      <div className="flex gap-1.5 mb-4">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sort === s.key
                ? "bg-[#0F172A] text-white"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#94A3B8] self-center">
          {items.length}개
        </span>
      </div>

      {/* 그리드 */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8] text-sm">
          {search.trim()
            ? `"${search.trim()}" 검색 결과가 없습니다.`
            : "조건에 맞는 상품이 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-6 leading-relaxed">
        상품 정보는 올리브영 공식 페이지에서 수집되며, 실제 가격과 다를 수 있습니다.
        <br />
        정확한 가격은 상품 페이지에서 확인하세요.
      </p>
    </div>
  );
}

const Card = memo(function Card({ item }: { item: OliveYoungItem }) {
  const hasDiscount = item.discountRate != null && item.discountRate > 0;
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative w-full aspect-square bg-[#F8FAFC]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            width={200}
            height={200}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
            onError={(e) =>
              ((e.target as HTMLImageElement).style.display = "none")
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            💄
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold text-white leading-none bg-[#0F172A]">
          {item.rank}위
        </span>
        {hasDiscount && (
          <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold text-white leading-none bg-[#EF4444]">
            -{item.discountRate}%
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] font-bold text-[#64748B] mb-0.5 truncate">
          {item.brand || "\u00A0"}
        </p>
        <p className="text-[11px] text-[#0F172A] leading-tight line-clamp-2 min-h-[28px]">
          {item.name}
        </p>
        <div className="mt-1.5">
          {item.origPrice && hasDiscount && (
            <p className="text-[10px] text-[#94A3B8] line-through leading-none">
              {fmt(item.origPrice)}원
            </p>
          )}
          <p className="text-sm font-bold leading-tight" style={{ color: BRAND }}>
            {fmt(item.salePrice)}
            <span className="text-[10px] font-medium text-[#64748B] ml-0.5">
              원
            </span>
          </p>
        </div>
        {item.flags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {item.flags.slice(0, 3).map((f) => (
              <span
                key={f}
                className="text-[9px] px-1 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] leading-none"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
});
