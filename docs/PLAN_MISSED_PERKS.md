# 놓치기 쉬운 혜택 통합 기획안

**문서 버전**: v1.3  
**작성일**: 2026-04-21  
**대상 서비스**: today-deals (https://today-deals-ochre.vercel.app)  
**기획 범위**: 정기 반복 혜택(Phase 1) + 브랜드 생일 혜택(Phase 2)

---

## 1. 배경 및 목적

### 1.1 문제 정의
- 사용자는 일상에서 **반복적으로 발생하는 혜택**(영화관 컬처데이, 베스킨라빈스 31데이 등)을 알면서도 까먹어서 놓치는 경우가 많음
- 브랜드 멤버십 가입 시 제공되는 **생일 혜택**은 실제 사용 여부와 별개로, 가입 사실 자체를 잊어버려 소멸되는 경우가 많음
- 흩어진 정보를 한 곳에서 **지금 챙길 것 중심으로 요약**해 보여주는 서비스가 부족함

### 1.2 목표
- "오늘/이번주 챙겨야 할 정기 혜택"을 **규칙 계산 + 운영자 검증 데이터** 기반으로 노출
- 생월 입력만으로 **생일 혜택 후보 체크리스트** 제공
- **신규 탭 추가 없이** 기존 5탭 구조 안에 자연스럽게 통합
- 모든 데이터는 **정적 JSON + 분기 1회 검증** 중심으로 운영하여 **초기 운영비 0원 수준** 유지

### 1.3 비목표 (명시적 제외)
- 카드사 혜택
- 호텔/패션위크 등 일부 사용자 한정 혜택
- 매월 변동성이 큰 혜택 (CU 1+1 신상, 도미노 마이데이 등)
- 로그인 후에만 확인 가능한 폐쇄형 데이터
- 사용자의 실제 멤버십 가입 여부, 실적 조건 충족 여부를 서버에서 판별하는 기능

### 1.4 제품 원칙
- 이 기능은 **크롤링 자동완결형 데이터 상품이 아니라, 검증된 에디토리얼 데이터 기능**으로 본다
- 사용자에게는 "지금 챙길 만한 혜택"을 주되, **과도한 확정 표현은 피하고 검증 상태를 함께 노출**한다
- 생일 혜택은 "무조건 받을 수 있음"이 아니라 **조건 확인 후 수령 가능한 후보 리스트**로 안내한다

---

## 2. 사용자 시나리오

### 2.1 시나리오 A — 정기 혜택 캐치
> 회사원 A씨, 매월 영화 관람을 즐김. CGV 컬처데이를 알지만 매번 까먹어서 정가로 결제.

- today-deals 홈 진입
- 최상단 **"이번주 놓치지 마세요"** 가로 스크롤 카드에서
  > 💎 **CGV 문화의 날** — 4월 29일 (수) D-3
- 카드 하단 `최근 검증: 4/1` 또는 `확인 필요` 배지 확인
- 공식 페이지 이동 → 그날 예매

### 2.2 시나리오 B — 생일 혜택 일괄 챙기기
> 직장인 B씨, 5월 생일. 스타벅스/올리브영 등 멤버십 가입은 했으나 어떤 생일 혜택이 있는지 정리되지 않음.

- 우측 하단 🎂 버튼 클릭 → Drawer 오픈
- 생월 5월 선택 → 17개 브랜드 체크리스트 표시
- 각 항목은 단순 나열이 아니라 아래 상태를 함께 보여줌
  - `당월 지급`
  - `가입 필요`
  - `조건 확인 필요`
  - `최근 검증일`
- 사용자가 받은 혜택 토글 체크 → LocalStorage 저장
- 다음 방문 시 미수령 항목만 강조

### 2.3 시나리오 C — 카테고리 탐색 중 정기 혜택 인지
> 사용자가 `/oliveyoung` 탭 진입

- 페이지 상단에 **"올리브영 정기 세일"** 카드 노출
  > 🗓 다음 올영세일: 7월 예정
  > 최근 검증: 4/10
- 상품 탐색 중 자연스럽게 정기 일정 인지

---

## 3. 정보 구조 (IA)

### 3.1 기존 구조 유지
```
[BottomNav 5탭] 통신사 | 편의점 | 올리브영 | 문화 | 주유
```

### 3.2 신규 데이터 통합 매핑

| 데이터 | 노출 위치 | 노출 방식 |
|---|---|---|
| **정기 혜택 Top 5** | `/` 홈 최상단 | "이번주 놓치지 마세요" 가로 스크롤 |
| CGV/메가박스/롯데시네마 컬처데이 | `/culture` | 상단 "정기 영화 할인" 섹션 |
| T멤버십 무비데이 | `/` 통신사 상단 | 통신사 딜 위 정기 카드 |
| 이마트 신선특가 / 트레이더스 회원의 날 | `/convenience` | 상단 "마트 정기 행사" 섹션 |
| 베스킨라빈스 31데이 | `/convenience` | 31일 임박 시 배너 |
| 올리브영 세일 | `/oliveyoung` | 상단 "정기 세일" 카드 |
| 11번가 십일절 / 쿠팡 행사 | `/` Featured | "이번주" 자동 포함 |
| 백화점 정기세일 / 스벅 프리퀀시 | `/` Featured | 시즌 도래 시 노출 |
| **🎂 생일 혜택 17개** | 소비자 화면 전역 FAB → Drawer | 생월 입력 → 체크리스트 |

### 3.3 FAB 노출 범위
- **노출**: `/`, `/convenience`, `/oliveyoung`, `/culture`, `/gas`
- **비노출**: `/admin`, `/admin/login`, `/deals/[id]`
- 이유:
  - 어드민 화면 간섭 방지
  - 상세 페이지 CTA와 시각 충돌 방지
  - 전역 FAB의 효용은 목록/탐색형 화면에서 가장 큼

### 3.4 신규 컴포넌트 배치
- **FAB (Floating Action Button)**: 우측 하단 고정, BottomNav 위 56px 이상 offset
- **Featured 섹션**: 홈 최상단, 가로 스크롤 카드
- **정기 카드**: 기존 DealCard와 시각적 구분(💎 배지 + 검증 배지)

---

## 4. 데이터 설계

### 4.1 정기 혜택 (Phase 1) — 15개

| # | id | 브랜드 | 카테고리 | 방식 |
|---|---|---|---|---|
| 1 | cgv-culture-day | CGV | movie | 고정 규칙 |
| 2 | megabox-culture-day | 메가박스 | movie | 고정 규칙 |
| 3 | lottecinema-culture-day | 롯데시네마 | movie | 고정 규칙 |
| 4 | baskin-31-day | 베스킨라빈스 | dessert | 고정 규칙 |
| 5 | emart-fresh-wed | 이마트 | mart | 고정 규칙 |
| 6 | traders-member-day | 트레이더스 | mart | 수동 윈도우 |
| 7 | oliveyoung-sale | 올리브영 | beauty | 수동 윈도우 |
| 8 | coupang-bigsmile | 쿠팡 | ecommerce | 수동 윈도우 |
| 9 | gmarket-bigsmile | G마켓 | ecommerce | 수동 윈도우 |
| 10 | 11st-monthly | 11번가 | ecommerce | 고정 규칙 |
| 11 | shinsegae-seasonal | 신세계백화점 | department | 수동 윈도우 |
| 12 | hyundai-seasonal | 현대백화점 | department | 수동 윈도우 |
| 13 | lotte-seasonal | 롯데백화점 | department | 수동 윈도우 |
| 14 | starbucks-frequency | 스타벅스 | cafe | 수동 윈도우 |
| 15 | tmem-movie-day | T멤버십 | telecom-perk | 고정 규칙 |

### 4.2 생일 혜택 (Phase 2) — 17개

| # | id | 브랜드 | 멤버십 |
|---|---|---|---|
| 1 | birthday-starbucks | 스타벅스 | 스타벅스 리워드 |
| 2 | birthday-baskin | 베스킨라빈스 | 해피포인트 |
| 3 | birthday-dunkin | 던킨 | 해피포인트 |
| 4 | birthday-paris | 파리바게뜨 | 해피포인트 |
| 5 | birthday-spc | SPC 통합 | 해피포인트 |
| 6 | birthday-twosome | 투썸플레이스 | 투썸하트 |
| 7 | birthday-hollys | 할리스 | 할리스 멤버십 |
| 8 | birthday-ediya | 이디야 | 이디야 멤버스 |
| 9 | birthday-oliveyoung | 올리브영 | CJ ONE |
| 10 | birthday-cu | CU | 포켓CU |
| 11 | birthday-gs25 | GS25 | 우리동네GS |
| 12 | birthday-kyobo | 교보문고 | 교보 멤버십 |
| 13 | birthday-yes24 | 예스24 | YES24 멤버십 |
| 14 | birthday-aladin | 알라딘 | 알라딘 멤버십 |
| 15 | birthday-cgv | CGV | CGV CLUB |
| 16 | birthday-megabox | 메가박스 | 메가박스 멤버십 |
| 17 | birthday-lottecinema | 롯데시네마 | 롯데시네마 멤버십 |

### 4.3 스키마 원칙
- 정기 혜택은 **고정 규칙형**과 **운영자가 직접 다음 일정 범위를 넣는 수동 윈도우형**으로 나눈다
- 생일 혜택은 단순 브랜드명만 저장하지 않고 **수령 조건과 검증 수준**을 함께 저장한다
- 사용자 화면에는 `검증됨`, `확인 필요`, `예상 일정`을 노출한다

### 4.4 JSON 스키마

**recurring-perks.json**
```typescript
type RecurringRule =
  | { type: "monthly_day"; day: number }
  | { type: "monthly_last_weekday"; weekday: 0|1|2|3|4|5|6 }
  | { type: "monthly_nth_weekday"; n: number; weekday: 0|1|2|3|4|5|6 }
  | { type: "weekly"; weekday: 0|1|2|3|4|5|6 };

type RecurringSchedule =
  | { mode: "rule"; rule: RecurringRule }
  | {
      mode: "manual_window";
      cadence: "monthly" | "quarterly" | "seasonal";
      nextKnownStart?: string;      // YYYY-MM-DD
      nextKnownEnd?: string;        // YYYY-MM-DD
      label: string;                // "7월 예정", "봄 정기세일"
      confidence: "confirmed" | "estimated";
    };

interface RecurringPerk {
  id: string;
  title: string;
  brand: string;
  category: string;
  schedule: RecurringSchedule;
  description: string;
  expectedDiscountText?: string;    // "약 7,000원", "무료 업그레이드"
  expectedSavingScore?: number;     // Featured 정렬용 내부 점수
  officialUrl: string;
  notes?: string;
  lastVerified: string;             // YYYY-MM-DD
  verificationLevel: "confirmed" | "estimated";
  integrationTargets: ("home" | "culture" | "convenience" | "oliveyoung")[];
}
```

**birthday-perks.json**
```typescript
interface BirthdayPerk {
  id: string;
  brand: string;
  membership: string;
  benefit: string;
  membershipUrl: string;
  category: "cafe" | "bakery" | "convenience" | "movie" | "beauty" | "book";
  eligibility?: string;            // "멤버십 가입자", "직전월 말일까지 가입" 등
  issueWindow?: string;            // "생일 당월", "생일 7일 전" 등
  requiresJoinBefore?: string;     // "전월 말", "생일 3일 전"
  claimMethod?: string;            // "앱 쿠폰함", "마이페이지", "현장 제시"
  notes?: string;
  lastVerified: string;
  verificationLevel: "confirmed" | "estimated";
}
```

### 4.5 데이터 입력 정책
- 이 데이터는 **자동 수집이 아니라 운영자가 관리하는 에디토리얼 데이터**다
- 세부 수치가 확정되지 않았을 때는 `expectedDiscountText`에 추정값을 쓰되, 사용자에게는 `확인 필요` 배지를 노출한다
- `lastVerified`가 90일을 초과하거나 `verificationLevel=estimated`인 항목은 **홈 Featured에서 완전 제외**한다 (해당 카테고리 페이지에서는 노출 가능, 단 `확인 필요` 배지 강제)
- 분기 1회 전체 재검증, 시즌형 항목은 시즌 시작 전 별도 점검
- 90일 이상 미검증 항목은 기존 `/admin` 화면에 경고로 노출하는 방향을 우선 검토한다

---

## 5. 화면 설계

### 5.1 홈 (`/`) — Featured 섹션 추가

```
┌─────────────────────────────────────┐
│ [헤더] 오늘혜택                      │
├─────────────────────────────────────┤
│ 💎 이번주 놓치지 마세요              │
│ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ CGV    │ │ 베라   │ │ 11번가 │   │
│ │ 컬처데이│ │ 31데이 │ │ 십일절 │   │
│ │ D-3    │ │ D-10   │ │ D-2    │   │
│ │ 검증됨 │ │ 검증됨 │ │ 확인필요│  │
│ └────────┘ └────────┘ └────────┘   │
│         ← 가로 스크롤 →             │
├─────────────────────────────────────┤
│ [기존 통신사 혜택 영역 그대로]       │
└─────────────────────────────────────┘
```

### 5.2 FAB → Birthday Drawer

```
┌─────────────────────────────────────┐
│ × 🎂 내 생일 혜택                    │
├─────────────────────────────────────┤
│ 생월 선택: [5월 ▼]                   │
│                                      │
│ 5월 생일 혜택 후보 17개              │
│ ☑ 스타벅스 — 음료 쿠폰              │
│   당월 지급 · 최근 검증 4/12         │
│ ☐ 올리브영 — 5,000원 쿠폰            │
│   CJ ONE 가입 필요 · [공식]          │
│ ☐ CGV — 영화 할인                    │
│   조건 확인 필요 · [공식]            │
│ ...                                  │
│                                      │
│ 진행: 1/17 (6%)                      │
└─────────────────────────────────────┘
```

### 5.3 카테고리 탭 통합 예시 (`/culture`)

```
┌─────────────────────────────────────┐
│ 문화 행사                            │
├─────────────────────────────────────┤
│ 🎬 정기 영화 할인                    │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ CGV 컬처데이 │ │ 메가박스    │    │
│ │ 매월 마지막  │ │ 컬처데이    │    │
│ │ 수요일 D-3   │ │ D-3         │    │
│ │ 검증됨       │ │ 검증됨      │    │
│ └─────────────┘ └─────────────┘    │
├─────────────────────────────────────┤
│ [기존 문화행사 목록]                  │
└─────────────────────────────────────┘
```

### 5.4 검증 상태 노출 규칙
- `검증됨`: 최근 90일 이내 운영 검증 완료
- `확인 필요`: 추정값이거나 검증 주기 초과
- `예상 일정`: 시즌형/수동 윈도우형으로 정확한 시작일 미확정

---

## 6. 핵심 로직

### 6.1 정기 혜택 계산 엔진
```typescript
// lib/recurring-rule.ts
function nextOccurrence(rule: RecurringRule, from: Date): Date | null;
function daysUntilNext(date: Date, today: Date): number;
function isWithinDays(date: Date, today: Date, days: number): boolean;
```

### 6.2 수동 윈도우형 계산 규칙
- `mode=manual_window` 항목은 규칙 엔진으로 날짜를 만들지 않는다
- `nextKnownStart`, `nextKnownEnd`, `label`, `confidence`를 그대로 사용한다
- `confidence=estimated`면 카드에 `예상 일정` 표시

### 6.3 Featured 선별 알고리즘
1. 모든 정기 혜택의 **다음 발생일 또는 수동 윈도우 시작일** 계산
2. 오늘부터 14일 이내 항목만 필터
3. `verificationLevel=estimated` 또는 `lastVerified` 90일 초과 항목 **완전 제외** (신뢰 우선)
4. `integrationTargets`에 `"home"` 포함 항목만 후보
5. 남은 항목을 **D-day 가까운 순**, 동률은 **expectedSavingScore** 우선
6. 상위 5개 노출

### 6.4 생일 체크리스트 표시 규칙
- 기본은 생월 기준 전체 후보 노출
- 단, 각 항목에 아래 상태를 분리 표시
  - `가입 필요`
  - `당월 지급`
  - `조건 확인 필요`
  - `검증됨/확인 필요`
- 사용자가 오해하지 않도록 CTA는 "혜택 받기"보다 **"공식 확인"** 중심으로 둔다

### 6.5 엣지 케이스
- 31일 없는 달(2월 등): 베라 31데이는 스킵
- 마지막 수요일이 공휴일: 그대로 표시하되 `공휴일 운영 여부 확인` 노트
- 수동 윈도우형인데 날짜 미입력: 홈 Featured 제외, 해당 카테고리 페이지에서만 "곧 시작 예정" 표기

### 6.6 integrationTargets 라우팅 규칙
- 한 항목이 여러 노출 위치를 가질 수 있음 (예: CGV 컬처데이 = `["home", "culture"]`)
- **홈 Featured**: `integrationTargets`에 `"home"` 포함된 항목만 (6.3 알고리즘 참조)
- **카테고리 페이지(`/culture`, `/convenience`, `/oliveyoung`, `/`)**: 해당 target 포함 항목만 필터
- 같은 항목이 홈과 카테고리 양쪽에 노출되어도 **중복 매핑이 의도된 동작**으로 간주 (홈은 시급도 중심, 카테고리는 컨텍스트 중심)
- `integrationTargets` 빈 배열은 데이터 검증 단계에서 차단

---

## 7. 운영 계획

### 7.1 운영 모델
- 이 기능은 **배치 크롤러 기반이 아닌 운영 검증형 데이터 관리 기능**
- 기존 `/admin`이 이미 있으므로, 장기적으로는 `/admin`에서 검증 누락 항목을 표시하고 수정하는 흐름을 우선 검토

### 7.2 데이터 갱신 주기
| 항목 | 주기 | 담당 |
|---|---|---|
| 정기 혜택 정책 (15개) | 분기 1회 | 운영자 수동 검증 |
| 생일 혜택 약관 (17개) | 분기 1회 | 운영자 수동 검증 |
| 시즌 행사 일정 | 시즌 시작 전 1회 | 운영자 수동 업데이트 |

### 7.3 인프라 영향
- 신규 외부 의존성 없음
- 데이터 크기: 약 10KB (recurring) + 8KB (birthday)
- 빌드 시간 영향은 미미
- 초기 운영비는 0원 수준으로 유지 가능

### 7.4 사용자 피드백 루프
- 각 카드 하단 `혜택이 변경/종료되었어요` 링크 제공
- 신고 누적 시 운영자가 보정
- 분기 검증 리마인드는 추후 GitHub Issue 자동 생성으로 확장 가능

---

## 8. 기술 영향도 분석

### 8.1 신규 파일
```
data/recurring-perks.json
data/birthday-perks.json
lib/recurring-rule.ts
components/UpcomingPerks.tsx
components/RecurringPerkCard.tsx
components/BirthdayFab.tsx
components/BirthdayDrawer.tsx
types/perks.ts
```

### 8.2 수정 파일
```
app/layout.tsx                    — BirthdayFab 조건부 전역 배치
app/HomeClient.tsx                — UpcomingPerks 삽입 + 이벤트 계측
app/culture/CultureClient.tsx     — 정기 영화 할인 섹션
app/convenience/ConvenienceClient.tsx — 마트 정기 행사 / 31데이 배너
app/oliveyoung/OliveYoungClient.tsx   — 올영 세일 카드
```

### 8.3 기존 기능 영향
- 기존 5탭 구조 유지
- 기존 deal 데이터, 크롤러, JSON 스키마와는 분리된 신규 데이터 파일로 관리
- 기존 ISR 캐싱 정책 영향 없음
- LocalStorage 키 추가 (기존 `hooks/useLocalStorage.ts` 훅 재사용):
  - `birthday-month` (number, 1~12)
  - `birthday-checked` (Record<perkId, boolean>)

### 8.4 분석/계측 영향
- 기존 `trackEvent()` 유틸 활용
- 신규 이벤트 추가 필요:
  - `featured_click`
  - `birthday_fab_open`
  - `birthday_month_select`
  - `birthday_check_toggle`
  - `birthday_official_click`
  - `perk_report_click`

### 8.5 FAB 전역 배치 구현 방식
- `app/layout.tsx`에 클라이언트 컴포넌트 `<BirthdayFab />` 삽입
- 컴포넌트 내부에서 `usePathname()` 으로 라우트 검사 → 비노출 라우트(`/admin*`, `/deals/*`) 진입 시 `null` 반환
- 하이드레이션 깜빡임 방지: 초기 렌더는 비노출 처리 후 클라이언트 마운트 후 표시

### 8.6 SEO/PWA 영향
- 신규 페이지 없음 → sitemap 변경 없음
- 홈 상단 Featured 섹션은 키워드 강화에 보조 효과 가능
- PWA 매니페스트 변경 없음

---

## 9. 리스크 및 대응

| 리스크 | 가능성 | 영향도 | 대응 |
|---|---|---|---|
| 정기 혜택 정책 변경(시간/요일/금액) | 중 | 중 | `lastVerified` 표시 + 신고 링크 + 분기 검증 |
| 생일 혜택 조건 미충족 사용자가 오해 | 중 | 높음 | `eligibility`, `issueWindow`, `조건 확인 필요` 표기 |
| 시즌형 혜택 일정을 규칙형으로 오인 | 중 | 중 | `manual_window` 분리 + `예상 일정` 라벨 |
| 31일 없는 달의 베라 31데이 처리 누락 | 중 | 저 | rule 엔진 단위 테스트 |
| FAB이 모바일 BottomNav와 충돌 | 중 | 저 | offset 조정 + 특정 라우트 비노출 |
| Featured 섹션이 기존 콘텐츠 영역 잠식 | 저 | 중 | 1스크린 내 높이 제한 + 필요 시 접기 토글 검토 |
| 생월 저장에 대한 개인정보 우려 | 저 | 저 | LocalStorage 전용, 서버 미전송 문구 명시 |

---

## 10. 일정 (예상 공수)

| 단계 | 작업 | 기간 |
|---|---|---|
| 1 | 데이터 JSON 작성 + 검증 상태 정의 | 1.5일 |
| 2 | Rule 엔진 + 단위 테스트 | 1일 |
| 3 | 컴포넌트 구현 (UpcomingPerks / Card / FAB / Drawer) | 1.5일 |
| 4 | 기존 페이지 통합 + 라우트 노출 제어 | 1일 |
| 5 | 이벤트 계측 + UX 폴리싱 + 모바일 테스트 + 빌드 검증 | 1~2일 |
| **합계** | | **6~7일** |

---

## 11. 성공 지표

### 11.1 정량 지표
- Featured 섹션 카드 클릭률(CTR) 15% 이상
- BirthdayFab 클릭률 5% 이상
- Drawer 진입 후 생월 입력률 70% 이상
- `birthday_official_click / birthday_fab_open` 비율 30% 이상
- 분기별 데이터 검증 누락 항목 0건

### 11.2 정성 지표
- `혜택 종료/변경` 신고 분기 5건 이하
- 사용자 제보로 신규 정기 혜택 추가
- "조건을 몰라서 못 썼다" 유형의 불만 감소

### 11.3 측정 이벤트 정의
| 이벤트 | 의미 |
|---|---|
| `featured_click` | 홈 상단 정기 혜택 카드 클릭 |
| `birthday_fab_open` | FAB 클릭 후 Drawer 오픈 |
| `birthday_month_select` | 생월 선택 완료 |
| `birthday_check_toggle` | 혜택 체크/해제 |
| `birthday_official_click` | 공식 페이지 클릭 |
| `perk_report_click` | 변경/종료 신고 링크 클릭 |

---

## 12. 향후 확장 (기획 외)

- **Phase 3 (보류)**: 매월 변동 혜택까지 확장
- **PWA 푸시 알림**: 정기 혜택 전날 알림
- **카카오톡 공유 카드**: "이번달 챙길 혜택 N개" 공유
- **개인화 확장**: 통신사/거주지/관심 카테고리 기반 맞춤 Featured
- **어드민 확장**: 검증 만료 항목 배지, 검증일 일괄 수정, 시즌 일정 입력 폼

---

## 13. 결정 필요 항목 (Open Questions)

1. **expectedDiscount 표시 방식**
   - (A) 추정 수치 노출 + `확인 필요` 라벨
   - (B) 수치 없으면 미노출
   - **권장: B**  
   초기엔 과도한 수치 표현보다 신뢰를 우선

2. **생일 혜택 노출 방식**
   - (A) 전체 후보 17개 노출 + 상태 배지
   - (B) 검증 완료 항목만 우선 노출
   - **권장: A**  
   대신 각 항목에 조건/검증 상태를 강하게 표시

3. **FAB 진입점**
   - (A) 소비자 라우트 전역 FAB
   - (B) 홈 내 버튼만
   - **권장: A**  
   단, `/admin`, `/deals/[id]`는 제외

4. **분기 검증 리마인드 자동화**
   - (A) GitHub Issue 자동 생성
   - (B) 운영자 수동 캘린더 관리
   - **권장: A**  
   사람 기억에 덜 의존하는 쪽이 안정적

5. **`verificationLevel=estimated` Featured 처리** *(v1.2 확정)*
   - **결정: 완전 제외**  
   신뢰 우선. 추정값은 카테고리 페이지에서만 `확인 필요` 배지와 함께 노출

6. **`integrationTargets` 다중 매핑 시 중복 노출** *(v1.2 확정)*
   - **결정: 의도된 중복 허용**  
   홈은 시급도 중심, 카테고리는 컨텍스트 중심으로 역할 분리

---

## 14. 변경 이력

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.0 | 2026-04-21 | 최초 작성 |
| v1.1 | 2026-04-21 | 제품 원칙 추가, schedule 이원화(rule/manual_window), verificationLevel 도입, 생일 필드 확장, FAB 노출 범위 명시, 분석 이벤트 정의, Open Question 권장안 |
| v1.2 | 2026-04-21 | estimated 항목 Featured 완전 제외 확정, integrationTargets 라우팅 규칙(6.6) 추가, FAB 구현 방식(8.5) 명시, useLocalStorage 훅 재사용 명시 |

---

## 15. 리뷰 메모 (검토용)

아래 항목은 문서 내용 자체는 정리되었으나, 실제 구현/운영 기준으로 추가 판단이 필요한 포인트다.

### 15.1 `/admin` 재사용 범위 표현 보정
- 현재 문서에는 `/admin`을 검증 누락 관리까지 자연스럽게 확장하는 흐름으로 서술되어 있음
- 다만 현재 구현된 `/admin`은 **쿠팡 매핑 관리 전용 성격이 강함**
- 따라서 아래 표현 중 하나로 정리하는 것이 더 정확함
  - `기존 /admin 확장 검토`
  - `검증 경고 UI는 어드민 확장 범위로 별도 구현`

**검토 체크**
- [ ] `/admin`을 그대로 확장할지
- [ ] 정기 혜택 검증 관리는 별도 어드민 화면/탭으로 분리할지

### 15.2 Featured 0건일 때 처리 규칙 필요
- 현재 규칙상 `verificationLevel=estimated` 또는 `lastVerified` 90일 초과 항목은 홈 Featured에서 완전 제외됨
- 이 경우 비수기에는 홈 상단 Featured가 **0건이 될 가능성**이 있음

**권장 선택지**
- (A) 0건이면 섹션 자체 숨김
- (B) `예상 일정` 항목 1건만 예외적으로 노출
- (C) 최근 검증 완료 항목 중 가장 가까운 다음 일정 1건 노출

**검토 체크**
- [ ] 0건일 때 홈에서 섹션을 숨길지
- [ ] 예외 노출 규칙을 둘지

### 15.3 `birthday-checked` 연도별 초기화 정책 필요
- 현재 문서 기준으로는 사용자가 한 번 체크한 항목이 다음 해 생일 시즌에도 그대로 체크된 상태로 남을 수 있음
- 생일 혜택은 **연 단위 반복 데이터**이므로 체크 상태도 주기 리셋 정책이 있어야 함

**권장 방식**
- `birthday-checked:2026`처럼 연도 포함 키 사용
- 또는 선택 생월 기준으로 새 사이클 시작 시 자동 초기화

**검토 체크**
- [ ] 연도별 LocalStorage 키 분리 적용
- [ ] 또는 생월 기준 자동 리셋 규칙 적용

### 15.4 구현 전 최종 판단 우선순위
1. Featured 0건 처리 규칙 확정
2. `birthday-checked` 초기화 정책 확정
3. `/admin` 확장 범위 확정

### 15.5 v1.3 확정 사항

**(1) Featured 0건 처리 — 단계적 fallback**
```
1단계: 14일 이내 confirmed 항목 상위 5개
2단계: 0건이면 윈도우 30일로 확장 + 섹션 제목 "다가오는 정기 혜택" (1건)
3단계: 30일 이내도 0건이면 섹션 숨김
```

**(2) `birthday-checked` 초기화 — 연도 포함 키**
- 키: `birthday-checked:${YYYY}` (연도별 자동 분리)
- `birthday-month` 는 단일 키 유지 (생월은 고정 정보)
- 과거 연도 데이터 보존 → "작년엔 N개 챙겼다" 동기부여 요소

**(3) `/admin` 확장 범위 — Phase 1.5로 분리**
- 본 구현(Phase 1+2)은 JSON 직접 편집 + git 커밋으로 검증/갱신
- 정기 혜택 관리 UI는 1분기 운영 후 Phase 1.5에서 `/admin` 내 Tab으로 추가
- 이유: 본 기획 범위 유지, 쿠팡 매핑 UI 회귀 위험 0, 운영 경험 후 설계 정교화

---

## 16. 변경 이력 (섹션 14와 통합)

v1.3: 섹션 15 리뷰 메모 3건 확정 (Featured fallback / birthday-checked 연도 키 / admin Phase 1.5 분리)

---

**문서 끝**
