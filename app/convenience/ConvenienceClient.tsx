"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { differenceInHours, differenceInDays } from "date-fns";
import { Search, X } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS, type Deal, type DealSource } from "@/types/deal";
import ConvenienceDealCard from "@/components/ConvenienceDealCard";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CategoryRecurringPerks } from "@/components/UpcomingPerks";

type StoreKey = "all" | DealSource;

const STORE_ORDER: { key: StoreKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "cu", label: "CU" },
  { key: "gs25", label: "GS25" },
  { key: "seven", label: "세븐일레븐" },
  { key: "emart24", label: "이마트24" },
];

const DEAL_TYPES = [
  { key: "all", label: "전체" },
  { key: "1+1", label: "1+1" },
  { key: "2+1", label: "2+1" },
];

export default function ConvenienceClient({ initialDeals, updatedAt }: { initialDeals: Deal[]; updatedAt: string }) {
  const [activeStore, setActiveStore] = useLocalStorage<StoreKey>("pref:store", "all");
  const [dealType, setDealType] = useState("all");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const updatedDate = new Date(updatedAt);
  const updatedMonth = updatedDate.getMonth() + 1;
  const updatedDay = updatedDate.getDate();
  const updatedHour = updatedDate.getHours();
  const hoursOld = differenceInHours(now, updatedDate);
  const daysOld = differenceInDays(now, updatedDate);
  const isStale = hoursOld >= 24;

  // 편의점별 카운트 (탭에 표시 + 표시 여부 판정)
  const storeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialDeals.length };
    for (const store of STORE_ORDER) {
      if (store.key === "all") continue;
      counts[store.key] = initialDeals.filter(
        (d) => d.source === store.key
      ).length;
    }
    return counts;
  }, [initialDeals]);

  // 데이터 0건인 편의점 탭은 숨김 (혼란 방지)
  const visibleStores = useMemo(
    () =>
      STORE_ORDER.filter(
        (s) => s.key === "all" || (storeCounts[s.key] ?? 0) > 0
      ),
    [storeCounts]
  );

  // 검색어가 입력되면 자동으로 "전체"로 전환 → 편의점 간 비교 가능
  // 사용자가 직접 편의점 탭을 클릭해서 검색 중인 케이스는 보존하지 않음
  // (의도적인 단순화: 검색은 항상 전체에서 비교한다는 일관된 멘탈모델)
  useEffect(() => {
    if (search.trim() && activeStore !== "all") {
      setActiveStore("all");
    }
  }, [search, activeStore]);

  const filteredDeals = useMemo(() => {
    let deals =
      activeStore === "all"
        ? initialDeals
        : initialDeals.filter((d) => d.source === activeStore);

    if (dealType !== "all") {
      deals = deals.filter((d) => d.discount === dealType);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      deals = deals.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          (d.price && d.price.toLowerCase().includes(q))
      );
    }

    // 전체 탭에서 검색 결과는 편의점별로 정렬해서 비교 편의 ↑
    if (activeStore === "all" && search.trim()) {
      const order: Record<string, number> = {
        cu: 0, gs25: 1, seven: 2, emart24: 3,
      };
      deals = [...deals].sort(
        (a, b) => (order[a.source] ?? 99) - (order[b.source] ?? 99)
      );
    }
    return deals;
  }, [initialDeals, activeStore, dealType, search]);

  const showStoreLabel = activeStore === "all";

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">편의점 행사</h1>
        <p className="text-sm text-[#64748B] mt-1">
          1+1, 2+1 행사 모아보기 · 총 {initialDeals.length}개 · {updatedMonth}월 {updatedDay}일 {updatedHour}시 기준
        </p>
      </div>

      {isStale && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 mb-4 text-xs text-[#92400E]">
          데이터가 최신이 아닐 수 있습니다 ({daysOld}일 전 기준)
        </div>
      )}

      <CategoryRecurringPerks target="convenience" title="정기 마트/식음료 행사" emoji="🛒" />

      {/* 편의점 탭 (가로 스크롤 - 탭 늘어나도 안전) */}
      <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        {visibleStores.map((store) => {
          const count = storeCounts[store.key] ?? 0;
          const active = activeStore === store.key;
          const bg =
            store.key === "all"
              ? "#0F172A"
              : SOURCE_COLORS[store.key as DealSource];
          return (
            <button
              key={store.key}
              onClick={() => setActiveStore(store.key)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B]"
              }`}
              style={active ? { backgroundColor: bg } : {}}
            >
              {store.label}
              <span className="ml-1 text-[11px] opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 상품 검색 */}
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
          placeholder="상품명 검색 (예: 콜라, 삼각김밥) - 전체 편의점 비교"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#94A3B8] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 행사 유형 필터 */}
      <div className="flex gap-1.5 mb-4">
        {DEAL_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setDealType(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              dealType === t.key
                ? "bg-[#0F172A] text-white"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#94A3B8] self-center">
          {filteredDeals.length}개
        </span>
      </div>

      {/* 상품 그리드 */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          {search.trim()
            ? `"${search.trim()}" 검색 결과가 없습니다.`
            : activeStore === "all"
              ? "현재 진행 중인 행사가 없습니다."
              : `현재 ${SOURCE_LABELS[activeStore as DealSource]} ${
                  dealType !== "all" ? dealType + " " : ""
                }행사가 없습니다.`}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filteredDeals.map((deal, i) => (
            <ConvenienceDealCard
              key={deal.id}
              deal={deal}
              index={i}
              showSourceBadge={showStoreLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
