import { NextResponse } from "next/server";
import { createSession, SESSION_CONFIG } from "@/lib/admin-session";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD 미설정" }, { status: 500 });
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...SESSION_CONFIG, value: token });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...SESSION_CONFIG, value: "", maxAge: 0 });
  return res;
}
