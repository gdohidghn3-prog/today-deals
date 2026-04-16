"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2, TrendingUp, TrendingDown, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// ─── 상수 ───────────────────────────────────────────────

type AvgItem = {
  PRODCD: string;
  PRODNM: string;
  PRICE: number | string;
  DIFF: number | string;
  TRADE_DT?: string;
};

type SidoAvgItem = {
  SIDOCD: string;
  SIDONM: string;
  PRODCD: string;
  PRICE: number;
  DIFF: number;
};

type Top10Item = {
  UNI_ID: string;
  PRICE: number;
  POLL_DIV_CD: string;
  OS_NM: string;
  VAN_ADR?: string;
  NEW_ADR?: string;
  GIS_X_COOR?: number;
  GIS_Y_COOR?: number;
  DISTANCE?: number;
};

type ProdKey = "B027" | "D047" | "B034" | "K015";

const PRODUCTS: { key: ProdKey; label: string; short: string }[] = [
  { key: "B027", label: "휘발유", short: "휘발유" },
  { key: "D047", label: "경유", short: "경유" },
  { key: "B034", label: "고급휘발유", short: "고급" },
  { key: "K015", label: "LPG (부탄)", short: "LPG" },
];

const SIDOS: { code: string; name: string }[] = [
  { code: "01", name: "서울" },
  { code: "02", name: "경기" },
  { code: "15", name: "인천" },
  { code: "03", name: "강원" },
  { code: "04", name: "충북" },
  { code: "05", name: "충남" },
  { code: "17", name: "대전" },
  { code: "19", name: "세종" },
  { code: "06", name: "전북" },
  { code: "07", name: "전남" },
  { code: "16", name: "광주" },
  { code: "08", name: "경북" },
  { code: "09", name: "경남" },
  { code: "14", name: "대구" },
  { code: "18", name: "울산" },
  { code: "10", name: "부산" },
  { code: "11", name: "제주" },
];

const POLL_DIV_LABEL: Record<string, string> = {
  SKE: "SK에너지",
  GSC: "GS칼텍스",
  HDO: "HD현대오일뱅크",
  SOL: "S-OIL",
  RTO: "자영알뜰",
  RTX: "고속도로알뜰",
  NHO: "농협알뜰",
  E1G: "E1",
  SKG: "SK가스",
  ETC: "기타",
};

const POLL_DIV_COLOR: Record<string, string> = {
  SKE: "#E4002B",
  GSC: "#0088CE",
  HDO: "#00A0E9",
  SOL: "#FFCC00",
  RTO: "#00875A",
  RTX: "#0046FF",
  NHO: "#009E5C",
  E1G: "#ED1C24",
  SKG: "#E4002B",
  ETC: "#64748B",
};

// ─── 유틸 ───────────────────────────────────────────────

function toNum(v: number | string): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

function fmtPrice(v: number | string): string {
  const n = toNum(v);
  return Math.round(n).toLocaleString("ko-KR");
}

