import { NextResponse } from "next/server";
import telecomJson from "@/data/telecom.json";
import convenienceJson from "@/data/convenience.json";
import type { Deal } from "@/types/deal";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://today-deals-ochre.vercel.app";

export async function GET() {
  const telecomDeals = (telecomJson.deals as unknown as Deal[]).slice(0, 20);
  const convDeals = (convenienceJson.deals as unknown as Deal[]).slice(0, 20);
  const allDeals = [...telecomDeals, ...convDeals];

  const items = allDeals.map((d) => `    <item>
      <title><![CDATA[${d.title}]]></title>
      <description><![CDATA[${d.description || ""}]]></description>
      <link>${BASE_URL}/deals/${d.id}</link>
      <guid isPermaLink="true">${BASE_URL}/deals/${d.id}</guid>
      <pubDate>${new Date(d.startDate || telecomJson.updatedAt).toUTCString()}</pubDate>
    </item>`).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>오늘혜택 — 신규 할인</title>
    <link>${BASE_URL}</link>
    <description>통신사 멤버십, 편의점 1+1, 올리브영 랭킹, 주유 최저가</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/api/feed" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
