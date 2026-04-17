"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS, type Deal } from "@/types/deal";

export default function DealDetailClient({
  deal,
  related,
}: {
  deal: Deal;
  related: Deal[];
}) {
  const color = SOURCE_COLORS[deal.source];
  const sourceLabel = SOURCE_LABELS[deal.source];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <div className="pt-4 pb-2">
        <Link href={["cu", "gs25", "seven", "emart24"].includes(deal.source) ? "/convenience" : "/"} className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft size={16} />
          {["cu", "gs25", "seven", "emart24"].includes(deal.source) ? "편의점 행사" : "통신사 혜택"}
        </Link>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {deal.imageUrl && (
          <div className="w-full aspect-square bg-[#F8FAFC] flex items-center justify-center p-4 max-h-[300px]">
            <img src={deal.imageUrl} alt={deal.title} className="max-w-full max-h-full object-contain" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: color }}>
              {sourceLabel}
            </span>
            {deal.membershipGrade && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                {deal.membershipGrade}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">{deal.title}</h1>
          <p className="text-sm text-[#64748B] mb-3">{deal.description}</p>
          <p className="text-2xl font-bold mb-2" style={{ color }}>{deal.discount}</p>
          {deal.price && <p className="text-sm text-[#64748B] mb-2">{deal.price}</p>}
          <p className="text-xs text-[#94A3B8]">{deal.startDate} ~ {deal.endDate}</p>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-[#1A1A2E] mb-3">같은 카테고리 혜택</h2>
          <div className="space-y-2">
            {related.map((r) => (
              <Link key={r.id} href={`/deals/${r.id}`} className="block bg-white border border-[#E2E8F0] rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{r.title}</p>
                    <p className="text-xs text-[#64748B]">{r.brand}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: SOURCE_COLORS[r.source] }}>{r.discount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
