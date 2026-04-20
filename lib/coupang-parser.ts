import * as cheerio from "cheerio";

export type ParsedCoupang = {
  productImage?: string;
  productName?: string;
  productPrice?: number;
  isRocket?: boolean;
  missing: string[];
};

export function parseCoupangHtml(html: string): ParsedCoupang {
  const $ = cheerio.load(html);
  const missing: string[] = [];

  const productImage =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $(".prod-image__item img").attr("src") ||
    $("#repImageContainer img").attr("src");

  let productName =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $(".prod-buy-header__title").text().trim() ||
    $("h1.prod-buy-header__title").text().trim() ||
    $("title").text().trim();
  if (productName) {
    productName = productName.replace(/\s*[-|]\s*쿠팡!?$/i, "").trim();
  }

  const priceMeta =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[property="og:price:amount"]').attr("content");
  let productPrice: number | undefined;
  if (priceMeta) {
    productPrice = parseInt(priceMeta.replace(/[^0-9]/g, ""), 10);
  } else {
    const priceText =
      $(".total-price strong").first().text() ||
      $(".prod-sale-price .total-price").first().text() ||
      $(".price-value").first().text();
    if (priceText) {
      const n = parseInt(priceText.replace(/[^0-9]/g, ""), 10);
      if (!Number.isNaN(n)) productPrice = n;
    }
  }

  const isRocket = /로켓배송|rocket-badge|rocket-merchant/i.test(html);

  if (!productImage) missing.push("productImage");
  if (!productName) missing.push("productName");
  if (!productPrice) missing.push("productPrice");

  return {
    productImage: productImage || undefined,
    productName: productName || undefined,
    productPrice,
    isRocket,
    missing,
  };
}
