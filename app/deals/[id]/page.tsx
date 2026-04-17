import { notFound } from "next/navigation";
import type { Metadata } from "next";
import convenienceJson from "@/data/convenience.json";
import telecomJson from "@/data/telecom.json";
import type { Deal } from "@/types/deal";
import DealDetailClient from "./DealDetailClient";

export const revalidate = 21600; // 6시간

function findDeal(id: string): Deal | undefined {
  const allDeals = [
    ...(telecomJson.deals as unknown as Deal[]),
    ...(convenienceJson.deals as unknown as Deal[]),
  ];
  return allDeals.find((d) => d.id === id);
}

function getRelated(deal: Deal): Deal[] {
  const allDeals = [
    ...(telecomJson.deals as unknown as Deal[]),
    ...(convenienceJson.deals as unknown as Deal[]),
  ];
  return allDeals
    .filter((d) => d.source === deal.source && d.id !== deal.id && d.category === deal.category)
    .slice(0, 3);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = findDeal(id);
  if (!deal) return { title: "혜택을 찾을 수 없습니다" };
  return {
    title: `${deal.title} | 오늘혜택`,
    description: deal.description,
    openGraph: {
      title: deal.title,
      description: deal.description,
      ...(deal.imageUrl ? { images: [deal.imageUrl] } : {}),
    },
  };
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = findDeal(id);
  if (!deal) notFound();
  const related = getRelated(deal);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    description: deal.description,
    brand: { "@type": "Brand", name: deal.brand },
    ...(deal.imageUrl ? { image: deal.imageUrl } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "KRW",
      ...(deal.price ? { price: deal.price.replace(/[^0-9]/g, "") } : {}),
      availability: "https://schema.org/InStock",
      validFrom: deal.startDate,
      validThrough: deal.endDate,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DealDetailClient deal={deal} related={related} />
    </>
  );
}
