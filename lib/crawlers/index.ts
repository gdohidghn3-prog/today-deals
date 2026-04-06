import type { Deal } from "@/types/deal";
import { crawlCU } from "./cu";
import { crawlGS25 } from "./gs25";
import { crawlSeven } from "./seven";
import { crawlSKT } from "./skt";

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

export async function crawlAllTelecom(): Promise<Deal[]> {
  const [skt] = await Promise.allSettled([crawlSKT()]);

  const deals: Deal[] = [];
  if (skt.status === "fulfilled") deals.push(...skt.value);

  console.log(
    `[Crawl] SKT: ${skt.status === "fulfilled" ? skt.value.length : "FAIL"}`
  );

  return deals;
}

export async function crawlAll(): Promise<Deal[]> {
  const [convenience, telecom] = await Promise.all([
    crawlAllConvenience(),
    crawlAllTelecom(),
  ]);
  return [...telecom, ...convenience];
}
