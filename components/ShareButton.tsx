"use client";

import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

declare global {
  interface Window {
    Kakao?: {
      isInitialized(): boolean;
      init(key: string): void;
      Share: {
        sendDefault(options: Record<string, unknown>): void;
      };
    };
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://today-deals-ochre.vercel.app";

interface ShareButtonProps {
  title: string;
  description: string;
  imageUrl?: string;
  dealId: string;
  source: string;
}

export default function ShareButton({ title, description, imageUrl, dealId, source }: ShareButtonProps) {
  const shareUrl = `${BASE_URL}/deals/${dealId}`;

  const handleShare = async () => {
    trackEvent("share", { source, deal_id: dealId });

    // 카카오 SDK가 있으면 카카오톡 공유
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (typeof window !== "undefined" && window.Kakao && kakaoKey) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl: imageUrl || `${BASE_URL}/og-default.png`,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: "혜택 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
      return;
    }

    // 카카오 SDK 없으면 Web Share API fallback
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareUrl });
      } catch {}
      return;
    }

    // 최후 fallback: 클립보드 복사
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 복사되었습니다!");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
      aria-label="공유"
    >
      <Share2 size={12} />
      공유
    </button>
  );
}
