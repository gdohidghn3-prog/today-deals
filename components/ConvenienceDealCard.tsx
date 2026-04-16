"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { SOURCE_COLORS, SOURCE_LABELS, type Deal } from "@/types/deal";
import NearbyStoresSheet from "@/components/NearbyStoresSheet";

const STORE_LINKS: Record<string, string> = {
  cu: "https://cu.bgfretail.com/event/plus.do",
  gs25: "http://gs25.gsretail.com/gscvs/ko/products/event-goods",
  seven: "https://www.7-eleven.co.kr/product/presentList.asp",
  emart24: "https://www.emart24.co.kr/goods/event",
};

function cleanName(raw: string): string {
  // "동원)양반누룽지닭죽 1+1" → "양반누룽지닭죽"
  let name = raw.replace(/\s*(1\+1|2\+1)\s*$/g, "").trim();
  const parenIdx = name.indexOf(")");
  if (parenIdx > 0 && parenIdx < 10) {
    name = name.substring(parenIdx + 1);
  }
  return name || raw;
}

export default function ConvenienceDealCard({
  deal,
  index = 0,
  showSourceBadge = false,
}: {
  deal: Deal;
  index?: number;
  /** 전체 탭에서 카드별 편의점 식별이 필요할 때 true */
  showSourceBadge?: boolean;
}) {
  const color = SOURCE_COLORS[deal.source];
  const name = cleanName(deal.title);
  const price = deal.price || "";
  const is1p1 = deal.discount === "1+1";
  const link = STORE_LINKS[deal.source] || "#";

  const [sheetOpen, setSheetOpen] = useState(false);

  const handleNearbyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSheetOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
        className="relative"
      >
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* 이미지 - 고정 비율 */}
          <div className="relative w-full aspect-square bg-[#F8FAFC] flex items-center justify-center p-2">
            {deal.imageUrl ? (
              <img
                src={deal.imageUrl}
                alt={name}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="text-2xl">🏪</div>
            )}
            <span
              className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold text-white leading-none"
              style={{ backgroundColor: is1p1 ? "#EF4444" : "#F59E0B" }}
            >
              {deal.discount}
            </span>
            {showSourceBadge && (
              <span
                className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold text-white leading-none"
                style={{ backgroundColor: color }}
              >
                {SOURCE_LABELS[deal.source]}
              </span>
            )}
          </div>

          {/* 정보 - 고정 높이 */}
          <div className="p-2 h-[52px] flex flex-col justify-between">
            <p className="text-[11px] font-medium text-[#0F172A] leading-tight line-clamp-2">
              {name}
            </p>
            {price && (
              <p className="text-xs font-bold mt-auto" style={{ color }}>
                {price}
              </p>
            )}
          </div>
        </a>

        {/* 주변매장 버튼 — 카드 우측 상단 (a 태그 외부) */}
        <button
          type="button"
          onClick={handleNearbyClick}
          className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-sm border border-[#E2E8F0] shadow-sm text-[10px] font-medium text-[#0F172A] hover:bg-white hover:border-[#CBD5E1] active:scale-95 transition-all"
          aria-label="주변 매장 찾기"
        >
          <MapPin size={10} />
          <span className="hidden sm:inline">주변</span>
        </button>
      </motion.div>

      <NearbyStoresSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        brand={deal.source}
        productName={name}
      />
    </>
  );
}
