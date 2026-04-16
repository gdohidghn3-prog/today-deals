import type { Metadata } from "next";
import GasClient from "./GasClient";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "주유 최저가",
  description: "전국/시도별 주유 최저가와 내 주변 저렴한 주유소를 한 번에.",
};

type AvgItem = {
  PRODCD: string;
  PRODNM: string;
  PRICE: number | string;
  DIFF: number | string;
  TRADE_DT?: string;
};

async function fetchInitialAvg(): Promise<{ items: AvgItem[]; updatedAt: string }> {
  const key = process.env.OPINET_API_KEY;
  if (!key) return { items: [], updatedAt: new Date().toISOString() };
  try {
    const res = await fetch(
      `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${key}`,
      { next: { revalidate: 21600 } }
    );
    if (!res.ok) throw new Error(`opinet ${res.status}`);
    const text = await res.text();
    const json = JSON.parse(text) as { RESULT?: { OIL?: AvgItem[] } };
    return {
      items: json?.RESULT?.OIL ?? [],
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[gas page] initial avg fetch failed", e);
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

export default async function GasPage() {
  const { items, updatedAt } = await fetchInitialAvg();
  return <GasClient initialAvg={items} updatedAt={updatedAt} />;
}
