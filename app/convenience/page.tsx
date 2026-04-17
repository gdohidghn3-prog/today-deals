import { getConvenienceDealsAsync } from "@/lib/deals";
import convenienceJson from "@/data/convenience.json";
import ConvenienceClient from "./ConvenienceClient";

export const revalidate = 21600; // 6시간마다 재크롤링

export default async function ConveniencePage() {
  const deals = await getConvenienceDealsAsync();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "편의점 1+1 / 2+1 행사",
    numberOfItems: deals.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConvenienceClient initialDeals={deals} updatedAt={convenienceJson.updatedAt} />
    </>
  );
}
