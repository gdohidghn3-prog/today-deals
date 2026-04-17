#!/usr/bin/env node
/**
 * JSON 스키마 검증 — 커밋 전 필수 필드/형식 확인
 * Usage: node scripts/validate-json.mjs data/telecom.json
 *        node scripts/validate-json.mjs data/convenience.json
 */
import { readFileSync } from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate-json.mjs <json-file>");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(file, "utf-8"));
} catch (e) {
  console.error(`JSON 파싱 실패 (${file}): ${e.message}`);
  process.exit(1);
}
const deals = data.deals || data.items || [];
const errors = [];

const VALID_SOURCES = ["skt", "kt", "lgu", "cu", "gs25", "seven", "emart24"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

for (const deal of deals) {
  const id = deal.id || "(no id)";

  // 필수 문자열 필드
  for (const f of ["id", "source", "title"]) {
    if (!deal[f] || typeof deal[f] !== "string" || deal[f].trim() === "") {
      errors.push(`${id}: missing or empty ${f}`);
    }
  }

  // source 허용값 (oliveyoung은 별도 구조이므로 스킵)
  if (deal.source && !VALID_SOURCES.includes(deal.source)) {
    // oliveyoung items don't have source field, skip
  }

  // 날짜 형식 (있는 경우만)
  if (deal.startDate && !DATE_RE.test(deal.startDate)) {
    errors.push(`${id}: invalid startDate "${deal.startDate}"`);
  }
  if (deal.endDate && !DATE_RE.test(deal.endDate)) {
    errors.push(`${id}: invalid endDate "${deal.endDate}"`);
  }

  // endDate >= startDate
  if (deal.startDate && deal.endDate && deal.endDate < deal.startDate) {
    errors.push(`${id}: endDate < startDate`);
  }
}

if (errors.length > 0) {
  console.error(`스키마 검증 실패 (${errors.length}건):`);
  errors.slice(0, 20).forEach(e => console.error("  " + e));
  if (errors.length > 20) console.error(`  ... 외 ${errors.length - 20}건`);
  process.exit(1);
}

console.log(`스키마 검증 통과: ${deals.length}건 (${file})`);
