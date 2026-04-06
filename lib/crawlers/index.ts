import type { Deal } from "@/types/deal";
import { crawlCU } from "./cu";
import { crawlGS25 } from "./gs25";
import { crawlSeven } from "./seven";

export async function crawlAllConvenience(): Promise<Deal[]> {
  const [cu, gs25, seven] = await Promise.allSettled([
    crawlCU(),
    crawlGS25(),
    crawlSeven(),
  ]);

  const deals: Deal[] = [];

  if (cu.status === "fulfilled") deals.push(...cu.value);
  if (gs25.status === "fulfilled") deals.push(...gs25.value);
  if (seven.status === "fulfilled") deals.push(...seven.value);

  console.log(
    `[Crawl] CU: ${cu.status === "fulfilled" ? cu.value.length : "FAIL"}, ` +
    `GS25: ${gs25.status === "fulfilled" ? gs25.value.length : "FAIL"}, ` +
    `7-Eleven: ${seven.status === "fulfilled" ? seven.value.length : "FAIL"}`
  );

  return deals;
}
