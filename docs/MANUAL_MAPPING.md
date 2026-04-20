# 쿠팡파트너스 수동 매핑 가이드

> 쿠팡파트너스 API 키 발급 전(최종 승인 15만원 매출 이전) 임시 운영 방식.
> 매출 발생 후 API 자동 매칭으로 전환 예정.

## 대상

`data/convenience.json`, `data/oliveyoung.json`의 인기 상품 중 쿠팡에서도 판매되는 상품.

우선순위:
1. 편의점 1+1 / 2+1 상품 (묶음구매 니즈)
2. 올리브영 TOP 50 (비교구매 니즈)
3. 통신사 멤버십은 제외 (쿠팡 판매 불가)

## 절차 (상품 1건당 ~2분)

### 1. dealId 확보

`data/convenience.json` 또는 `data/oliveyoung.json`에서 매핑할 상품의 `id` 복사.

예: `"id": "cu-d9da48dd"`

### 2. 쿠팡 상품 검색 + 파트너스 링크 생성

1. https://partners.coupang.com 로그인
2. 상단 메뉴 **링크 생성 → 간편 링크 만들기**
3. 쿠팡 상품 URL 또는 검색어 입력 → 매칭되는 상품 선택
4. 생성된 **짧은 링크** (`https://link.coupang.com/a/XXXXXX`) 복사

### 3. 상품 정보 수집

쿠팡 상품 페이지에서 다음 4가지 수집:
- **productUrl**: 파트너스 짧은 링크
- **productImage**: 상품 대표 이미지 URL (우클릭 → 이미지 주소 복사, `coupangcdn.com` 도메인이어야 함)
- **productName**: 쿠팡에 표시된 정식 상품명
- **productPrice**: 현재 판매가 (숫자만, 원 단위)
- **isRocket**: 로켓배송 여부 (true/false)

### 4. data/coupang-links.json 편집

```json
{
  "updatedAt": "2026-04-20",
  "links": {
    "cu-d9da48dd": {
      "productUrl": "https://link.coupang.com/a/b2dXyZ",
      "productImage": "https://thumbnail6.coupangcdn.com/thumbnails/remote/.../8a9f.jpg",
      "productName": "코카콜라 500ml x 24개",
      "productPrice": 18900,
      "isRocket": true
    }
  }
}
```

`_example_` 접두어가 붙은 예시 항목은 삭제해도 무관 (렌더링 시 무시됨).

### 5. 저장 후 `updatedAt` 날짜 갱신

## 주의사항

- **반드시 파트너스 링크** (`link.coupang.com/a/*`) 사용. 일반 쿠팡 URL은 수수료 정산 안 됨.
- 이미지는 **쿠팡 CDN URL 그대로** 참조. 다운로드/재호스팅 금지.
- 상품 단종/품절 시 해당 항목 삭제 (빈 링크보다 미표시가 나음).
- 대가성 고지 문구는 `Disclaimer.tsx`와 각 카드 하단에 자동 노출됨.

## 갱신 주기

- 초기 30개 매핑 후 **주 1회 재확인** (품절/단종 체크)
- 매출 15만원 달성 → API 키 발급 → `scripts/match-coupang.mjs` 자동화 전환

## 렌더링 확인

매핑 추가 후 `npm run dev` → `/deals/<dealId>` 접속 → 상세 페이지 하단에 쿠팡 카드 노출 확인.
