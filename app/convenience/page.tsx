"use client";

import { useState, useMemo } from "react";
import { getConvenienceDeals } from "@/lib/deals";
import { SOURCE_LABELS, SOURCE_COLORS, type DealSource } from "@/types/deal";
import DealCard from "@/components/DealCard";

const STORES: { key: DealSource; label: string }[] = [
  { key: "cu", label: "CU" },
  { key: "gs25", label: "GS25" },
  { key: "seven", label: "세븐일레븐" },
];

export default function ConveniencePage() {
  const [activeStore, setActiveStore] = useState<DealSource>("cu");
  const allDeals = useMemo(() => getConvenienceDeals(), []);
  const filteredDeals = allDeals.filter((d) => d.source === activeStore);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">편의점 행사</h1>
        <p className="text-sm text-[#64748B] mt-1">1+1, 2+1 행사 모아보기</p>
      </div>

      {/* 편의점 탭 */}
      <div className="flex gap-2 mb-6">
        {STORES.map((store) => (
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
          </button>
        ))}
      </div>

      {/* 행사 목록 */}
      <div className="space-y-2">
        {filteredDeals.map((deal, i) => (
          <DealCard key={deal.id} deal={deal} index={i} />
        ))}
      </div>

      {filteredDeals.length === 0 && (
        <div className="text-center py-12 text-[#94A3B8]">
          현재 {SOURCE_LABELS[activeStore]} 행사가 없습니다.
        </div>
      )}
    </div>
  );
}
