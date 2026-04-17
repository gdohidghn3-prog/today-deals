import { createHash } from "crypto";

/**
 * 상품명/브랜드 정규화 — ID 안정성을 위해 표기 차이 통일
 * v1 규칙: 변경 시 기존 ID 호환을 위해 유지. 신규 규칙은 v2- prefix로 분기.
 */
export function normalize(s) {
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

/**
 * 결정적 stable ID 생성
 * API 고유값이 있는 소스(LGU+ 등)는 그대로 사용
 */
export function stableId(source, brand, title, discount) {
  const payload = `${source}|${normalize(brand)}|${normalize(title)}|${normalize(discount)}`;
  const hash = createHash("md5").update(payload).digest("hex").slice(0, 8);
  return `${source}-${hash}`;
}
