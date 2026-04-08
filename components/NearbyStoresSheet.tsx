"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation, Phone, AlertTriangle } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS, type DealSource } from "@/types/deal";

interface NearbyStore {
  id: string;
  name: string;
  brand: DealSource;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance: number;
  placeUrl: string;
}

interface Origin {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  brand: DealSource;
  productName: string;
}

type LoadState = "idle" | "locating" | "fetching" | "ready" | "denied" | "error";

export default function NearbyStoresSheet({
  open,
  onClose,
  brand,
  productName,
}: Props) {
  const [state, setState] = useState<LoadState>("idle");
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 시트가 열릴 때 외부 시스템(geolocation + 카카오 API)을 동기화한다.
  // 모든 setState는 비동기 콜백에서 발생.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const setIfActive = <T,>(setter: (v: T) => void, value: T) => {
      if (!cancelled) setter(value);
    };

    const run = () => {
      setIfActive(setState, "locating" as LoadState);
      setIfActive(setErrorMsg, "");
      setIfActive(setStores, [] as NearbyStore[]);
      setIfActive(setOrigin, null as Origin | null);

      if (!("geolocation" in navigator)) {
        setIfActive(setState, "error" as LoadState);
        setIfActive(setErrorMsg, "이 브라우저는 위치 정보를 지원하지 않습니다.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setIfActive(setState, "fetching" as LoadState);
          try {
            const res = await fetch(
              `/api/nearby-stores?x=${longitude}&y=${latitude}&radius=1000&brand=${brand}`
            );
            const data = await res.json();
            if (cancelled) return;
            if (!res.ok) {
              setIfActive(setState, "error" as LoadState);
              setIfActive(setErrorMsg, data.error || "매장 조회 실패");
              return;
            }
            setIfActive(setStores, (data.stores || []) as NearbyStore[]);
            setIfActive(
              setOrigin,
              (data.origin as Origin) || {
                lat: latitude,
                lng: longitude,
                address: "",
              }
            );
            setIfActive(setState, "ready" as LoadState);
          } catch {
            if (cancelled) return;
            setIfActive(setState, "error" as LoadState);
            setIfActive(setErrorMsg, "네트워크 오류");
          }
        },
        (err) => {
          if (cancelled) return;
          if (err.code === err.PERMISSION_DENIED) {
            setIfActive(setState, "denied" as LoadState);
          } else {
            setIfActive(setState, "error" as LoadState);
            setIfActive(setErrorMsg, "위치를 가져오지 못했습니다.");
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    // 마이크로태스크로 미루어 effect body에서 직접 setState하지 않게 한다
    queueMicrotask(run);

    return () => {
      cancelled = true;
    };
  }, [open, brand]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-[#CBD5E1] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-semibold mb-0.5"
                  style={{ color: SOURCE_COLORS[brand] }}
                >
                  {SOURCE_LABELS[brand]} 주변 매장
                </div>
                <p className="text-sm text-[#0F172A] truncate">{productName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 -mr-1 text-[#64748B] hover:text-[#0F172A]"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {state === "locating" && (
                <div className="py-12 text-center text-sm text-[#64748B]">
                  <div className="inline-block animate-pulse">📍 위치 확인 중...</div>
                </div>
              )}

              {state === "fetching" && (
                <div className="py-12 text-center text-sm text-[#64748B]">
                  <div className="inline-block animate-pulse">
                    🏪 주변 매장 검색 중...
                  </div>
                </div>
              )}

              {state === "denied" && (
                <div className="py-12 text-center">
                  <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-sm font-medium text-[#0F172A] mb-1">
                    위치 권한이 거부되었습니다
                  </p>
                  <p className="text-xs text-[#64748B]">
                    브라우저 설정에서 위치 권한을 허용해주세요.
                  </p>
                </div>
              )}

              {state === "error" && (
                <div className="py-12 text-center">
                  <AlertTriangle size={32} className="mx-auto text-rose-500 mb-2" />
                  <p className="text-sm font-medium text-[#0F172A] mb-1">
                    오류가 발생했습니다
                  </p>
                  <p className="text-xs text-[#64748B]">{errorMsg}</p>
                </div>
              )}

              {state === "ready" && stores.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#64748B]">
                    반경 1km 내 {SOURCE_LABELS[brand]} 매장이 없습니다.
                  </p>
                </div>
              )}

              {state === "ready" && stores.length > 0 && (
                <>
                  {/* 현재 위치 카드 */}
                  {origin && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <MapPin
                        size={16}
                        className="text-blue-600 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider mb-0.5">
                          내 위치
                        </div>
                        <p className="text-xs text-[#0F172A] truncate">
                          {origin.address || `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-[#64748B] mb-2">
                    반경 1km · {stores.length}개 매장
                  </div>
                  <ul className="space-y-2">
                    {stores.map((s) => (
                      <li
                        key={s.id}
                        className="border border-[#E2E8F0] rounded-xl p-3 hover:border-[#CBD5E1] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              {s.name}
                            </p>
                            {s.address && (
                              <p className="text-xs text-[#64748B] truncate mt-0.5">
                                {s.address}
                              </p>
                            )}
                          </div>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              color: SOURCE_COLORS[s.brand],
                              backgroundColor: SOURCE_COLORS[s.brand] + "15",
                            }}
                          >
                            {s.distance}m
                          </span>
                        </div>

                        <div className="flex gap-1.5 mt-2">
                          {s.placeUrl && (
                            <a
                              href={s.placeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-medium hover:opacity-90"
                            >
                              <MapPin size={12} /> 카카오맵
                            </a>
                          )}
                          <a
                            href={
                              origin
                                ? `https://map.kakao.com/link/from/${encodeURIComponent(
                                    origin.address || "내 위치"
                                  )},${origin.lat},${origin.lng}/to/${encodeURIComponent(
                                    s.name
                                  )},${s.lat},${s.lng}`
                                : `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                          >
                            <Navigation size={12} /> 길찾기
                          </a>
                          {s.phone && (
                            <a
                              href={`tel:${s.phone}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                            >
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* 면책 안내 */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      ⚠ 행사 상품은 본사 일괄 진행이지만 매장별 입고/재고는
                      다를 수 있습니다. 방문 전 매장 전화 확인을 권장합니다.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
