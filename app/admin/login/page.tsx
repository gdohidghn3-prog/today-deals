"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "로그인 실패");
        setLoading(false);
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("네트워크 오류");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
      <h1 className="text-lg font-bold text-[#0F172A] mb-1">🔐 어드민 로그인</h1>
      <p className="text-xs text-[#64748B] mb-5">오늘혜택 쿠팡 매핑 관리</p>

      <label className="block text-xs font-medium text-[#475569] mb-1">비밀번호</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35]"
        required
      />

      {error && <p className="mt-3 text-xs text-[#DC2626]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#E55A2B] disabled:opacity-50"
      >
        {loading ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#FAFAFA]">
      <Suspense fallback={<div className="text-sm text-[#64748B]">로딩 중...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
