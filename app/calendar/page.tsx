"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getWeeklyCalendar } from "@/lib/deals";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/types/deal";

export default function CalendarPage() {
  const calendar = useMemo(() => getWeeklyCalendar(), []);
  const todayDay = new Date().getDay();

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">요일별 혜택</h1>
        <p className="text-sm text-[#64748B] mt-1">
          요일별 고정 할인/혜택을 한눈에 확인하세요
        </p>
      </div>

      <div className="space-y-3">
        {calendar.map((day, i) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white border rounded-xl p-4 ${
              day.day === todayDay
                ? "border-[#FF6B35] ring-2 ring-[#FF6B35]/20"
                : "border-[#E2E8F0]"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                  day.day === todayDay
                    ? "bg-[#FF6B35] text-white"
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {day.label}
              </span>
              {day.day === todayDay && (
                <span className="text-[11px] px-2 py-0.5 bg-[#FFF7ED] text-[#FF6B35] rounded-full font-medium">
                  오늘
                </span>
              )}
            </div>

            {day.deals.length === 0 ? (
              <p className="text-xs text-[#CBD5E1]">요일 한정 혜택 없음</p>
            ) : (
              <div className="space-y-1.5">
                {day.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: SOURCE_COLORS[deal.source] }}
                      >
                        {SOURCE_LABELS[deal.source]}
                      </span>
                      <span className="text-sm text-[#1A1A2E]">{deal.brand}</span>
                    </div>
                    <span className="text-sm font-bold text-[#FF6B35]">
                      {deal.discount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
