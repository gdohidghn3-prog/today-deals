"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, Calendar, X, Filter } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import Image from "next/image";

type CultureEvent = {
  id: string;
  title: string;
  category: string;
  region: string;
  place: string;
  date: string;
  startDate: string;
  endDate: string;
  isFree: boolean;
  fee: string;
  target: string;
  imageUrl: string;
  link: string;
  orgLink: string;
  lat: number | null;
  lng: number | null;
  time: string;
  source: "seoul" | "tour";
};

type FeeFilter = "all" | "free" | "paid";
type TimeFilter = "all" | "ongoing" | "upcoming" | "thisweek";

const CATEGORY_COLORS: Record<string, string> = {
  "전시/미술": "#E74C3C",
  "클래식": "#8E44AD",
  "콘서트": "#2980B9",
  "뮤지컬/오페라": "#E67E22",
  "무용": "#1ABC9C",
  "국악": "#D4A574",
  "축제-문화/예술": "#E91E63",
  "축제-시민화합": "#FF5722",
  "축제-자연/경관": "#4CAF50",
  "축제-전통/역사": "#795548",
  "축제/행사": "#FF9800",
  "기타": "#607D8B",
  "교육/체험": "#00BCD4",
  "독주/독창회": "#9C27B0",
  "영화": "#F44336",
  "연극": "#3F51B5",
  "공연/행사": "#673AB7",
  "체육대회": "#009688",
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] || "#607D8B";
}

function isOngoing(event: CultureEvent): boolean {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  return start <= now && end >= now;
}

function isThisWeek(event: CultureEvent): boolean {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  return (start <= weekEnd && end >= now);
}

function formatDateRange(date: string): string {
  if (!date) return "";
  return date.replace(/~/g, " ~ ");
}

