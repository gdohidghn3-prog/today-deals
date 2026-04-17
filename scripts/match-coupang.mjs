#!/usr/bin/env node
/**
 * 쿠팡파트너스 상품 매칭 스캐폴딩
 * 전제: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 환경변수 필요
 * 실행: node scripts/match-coupang.mjs
 *
 * TODO: 쿠팡파트너스 가입 심사 통과 후 활성화
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;

if (!ACCESS_KEY || !SECRET_KEY) {
  console.log("[CoupangMatch] COUPANG_ACCESS_KEY/SECRET_KEY 미설정 — 스킵");
  console.log("쿠팡파트너스 가입 후 환경변수를 설정하세요.");
  process.exit(0);
}

// TODO: 쿠팡파트너스 API 연동
// 1. data/convenience.json 로드
// 2. 상품명 정규화 (normalize 함수)
// 3. 쿠팡파트너스 검색 API 호출
// 4. 매칭 결과를 data/coupang-links.json에 저장
console.log("[CoupangMatch] 구현 예정 — 쿠팡파트너스 API 연동 필요");
