import coupangData from "@/data/coupang-links.json";

export type CoupangLink = {
  productUrl: string;
  productImage: string;
  productName: string;
  productPrice: number;
  isRocket?: boolean;
};

type CoupangLinksFile = {
  updatedAt: string | null;
  links: Record<string, CoupangLink & { note?: string }>;
};

const data = coupangData as CoupangLinksFile;

export function getCoupangLink(dealId: string): CoupangLink | null {
  const entry = data.links[dealId];
  if (!entry || dealId.startsWith("_example_")) return null;
  if (!entry.productUrl || !entry.productImage) return null;
  if (entry.productUrl.includes("REPLACE_ME") || entry.productImage.includes("REPLACE_ME")) return null;
  return {
    productUrl: entry.productUrl,
    productImage: entry.productImage,
    productName: entry.productName,
    productPrice: entry.productPrice,
    isRocket: entry.isRocket,
  };
}
