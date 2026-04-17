"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS, type Deal } from "@/types/deal";
import { trackEvent } from "@/lib/analytics";

function getSearchUrl(deal: Deal): string {
  const source = SOURCE_LABELS[deal.source];
  const query = `${source} ${deal.title}`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}

export default function DealCard({ deal, index = 0 }: { deal: Deal; index?: number }) {
  const color = SOURCE_COLORS[deal.source];
  const isHot = deal.discount.includes("50%") || deal.discount.includes("1+1") || deal.discount === "무료";
  const searchUrl = getSearchUrl(deal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <a
        href={deal.link || searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("deal_click", { source: deal.source, brand: deal.brand })}
        className={`block bg-white border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
          isHot ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/20" : "border-[#E2E8F0]"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {SOURCE_LABELS[deal.source]}
            </span>
            {deal.membershipGrade && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                {deal.membershipGrade}
              </span>
            )}
            {isHot && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#FEF3C7] text-[#D97706]">
                HOT
              </span>
            )}
          </div>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#94A3B8] shrink-0 hover:text-[#64748B] transition-colors"
            aria-label="네이버 검색"
          >
            <Search size={14} />
          </a>
        </div>

        <h3 className="font-semibold text-[#0F172A] text-sm mb-1">{deal.title}</h3>
        <p className="text-xs text-[#64748B] mb-2">{deal.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color }}>
            {deal.discount}
          </span>
          <span className="text-[11px] text-[#94A3B8]">{deal.brand}</span>
        </div>

        {deal.dayOfWeek && (
          <div className="flex gap-1 mt-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <span
                key={d}
                className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full ${
                  deal.dayOfWeek!.includes(i)
                    ? "bg-[#6366F1] text-white"
                    : "bg-[#F1F5F9] text-[#CBD5E1]"
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        )}
      </a>
    </motion.div>
  );
}
