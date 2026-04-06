"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SOURCE_LABELS, SOURCE_COLORS, type Deal, type TelecomType } from "@/types/deal";

const TELECOMS: TelecomType[] = ["skt", "kt", "lgu"];

const CATEGORIES = [
  { key: "cafe", label: "카페", emoji: "☕" },
  { key: "food", label: "외식", emoji: "🍽️" },
  { key: "culture", label: "문화", emoji: "🎬" },
  { key: "shopping", label: "쇼핑", emoji: "🛒" },
  { key: "convenience", label: "편의점", emoji: "🏪" },
  { key: "etc", label: "기타", emoji: "🎁" },
];

export default function CompareClient({ deals }: { deals: Deal[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Deal[]>> = {};
    for (const cat of CATEGORIES) {
      map[cat.key] = {};
      for (const t of TELECOMS) {
        map[cat.key][t] = deals.filter(
          (d) => d.source === t && d.category === cat.key
        );
      }
    }
    return map;
  }, [deals]);

  const hasData = (catKey: string) =>
    TELECOMS.some((t) => grouped[catKey]?.[t]?.length > 0);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">통신사 비교</h1>
        <p className="text-sm text-[#64748B] mt-1">
          SKT · KT · LGU+ 멤버십 혜택을 한눈에 비교하세요
        </p>
      </div>

      {/* 통신사 헤더 (고정) */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {TELECOMS.map((t) => (
          <div
            key={t}
            className="text-center py-2 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: SOURCE_COLORS[t] }}
          >
            {SOURCE_LABELS[t]}
            <span className="ml-1 text-[11px] opacity-80">
              ({deals.filter((d) => d.source === t).length})
            </span>
          </div>
        ))}
      </div>

      {/* 카테고리별 비교 */}
      {CATEGORIES.filter((cat) => hasData(cat.key)).map((cat, catIdx) => (
        <motion.section
          key={cat.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: catIdx * 0.05 }}
          className="mb-6"
        >
          <h2 className="text-sm font-bold text-[#0F172A] mb-2">
            {cat.emoji} {cat.label}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {TELECOMS.map((t) => {
              const items = grouped[cat.key]?.[t] || [];
              return (
                <div
                  key={t}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 min-h-[60px]"
                >
                  {items.length === 0 ? (
                    <p className="text-[11px] text-[#CBD5E1] text-center py-2">-</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((deal) => (
                        <a
                          key={deal.id}
                          href={deal.link || `https://search.naver.com/search.naver?query=${encodeURIComponent(SOURCE_LABELS[deal.source] + " " + deal.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:bg-[#F8FAFC] rounded-lg p-1 -m-1 transition-colors"
                        >
                          <p className="text-[11px] font-medium text-[#0F172A] leading-tight">
                            {deal.brand}
                          </p>
                          <p
                            className="text-xs font-bold mt-0.5"
                            style={{ color: SOURCE_COLORS[t] }}
                          >
                            {deal.discount}
                          </p>
                          {deal.membershipGrade && (
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">
                              {deal.membershipGrade}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
      ))}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-4 leading-relaxed">
        혜택 정보는 각 통신사 공식 사이트에서 자동 수집되며, 실제와 다를 수 있습니다.
      </p>
    </div>
  );
}
