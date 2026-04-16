import type { Metadata } from "next";
import { getOliveYoungCached } from "@/lib/crawlers/oliveyoung";
import OliveYoungClient from "./OliveYoungClient";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "올리브영 랭킹 · 세일",
  description:
    "올리브영 실시간 랭킹 TOP 100과 세일 상품을 할인율 순으로 확인하세요.",
};

export default async function OliveYoungPage() {
  const { items, updatedAt } = await getOliveYoungCached();
  return <OliveYoungClient initialItems={items} updatedAt={updatedAt} />;
}
