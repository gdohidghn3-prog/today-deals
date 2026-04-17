import { getConvenienceDealsAsync } from "@/lib/deals";
import convenienceJson from "@/data/convenience.json";
import ConvenienceClient from "./ConvenienceClient";

export const revalidate = 21600; // 6시간마다 재크롤링

export default async function ConveniencePage() {
  const deals = await getConvenienceDealsAsync();
  return <ConvenienceClient initialDeals={deals} updatedAt={convenienceJson.updatedAt} />;
}
