# 어드민 페이지 사용 가이드

## 접속

```
https://<your-domain>/admin
```

최초 접속 시 `/admin/login`으로 리다이렉트 → 비밀번호 입력 → 8시간 세션 유지.

## 필수 환경변수 (Vercel)

| 변수 | 값 | 설명 |
|------|-----|------|
| `ADMIN_PASSWORD` | 직접 설정 | 로그인 비밀번호 (16자 이상 권장) |
| `GITHUB_TOKEN` | Fine-grained PAT | `today-deals` 레포 Contents 쓰기 권한 |
| `GITHUB_REPO` | `사용자명/today-deals` | 커밋 대상 레포 |
| `GITHUB_BRANCH` | `main` (선택, 기본값 main) | 커밋 브랜치 |
| `SESSION_SECRET` | 랜덤 문자열 (선택) | 세션 JWT 서명용. 미설정 시 `ADMIN_PASSWORD` 사용 |

`SESSION_SECRET`을 별도 지정하려면:
```
openssl rand -base64 32
```
로 생성한 값 사용.

## 신규 매핑 추가 (30초)

1. **혜택 선택** — 검색창에서 상품명 입력 → 리스트에서 클릭
2. **파트너스 링크** — 쿠팡파트너스에서 발급한 `https://link.coupang.com/a/XXXXX` 붙여넣기
3. **쿠팡 HTML 붙여넣기** (추천)
   - 쿠팡 상품 페이지 열기 → `Ctrl+U` → `Ctrl+A` → `Ctrl+C`
   - 어드민의 HTML textarea에 `Ctrl+V`
   - **🚀 자동 추출** 버튼 클릭 → 이미지/이름/가격/로켓배송 자동 입력
4. **검증 부족 시 수동 보완** — 추출 실패한 필드만 직접 입력
5. **이미지 업로드** (옵션) — URL 대신 파일 첨부 시 레포 `public/coupang/<dealId>.jpg`로 커밋됨
6. **미리보기 확인** → **💾 저장 & 배포** 클릭

저장 직후 GitHub에 커밋 → Vercel 자동 재배포 (~30초 후 반영).

## 수정 / 삭제

- 리스트에서 ✓ 표시된 항목은 이미 매핑됨 → 클릭 시 **수정 모드**
- 기존 매핑 섹션의 `수정` / `삭제` 버튼으로 빠르게 관리

## 로그아웃

상단 우측 "로그아웃" → 세션 쿠키 삭제.

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| 로그인 직후 다시 로그인 화면 | `SESSION_SECRET` 또는 `ADMIN_PASSWORD` 미설정 → Vercel 환경변수 확인 |
| "파트너스 짧은 링크 형식이어야 합니다" | `link.coupang.com/a/...` 형식만 허용 (일반 쿠팡 URL 금지 — 수수료 정산 안 됨) |
| HTML 자동 추출 실패 | 쿠팡이 HTML 구조 변경 → 수동 입력으로 대체 + `lib/coupang-parser.ts` 셀렉터 갱신 필요 |
| 저장 시 "GITHUB_TOKEN 필요" | Vercel 환경변수 미등록 또는 만료 → 재발급 후 재배포 |
| 이미지 업로드 후 깨짐 | 레포에 커밋 직후엔 캐시 때문에 잠시 404 가능. 배포 완료 후 새로고침 |

## 보안 주의

- **절대 `GITHUB_TOKEN`을 코드에 직접 넣지 말 것** (환경변수만 사용)
- 토큰 유출 의심 시 GitHub Settings → Developer settings → 해당 토큰 **Revoke** 후 재발급
- `/admin`, `/api/admin/*`은 robots.txt에서 차단되지만 검색 엔진 의존 금지 — 비밀번호가 최우선 방어선
