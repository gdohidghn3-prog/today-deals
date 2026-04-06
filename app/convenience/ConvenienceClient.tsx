"use client";

import { useState, useMemo } from "react";
import { SOURCE_LABELS, SOURCE_COLORS, type Deal, type DealSource } from "@/types/deal";
import ConvenienceDealCard from "@/components/ConvenienceDealCard";

const STORES: { key: DealSource; label: string }[] = [
  { key: "cu", label: "CU" },
  { key: "gs25", label: "GS25" },
  { key: "seven", label: "세븐일레븐" },
];

const DEAL_TYPES = [
  { key: "all", label: "전체" },
  { key: "1+1", label: "1+1" },
  { key: "2+1", label: "2+1" },
];

export default function ConvenienceClient({ initialDeals }: { initialDeals: Deal[] }) {
  const [activeStore, setActiveStore] = useState<DealSource>("cu");
  const [dealType, setDealType] = useState("all");

  const filteredDeals = useMemo(() => {
    let deals = initialDeals.filter((d) => d.source === activeStore);
    if (dealType !== "all") {
      deals = deals.filter((d) => d.discount === dealType);
    }
    return deals;
  }, [initialDeals, activeStore, dealType]);

  const storeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const store of STORES) {
      counts[store.key] = initialDeals.filter((d) => d.source === store.key).length;
    }
    return counts;
  }, [initialDeals]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">편의점 행사</h1>
        <p className="text-sm text-[#64748B] mt-1">
          1+1, 2+1 행사 모아보기 · 총 {initialDeals.length}개
        </p>
      </div>

      {/* 편의점 탭 */}
      <div className="flex gap-2 mb-4">
        {STORES.map((store) => {
          const count = storeCounts[store.key] || 0;
          return (
            <button
              key={store.key}
              onClick={() => setActiveStore(store.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeStore === store.key
                  ? "text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B]"
              }`}
              style={
                activeStore === store.key
                  ? { backgroundColor: SOURCE_COLORS[store.key] }
                  : {}
              }
            >
              {store.label}
              <span className="ml-1 text-[11px] opacity-80">{count}</span>
            </button>
          );
        })}
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
          현재 {SOURCE_LABELS[activeStore]} {dealType !== "all" ? dealType + " " : ""}행사가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filteredDeals.map((deal, i) => (
            <ConvenienceDealCard key={deal.id} deal={deal} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
