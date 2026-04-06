"use client";

import { motion } from "framer-motion";
import { SOURCE_COLORS, type Deal } from "@/types/deal";

const STORE_LINKS: Record<string, string> = {
  cu: "https://cu.bgfretail.com/event/plus.do",
  gs25: "http://gs25.gsretail.com/gscvs/ko/products/event-goods",
  seven: "https://www.7-eleven.co.kr/product/presentList.asp",
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
}: {
  deal: Deal;
  index?: number;
}) {
  const color = SOURCE_COLORS[deal.source];
  const name = cleanName(deal.title);
  const price = deal.price || "";
  const is1p1 = deal.discount === "1+1";
  const link = STORE_LINKS[deal.source] || "#";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
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
    </motion.div>
  );
}
