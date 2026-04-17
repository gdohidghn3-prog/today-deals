"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center pb-20">
      <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">
        일시적인 오류가 발생했습니다
      </h2>
      <p className="text-sm text-[#64748B] mb-4">
        잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E5612F] transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
