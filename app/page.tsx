import { getTodayDealsAsync } from "@/lib/deals";
import HomeClient from "./HomeClient";

export const revalidate = 21600; // 6시간마다 재크롤링

export default async function HomePage() {
  const deals = await getTodayDealsAsync();
  return <HomeClient initialDeals={deals} />;
}
