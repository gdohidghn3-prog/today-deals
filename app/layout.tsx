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
    "통신사 멤버십 할인과 편의점 1+1 행사를 실시간으로 확인하세요.",
  keywords: ["통신사 멤버십", "편의점 1+1", "T멤버십", "KT멤버십", "LGU+", "오늘 할인", "편의점 행사"],
  openGraph: {
    title: "오늘혜택 — 통신사 멤버십 · 편의점 행사 실시간",
    description: "통신사 멤버십 할인과 편의점 1+1 행사를 실시간으로 확인하세요.",
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
      <body className="min-h-full flex flex-col bg-[#FAFAFA]">
        {children}
        <Disclaimer />
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
