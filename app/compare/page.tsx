import { getTodayDealsAsync } from "@/lib/deals";
import CompareClient from "./CompareClient";

export const revalidate = 21600;

export default async function ComparePage() {
  const deals = await getTodayDealsAsync();
  const telecomDeals = deals.filter((d) => ["skt", "kt", "lgu"].includes(d.source));
  return <CompareClient deals={telecomDeals} />;
}
