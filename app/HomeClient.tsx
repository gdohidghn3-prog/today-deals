"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CATEGORY_LABELS, SOURCE_LABELS, type Deal, type DealCategory, type TelecomType } from "@/types/deal";
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

  // 통신사 혜택만 필터
  const telecomDeals = useMemo(
    () => initialDeals.filter((d) => ["skt", "kt", "lgu"].includes(d.source)),
    [initialDeals]
  );

  const filteredDeals = useMemo(() => {
    if (telecom === "all") return telecomDeals;
    return telecomDeals.filter((d) => d.source === telecom);
  }, [telecomDeals, telecom]);

  const categories = Object.keys(CATEGORY_LABELS) as DealCategory[];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">오늘혜택</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })} · 통신사 멤버십 혜택
        </p>
      </div>

      {/* 통신사 필터 */}
      <div className="flex gap-2 mb-2">
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
            {opt.key !== "all" && (
              <span className="ml-1 text-[11px] opacity-80">
                {telecomDeals.filter((d) => d.source === opt.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[#CBD5E1] mb-5">
        {telecom === "all"
          ? `총 ${filteredDeals.length}개 혜택`
          : `${SOURCE_LABELS[telecom]} ${filteredDeals.length}개 혜택`}
        {" · "}등급에 따라 혜택이 다를 수 있습니다
      </p>

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
          해당 통신사의 혜택 정보가 없습니다.
        </div>
      )}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-4 leading-relaxed">
        혜택 정보는 각 통신사 공식 사이트에서 자동 수집되며, 실제와 다를 수 있습니다.
        <br />정확한 내용은 카드를 눌러 확인하세요.
      </p>
    </div>
  );
}
