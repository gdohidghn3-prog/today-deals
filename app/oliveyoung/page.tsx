import type { Metadata } from "next";
import { getOliveYoungCached } from "@/lib/crawlers/oliveyoung";
import OliveYoungClient from "./OliveYoungClient";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "올리브영 랭킹 · 세일",
  description:
    "올리브영 실시간 카테고리별 랭킹과 세일 상품을 할인율 순으로 확인하세요.",
};

export default async function OliveYoungPage() {
  const { items, updatedAt, categories } = await getOliveYoungCached();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "올리브영 랭킹 · 세일",
    numberOfItems: items.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OliveYoungClient
        initialItems={items}
        updatedAt={updatedAt}
        categories={categories ?? []}
      />
    </>
  );
}
