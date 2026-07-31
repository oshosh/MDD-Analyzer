# 🏗️ MDD Analyzer — 시스템 아키텍처 문서

> 본 문서는 MDD Analyzer 프로젝트의 전체 시스템 구조, 데이터 흐름, 보안 설계, 그리고 폴더 아키텍처를 기술합니다.

---

## 📐 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 브라우저                                 │
│                                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ControlPanel │  │  SummaryTable │  │ BuySignal    │  │ InvestorTrend│   │
│  │ (검색/입력)  │  │  (MDD 요약)   │  │ (매수 시그널)│  │ (수급 패널)  │   │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                   │                  │           │
│         └─────────────────┴───────────────────┴──────────────────┘           │
│                                    │                                        │
│                    browserApiClient (Axios)                                  │
│                    ┌──────────────────────────┐                              │
│                    │ HMAC-SHA256 서명 자동 첨부│                              │
│                    │ x-mdd-signature           │                              │
│                    │ x-mdd-timestamp           │                              │
│                    └─────────────┬────────────┘                              │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │ HTTPS (서명 헤더 포함)
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Vercel Edge / Next.js 15 서버                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    middleware.ts (API 게이트웨이)                       │  │
│  │                                                                        │  │
│  │  Layer 1: Sec-Fetch-Site 검증                                          │  │
│  │    ├── "none" (주소창 직접 입력)        → 403 Forbidden (빈 응답)       │  │
│  │    └── "cross-site" (외부 사이트 호출)  → 403 Forbidden (빈 응답)       │  │
│  │                                                                        │  │
│  │  Layer 2: HMAC-SHA256 서명 검증                                        │  │
│  │    ├── 서명 헤더 누락                  → 403 Forbidden (빈 응답)        │  │
│  │    ├── 타임스탬프 30초 초과 (리플레이)  → 403 Forbidden (빈 응답)       │  │
│  │    └── 서명 불일치                     → 403 Forbidden (빈 응답)        │  │
│  │                                                                        │  │
│  │  ✅ 통과 → Route Handler로 전달                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        API Route Handlers                              │  │
│  │                                                                        │  │
│  │  /api/raw        → Zod 검증 → rawBuilder.ts    → serverCache.ts       │  │
│  │  /api/search     → Zod 검증 → marketData.ts    → Yahoo/Wiki API       │  │
│  │  /api/prices     → Zod 검증 → marketData.ts    → Yahoo/Proxy API      │  │
│  │  /api/fx         → Zod 검증 → marketData.ts    → Yahoo/Proxy API      │  │
│  │  /api/listing    → Zod 검증 → marketData.ts    → Yahoo/Proxy API      │  │
│  │  /api/kr-stock   → Zod 검증 → krStockService   → 네이버 금융 API      │  │
│  │  /api/kr-stock/price → Zod  → serverApiClient  → 네이버 모바일 API    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        Server Services Layer                           │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌───────────────────────────┐   │  │
│  │  │ marketData   │  │ rawBuilder    │  │ krStockService            │   │  │
│  │  │ (Yahoo/Proxy)│  │ (MDD 연산)    │  │ (네이버 수급)             │   │  │
│  │  └──────┬───────┘  └──────┬────────┘  └──────┬────────────────────┘   │  │
│  │         │                 │                   │                        │  │
│  │  ┌──────▼─────────────────▼───────────────────▼────────────────────┐  │  │
│  │  │                    serverCache.ts                                │  │  │
│  │  │   Memory Cache ←→ File Cache (.cache/) ←→ Upstash Redis (옵션) │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           외부 데이터 소스                                    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Yahoo Finance│  │ 네이버 금융   │  │ Wikipedia    │  │ Investing Proxy  │ │
│  │ (글로벌 시세)│  │ (한국 수급)   │  │ (한→영 번역) │  │ (보조 데이터)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ API 보안 아키텍처

### HMAC-SHA256 요청 서명 흐름

```
 클라이언트 (browserApiClient)                     서버 (middleware.ts)
 ─────────────────────────────                     ──────────────────────

 1. timestamp = Date.now()
 2. message = `${timestamp}:${pathname}`
 3. signature = HMAC-SHA256(message, SECRET_KEY)    
 4. 헤더 첨부:                                      
    x-mdd-timestamp: 1722412345678                 
    x-mdd-signature: a3f8c2...                      
                          │                          
                          │  HTTPS 요청              
                          ▼                          
                                                    5. 헤더에서 timestamp, signature 추출
                                                    6. age = |now - timestamp|
                                                    7. age > 30초? → 403 (리플레이 차단)
                                                    8. expected = HMAC-SHA256(message, SECRET_KEY)
                                                    9. expected !== signature? → 403
                                                   10. ✅ 통과 → Route Handler 실행
```

### 차단 시나리오별 결과

