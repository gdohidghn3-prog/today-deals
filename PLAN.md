# 오늘혜택 — 수정사항 + 기획안 v3 (최종)

> 작성일: 2026-04-17
> 원칙: **사용자 수작업 0건, 초기 운영비 0원 수준** (현재 트래픽·무료 한도 내)
> 단, 수익화 이후 트래픽 증가 시 Vercel Hobby 정책, 카카오 API 초과 과금 가능성 재확인 필요

---

## Part 1. 수정사항

### CRITICAL

> **읽기 가이드:** Critical 항목은 3개 묶음으로 구성
> - **운영 안정성 (C1, C2, C3):** 크롤러 복구, 검증/알림, 워크플로우 설정
> - **API 보호 (C4):** 인증, 응답 최소화, rate limit
> - **데이터 신선도/정합성 (C5, C6):** 갱신 시각 표시, 소스별 신선도, 스키마 검증

#### C1. 통신사 크롤러 8일째 중단 + 데이터 경로 혼합 문제

**현상:**
- `data/telecom.json`의 `updatedAt`이 `2026-04-09`에서 멈춤
- KT 149건 + LGU+ 164건이 8일째 stale 데이터
- SKT 20건만 런타임 크롤(`crawlers/index.ts:68-74`)로 보충되어 문제가 가려져 있었음

**원인 — 데이터 경로 혼합:**
```
현재 (혼합형):
  SKT  → 런타임 실시간 크롤 (Vercel 서버에서 직접)
  KT   → data/telecom.json에서 로드 (GH Actions 배치)
  LGU+ → data/telecom.json에서 로드 (GH Actions 배치)

문제:
  - SKT 정상이라 통신사 탭이 "돌아가는 것처럼" 보임
  - KT/LGU+만 stale인데 감지 안 됨
  - Vercel에서 SKT 크롤 타임아웃 시 SKT 0건 → 별도 장애
```

**수정 — 배치 JSON 단일 경로로 통일:**
```
변경 (단일 경로):
  SKT/KT/LGU+ 전부 → data/telecom.json에서 로드
  런타임 크롤은 JSON 누락 시에만 fallback (편의점과 동일 패턴)
```

```typescript
// lib/crawlers/index.ts — 변경
export async function crawlAllTelecom(): Promise<Deal[]> {
  // 1순위: 정적 JSON (GH Actions 매일 09:00 KST)
  try {
    const cached = (telecomJson.deals as unknown as Deal[]) ?? [];
    if (cached.length > 0) {
      console.log(`[Crawl] telecom JSON: ${cached.length}개 (${telecomJson.updatedAt})`);
      return cached;
    }
  } catch {}

  // 2순위: 런타임 fallback (JSON 비어있을 때만)
  console.log("[Crawl] telecom JSON 비어있음 → 런타임 fallback");
  try { return await crawlSKT(); } catch { return []; }
}
```

**추가 작업:**
- GH Actions `crawl-telecom.yml` 재활성화 및 정상 동작 확인
- `updatedAt` 프론트에 표시 (C4 참조)
- 소스별 신선도 모델 도입 (C5 참조)

---

#### C2. 크롤 실패 무음 장애 — 소스별 검증 + 부분 실패 보존 + 텔레그램 알림

**현상:** 3개 워크플로우 모두 실패 시 알림 채널 없음. C1이 8일간 방치된 직접 원인.

**수정 — 소스별 최소 건수 검증:**

총 건수 기준은 부분 실패를 감지 못함 (예: KT만 0건이어도 총합은 정상처럼 보임). 소스별 하한선 적용:

```yaml
# .github/workflows/crawl-telecom.yml

- name: Validate per-source counts
  run: |
    node -e "
      const d = JSON.parse(require('fs').readFileSync('data/telecom.json'));
      const min = { skt: 10, kt: 100, lgu: 120 };
      const fails = [];
      for (const [k, v] of Object.entries(min)) {
        if ((d.summary[k] || 0) < v) fails.push(k + ':' + (d.summary[k] || 0) + '<' + v);
      }
      if (fails.length) { console.error('소스별 건수 미달:', fails.join(', ')); process.exit(1); }
      console.log('검증 통과:', JSON.stringify(d.summary));
    "
```

