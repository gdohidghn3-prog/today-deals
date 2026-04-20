import { NextResponse } from "next/server";
import { deleteCoupangLink } from "@/lib/github";

export async function POST(req: Request) {
  try {
    const { dealId } = (await req.json().catch(() => ({}))) as { dealId?: string };
    if (!dealId) return NextResponse.json({ error: "dealId 필요" }, { status: 400 });
    await deleteCoupangLink(dealId);
    return NextResponse.json({ ok: true, dealId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "삭제 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
