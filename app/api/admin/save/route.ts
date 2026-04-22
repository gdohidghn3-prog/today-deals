import { NextResponse } from "next/server";
import { saveCoupangLink, uploadImage } from "@/lib/github";

type SaveBody = {
  dealId: string;
  productUrl: string;
  productImage: string;
  productName: string;
  productPrice?: number;
  isRocket?: boolean;
  imageUpload?: { base64: string; ext: string };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveBody;
    const { dealId, productUrl, productName, productPrice, isRocket } = body;

    if (!dealId || !productUrl || !productName) {
      return NextResponse.json({ error: "필수 필드 누락 (dealId, productUrl, productName)" }, { status: 400 });
    }
    if (!/^https:\/\/link\.coupang\.com\/a\//.test(productUrl)) {
      return NextResponse.json({ error: "파트너스 짧은 링크(link.coupang.com/a/...) 형식이어야 합니다" }, { status: 400 });
    }

    let productImage = body.productImage;

    if (body.imageUpload?.base64) {
      productImage = await uploadImage(dealId, body.imageUpload.base64, body.imageUpload.ext);
    }

    if (!productImage) {
      return NextResponse.json({ error: "이미지 URL 또는 업로드가 필요합니다" }, { status: 400 });
    }

    await saveCoupangLink(dealId, {
      productUrl,
      productImage,
      productName,
      ...(typeof productPrice === "number" && productPrice > 0 ? { productPrice } : {}),
      isRocket: !!isRocket,
    });

    return NextResponse.json({ ok: true, dealId, productImage });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "저장 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