function fmtDiff(v: number | string): string {
  const n = toNum(v);
  if (n === 0) return "0";
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

// ─── 컴포넌트 ───────────────────────────────────────────

export default function GasClient({
  initialAvg,
  updatedAt,
}: {
  initialAvg: AvgItem[];
  updatedAt: string;
}) {
  const [prod, setProd] = useState<ProdKey>("B027");
  const [sido, setSido] = useState<string>("01");
  const [sidoAvg, setSidoAvg] = useState<SidoAvgItem[]>([]);
  const [top10, setTop10] = useState<Top10Item[]>([]);
  const [aroundStations, setAroundStations] = useState<Top10Item[] | null>(null);
  const [aroundLabel, setAroundLabel] = useState<string>("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingAround, setLoadingAround] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [zoneQuery, setZoneQuery] = useState("");
  const [loadingZone, setLoadingZone] = useState(false);

  // 선택한 유종의 전국 평균
  const nationalAvg = useMemo(() => {
    return initialAvg.find((x) => x.PRODCD === prod);
  }, [initialAvg, prod]);

  // 선택한 시도의 평균
  const selectedSidoAvg = useMemo(() => {
    return sidoAvg.find((x) => x.SIDOCD === sido);
  }, [sidoAvg, sido]);

  // 유종/시도 바뀌면 top10 + 시도평균 재조회
  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    Promise.all([
      fetch(`/api/gas?action=sido&prodcd=${prod}`).then((r) => r.json()),
      fetch(`/api/gas?action=top10&prodcd=${prod}&area=${sido}`).then((r) =>
        r.json()
      ),
    ])
      .then(([sidoRes, topRes]) => {
        if (cancelled) return;
        setSidoAvg(sidoRes.data ?? []);
        setTop10(topRes.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setSidoAvg([]);
          setTop10([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prod, sido]);

  const handleNearby = () => {
    if (!navigator.geolocation) {
      setLocError("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }
    setLocError(null);
    setLoadingAround(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/gas?action=around&prodcd=${prod}&x=${longitude}&y=${latitude}&radius=5000`
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || "조회 실패");
          setAroundStations(json.data ?? []);
          setAroundLabel("내 위치 반경 5km");
        } catch (e) {
          setLocError(e instanceof Error ? e.message : "조회 실패");
          setAroundStations(null);
          setAroundLabel("");
        } finally {
          setLoadingAround(false);
        }
      },
      (err) => {
        setLocError(
          err.code === 1
            ? "위치 권한이 거부되었습니다."
            : "위치를 가져올 수 없습니다."
        );
        setLoadingAround(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleZoneSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = zoneQuery.trim();
    if (!q) return;
    setLocError(null);
    setLoadingZone(true);
    try {
      const res = await fetch(
        `/api/gas?action=zone&prodcd=${prod}&query=${encodeURIComponent(q)}&radius=3000`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "조회 실패");
      setAroundStations(json.data ?? []);
      setAroundLabel(
        json.origin?.placeName
          ? `${json.origin.placeName} 반경 3km`
          : `"${q}" 반경 3km`
      );
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "조회 실패");
      setAroundStations(null);
      setAroundLabel("");
    } finally {
      setLoadingZone(false);
    }
  };

  const activeList = aroundStations ?? top10;
  const isAround = aroundStations !== null;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">주유 최저가</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {format(new Date(updatedAt), "M월 d일 EEEE HH시", { locale: ko })} 기준 · 출처
          오피넷
        </p>
      </div>

      {/* 유종 탭 */}
      <div className="flex gap-2 mb-4">
        {PRODUCTS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setProd(p.key);
              setAroundStations(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              prod === p.key
                ? "bg-[#FF6B35] text-white"
                : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
          >
            {p.short}
          </button>
        ))}
      </div>

      {/* 전국 평균 & 선택 시도 평균 카드 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3">
          <p className="text-[11px] text-[#94A3B8] mb-1">전국 평균</p>
          <p className="text-xl font-bold text-[#0F172A] leading-tight">
            {nationalAvg ? fmtPrice(nationalAvg.PRICE) : "-"}
            <span className="text-xs font-medium text-[#64748B] ml-1">원</span>
          </p>
          {nationalAvg && (
            <p
              className={`text-[11px] font-medium mt-0.5 flex items-center gap-0.5 ${
                toNum(nationalAvg.DIFF) > 0 ? "text-[#EF4444]" : "text-[#2563EB]"
              }`}
            >
              {toNum(nationalAvg.DIFF) > 0 ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              전일 대비 {fmtDiff(nationalAvg.DIFF)}
            </p>
          )}
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3">
          <p className="text-[11px] text-[#94A3B8] mb-1">
            {SIDOS.find((s) => s.code === sido)?.name ?? ""} 평균
          </p>
          <p className="text-xl font-bold text-[#0F172A] leading-tight">
            {selectedSidoAvg ? fmtPrice(selectedSidoAvg.PRICE) : "-"}
            <span className="text-xs font-medium text-[#64748B] ml-1">원</span>
          </p>
          {selectedSidoAvg && nationalAvg && (
            <p
              className={`text-[11px] font-medium mt-0.5 ${
                toNum(selectedSidoAvg.PRICE) < toNum(nationalAvg.PRICE)
                  ? "text-[#2563EB]"
                  : "text-[#EF4444]"
              }`}
            >
              전국 대비{" "}
              {fmtDiff(toNum(selectedSidoAvg.PRICE) - toNum(nationalAvg.PRICE))}
            </p>
          )}
        </div>
      </div>

      {/* 시도 선택 + 내 주변 버튼 */}
      <div className="flex gap-2 mb-2">
        <select
          value={sido}
          onChange={(e) => {
            setSido(e.target.value);
            setAroundStations(null);
            setAroundLabel("");
          }}
          className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#94A3B8]"
          aria-label="시도 선택"
        >
          {SIDOS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleNearby}
          disabled={loadingAround}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0F172A] text-white text-sm font-medium disabled:opacity-60"
        >
          {loadingAround ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MapPin size={14} />
          )}
          내 주변
        </button>
      </div>

      {/* 지역 검색 */}
      <form onSubmit={handleZoneSearch} className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          type="text"
          value={zoneQuery}
          onChange={(e) => setZoneQuery(e.target.value)}
          placeholder="지역 검색 (예: 판교역, 해운대구, 홍대입구)"
          className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#94A3B8] transition-colors"
        />
        {zoneQuery && (
          <button
            type="button"
            onClick={() => {
              setZoneQuery("");
              setAroundStations(null);
              setAroundLabel("");
            }}
            className="absolute right-[72px] top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          disabled={loadingZone || !zoneQuery.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white text-xs font-medium disabled:opacity-50"
        >
          {loadingZone ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            "검색"
          )}
        </button>
      </form>

      {locError && (
        <p className="text-xs text-[#EF4444] mb-3">{locError}</p>
      )}

      {isAround && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-[#64748B]">
            {aroundLabel || "주변 최저가 주유소"}
          </p>
          <button
            type="button"
            onClick={() => {
              setAroundStations(null);
              setAroundLabel("");
            }}
            className="text-[11px] text-[#2563EB] underline"
          >
            시도 최저가로 돌아가기
          </button>
        </div>
      )}

      {/* 최저가 리스트 */}
      {loadingList && !isAround ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <Loader2 size={20} className="inline animate-spin" />
        </div>
      ) : activeList.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8] text-sm">
          조회 결과가 없습니다.
        </div>
      ) : (
        <ol className="space-y-2">
          {activeList.map((s, idx) => {
            const brand = POLL_DIV_LABEL[s.POLL_DIV_CD] ?? "기타";
            const color = POLL_DIV_COLOR[s.POLL_DIV_CD] ?? "#64748B";
            const addr = s.NEW_ADR || s.VAN_ADR || "";
            // 카카오맵: 주유소명 + 도로명주소로 검색 링크
            const mapQuery = [s.OS_NM, addr].filter(Boolean).join(" ");
            const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(mapQuery)}`;
            return (
              <li
                key={s.UNI_ID}
                className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-6 text-center text-sm font-bold text-[#94A3B8]">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded leading-none"
                      style={{ backgroundColor: color }}
                    >
                      {brand}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#0F172A] truncate">
                    {s.OS_NM}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] truncate">
                    {addr}
                    {typeof s.DISTANCE === "number" &&
                      ` · ${Math.round(s.DISTANCE)}m`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-[#FF6B35] leading-none">
                    {fmtPrice(s.PRICE)}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">원/L</p>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[10px] text-[#2563EB] underline mt-1"
                  >
                    지도
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[10px] text-[#CBD5E1] text-center mt-6 leading-relaxed">
        가격 정보는 오피넷(한국석유공사)에서 제공되며, 실제 판매가와 다를 수 있습니다.
        <br />
        정확한 가격은 주유소에서 확인하세요.
      </p>
    </div>
  );
}