```yaml
# .github/workflows/crawl-convenience.yml

- name: Validate per-source counts
  run: |
    node -e "
      const d = JSON.parse(require('fs').readFileSync('data/convenience.json'));
      const min = { cu: 300, gs25: 300, seven: 500, emart24: 300 };
      const fails = [];
      for (const [k, v] of Object.entries(min)) {
        if ((d.summary[k] || 0) < v) fails.push(k + ':' + (d.summary[k] || 0) + '<' + v);
      }
      if (fails.length) { console.error('소스별 건수 미달:', fails.join(', ')); process.exit(1); }
      console.log('검증 통과:', JSON.stringify(d.summary));
    "
```

**부분 실패 시 소스 단위 merge 보존:**

```yaml
- name: Merge-preserve on partial failure
  if: failure()
  run: |
    # 실패한 source만 이전 JSON에서 병합 복원 (파일 전체 롤백 아님)
    node -e "
      const fs = require('fs');
      const cp = require('child_process');
      const cur = JSON.parse(fs.readFileSync('data/telecom.json'));
      const prev = JSON.parse(cp.execSync('git show HEAD:data/telecom.json').toString());
      const min = { skt: 10, kt: 100, lgu: 120 };
      for (const [src, threshold] of Object.entries(min)) {
        if ((cur.summary[src] || 0) < threshold) {
          const prevDeals = prev.deals.filter(d => d.source === src);
          cur.deals = cur.deals.filter(d => d.source !== src).concat(prevDeals);
          cur.summary[src] = prevDeals.length;
          console.log(src + ': 이전 데이터 복원 (' + prevDeals.length + '건)');
        }
      }
      cur.count = cur.deals.length;
      fs.writeFileSync('data/telecom.json', JSON.stringify(cur, null, 2));
    "
```

**텔레그램 알림:**

```yaml
- name: Alert on failure
  if: failure()
  run: |
    curl -s -X POST "https://api.telegram.org/bot${{ secrets.TG_BOT_TOKEN }}/sendMessage" \
      -d chat_id=${{ secrets.TG_CHAT_ID }} \
      -d text="⚠️ [오늘혜택] ${{ github.workflow }} 실패 — $(date +%m/%d %H:%M)"
```

---

#### C3. 워크플로우 운영 안정성 강화

**현상:** 3개 워크플로우 모두 `concurrency`, `timeout-minutes`, `permissions` 미설정

**수정 — 각 워크플로우에 공통 추가:**

```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: true    # 중복 실행 방지 (이전 run 취소)

permissions:
  contents: write              # git push 권한 명시

jobs:
  crawl:
    runs-on: ubuntu-latest
    timeout-minutes: 10        # 10분 초과 시 강제 종료
```

**효과:**
- 동시 실행 방지 (cron 지연 등으로 이전 실행이 안 끝났을 때)
- 무한 hang 방지 (크롤러가 응답 대기로 멈출 때)
- 권한 범위 명시 (보안 모범 사례)

---

#### C4. /api/crawl 인증 + 응답 최소화 + API Rate Limit

**현상:**
- `POST /api/crawl` — 인증 없이 공개. 응답에 전체 deal 데이터까지 반환 (`route.ts:23-29`)
- `/api/gas`, `/api/nearby-stores` — 카카오/OPINET API를 무한 프록시 가능

**수정 (3가지):**

```
1. /api/crawl → 시크릿 키 검증 + 응답에서 deals 배열 제거
2. /api/gas, /api/nearby-stores → IP 기반 rate limit
3. middleware.ts에서 통합 보호
```

**/api/crawl 응답 최소화:**
```typescript
// app/api/crawl/route.ts — 변경
return NextResponse.json({
  success: true,
  total: deals.length,
  summary,           // 소스별 건수만
  updatedAt: new Date().toISOString(),
  elapsed: `${elapsed}ms`,
  // deals 배열 제거 — 외부 노출 불필요
});
```

