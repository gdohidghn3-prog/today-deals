import Image from "next/image";
import type { CoupangLink } from "@/lib/coupang";

export default function CoupangLinkCard({ link }: { link: CoupangLink }) {
  return (
    <a
      href={link.productUrl}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="mt-4 block bg-white border border-[#FFD8A8] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="px-3 py-2 bg-[#FFF4E6] border-b border-[#FFD8A8]">
        <p className="text-[11px] font-bold text-[#D97706]">🛒 쿠팡에서 비교/구매</p>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="relative w-16 h-16 flex-shrink-0 bg-[#F8FAFC] rounded-lg overflow-hidden">
          <Image
            src={link.productImage}
            alt={link.productName}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#0F172A] line-clamp-2 leading-tight">
            {link.productName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] text-[#64748B]">쿠팡에서 가격 확인 →</p>
            {link.isRocket && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3B82F6] text-white font-bold">
                로켓배송
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="px-3 pb-2 text-[10px] text-[#94A3B8] leading-tight">
        쿠팡 파트너스 활동으로 일정 수수료를 받을 수 있습니다.
      </p>
    </a>
  );
}
