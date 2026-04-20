import { NextResponse } from "next/server";
import { parseCoupangHtml } from "@/lib/coupang-parser";

export async function POST(req: Request) {
  const { html } = (await req.json().catch(() => ({}))) as { html?: string };
  if (!html || typeof html !== "string" || html.length < 100) {
    return NextResponse.json({ error: "HTML이 너무 짧거나 비어있습니다" }, { status: 400 });
  }
  const result = parseCoupangHtml(html);
  return NextResponse.json(result);
}