| 시나리오 | 차단 레이어 | 응답 |
|---|---|---|
| 브라우저 주소창에 `/api/kr-stock?code=005930` 직접 입력 | Layer 1 (Sec-Fetch-Site = "none") | `403` 빈 응답 |
| 외부 사이트에서 `<script>fetch(...)</script>` 호출 | Layer 1 (Sec-Fetch-Site = "cross-site") | `403` 빈 응답 |
| Postman / curl 등 개발 도구로 서명 없이 호출 | Layer 2 (서명 누락) | `403` 빈 응답 |
| 과거 서명 값을 복사하여 재사용 (리플레이 공격) | Layer 2 (타임스탬프 30초 초과) | `403` 빈 응답 |
| 서명 키를 모르는 상태에서 서명 위조 시도 | Layer 2 (서명 불일치) | `403` 빈 응답 |
| ✅ 내부 대시보드에서 `browserApiClient`로 호출 | 통과 | `200` 정상 JSON |

---

## 🌐 한글 검색 다국어 파이프라인

```
  사용자 입력: "삼성전자"
          │
          ▼
  ┌─────────────────────────────────┐
  │  한글 감지 (정규식 판별)         │
  │  /[\uAC00-\uD7A3\u3131-\u318E]/ │
  └──────────────┬──────────────────┘
                 │ 한글 확인됨
                 ▼
  ┌──────────────────────────────────────┐
  │  Step 1: Wikipedia ko opensearch     │
  │  "삼성전자" → ["삼성전자", ...]       │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────┐
  │  Step 2: Wikipedia langlinks (en)    │
  │  "삼성전자" → "Samsung Electronics"  │
  │                                      │
  │  [Fallback] wikitext 파싱            │
  │  |원어 = / {{lang|en|...}}           │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────┐
  │  Step 3: Yahoo Finance Search       │
  │  "Samsung Electronics" → [005930.KS]│
  │                                      │
  │  중복 제거(Deduplication) 후 반환    │
  └──────────────────────────────────────┘
```

---

## 🇰🇷 한국 주식 수급 분석 데이터 흐름

```
  종목코드: 005930 (삼성전자)
          │
          ├──────────────────────┐
          ▼                      ▼
  ┌────────────────┐    ┌─────────────────────────┐
  │ 트랙 A: 장중   │    │ 트랙 B: 5영업일 확정     │
  │ 외국계 가집계   │    │ 외인/기관/개인 수급       │
  │                │    │                           │
  │ 네이버 PC 페이지│    │ 네이버 모바일 API         │
  │ (EUC-KR HTML)  │    │ /api/stock/{code}/        │
  │                │    │ integration               │
  │ 외국계추정합    │    │                           │
  │ 매도총합: A주   │    │ dealTrendInfos[]          │
  │ 매수총합: B주   │    │ foreignerPureBuyQuant     │
  │                │    │ organPureBuyQuant          │
  │ 순매수 = B - A │    │ individualPureBuyQuant    │
  └───────┬────────┘    └────────────┬──────────────┘
          │                          │
          └──────────┬───────────────┘
                     ▼
          ┌──────────────────────────┐
          │  KrStockIntegrationData  │
          │                          │
          │  실시간 시세              │
          │  + 장중 외국계 추정치     │
          │  + 5영업일 확정 수급      │
          │  + 52주 시세 범위         │
          └──────────────────────────┘
```

---

## 📁 프로젝트 폴더 아키텍처 (승격 구조)

