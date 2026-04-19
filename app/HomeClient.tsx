"use client";

import { useState, useMemo, useRef } from "react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Search, X } from "lucide-react";
import { CATEGORY_LABELS, SOURCE_LABELS, type Deal, type DealCategory, type TelecomType } from "@/types/deal";
import DealCard from "@/components/DealCard";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { trackEvent } from "@/lib/analytics";

const TELECOM_OPTIONS: { key: TelecomType | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "skt", label: "SKT" },
  { key: "kt", label: "KT" },
  { key: "lgu", label: "LGU+" },
];

export default function HomeClient({ initialDeals, updatedAt }: { initialDeals: Deal[]; updatedAt: string }) {
  const [telecom, setTelecom] = useLocalStorage<TelecomType | "all">("pref:telecom", "all");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date();
  const updatedDate = new Date(updatedAt);
  const updatedMonth = updatedDate.getMonth() + 1;
  const updatedDay = updatedDate.getDate();
  const updatedHour = updatedDate.getHours();
  const hoursOld = differenceInHours(today, updatedDate);
  const daysOld = differenceInDays(today, updatedDate);
  const isStale = hoursOld >= 24;

  // 통신사 혜택만 필터
  const telecomDeals = useMemo(
    () => initialDeals.filter((d) => ["skt", "kt", "lgu"].includes(d.source)),
    [initialDeals]
  );

  const filteredDeals = useMemo(() => {
    let deals = telecom === "all" ? telecomDeals : telecomDeals.filter((d) => d.source === telecom);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      deals = deals.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }
    return deals;
  }, [telecomDeals, telecom, search]);

  const categories = Object.keys(CATEGORY_LABELS) as DealCategory[];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">오늘혜택</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })} · 통신사 멤버십 혜택 · {updatedMonth}월 {updatedDay}일 {updatedHour}시 기준
        </p>
      </div>

      {isStale && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 mb-4 text-xs text-[#92400E]">
          데이터가 최신이 아닐 수 있습니다 ({daysOld}일 전 기준)
        </div>
      )}

      {/* 통신사 필터 */}
      <div className="flex gap-2 mb-2">
        {TELECOM_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => { setTelecom(opt.key); trackEvent("filter_change", { tab: "telecom", value: opt.key }); }}
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

      <p className="text-[11px] text-[#CBD5E1] mb-3">
        {telecom === "all"
          ? `총 ${filteredDeals.length}개 혜택`
          : `${SOURCE_LABELS[telecom]} ${filteredDeals.length}개 혜택`}
        {telecom === "skt" ? " · 대표 제휴 브랜드 기준" : ""}
        {" · "}등급에 따라 혜택이 다를 수 있습니다
      </p>

      {/* 브랜드 검색 */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => { if (search.trim()) trackEvent("search", { query: search.trim(), count: filteredDeals.length }); }}
          placeholder="브랜드/혜택 검색 (예: 스타벅스, CGV)"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#94A3B8] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
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
          {search.trim()
            ? `"${search.trim()}" 검색 결과가 없습니다.`
            : "해당 통신사의 혜택 정보가 없습니다."}
        </div>
      )}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-4 leading-relaxed">
        혜택 정보는 각 통신사 공식 사이트에서 자동 수집되며, 실제와 다를 수 있습니다.
        <br />정확한 내용은 카드를 눌러 확인하세요.
      </p>
    </div>
  );
}
