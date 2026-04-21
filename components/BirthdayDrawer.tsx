"use client";

import { useEffect, useMemo } from "react";
import { X, ExternalLink } from "lucide-react";
import birthdayData from "@/data/birthday-perks.json";
import type { BirthdayPerk } from "@/types/perks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { trackEvent } from "@/lib/analytics";

const PERKS = birthdayData as BirthdayPerk[];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const CATEGORY_LABEL: Record<BirthdayPerk["category"], string> = {
  cafe: "카페",
  bakery: "베이커리",
  convenience: "편의점",
  movie: "영화",
  beauty: "뷰티",
  book: "도서",
};

export default function BirthdayDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [month, setMonth] = useLocalStorage<number | null>("birthday-month", null);
  const year = new Date().getFullYear();
  const checkedKey = `birthday-checked:${year}`;
  const [checked, setChecked] = useLocalStorage<Record<string, boolean>>(checkedKey, {});

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const checkedCount = useMemo(
    () => PERKS.reduce((acc, p) => acc + (checked[p.id] ? 1 : 0), 0),
    [checked]
  );

  if (!open) return null;

  const handleMonthChange = (m: number) => {
    setMonth(m);
    trackEvent("birthday_month_select", { month: m });
  };

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    trackEvent("birthday_check_toggle", { id, checked: next[id] ? 1 : 0 });
  };

  const handleOfficialClick = (id: string) => {
    trackEvent("birthday_official_click", { id });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-[#0F172A]">🎂 내 생일 혜택</h2>
          <button onClick={onClose} aria-label="닫기" className="text-[#64748B] hover:text-[#0F172A]">
            <X size={20} />
          </button>
        </header>

        <div className="px-4 py-3 border-b border-[#F1F5F9]">
          <label className="block text-[11px] text-[#64748B] mb-2">생월 선택</label>
          <div className="flex flex-wrap gap-1">
            {MONTHS.map((m) => (
              <button
                key={m}
                onClick={() => handleMonthChange(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  month === m
                    ? "bg-[#FF6B35] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-2">
            생월은 이 기기에만 저장됩니다 (서버 미전송)
          </p>
        </div>

        {month === null ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-[#94A3B8]">
            생월을 먼저 선택하세요
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-[#F1F5F9] bg-[#FFF4E6]">
              <p className="text-xs font-bold text-[#D97706]">
                {month}월 생일 혜택 후보 {PERKS.length}개 · 진행 {checkedCount}/{PERKS.length}
              </p>
              <p className="text-[10px] text-[#92400E] mt-0.5">
                각 혜택은 멤버십 가입 및 조건 확인 후 수령 가능합니다
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
              {PERKS.map((perk) => (
                <BirthdayItem
                  key={perk.id}
                  perk={perk}
                  checked={!!checked[perk.id]}
                  onToggle={() => toggle(perk.id)}
                  onOfficialClick={() => handleOfficialClick(perk.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BirthdayItem({
  perk,
  checked,
  onToggle,
  onOfficialClick,
}: {
  perk: BirthdayPerk;
  checked: boolean;
  onToggle: () => void;
  onOfficialClick: () => void;
}) {
  const verifiedBadge =
    perk.verificationLevel === "estimated"
      ? { label: "조건 확인 필요", className: "bg-[#FEF3C7] text-[#92400E]" }
      : { label: "검증됨", className: "bg-[#DCFCE7] text-[#166534]" };

  return (
    <div className={`px-4 py-3 ${checked ? "bg-[#F8FAFC]" : "bg-white"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 w-4 h-4 accent-[#FF6B35]"
          aria-label={`${perk.brand} 혜택 받음 표시`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-[#0F172A]">{perk.brand}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
              {CATEGORY_LABEL[perk.category]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${verifiedBadge.className}`}>
              {verifiedBadge.label}
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-1">{perk.benefit}</p>
          <p className="text-[10px] text-[#94A3B8] mt-1">
            {perk.eligibility ? `${perk.eligibility} · ` : ""}
            {perk.issueWindow ?? ""}
            {perk.claimMethod ? ` · ${perk.claimMethod}` : ""}
          </p>
          <a
            href={perk.membershipUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOfficialClick}
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#3B82F6] hover:underline"
          >
            공식 확인 <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
