import { NextResponse } from "next/server";
import convenienceJson from "@/data/convenience.json";
import type { Deal } from "@/types/deal";
import { getCoupangLinks } from "@/lib/github";

export async function GET() {
  try {
    const deals = (convenienceJson.deals as unknown as Deal[]).map((d) => ({
      id: d.id,
      source: d.source,
      title: d.title,
      brand: d.brand,
      discount: d.discount,
      price: d.price,
      imageUrl: d.imageUrl,
    }));

    const linksFile = await getCoupangLinks();
    const mappedIds = Object.keys(linksFile.links).filter((k) => !k.startsWith("_example_"));

    return NextResponse.json({
      deals,
      mappedIds,
      mappings: linksFile.links,
      updatedAt: linksFile.updatedAt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "불러오기 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
