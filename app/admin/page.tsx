"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Deal = {
  id: string;
  source: string;
  title: string;
  brand: string;
  discount?: string;
  price?: string;
  imageUrl?: string;
};

type Mapping = {
  productUrl: string;
  productImage: string;
  productName: string;
  productPrice: number;
  isRocket?: boolean;
  note?: string;
};

type DealsResponse = {
  deals: Deal[];
  mappedIds: string[];
  mappings: Record<string, Mapping>;
  updatedAt: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DealsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productPrice, setProductPrice] = useState<number | "">("");
  const [isRocket, setIsRocket] = useState(false);

  const [htmlInput, setHtmlInput] = useState("");
  const [parseStatus, setParseStatus] = useState<string>("");

  const [uploadedBase64, setUploadedBase64] = useState<string>("");
  const [uploadedExt, setUploadedExt] = useState<string>("");
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function loadDeals() {
    const res = await fetch("/api/admin/deals");
    if (res.ok) {
      const d = (await res.json()) as DealsResponse;
      setData(d);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDeals();
  }, []);

  const filteredDeals = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.deals;
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 30);
  }, [data, search]);

  function pickDeal(id: string) {
    setSelectedId(id);
    if (data?.mappings[id]) {
      const m = data.mappings[id];
      setProductUrl(m.productUrl);
      setProductName(m.productName);
      setProductImage(m.productImage);
      setProductPrice(m.productPrice);
      setIsRocket(!!m.isRocket);
    } else {
      setProductUrl("");
      setProductName("");
      setProductImage("");
      setProductPrice("");
      setIsRocket(false);
    }
    setHtmlInput("");
    setParseStatus("");
    setUploadedBase64("");
    setUploadedExt("");
    setUploadPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function parseHtml() {
    if (htmlInput.length < 100) {
      setParseStatus("HTML이 너무 짧습니다");
      return;
    }
    setParseStatus("파싱 중...");
    const res = await fetch("/api/admin/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: htmlInput }),
    });
    const d = await res.json();
    if (!res.ok) {
      setParseStatus(d.error || "파싱 실패");
      return;
    }
    if (d.productName) setProductName(d.productName);
    if (d.productImage) setProductImage(d.productImage);
    if (d.productPrice) setProductPrice(d.productPrice);
    if (typeof d.isRocket === "boolean") setIsRocket(d.isRocket);
    const filled: string[] = [];
    if (d.productName) filled.push("상품명");
    if (d.productImage) filled.push("이미지");
    if (d.productPrice) filled.push("가격");
    const missing = d.missing as string[];
    setParseStatus(
      missing?.length
        ? `✅ ${filled.join(", ")} 추출 / ⚠️ ${missing.join(", ")} 수동 입력 필요`
        : `✅ ${filled.join(", ")} 모두 추출 완료`,
    );
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setToast({ type: "error", msg: "이미지가 2MB를 초과합니다" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const m = f.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = m ? m[1] : "jpg";
      setUploadedBase64(base64);
      setUploadedExt(ext);
      setUploadPreview(dataUrl);
    };
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!selectedId) {
      setToast({ type: "error", msg: "먼저 혜택을 선택하세요" });
      return;
    }
    if (!productUrl || !productName || !productPrice) {
      setToast({ type: "error", msg: "파트너스 링크, 상품명, 가격은 필수입니다" });
      return;
    }
    if (!productImage && !uploadedBase64) {
      setToast({ type: "error", msg: "이미지 URL 또는 업로드가 필요합니다" });
      return;
    }

    setSaving(true);
    const body = {
      dealId: selectedId,
      productUrl,
      productName,
      productImage,
      productPrice: Number(productPrice),
      isRocket,
      ...(uploadedBase64 ? { imageUpload: { base64: uploadedBase64, ext: uploadedExt } } : {}),
    };
    const res = await fetch("/api/admin/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setToast({ type: "error", msg: d.error || "저장 실패" });
      return;
    }
    setToast({ type: "success", msg: "✅ 저장 완료. ~30초 후 배포 반영됩니다." });
    await loadDeals();
  }

  async function remove(dealId: string) {
    if (!confirm(`${dealId} 매핑을 삭제할까요?`)) return;
    const res = await fetch("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId }),
    });
    const d = await res.json();
    if (!res.ok) {
      setToast({ type: "error", msg: d.error || "삭제 실패" });
      return;
    }
    setToast({ type: "success", msg: `🗑️ ${dealId} 삭제됨` });
    if (selectedId === dealId) setSelectedId("");
    await loadDeals();
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const selectedDeal = data?.deals.find((d) => d.id === selectedId);
  const isEditing = !!data?.mappings[selectedId];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#0F172A]">🔐 쿠팡 매핑 관리</h1>
          <p className="text-[11px] text-[#64748B]">
            편의점 {data?.deals.length ?? 0}개 중 매핑 완료 {data?.mappedIds.length ?? 0}개
            {data?.updatedAt && ` · 최종 갱신 ${data.updatedAt}`}
          </p>
        </div>
        <button onClick={logout} className="text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1">
          로그아웃
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {toast && (
          <div
            className={`sticky top-14 z-20 rounded-lg px-3 py-2 text-sm ${
              toast.type === "success" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"
            }`}
            onClick={() => setToast(null)}
          >
            {toast.msg}
          </div>
        )}

        {/* 1. 혜택 선택 */}
        <section className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <h2 className="text-sm font-bold text-[#0F172A] mb-2">1️⃣ 혜택 선택</h2>
          <input
            type="search"
            placeholder="상품명/브랜드/ID 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm mb-2"
          />
          {loading ? (
            <p className="text-xs text-[#64748B]">불러오는 중...</p>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-lg divide-y">
              {filteredDeals.map((d) => {
                const mapped = data!.mappedIds.includes(d.id);
                const active = selectedId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => pickDeal(d.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F8FAFC] ${
                      active ? "bg-[#FFF4E6]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {mapped && <span className="text-[#16A34A]">✓</span>}
                      <span className="font-mono text-[10px] text-[#94A3B8]">{d.id}</span>
                      <span className="font-medium text-[#0F172A] flex-1 truncate">{d.title}</span>
                      {d.price && <span className="text-[#64748B]">{d.price}</span>}
                    </div>
                  </button>
                );
              })}
              {filteredDeals.length === 0 && (
                <p className="px-3 py-4 text-xs text-[#64748B] text-center">검색 결과 없음</p>
              )}
            </div>
          )}
        </section>

        {selectedDeal && (
          <>
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <h2 className="text-sm font-bold text-[#0F172A] mb-2">
                2️⃣ 파트너스 링크 {isEditing && <span className="text-[10px] text-[#D97706]">(수정 모드)</span>}
              </h2>
              <input
                type="url"
                placeholder="https://link.coupang.com/a/XXXXX"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm font-mono"
              />
            </section>

            <section className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <h2 className="text-sm font-bold text-[#0F172A] mb-1">3️⃣ 쿠팡 HTML 자동 추출 (추천)</h2>
              <p className="text-[11px] text-[#64748B] mb-2">
                쿠팡 상품 페이지에서 <kbd className="px-1 bg-[#F1F5F9] rounded">Ctrl+U</kbd> →{" "}
                <kbd className="px-1 bg-[#F1F5F9] rounded">Ctrl+A</kbd> →{" "}
                <kbd className="px-1 bg-[#F1F5F9] rounded">Ctrl+C</kbd> → 아래 붙여넣기
              </p>
              <textarea
                rows={4}
                placeholder="<!DOCTYPE html> ..."
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-[11px] font-mono"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={parseHtml}
                  className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B]"
                >
                  🚀 자동 추출
                </button>
                {parseStatus && <span className="text-[11px] text-[#475569]">{parseStatus}</span>}
              </div>
            </section>

            <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#0F172A]">4️⃣ 상품 정보</h2>
              <div>
                <label className="block text-[11px] text-[#475569] mb-1">상품명 *</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#475569] mb-1">가격 (원) *</label>
                <input
                  type="number"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#475569] mb-1">이미지 URL (쿠팡 CDN)</label>
                <input
                  type="url"
                  placeholder="https://thumbnail6.coupangcdn.com/..."
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#475569] mb-1">또는 이미지 파일 업로드 (2MB 이하)</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  onChange={onFilePicked}
                  className="text-xs"
                />
                {uploadPreview && (
                  <div className="mt-2">
                    <img src={uploadPreview} alt="업로드 미리보기" className="w-24 h-24 object-contain rounded border" />
                    <p className="text-[10px] text-[#94A3B8] mt-1">
                      업로드 시 `/public/coupang/{selectedId}.{uploadedExt}`에 저장됨
                    </p>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-[#475569]">
                <input type="checkbox" checked={isRocket} onChange={(e) => setIsRocket(e.target.checked)} />
                로켓배송
              </label>
            </section>

            {/* 미리보기 */}
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <h2 className="text-sm font-bold text-[#0F172A] mb-2">👁️ 미리보기</h2>
              <div className="border border-[#FFD8A8] rounded-xl overflow-hidden bg-white">
                <div className="px-3 py-2 bg-[#FFF4E6] border-b border-[#FFD8A8]">
                  <p className="text-[11px] font-bold text-[#D97706]">🛒 쿠팡에서 비교/구매</p>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-16 h-16 flex-shrink-0 bg-[#F8FAFC] rounded-lg overflow-hidden flex items-center justify-center">
                    {uploadPreview || productImage ? (
                      <img
                        src={uploadPreview || productImage}
                        alt={productName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-[#CBD5E1]">이미지 없음</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#0F172A] line-clamp-2">{productName || "(상품명)"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-bold text-[#D97706]">
                        {productPrice ? `${Number(productPrice).toLocaleString()}원` : "(가격)"}
                      </p>
                      {isRocket && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3B82F6] text-white font-bold">
                          로켓배송
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#E55A2B] disabled:opacity-50"
              >
                {saving ? "저장 중..." : isEditing ? "💾 수정 저장" : "💾 저장 & 배포"}
              </button>
              {isEditing && (
                <button
                  onClick={() => remove(selectedId)}
                  className="px-4 py-3 rounded-xl bg-[#FEE2E2] text-[#991B1B] text-sm font-bold hover:bg-[#FECACA]"
                >
                  🗑️ 삭제
                </button>
              )}
            </div>
          </>
        )}

        {/* 기존 매핑 목록 */}
        {data && data.mappedIds.length > 0 && (
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <h2 className="text-sm font-bold text-[#0F172A] mb-2">
              📋 기존 매핑 ({data.mappedIds.length})
            </h2>
            <div className="divide-y">
              {data.mappedIds.map((id) => {
                const m = data.mappings[id];
                return (
                  <div key={id} className="py-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#94A3B8] w-24 truncate">{id}</span>
                    <span className="flex-1 text-xs text-[#0F172A] truncate">{m.productName}</span>
                    <span className="text-xs text-[#D97706] font-bold">
                      {m.productPrice.toLocaleString()}원
                    </span>
                    <button
                      onClick={() => pickDeal(id)}
                      className="text-[11px] text-[#3B82F6] hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => remove(id)}
                      className="text-[11px] text-[#DC2626] hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
