"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CATEGORY_LABELS, type Deal, type DealCategory, type TelecomType } from "@/types/deal";
import DealCard from "@/components/DealCard";

const TELECOM_OPTIONS: { key: TelecomType | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "skt", label: "SKT" },
  { key: "kt", label: "KT" },
  { key: "lgu", label: "LGU+" },
];

export default function HomeClient({ initialDeals }: { initialDeals: Deal[] }) {
  const [telecom, setTelecom] = useState<TelecomType | "all">("all");
  const today = new Date();

  const filteredDeals = useMemo(() => {
    if (telecom === "all") return initialDeals;
    return initialDeals.filter(
      (d) => d.source === telecom || !["skt", "kt", "lgu"].includes(d.source),
    );
  }, [initialDeals, telecom]);

  const categories = Object.keys(CATEGORY_LABELS) as DealCategory[];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      {/* 헤더 */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">오늘혜택</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })}
        </p>
      </div>

      {/* 통신사 필터 */}
      <div className="flex gap-2 mb-6">
        {TELECOM_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTelecom(opt.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              telecom === opt.key
                ? "bg-[#FF6B35] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#FF6B35] hover:text-[#FF6B35]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 카테고리별 혜택 */}
      {categories.map((cat) => {
        const info = CATEGORY_LABELS[cat];
        const catDeals = filteredDeals.filter((d) => d.category === cat);
        if (catDeals.length === 0) return null;

        return (
          <section key={cat} className="mb-8">
            <h2 className="text-base font-bold text-[#1A1A2E] mb-3">
              {info.emoji} {info.label}
            </h2>
            <div className="space-y-2">
              {catDeals.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} />
              ))}
            </div>
          </section>
        );
      })}

      {filteredDeals.length === 0 && (
        <div className="text-center py-12 text-[#94A3B8]">
          오늘 해당하는 혜택이 없습니다.
        </div>
      )}

      <p className="text-[11px] text-[#CBD5E1] text-center mt-6 mb-2">
        혜택 정보는 변경될 수 있습니다 · 카드를 눌러 최신 정보를 확인하세요
      </p>
    </div>
  );
}
