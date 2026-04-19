import type { Metadata } from "next";
import CultureClient from "./CultureClient";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "무료 문화행사",
  description:
    "서울 무료 전시, 공연, 축제, 콘서트 일정을 한눈에 확인하세요.",
};

export default function CulturePage() {
  return <CultureClient />;
}
