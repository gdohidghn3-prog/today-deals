"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { OliveYoungItem } from "@/lib/crawlers/oliveyoung";

type FilterKey = "all" | "sale" | "coupon" | "today";
type SortKey = "rank" | "discount" | "price";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "sale", label: "세일" },
  { key: "coupon", label: "쿠폰" },
  { key: "today", label: "오늘드림" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "랭킹순" },
  { key: "discount", label: "할인율순" },
  { key: "price", label: "저가순" },
];

const BRAND = "#13A538";

function fmt(n: number | null): string {
  if (n == null) return "-";
  return n.toLocaleString("ko-KR");
}

export default function OliveYoungClient({
  initialItems,
}: {
  initialItems: OliveYoungItem[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    let list = initialItems.slice();

    if (filter === "sale") list = list.filter((i) => i.flags.includes("세일"));
    else if (filter === "coupon")
      list = list.filter((i) => i.flags.includes("쿠폰"));
    else if (filter === "today")
      list = list.filter((i) => i.flags.includes("오늘드림"));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q)
      );
    }

    if (sort === "discount") {
      list.sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
    } else if (sort === "price") {
      list.sort(
        (a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity)
      );
    } else {
      list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  }, [initialItems, filter, sort, search]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">올리브영 랭킹</h1>
        <p className="text-sm text-[#64748B] mt-1">
          실시간 인기 상품 TOP {initialItems.length}개
        </p>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="상품명/브랜드 검색 (예: 리들샷, VT)"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#94A3B8] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? "text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
            style={filter === f.key ? { backgroundColor: BRAND } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex gap-1.5 mb-4">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sort === s.key
                ? "bg-[#0F172A] text-white"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#94A3B8] self-center">
          {items.length}개
        </span>
      </div>

      {/* 그리드 */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8] text-sm">
          {search.trim()
            ? `"${search.trim()}" 검색 결과가 없습니다.`
            : "조건에 맞는 상품이 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item, i) => (
            <Card key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-6 leading-relaxed">
        상품 정보는 올리브영 공식 페이지에서 수집되며, 실제 가격과 다를 수 있습니다.
        <br />
        정확한 가격은 상품 페이지에서 확인하세요.
      </p>
    </div>
  );
}

function Card({ item, index }: { item: OliveYoungItem; index: number }) {
  const hasDiscount = item.discountRate != null && item.discountRate > 0;
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
      className="block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative w-full aspect-square bg-[#F8FAFC]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) =>
              ((e.target as HTMLImageElement).style.display = "none")
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            💄
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold text-white leading-none bg-[#0F172A]">
          {item.rank}위
        </span>
        {hasDiscount && (
          <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold text-white leading-none bg-[#EF4444]">
            -{item.discountRate}%
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] font-bold text-[#64748B] mb-0.5 truncate">
          {item.brand || "\u00A0"}
        </p>
        <p className="text-[11px] text-[#0F172A] leading-tight line-clamp-2 min-h-[28px]">
          {item.name}
        </p>
        <div className="mt-1.5">
          {item.origPrice && hasDiscount && (
            <p className="text-[10px] text-[#94A3B8] line-through leading-none">
              {fmt(item.origPrice)}원
            </p>
          )}
          <p className="text-sm font-bold leading-tight" style={{ color: BRAND }}>
            {fmt(item.salePrice)}
            <span className="text-[10px] font-medium text-[#64748B] ml-0.5">
              원
            </span>
          </p>
        </div>
        {item.flags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {item.flags.slice(0, 3).map((f) => (
              <span
                key={f}
                className="text-[9px] px-1 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] leading-none"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.a>
  );
}
