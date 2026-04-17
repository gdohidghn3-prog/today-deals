import { getTodayDealsAsync } from "@/lib/deals";
import telecomJson from "@/data/telecom.json";
import HomeClient from "./HomeClient";

export const revalidate = 21600; // 6시간마다 재크롤링

export default async function HomePage() {
  const deals = await getTodayDealsAsync();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "통신사 멤버십 혜택",
    numberOfItems: deals.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient initialDeals={deals} updatedAt={telecomJson.updatedAt} />
    </>
  );
}
