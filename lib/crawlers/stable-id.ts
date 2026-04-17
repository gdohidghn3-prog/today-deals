import { createHash } from "crypto";

function normalize(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ").trim()
    .replace(/[)）\]】]/g, ")")
    .replace(/[(（\[【]/g, "(")
    .replace(/㎖|ML|Ml/gi, "ml")
    .replace(/㎎|MG|Mg/gi, "mg")
    .replace(/㎏|KG|Kg/gi, "kg")
    .replace(/[^\w가-힣().%+\-/ ]/g, "")
    .toLowerCase();
}

export function stableId(source: string, brand: string, title: string, discount: string): string {
  const payload = `${source}|${normalize(brand)}|${normalize(title)}|${normalize(discount)}`;
  const hash = createHash("md5").update(payload).digest("hex").slice(0, 8);
  return `${source}-${hash}`;
}
