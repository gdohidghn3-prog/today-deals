import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: {
    default: "오늘혜택 — 오늘 쓸 수 있는 할인/무료 혜택 모음",
    template: "%s | 오늘혜택",
  },
  description:
    "통신사 멤버십, 카드 할인, 편의점 1+1 — 오늘 놓치면 안 되는 혜택을 한 페이지에.",
  keywords: ["통신사 멤버십", "카드 할인", "편의점 1+1", "T멤버십", "KT멤버십", "오늘 할인"],
  openGraph: {
    title: "오늘혜택 — 오늘 쓸 수 있는 할인/무료 혜택 모음",
    description: "통신사 멤버십, 카드 할인, 편의점 1+1 — 오늘 놓치면 안 되는 혜택을 한 페이지에.",
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
        <BottomNav />
      </body>
    </html>
  );
}
