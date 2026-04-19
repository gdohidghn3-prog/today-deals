import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Disclaimer from "@/components/Disclaimer";
import Analytics from "@/components/Analytics";

const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: {
    default: "오늘혜택 — 오늘 쓸 수 있는 할인/무료 혜택 모음",
    template: "%s | 오늘혜택",
  },
  description:
    "통신사 멤버십, 편의점 1+1, 올리브영 랭킹, 주유 최저가를 한 번에 확인하세요.",
  keywords: ["통신사 멤버십", "편의점 1+1", "올리브영 랭킹", "올리브영 세일", "주유 최저가", "T멤버십", "KT멤버십", "LGU+", "오늘 할인", "편의점 행사", "휘발유 가격", "오피넷"],
  openGraph: {
    title: "오늘혜택 — 통신사 · 편의점 · 올리브영 · 주유",
    description: "통신사 멤버십, 편의점 1+1, 올리브영 랭킹, 주유 최저가를 한 번에.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${noto.className} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF6B35" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAFA]">
        {children}
        <Disclaimer />
        <BottomNav />
        <Analytics />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}} />
      </body>
    </html>
  );
}
