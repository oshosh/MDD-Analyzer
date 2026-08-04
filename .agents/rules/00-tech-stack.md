---
description: '기술 스택 및 소스 코드 구조 정의'
globs: '*'
alwaysApply: true
---

# 🏗️ 소스 코드 구조 (Feature-Sliced Design)

```
src/
├── app/                          # App Layer: Next.js App Router (페이지 라우팅 및 API 라우트)
│   ├── (mdd)/                    # 메인 페이지 라우트 그룹
│   ├── api/                      # 외부 금융 데이터 API 라우트
│   ├── globals.css               # Material 3 컬러 토큰 및 Tailwind v4
│   └── layout.tsx                # 루트 레이아웃
├── widgets/                      # Widget Layer: 복수 Feature/Entity 조합 UI
│   └── mdd-dashboard/            # MDD 대시보드 메인 조립 컴포넌트 (MddContents, MddContentDisplay)
├── features/                     # Feature Layer: 독립적 사용자 기능 모듈
│   ├── mdd-analysis/             # MDD 분석 기능 (ui, model, api)
│   ├── ai-cycle-analysis/        # AI 낙폭 주기 분석 기능 (ui, model, lib)
│   └── kr-stock-trend/           # 한국 주식 실시간 수급 분석 기능 (ui, model)
├── entities/                     # Entity Layer: 비즈니스 도메인 모델
│   ├── instrument/               # 금융 자산 / 인터벌 / 시세 데이터 모델
│   ├── mdd/                      # MDD 연산, 회복력, 구매신호 데이터 모델
│   └── kr-stock/                 # 한국 주식 수급 데이터 모델
├── shared/                       # Shared Layer: 공용 인프라 및 UI 자산
│   ├── ui/                       # shadcn/ui 기반 Material 3 UI 컴포넌트
│   ├── lib/                      # 공용 유틸리티 및 금융 수학 계산 로직
│   ├── hooks/                    # 공용 커스텀 훅
│   ├── table/                    # TanStack Table 공용 대용량 테이블
│   └── providers/                # 글로벌 상태 및 프로바이더 합성
└── server/                       # Server Service Layer (Next.js 전용 백엔드 비즈니스 로직)
```

# ⚙️ 기술 스택 (Technology Stack)

### Core Framework

- **Next.js 15.1.6 (App Router)**: 최신 서버 컴포넌트 아키텍처 및 Turbopack 활용
- **React 19.0.0**: 최신 리액트 기능 반영
- **TypeScript 5.7.3**: 런타임 안정성을 위한 엄격한 타입 시스템

### 상태 관리 및 데이터 페칭

- **TanStack Query 5.66.9**: 서버 상태 관리 및 API 캐싱
- **Jotai 2.11.1**: 원자(Atom) 단위의 가벼운 클라이언트 상태 관리
- **Zod 3.24.2**: 데이터 검증 및 런타임 타입 체크

### UI 및 디자인

- **Tailwind CSS 4.2.1**: 유틸리티 우선의 현대적인 스타일링 및 `globals.css` 기반 토큰 관리
- **Material 3 Design**: 구글의 최신 디자인 시스템 가이드 준수
- **Lucide React 0.575.0**: 일관된 시스템 아이콘
