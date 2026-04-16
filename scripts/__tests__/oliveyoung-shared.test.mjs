/**
 * 올리브영 공통 모듈 회귀 테스트.
 * 실행: node --test scripts/__tests__/oliveyoung-shared.test.mjs
 *
 * 외부 네트워크 호출 없이 fixture HTML로 파서 동작만 검증한다.
 * 셀렉터가 깨지면 즉시 알 수 있도록 최소한의 방어선을 둔다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseListHtml,
  dedupeItems,
  buildBrowserHeaders,
  getBestUrl,
  MIN_THRESHOLD,
} from "../../lib/crawlers/oliveyoung-shared.mjs";

const FIXTURE_HTML = `
<ul class="cate_prd_list">
  <li>
    <div class="prd_thumb">
      <a class="prd_thumb" href="/store/goods/getGoodsDetail.do?goodsNo=A000000123456">
        <img src="https://image.oliveyoung.co.kr/uploads/images/test1.jpg" alt="x">
      </a>
    </div>
    <div class="prd_info">
      <span class="tx_brand">테스트브랜드</span>
      <p class="tx_name">테스트 상품 A 50ml</p>
      <span class="tx_org"><span class="tx_num">20,000</span></span>
      <span class="tx_cur"><span class="tx_num">15,000</span></span>
      <div class="prd_flag">
        <span>세일</span>
        <span>쿠폰</span>
      </div>
    </div>
  </li>
  <li>
    <div class="prd_thumb">
      <a class="prd_thumb" href="/store/goods/getGoodsDetail.do?goodsNo=B000000789012">
        <img data-src="https://image.oliveyoung.co.kr/uploads/images/test2.jpg" alt="y">
      </a>
    </div>
    <div class="prd_info">
      <span class="tx_brand">브랜드B</span>
      <p class="tx_name">상품B</p>
      <span class="tx_cur"><span class="tx_num">9,900</span></span>
      <div class="prd_flag">
        <span>오늘드림</span>
      </div>
    </div>
  </li>
  <li>
    <!-- name 없음 - skip 되어야 함 -->
    <div class="prd_info">
      <span class="tx_brand">브랜드C</span>
    </div>
  </li>
</ul>
`;

test("parseListHtml: 정상 fixture에서 2개 아이템 파싱", () => {
  const items = parseListHtml(FIXTURE_HTML);
  assert.equal(items.length, 2, "name 없는 항목은 skip되어야 함");
});

test("parseListHtml: id는 goodsNo 추출", () => {
  const items = parseListHtml(FIXTURE_HTML);
  assert.equal(items[0].id, "A000000123456");
  assert.equal(items[1].id, "B000000789012");
});

test("parseListHtml: 가격/할인율 계산", () => {
  const items = parseListHtml(FIXTURE_HTML);
  assert.equal(items[0].salePrice, 15000);
  assert.equal(items[0].origPrice, 20000);
  assert.equal(items[0].discountRate, 25);
  assert.equal(items[1].salePrice, 9900);
  assert.equal(items[1].origPrice, null);
  assert.equal(items[1].discountRate, null);
});

test("parseListHtml: rank는 startRank 기반", () => {
  const items = parseListHtml(FIXTURE_HTML, 101);
  assert.equal(items[0].rank, 101);
  assert.equal(items[1].rank, 102);
});

test("parseListHtml: data-src 이미지 fallback", () => {
  const items = parseListHtml(FIXTURE_HTML);
  assert.match(items[1].imageUrl, /test2\.jpg$/);
});

test("parseListHtml: flags 배열 수집", () => {
  const items = parseListHtml(FIXTURE_HTML);
  assert.deepEqual(items[0].flags.sort(), ["쿠폰", "세일"].sort());
  assert.deepEqual(items[1].flags, ["오늘드림"]);
});

test("parseListHtml: 빈 HTML은 빈 배열", () => {
  assert.deepEqual(parseListHtml("<html></html>"), []);
});

test("parseListHtml: 셀렉터 미매칭 HTML은 빈 배열 (회귀 감지)", () => {
  // 올리브영이 .cate_prd_list 클래스를 바꾸면 즉시 0건이 되어
  // 배치 스크립트의 MIN_THRESHOLD 체크에서 실패로 처리된다.
  const broken = `<ul class="some_other_list"><li><p class="tx_name">x</p></li></ul>`;
  assert.deepEqual(parseListHtml(broken), []);
});

test("dedupeItems: 동일 id 중복 제거", () => {
  const dup = [
    { id: "A1", brand: "X", name: "Y", rank: 1, flags: [] },
    { id: "A1", brand: "X", name: "Y", rank: 2, flags: [] },
    { id: "A2", brand: "X", name: "Z", rank: 3, flags: [] },
  ];
  const result = dedupeItems(dup);
  assert.equal(result.length, 2);
  assert.equal(result[0].rank, 1, "먼저 등장한 것이 보존되어야 함");
});

test("dedupeItems: 동일 (brand+name) 중복 제거", () => {
  const dup = [
    { id: "A1", brand: "X", name: "Y", rank: 1, flags: [] },
    { id: "A2", brand: "X", name: "Y", rank: 2, flags: [] }, // 다른 id, 같은 brand+name
  ];
  assert.equal(dedupeItems(dup).length, 1);
});

test("buildBrowserHeaders: 데스크톱/모바일 UA 분기", () => {
  const desktop = buildBrowserHeaders({ mobile: false });
  const mobile = buildBrowserHeaders({ mobile: true });
  assert.match(desktop["User-Agent"], /Windows NT/);
  assert.equal(desktop["Sec-Ch-Ua-Mobile"], "?0");
  assert.match(mobile["User-Agent"], /Android/);
  assert.equal(mobile["Sec-Ch-Ua-Mobile"], "?1");
});

test("getBestUrl: pageIdx가 URL에 정확히 반영", () => {
  assert.match(getBestUrl(1), /pageIdx=1/);
  assert.match(getBestUrl(3), /pageIdx=3/);
  assert.match(getBestUrl(1), /rowsPerPage=100/);
});

test("MIN_THRESHOLD: 30 이상 (안전 임계치 회귀 방지)", () => {
  assert.ok(MIN_THRESHOLD >= 30, "임계치를 낮추는 변경은 의도적이어야 함");
});