export default function CultureClient() {
  const [events, setEvents] = useState<CultureEvent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [sources, setSources] = useState<{ seoul: number; tour: number }>({ seoul: 0, tour: 0 });

  const [selectedCat, setSelectedCat] = useState("전체");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ongoing");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/culture")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEvents(data.events ?? []);
        setCategories(data.categories ?? []);
        setRegions(data.regions ?? []);
        setUpdatedAt(data.updatedAt);
        setSources(data.sources ?? { seoul: 0, tour: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setVisibleCount(30);
  }, [selectedCat, selectedRegion, feeFilter, timeFilter, search]);

  const filtered = useMemo(() => {
    let list = events;

    // 시간 필터
    if (timeFilter === "ongoing") list = list.filter(isOngoing);
    if (timeFilter === "upcoming") {
      const now = new Date();
      list = list.filter((e) => new Date(e.startDate) > now);
    }
    if (timeFilter === "thisweek") list = list.filter(isThisWeek);

    // 무료/유료
    if (feeFilter === "free") list = list.filter((e) => e.isFree);
    if (feeFilter === "paid") list = list.filter((e) => !e.isFree);

    // 카테고리
    if (selectedCat !== "전체") list = list.filter((e) => e.category === selectedCat);

    // 지역
    if (selectedRegion !== "전체") list = list.filter((e) => e.region.startsWith(selectedRegion));

    // 검색
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.place.toLowerCase().includes(q) ||
          e.region.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.fee.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, feeFilter, timeFilter, selectedCat, selectedRegion, search]);

  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center pb-20">
        <div className="animate-pulse text-[#94A3B8]">문화행사 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center pb-20">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">문화행사를 불러올 수 없습니다</h2>
        <p className="text-sm text-[#64748B] mb-4">일시적인 오류입니다. 잠시 후 다시 시도해주세요.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 pt-6 pb-24">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1A1A2E]">문화행사</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          전시 · 공연 · 축제 · 콘서트
          {sources.tour > 0 && ` · 서울 ${sources.seoul}건 + 전국 ${sources.tour}건`}
          {sources.tour === 0 && events.length > 0 && ` · ${events.length}건`}
          {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString("ko-KR")} 기준`}
        </p>
      </div>

      {/* 시간 필터 */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
        {([
          { key: "ongoing" as TimeFilter, label: "진행중" },
          { key: "thisweek" as TimeFilter, label: "이번주" },
          { key: "upcoming" as TimeFilter, label: "예정" },
          { key: "all" as TimeFilter, label: "전체" },
        ]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              setTimeFilter(opt.key);
              trackEvent("filter_change", { tab: "culture_time", value: opt.key });
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              timeFilter === opt.key
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="border-l border-[#E2E8F0] mx-1" />
        {([
          { key: "all" as FeeFilter, label: "전체" },
          { key: "free" as FeeFilter, label: "무료" },
          { key: "paid" as FeeFilter, label: "유료" },
        ]).map((opt) => (
          <button
            key={`fee-${opt.key}`}
            onClick={() => {
              setFeeFilter(opt.key);
              trackEvent("filter_change", { tab: "culture_fee", value: opt.key });
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              feeFilter === opt.key
                ? "bg-[#10B981] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 지역 필터 */}
      {regions.length > 1 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide pb-1">
          {["전체", ...regions].map((r) => (
            <button
              key={r}
              onClick={() => {
                setSelectedRegion(r);
                trackEvent("filter_change", { tab: "culture_region", value: r });
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedRegion === r
                  ? "bg-[#3B82F6] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {["전체", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCat(cat);
              trackEvent("filter_change", { tab: "culture_cat", value: cat });
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCat === cat
                ? "bg-[#7C3AED] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => {
            if (search.trim()) trackEvent("search", { query: search.trim(), tab: "culture", count: filtered.length });
          }}
          placeholder="행사명, 장소, 지역, 장르 검색..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#E2E8F0] text-sm placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
        />
        {search && (
          <button
            onClick={() => { setSearch(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p className="text-[11px] text-[#CBD5E1] mb-3">
        {filtered.length}개 행사
        {timeFilter === "ongoing" && " · 현재 진행중"}
        {timeFilter === "thisweek" && " · 이번주"}
        {timeFilter === "upcoming" && " · 예정"}
        {feeFilter === "free" && " · 무료만"}
      </p>

      {/* 행사 목록 */}
      <div className="space-y-3">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((c) => c + 30)}
          className="w-full mt-4 py-3 rounded-xl border border-[#E2E8F0] text-sm text-[#64748B] font-medium hover:bg-[#F8FAFC]"
        >
          더보기 ({filtered.length - visibleCount}개 남음)
        </button>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[#94A3B8] mb-2">조건에 맞는 행사가 없습니다</p>
          <button
            onClick={() => { setSelectedCat("전체"); setSelectedRegion("전체"); setFeeFilter("all"); setTimeFilter("all"); setSearch(""); }}
            className="text-xs text-[#7C3AED] underline"
          >
            필터 초기화
          </button>
        </div>
      )}
    </main>
  );
}

function EventCard({ event }: { event: CultureEvent }) {
  const ongoing = isOngoing(event);
  const catColor = getCatColor(event.category);
  const link = event.orgLink || event.link;

  return (
    <a
      href={link || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3 p-3">
        {/* 이미지 */}
        {event.imageUrl && (
          <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[#F1F5F9]">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: catColor }}
            >
              {event.category}
            </span>
            {event.isFree && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">
                무료
              </span>
            )}
            {ongoing && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                진행중
              </span>
            )}
            {event.region && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                {event.region.split(" ")[0]}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-[#1A1A2E] leading-snug line-clamp-2 mb-1">
            {event.title}
          </h3>

          <div className="flex items-center gap-1 text-[11px] text-[#64748B] mb-0.5">
            <MapPin size={10} className="flex-shrink-0" />
            <span className="truncate">{event.place || event.region}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
            <Calendar size={10} className="flex-shrink-0" />
            <span className="truncate">{formatDateRange(event.date)}</span>
          </div>

          {!event.isFree && event.fee && (
            <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate">{event.fee}</p>
          )}
        </div>
      </div>
    </a>
  );
}
