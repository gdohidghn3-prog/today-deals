"use client";

import type { RecurringPerk } from "@/types/perks";
import type { ResolvedSchedule } from "@/lib/recurring-rule";
import { trackEvent } from "@/lib/analytics";

const BADGE_STYLES = {
  verified: { label: "검증됨", className: "bg-[#DCFCE7] text-[#166534]" },
  needs_check: { label: "확인 필요", className: "bg-[#FEF3C7] text-[#92400E]" },
  estimated_window: { label: "예상 일정", className: "bg-[#E0E7FF] text-[#3730A3]" },
} as const;

export default function RecurringPerkCard({
  perk,
  resolved,
  variant = "featured",
}: {
  perk: RecurringPerk;
  resolved: ResolvedSchedule;
  variant?: "featured" | "compact";
}) {
  const badge = BADGE_STYLES[resolved.badge];
  const dDay = resolved.daysUntil;
  const isFeatured = variant === "featured";

  const handleClick = () => {
    trackEvent("featured_click", { id: perk.id, brand: perk.brand });
  };

  return (
    <a
      href={perk.officialUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`block bg-white border border-[#FFD8A8] rounded-xl overflow-hidden hover:shadow-md transition-shadow ${
        isFeatured ? "min-w-[180px] max-w-[200px] flex-shrink-0" : ""
      }`}
    >
      <div className="px-3 py-1.5 bg-[#FFF4E6] border-b border-[#FFD8A8] flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#D97706]">💎 정기 혜택</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-[#0F172A] line-clamp-1">{perk.title}</p>
        <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{perk.brand}</p>
        {resolved.label && (
          <p className="text-[11px] font-bold text-[#D97706] mt-1.5">{resolved.label}</p>
        )}
        {!resolved.label && (
          <p className="text-[11px] text-[#94A3B8] mt-1.5 italic">곧 시작 예정</p>
        )}
        {perk.expectedDiscountText && (
          <p className="text-[10px] text-[#475569] mt-1 line-clamp-1">
            {perk.expectedDiscountText}
          </p>
        )}
        {dDay !== null && dDay <= 3 && dDay >= 0 && (
          <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-[#FF6B35] text-white font-bold">
            마감 임박
          </span>
        )}
      </div>
    </a>
  );
}