```
src/
├── app/
│   ├── (mdd)/                          # MDD 도메인 그룹
│   │   ├── page.tsx                    # RSC: prefetchQuery + HydrationBoundary
│   │   ├── error.tsx                   # 에러 바운더리 (shadcn Card UI)
│   │   ├── _components/               # 도메인 전용 컴포넌트 (로컬)
│   │   │   ├── ControlPanel.tsx        # 검색/입력 폼
│   │   │   ├── MddContentDisplay.tsx   # 탭 오케스트레이터
│   │   │   ├── SummaryTable.tsx        # MDD 요약 비교 테이블
│   │   │   ├── BuySignalPanel.tsx      # 통계적 매수 시그널
│   │   │   ├── ChartsPanel.tsx         # 차트 시각화
│   │   │   ├── RawTable.tsx            # RAW 데이터 검증
│   │   │   ├── RecoveryTable.tsx       # 회복 탄력성
│   │   │   └── stock/                  # 한국 주식 전용 서브 컴포넌트
│   │   │       ├── InvestorTrendTab.tsx # 수급 분석 메인 탭 (React Query)
│   │   │       ├── InvestorBarRow.tsx   # 수급 바 차트 행 (분리)
│   │   │       └── RealtimePriceHeader.tsx # 시세 헤더 (React Query)
│   │   ├── _hooks/                     # 도메인 전용 훅 (로컬)
│   │   │   ├── useMddQuery.ts          # MDD 데이터 쿼리 훅
│   │   │   └── useSymbolDates.ts       # 상장일 조회 (useMutation)
│   │   └── _lib/                       # 도메인 전용 유틸 (로컬)
│   │       ├── queryOptions.ts         # TanStack Query queryOptions 정의
│   │       └── schemas.ts             # 도메인 전용 Zod 스키마
│   │
│   ├── api/                            # API Route Handlers
│   │   ├── raw/route.ts               # MDD 원시 데이터 (serverCache 활용)
│   │   ├── search/route.ts            # 종목 검색 (한글 지원)
│   │   ├── prices/route.ts            # 시세 조회
│   │   ├── fx/route.ts                # 환율 조회
│   │   ├── listing/route.ts           # 상장 정보
│   │   ├── kr-stock/route.ts          # 한국 주식 수급 통합
│   │   └── kr-stock/price/route.ts    # 한국 주식 실시간 시세
│   │
│   ├── error.tsx                       # 글로벌 에러 바운더리
│   ├── not-found.tsx                   # 글로벌 404 페이지
│   └── layout.tsx                      # 루트 레이아웃
│
├── components/                         # 전역 공유 컴포넌트 (승격 완료)
│   ├── ui/                            # shadcn UI 기본 컴포넌트
│   │   ├── text.tsx                   # Typography 공통 컴포넌트 (cva)
│   │   ├── card.tsx, button.tsx ...   # shadcn 표준 컴포넌트
│   │   └── ...
│   ├── provider/
│   │   └── AppProviders.tsx           # QueryClient + Jotai 중앙 Provider
│   └── shared/
│       └── ClientOnly.tsx             # SSR 하이드레이션 방어 래퍼
│
├── lib/                                # 전역 공유 유틸리티
│   ├── http/
│   │   ├── axios.ts                   # browserApiClient (HMAC 서명 자동 첨부)
│   │   └── error.ts                   # HttpApiError 클래스
│   ├── finance/
│   │   └── calc.ts                    # MDD/Peak/Drawdown 금융 수학 연산
│   ├── security.ts                    # HMAC-SHA256 서명 생성/검증 유틸
│   ├── types.ts                       # 전역 공유 타입 정의
│   ├── utils.ts                       # cn() (clsx + twMerge)
│   ├── date.ts                        # 날짜 유틸
│   └── format.ts                      # 숫자/퍼센트 포맷팅
│
├── server/                             # 서버 전용 서비스 계층
│   └── services/
│       ├── marketData.ts              # Yahoo/Proxy/Wikipedia 통합 데이터 수집
│       ├── rawBuilder.ts              # MDD 분석 결과 빌더
│       ├── krStockService.ts          # 한국 주식 수급 수집 서비스
│       ├── serverCache.ts             # 3-tier 캐시 (Memory → File → Upstash)
│       └── requestSchema.ts           # 전체 API Zod 스키마 정의
│
├── middleware.ts                        # API 게이트웨이 (HMAC + Sec-Fetch 검증)
│
└── tests/
    ├── calc.test.ts                    # 금융 수학 단위 테스트
    ├── krStockService.test.ts          # 수급 서비스 통합 테스트
    └── krx-scratch.test.ts            # HTML 파싱 검증 테스트
```

### 승격 원칙 (Promotion Rule)

```
  로컬 (도메인 전용)                    전역 (공유)
  ─────────────────                    ───────────
  src/app/(mdd)/_components/    →→→    src/components/
  src/app/(mdd)/_hooks/         →→→    src/hooks/
  src/app/(mdd)/_lib/           →→→    src/lib/

  ※ 최초 로컬에 작성 → 2개 이상 도메인에서 사용 확정 시에만 승격
```

---

## 🔄 데이터 캐싱 전략 (3-tier Cache)

```
  요청 수신
     │
     ▼
  ┌──────────────────┐     HIT
  │  1. Memory Cache │ ──────────→ 즉시 반환 (0.001ms)
  │  (Map + TTL)     │
  └────────┬─────────┘
           │ MISS
           ▼
  ┌──────────────────┐     HIT
  │  2. File Cache   │ ──────────→ Memory에 적재 후 반환
  │  (.cache/*.json) │
  └────────┬─────────┘
           │ MISS
           ▼
  ┌──────────────────┐     HIT
  │  3. Upstash Redis│ ──────────→ Memory + File에 적재 후 반환
  │  (원격 KV, 옵션) │
  └────────┬─────────┘
           │ MISS
           ▼
  ┌──────────────────┐
  │  외부 API 호출   │ ──────────→ 3-tier 모두에 저장 후 반환
  │  (Yahoo/네이버)  │
  └──────────────────┘
```

---

## 🧪 테스트 전략

| 영역 | 도구 | 대상 |
|---|---|---|
| 금융 수학 단위 테스트 | Vitest | `calc.ts` (MDD, Peak, Drawdown, Recovery 연산) |
| 한국 주식 통합 테스트 | Vitest | `krStockService.ts` (수급 파싱 + 수학 무결성) |
| HTML 파싱 검증 | Vitest | `krx-scratch.test.ts` (외국계추정합 매수/매도 연산) |
| 정적 타입 검사 | TypeScript (strict) | 전체 소스코드 `tsc --noEmit` |

```bash
pnpm typecheck    # TypeScript 정적 타입 검사
pnpm test         # Vitest 단위/통합 테스트
```