**middleware.ts (신규):**
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30;
const WINDOW = 60_000;

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/crawl") {
    const key = req.headers.get("x-api-key");
    if (key !== process.env.CRAWL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (req.nextUrl.pathname.startsWith("/api/gas") ||
      req.nextUrl.pathname.startsWith("/api/nearby-stores")) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const entry = hitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      hitMap.set(ip, { count: 1, resetAt: now + WINDOW });
    } else {
      entry.count++;
      if (entry.count > LIMIT) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
```

**비고:** Vercel Edge Middleware는 무료 티어에 포함. in-memory Map은 cold start마다 리셋되지만, 단일 인스턴스 내 burst 공격 방어에는 충분.

---

#### C5. 데이터 갱신 시각 표시 + 소스별 신선도 모델

**현상:**
- 올리브영/주유만 "기준" 시각 표시. 통신사/편의점은 미표시
- 통신사 JSON에 `updatedAt` 1개만 존재 → 소스별 신선도 파악 불가

**수정 (2단계):**

**1단계 — 프론트 갱신 시각 표시:**
```
통신사: "4월 17일 09시 기준" 추가
편의점: "4월 16일 09시 기준" 추가
24시간 초과 시: "⚠️ 데이터가 최신이 아닐 수 있습니다 (2일 전 기준)" 경고 배너
```

**2단계 — JSON에 소스별 타임스탬프 추가:**
```json
{
  "updatedAt": "2026-04-17T00:00:00Z",
  "freshness": {
    "skt": "2026-04-17T00:01:23Z",
    "kt": "2026-04-17T00:02:45Z",
    "lgu": "2026-04-17T00:03:12Z"
  },
  "summary": { "skt": 20, "kt": 149, "lgu": 164 },
  "deals": [...]
}
```

**효과:** C1 같은 부분 stale을 프론트/운영 양쪽에서 감지 가능

---

#### C6. JSON 스키마 검증 — 커밋 전 구조 검증

**현상:** 수집 성공/건수 검증은 있으나, JSON 필드 구조 검증 없음. 크롤러 버그로 필수 필드 누락 시 프론트 런타임 에러.

**수정 — 커밋 전 스키마 검증 step 추가:**

```yaml
- name: Validate JSON schema
  run: |
    node -e "
      const d = JSON.parse(require('fs').readFileSync('data/telecom.json'));
      const required = ['id', 'source', 'title', 'discount', 'brand', 'startDate', 'endDate'];
      const errors = [];
      for (const deal of d.deals) {
        for (const f of required) {
          if (!deal[f] || typeof deal[f] !== 'string' || deal[f].trim() === '') {
            errors.push(deal.id + ': missing ' + f);
          }
        }
        // startDate/endDate 형식 검증
        if (deal.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(deal.startDate)) {
          errors.push(deal.id + ': invalid startDate ' + deal.startDate);
        }
      }
      if (errors.length) {
        console.error('스키마 검증 실패:', errors.slice(0, 10).join('; '));
        process.exit(1);
      }
      console.log('스키마 검증 통과:', d.deals.length + '건');
    "
```

**검증 항목:**

| 필드 | 규칙 |
|------|------|
| `id` | 비어있지 않은 문자열 |
| `source` | 허용 값: `skt`, `kt`, `lgu`, `cu`, `gs25`, `seven`, `emart24` 등 |
| `title` | 비어있지 않은 문자열 |
| `discount` | 비어있지 않은 문자열 |
| `brand` | 비어있지 않은 문자열 |
| `startDate` | `YYYY-MM-DD` 형식 |
| `endDate` | `YYYY-MM-DD` 형식, `>= startDate` |

**효과:** 크롤러 변경/사이트 구조 변경 시 잘못된 데이터가 프론트까지 도달하는 것을 사전 차단

---

### MAJOR

#### M1. 올리브영 1,903개 한번에 렌더링

**현상:** `OliveYoungClient.tsx:227-231`에서 `items.map()`으로 전체 렌더링. 모바일 초기 렌더 느림.

**수정:** "더보기" 버튼 방식 (외부 라이브러리 불필요)

```typescript
const PAGE_SIZE = 50;
const [page, setPage] = useState(1);
const visible = items.slice(0, page * PAGE_SIZE);
const hasMore = visible.length < items.length;

// 그리드 아래
{hasMore && (
  <button onClick={() => setPage(p => p + 1)}
    className="w-full py-3 mt-3 rounded-xl bg-white border ...">
    더보기 ({items.length - visible.length}개 남음)
  </button>
)}
```

---

#### M2. Error Boundary 없음

**현상:** Server Component에서 throw 시 페이지 전체 500.

**수정:**
```
app/error.tsx                 ← 글로벌 에러 페이지
app/convenience/error.tsx     ← 편의점 전용
app/oliveyoung/error.tsx      ← 올리브영 전용

+ 각 페이지 Server Component에 try-catch + 빈 배열 fallback
```

---

#### M3. 개인화 상태 휘발

**현상:** 통신사 필터, 편의점 탭, 시도 선택이 매 방문 초기화.

**수정:** `useLocalStorage` 커스텀 훅 (외부 라이브러리 불필요)

| 페이지 | 저장 키 | 기본값 |
|--------|---------|--------|
| 통신사 | `pref:telecom` | `"all"` |
| 편의점 | `pref:store` | `"all"` |
| 주유 유종 | `pref:fuel` | `"B027"` |
| 주유 시도 | `pref:sido` | `"01"` |
| 올리브영 카테고리 | `pref:oy-category` | `"전체"` |

---

#### M4. 통신사 카드 클릭 → 네이버 검색 이탈

**현상:** `DealCard.tsx:7-11` — 모든 카드가 `search.naver.com`으로 이동.

**수정:** 카드 본문은 통신사 공식 페이지로, 검색 아이콘은 기존 유지

```
현재: [카드 전체] → 네이버 검색
변경: [카드 본문] → deal.link (통신사 공식 쿠폰/멤버십 페이지)
      [🔍 아이콘] → 네이버 검색 (별도 클릭 영역)
```

---

#### M5. 전 소스 Stable ID

**현상:** 크롤할 때마다 같은 상품에 다른 ID 부여

| 소스 | 현재 ID 방식 | 안정성 |
|------|-------------|--------|
| SKT | `skt-${index}` | 불안정 — 순서 바뀌면 변경 |
| KT | `kt-${index}` | 불안정 |
| LGU+ | `lgu-${urcMbspJncoNo}` | **안정** — API 고유값 |
| CU | `cu-11-p1-${index}` | 불안정 — 페이지+인덱스 |
| GS25 | `gs25-11-p1-${index}` | 불안정 |
| 세븐일레븐 | `seven-11-${index}` | 불안정 |
| 이마트24 | `emart24-11-${index}` | 불안정 |
| 올리브영 | rank 기반 추정 | 불안정 — 순위 변동 |

**수정 — 전 소스 공통 규칙:**

```
1. 해시 전 정규화: 공백 통일, 특수문자 제거, 용량 표기 통일 (ml/ML/㎖→ml), 브랜드 접두어 정리
2. 정규화된 (source|brand|title|discount) 해시로 ID 생성
3. API 고유값이 있는 소스(LGU+ 등)는 그대로 사용
```

```javascript
import { createHash } from "crypto";

function normalize(s) {
  return s
    .replace(/\s+/g, " ").trim()           // 공백 통일
    .replace(/[)）\]】]/g, ")")             // 괄호 통일
    .replace(/[(（\[【]/g, "(")
    .replace(/㎖|ML|Ml/gi, "ml")           // 용량 표기 통일
    .replace(/㎎|MG|Mg/gi, "mg")
    .replace(/[^\w가-힣().%+\-/ml ]/g, "") // 불필요 특수문자 제거
    .toLowerCase();
}

function stableId(source, brand, title, discount) {
  const payload = `${source}|${normalize(brand)}|${normalize(title)}|${normalize(discount)}`;
  const hash = createHash("md5").update(payload).digest("hex").slice(0, 8);
  return `${source}-${hash}`;
}
```

**적용 대상:** `scripts/crawl-telecom.mjs`, `scripts/crawl-convenience.mjs`, `scripts/crawl-oliveyoung.mjs` + `lib/crawlers/*.ts` (runtime fallback)

**이 작업이 F1(제휴 링크), F4(SEO 페이지), F7(가격 이력)의 전제 조건.**

**버전 관리 정책:** 정규화 규칙 변경 시 기존 ID와의 호환을 위해 v1 규칙을 유지하고, 신규 규칙이 필요하면 `v2-` prefix로 분기. 이력 데이터(F7)의 연속성 보장이 목적.

---

### MINOR

#### m1. 올리브영 `<img>` → Next.js `<Image>` 교체
#### m2. 모바일 검색 clear 시 키보드 재팝업 — focus 제거
#### m3. GA 이벤트 트래킹 추가

| 이벤트 | 파라미터 | 위치 |
|--------|---------|------|
| `deal_click` | source, brand, discount | DealCard, ConvenienceDealCard, OliveYoung Card |
| `filter_change` | tab, value | 통신사/편의점/올리브영 필터 버튼 |
| `search` | query, result_count | 각 페이지 검색 input |
| `nearby_search` | store_brand | NearbyStoresSheet |
| `share` | source, deal_id | F2 공유 버튼 |

#### m4. SEO 구조화 데이터 (JSON-LD) — ItemList + BreadcrumbList
#### m5. 크롤러 코드 중복 제거 — oliveyoung-shared.mjs 통합 완료
#### m6. JSON diff 최적화 — deals 배열만 비교, updatedAt 제외

---

## Part 2. 기획안

> 모든 기능: 자동화 완결 + 무료 인프라 범위 내 운영

### F1. 제휴 링크 수익화

**전제:** M5(Stable ID) 완료 + 쿠팡파트너스 가입 심사 통과

**현재:**
```
편의점 카드 → 편의점 공식 행사 페이지 (수익 $0)
올리브영 카드 → 올리브영 상품 페이지 (수익 $0)
```

**변경:**
```
편의점 카드 하단 → "쿠팡에서 묶음 구매" 제휴 링크 추가
올리브영 카드 하단 → "쿠팡에서 비교" 제휴 링크 추가
기존 링크는 그대로 유지 (공식 페이지 접근 방해 없음)
```

**자동 매칭 — GH Actions 배치:**
```
1. 상품명 정규화 (M5 normalize 함수 재활용)
2. 쿠팡파트너스 검색 API → 최저가 상품 URL → 파트너스 링크 변환
3. data/coupang-links.json에 {dealId → coupangUrl} 매핑 저장
4. 주 1회 갱신 (상품 변동 주기에 맞춤)
```

**매칭률 현실 추정:**
- 편의점 PB상품 (CU 헤이루, GS25 유어스 등): 매칭 불가 (~30%)
- 일반 브랜드 (코카콜라, 농심 등): 매칭 가능 (~70%)
- 올리브영 화장품: 브랜드+상품명으로 높은 매칭률 (~80%)
- 미매칭 상품은 링크 미표시 (빈 문자열 스킵)

**비용:** 쿠팡파트너스 API 무료
**수익 추정:** 일 500 PV × 5% CTR × 3% 전환 × 700원 = 월 ~16,000원 (초기)

---

### F2. 카카오톡 공유

**목적:** 바이럴 유입

**전제:** 카카오 개발자 앱 등록 + JS 키 발급 (무료)

**UI:** 각 카드에 공유 아이콘 → 카카오톡 피드형 공유

**비용:** 카카오 JS SDK 무료 (일 30만 건 한도). 트래픽 증가 시 한도 초과 여부 모니터링 필요

---

### F3. PWA

**목적:** 앱스토어 배포 없이 홈화면 앱 아이콘 + 오프라인 캐시

**구현:**
```
public/manifest.json   ← 앱 메타데이터
public/sw.js            ← Service Worker
app/layout.tsx          ← <link rel="manifest"> 추가
```

**SW 캐시 전략:**
```
정적 자산 → Cache First
data/*.json → Network First (실패 시 캐시)
/api/* → Network Only
이미지 → Stale While Revalidate
```

---

### F4. 개별 상품 SEO 페이지

**전제:** M5(Stable ID) 완료

**목적:** 검색 진입 URL 5개 → ~4,000개 확장

**빌드 전략:**
```
전량 generateStaticParams(SSG)는 빌드 시간·메모리 부담이 큼
→ 상세 페이지는 동적 렌더 + ISR(revalidate: 21600) 우선 적용
→ sitemap만 전체 URL 노출 (검색 엔진 색인용)
→ 트래픽 패턴 확인 후 인기 상품만 선택적 SSG 전환 검토
```

**구조:**
```
app/deals/[id]/page.tsx     ← 동적 라우트 (ISR 6시간)
app/sitemap.ts              ← 동적 sitemap (~4,000 URL)
```

**SEO 마크업:** Product + Offer JSON-LD

---

### F5. "오늘의 BEST" 자동 추천

**목적:** 첫 화면 이탈률 감소

**자동 선정 기준 — GH Actions 크롤 시점에 계산:**
- 통신사: 할인율 상위 + 인기 브랜드 가중치
- 편의점: 1+1 > 2+1, 가격 높은 순
- 올리브영: 할인율 × 랭킹 역수

**데이터:** 각 `data/*.json`에 `best` 배열 (상위 3건 ID) 추가

---

### F6. 마트 전단지 탭

**목적:** "할인" 검색 사용자 커버리지 확대

**단계적 접근:**
```
1차: 이마트 PoC (크롤 가능 여부 확인 + 단일 소스 구현)
2차: 홈플러스/롯데마트 확장 (PoC 성공 시)
```

**전제 확인 필요:**
- 각 마트 사이트 robots.txt 및 크롤 차단 여부
- 전단지가 구조화 HTML인지 이미지 기반인지 (이미지 기반이면 크롤 불가)
- PoC 실패 시 이 기능은 보류

---

### F7. 가격 이력 누적 (git 기반, DB 없음)

**전제:** M5(Stable ID) 완료

**해결 — jsonl append:**
```
GH Actions 크롤 스크립트 마지막에:
1. 어제 JSON vs 오늘 JSON diff (stable ID 기준)
2. 신규 등장 → history/deals.jsonl에 appeared
3. 사라진 상품 → history/deals.jsonl에 disappeared
```

**파일 크기 추정:** 일 50건 × 120byte = 6KB/일 = ~2MB/년

---

### F8. RSS 피드 (알림 대체)

**목적:** 서버/DB 없이 신규 혜택 구독

```
/api/feed/route.ts → 오늘 신규/변경 혜택 RSS XML 생성
사용자가 RSS 리더 또는 IFTTT에서 구독
```

---

## Part 3. 실행 로드맵

> 순서: **안정화 → Stable ID → 수익화 → 개인화 → SEO**
> 수익화를 개인화/SEO보다 앞에 둔 이유: 수익 장치가 없으면 트래픽이 늘어도 $0

### Phase 1: 안정화 (Day 1~2)

| 작업 | 분류 | 소요 |
|------|------|------|
| C1: 통신사 크롤러 복구 + JSON 단일 경로 | 크리티컬 | 2시간 |
| C2: 소스별 검증 + 부분 실패 보존 + 텔레그램 알림 | 크리티컬 | 1시간 |
| C3: 워크플로우 concurrency/timeout/permissions | 크리티컬 | 30분 |
| C4: /api/crawl 보호 + 응답 최소화 + rate limit | 크리티컬 | 1시간 |
| C5: 데이터 갱신 시각 + 소스별 신선도 | 크리티컬 | 1시간 |
| C6: JSON 스키마 검증 | 크리티컬 | 1시간 |
| M2: Error Boundary | 메이저 | 1시간 |
| m2: 모바일 검색 clear UX | 마이너 | 15분 |

### Phase 2: Stable ID + 수익화 (Day 3~4)

| 작업 | 분류 | 소요 |
|------|------|------|
| M5: 전 소스 Stable ID (정규화 포함) | 메이저 (전제) | 3시간 |
| F1: 쿠팡파트너스 제휴 링크 | 수익화 | 5시간 |
| F5: 오늘의 BEST 자동 추천 | 기능 | 3시간 |
| m3: GA 이벤트 트래킹 | 마이너 | 1시간 |

### Phase 3: 개인화 + 바이럴 (Day 5~6)

| 작업 | 분류 | 소요 |
|------|------|------|
| M3: localStorage 개인화 | 메이저 | 2시간 |
| M4: 통신사 카드 링크 개선 | 메이저 | 1시간 |
| M1: 올리브영 페이지네이션 | 메이저 | 1시간 |
| F2: 카카오톡 공유 | 바이럴 | 3시간 |
| m1: 올리브영 Image 최적화 | 마이너 | 1시간 |

### Phase 4: SEO + PWA (Day 7~9)

| 작업 | 분류 | 소요 |
|------|------|------|
| F3: PWA (manifest + SW) | 리텐션 | 5시간 |
| F4: 개별 상품 SEO 페이지 (동적 ISR) + sitemap | SEO | 8시간 |
| m4: JSON-LD 구조화 데이터 | SEO | 1시간 |
| F8: RSS 피드 | 알림 | 2시간 |

### Phase 5: 확장 + 데이터 (Day 10~14)

| 작업 | 분류 | 소요 |
|------|------|------|
| F6: 마트 이마트 PoC → 성공 시 확장 | 확장 | 4+4시간 |
| F7: 가격 이력 누적 | 데이터 | 5시간 |
| m5: 크롤러 중복 제거 | 기술부채 | 2시간 |
| m6: JSON diff 최적화 | 기술부채 | 1시간 |

---

## Part 4. 비용

**현재 기준: 초기 운영비 0원 수준 (모든 서비스 무료 한도 내)**

| 인프라 | 서비스 | 비용 | 무료 한도 | 현재 사용 |
|--------|--------|------|----------|----------|
| 호스팅 | Vercel Hobby | $0 | 100GB 대역폭/월 | ~수 GB |
| CI/CD | GitHub Actions | $0 | 공개 무제한 / 비공개 2,000분/월 | ~450분/월 |
| 지도 | Kakao REST API | $0 | 30만 건/일 | 미미 |
| 유가 | OPINET API | $0 | 무제한 (공공) | 미미 |
| 제휴 | 쿠팡파트너스 | $0 (수익만) | 무제한 | 0 (신규) |
| 공유 | 카카오 JS SDK | $0 | 30만 건/일 | 0 (신규) |
| 분석 | Google Analytics 4 | $0 | 무제한 | pageview만 |
| 알림 | 텔레그램 Bot API | $0 | 무제한 | 기존 봇 재활용 |
| 저장 | GitHub (JSON+jsonl) | $0 | 무제한 (공개) | ~60K줄 |

**트래픽 증가 시 재확인 필요 항목:**
- Vercel Hobby: 100GB 대역폭 초과 시 Pro ($20/월) 전환 필요
- 카카오 REST API: 일 30만 건 초과 시 비즈앱 전환 (과금)
- 카카오 JS SDK: 공유 30만 건/일 초과 시 비즈앱
- GitHub Actions (비공개 repo): 2,000분/월 초과 시 추가 과금

**비공개 repo인 경우:** 현재 ~450분/월 사용. 마트 탭 추가 시 +20분/월. 한도 내이나 모니터링 필요.

---

## Part 5. 기대 효과

| 지표 | 현재 | Phase 2 후 | Phase 4 후 |
|------|------|-----------|-----------|
| 월 수익 | $0 | ~2만원 (제휴) | ~10만원 (SEO 유입↑) |
| 검색 URL | 5개 | 5개 | ~4,000개 |
| 재방문율 | 낮음 | 중간 (개인화) | 높음 (PWA+공유) |
| 데이터 안정성 | 실패 인지 불가 | 실패 즉시 알림 | 이력 추적 가능 |
| 이탈률 | 높음 (외부 링크) | 중간 (내부 링크) | 낮음 (상품 페이지) |

---

## Part 6. 검증 계획

### 자동화 테스트

#### Stable ID 회귀 테스트
```javascript
// scripts/__tests__/stable-id.test.mjs
// 동일 입력 → 동일 ID 보장
assert.equal(stableId("cu", "코카콜라", "코카콜라 500ml", "1+1"), "cu-a3f7b2c1");
// 정규화 검증: 공백, 대소문자, 용량 표기 차이 → 동일 ID
assert.equal(
  stableId("cu", "코카콜라", "코카콜라  500ML", "1+1"),  // 공백 2개, ML 대문자
  stableId("cu", "코카콜라", "코카콜라 500ml", "1+1")    // 공백 1개, ml 소문자
);
// 다른 소스 → 다른 ID
assert.notEqual(
  stableId("cu", "코카콜라", "코카콜라 500ml", "1+1"),
  stableId("gs25", "코카콜라", "코카콜라 500ml", "1+1")
);
```

#### JSON 스키마 검증 테스트
```javascript
// scripts/__tests__/schema.test.mjs
// 필수 필드 누락 시 실패
const invalid = { id: "", source: "cu", title: "test", ... };
assert.throws(() => validateDeal(invalid), /missing id/);
// 날짜 형식 오류 시 실패
const badDate = { ..., startDate: "2026/04/01" };
assert.throws(() => validateDeal(badDate), /invalid startDate/);
```

#### JSON diff 테스트
```javascript
// scripts/__tests__/diff.test.mjs
// deals 동일 + updatedAt만 다를 때 → "변경 없음" 판정
// deals 1건 추가 시 → "변경 있음" 판정
```

### 워크플로우 검증

#### GH Actions Validation (수동 실행으로 검증)
```yaml
# 각 워크플로우에 workflow_dispatch 이미 포함됨
# 수동 실행 → 소스별 건수 검증 → 스키마 검증 → 커밋 → 알림
```

**체크 항목:**
- [ ] concurrency 동작 확인 (동시 2개 trigger → 1개만 실행)
- [ ] timeout 동작 확인 (의도적 sleep 15분 → 10분에 강제 종료)
- [ ] 부분 실패 시 기존 데이터 보존 확인
- [ ] 텔레그램 알림 수신 확인

### 핵심 페이지 수동 QA 체크리스트

| 페이지 | 확인 항목 |
|--------|----------|
| 통신사 | 갱신 시각 표시 + stale 경고 동작 |
| 통신사 | SKT/KT/LGU+ 각각 필터 → 건수 정상 |
| 통신사 | 카드 클릭 → 공식 페이지 (네이버 아님) |
| 편의점 | 4사 각각 탭 전환 → 이미지 로드 정상 |
| 편의점 | 검색 → clear → 키보드 안 올라옴 (모바일) |
| 올리브영 | 초기 50개 로드 → 더보기 → 추가 50개 |
| 올리브영 | 카테고리 필터 → 건수 정확 |
| 주유 | 시도 변경 → TOP 10 갱신 |
| 주유 | 내 주변 → 위치 권한 → 결과 표시 |
| 전체 | localStorage 저장 → 새 탭 → 복원 |
| 전체 | Error Boundary → 서버 에러 시 fallback UI |
| 전체 | /api/crawl 직접 호출 → 401 반환 |

---

### 배포 후 운영 모니터링

Phase 1~2 배포 후 지속 감시 항목:

| 항목 | 감시 방법 | 기준 |
|------|----------|------|
| 데이터 신선도 | `data/*.json`의 `updatedAt` → 24시간 초과 시 텔레그램 알림 | 매일 자동 |
| 소스별 count 변동폭 | 전일 대비 ±30% 이상 변동 시 경고 | 크롤 시점 |
| API 429 비율 | Vercel Analytics에서 429 응답 비율 확인 | 주 1회 |
| 워크플로우 실패 | 텔레그램 알림 수신 여부 | 상시 |
| Stable ID 충돌 | 동일 ID에 다른 상품 매핑되는 케이스 | 크롤 시 자동 감지 |

---

## Part 7. 전제 확인 체크리스트

작업 착수 전 확인 필요한 항목:

- [ ] 쿠팡파트너스 가입 심사 통과 여부 (F1 전제)
- [ ] 카카오 개발자 앱 등록 + JS 키 발급 (F2 전제)
- [ ] 이마트 사이트 크롤 가능 여부 — robots.txt + 구조화 HTML 확인 (F6 PoC 전제)
- [ ] GitHub repo가 public인지 private인지 (GH Actions 한도 결정)
- [ ] 텔레그램 봇 토큰 + 채팅 ID 확인 (C2 — 기존 봇 재활용 가능 여부)
- [ ] 통신사 크롤러 GH Actions 실행 결과 확인 (C1 — 수동 trigger 후 정상 동작 여부)
