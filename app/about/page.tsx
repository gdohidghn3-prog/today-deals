import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">오늘혜택</h1>
      <p className="text-[#64748B] mb-6">
        오늘 쓸 수 있는 할인/무료 혜택을 한 페이지에 정리합니다.
      </p>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">주요 기능</h2>
        <div className="space-y-2">
          {[
            { icon: "📱", title: "통신사 멤버십", desc: "SKT, KT, LGU+ 멤버십 할인 한눈에" },
            { icon: "💳", title: "카드 할인", desc: "삼성, 신한, 현대, KB, 롯데카드 오늘 혜택" },
            { icon: "🏪", title: "편의점 행사", desc: "CU, GS25, 세븐일레븐 1+1, 2+1" },
            { icon: "📅", title: "요일별 캘린더", desc: "화요일 스타벅스, 수요일 CGV 등 요일 혜택" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 bg-white border border-[#E2E8F0] rounded-xl p-4"
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A2E]">{item.title}</h3>
                <p className="text-xs text-[#64748B]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">데이터 출처</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-sm text-[#374151] space-y-1">
          <p>각 통신사 멤버십 공식 페이지</p>
          <p>각 카드사 이벤트/혜택 페이지</p>
          <p>편의점 공식 행사 안내</p>
          <p className="text-xs text-[#94A3B8] mt-2">
            혜택 정보는 변경될 수 있습니다. 정확한 내용은 각 서비스에서 확인하세요.
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-medium hover:bg-[#E5612F] transition-colors"
        >
          오늘 혜택 확인하기
        </Link>
      </div>
    </div>
  );
}
