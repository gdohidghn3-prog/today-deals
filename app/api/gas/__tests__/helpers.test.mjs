/**
 * 주유소 좌표 helper 테스트.
 * 실행: node --test app/api/gas/__tests__/helpers.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLowPrecisionKatec,
  classifyCoordSource,
} from "../helpers.mjs";

test("isLowPrecisionKatec: 정밀 좌표는 false", () => {
  assert.equal(isLowPrecisionKatec(300993.5827, 550065.1299), false);
});

test("isLowPrecisionKatec: 100단위 반올림 좌표는 true", () => {
  assert.equal(isLowPrecisionKatec(303700.0, 544645.0), true);
  assert.equal(isLowPrecisionKatec(317446.0, 549272.0), true);
});

test("isLowPrecisionKatec: x만 정밀하면 false", () => {
  assert.equal(isLowPrecisionKatec(300993.5827, 550065.0), false);
});

test("isLowPrecisionKatec: y만 정밀하면 false", () => {
  assert.equal(isLowPrecisionKatec(303700.0, 544645.1234), false);
});

test("isLowPrecisionKatec: NaN/Infinity 입력은 false", () => {
  assert.equal(isLowPrecisionKatec(NaN, 100), false);
  assert.equal(isLowPrecisionKatec(100, Infinity), false);
});

test("classifyCoordSource: 변환 실패는 'none'", () => {
  assert.equal(classifyCoordSource(300993.58, 550065.13, null), "none");
});

test("classifyCoordSource: 변환 성공 + 정밀은 'katec'", () => {
  const wgs = { lat: 37.5, lng: 126.9 };
  assert.equal(
    classifyCoordSource(300993.5827, 550065.1299, wgs),
    "katec"
  );
});

test("classifyCoordSource: 변환 성공 + 저정밀은 'katec_low'", () => {
  const wgs = { lat: 37.5, lng: 126.9 };
  assert.equal(classifyCoordSource(303700.0, 544645.0, wgs), "katec_low");
});

test("classifyCoordSource: 좌표 NaN이면 'none'", () => {
  const wgs = { lat: 37.5, lng: 126.9 };
  assert.equal(classifyCoordSource(NaN, 100, wgs), "none");
  assert.equal(classifyCoordSource(100, NaN, wgs), "none");
});

test("classifyCoordSource: 3상태 모두 도달 가능 (회귀 방지)", () => {
  // 3상태 enum이 모두 살아있어야 UI 뱃지 로직이 정상 동작
  const wgs = { lat: 1, lng: 1 };
  const sources = new Set([
    classifyCoordSource(123.45, 678.91, wgs),  // katec
    classifyCoordSource(100, 200, wgs),        // katec_low
    classifyCoordSource(123, 456, null),       // none
  ]);
  assert.equal(sources.size, 3);
  assert.ok(sources.has("katec"));
  assert.ok(sources.has("katec_low"));
  assert.ok(sources.has("none"));
});
