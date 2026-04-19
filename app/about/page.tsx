import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개 — 오늘혜택",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">오늘혜택</h1>
      <p className="text-[#64748B] mb-6">
        통신사 멤버십 · 편의점 · 올리브영 · 문화행사 · 주유 최저가를 한 번에.
      </p>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">주요 기능</h2>
        <div className="space-y-2">
          {[
            { icon: "📱", title: "통신사 멤버십 혜택", desc: "SKT·KT·LGU+ 공식 사이트에서 자동 수집한 등급별 할인 정보" },
            { icon: "🏪", title: "편의점 행사", desc: "CU·GS25·세븐일레븐·이마트24 1+1, 2+1 행사 상품 검색" },
            { icon: "💄", title: "올리브영 랭킹", desc: "실시간 인기 TOP 100과 세일·쿠폰·오늘드림 상품 모아보기" },
            { icon: "🎭", title: "무료 문화행사", desc: "서울시 무료 전시·공연·축제·콘서트 일정 (서울 열린데이터)" },
            { icon: "⛽", title: "주유 최저가", desc: "전국·시도별 평균가와 내 주변 저렴한 주유소 (오피넷 제공)" },
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
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-sm text-[#374151] space-y-1.5">
          <p>SKT — sktmembership.tworld.co.kr 실시간 크롤링</p>
          <p>KT — membership.kt.com 자동 수집</p>
          <p>LGU+ — lguplus.com/benefit-membership 자동 수집</p>
          <p>편의점 — 각 편의점 공식 행사 페이지 실시간 크롤링</p>
          <p>올리브영 — oliveyoung.co.kr 랭킹 페이지 실시간 크롤링</p>
          <p>문화행사 — 서울 열린데이터광장 문화행사 API</p>
          <p>주유 — 오피넷 (한국석유공사) 공식 유가정보 API</p>
        </div>
      </section>

      <section className="mb-6">
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 text-sm text-[#92400E]">
          <p className="font-semibold mb-1">안내</p>
          <p className="text-xs leading-relaxed">
            본 서비스의 정보는 각 공식 사이트에서 자동 수집한 것으로,
            실제 혜택과 다를 수 있습니다. 정확한 내용은 해당 통신사 앱 또는 공식 사이트에서 확인하시기 바랍니다.
            정보의 정확성에 대해 보증하지 않으며, 이에 따른 책임을 지지 않습니다.
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-medium hover:bg-[#E5612F] transition-colors"
        >
          혜택 확인하기
        </Link>
      </div>
    </div>
  );
}
