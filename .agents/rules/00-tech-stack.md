---
description: '기술 스택 및 소스 코드 구조 정의'
globs: '*'
alwaysApply: true
---

# 🏗️ 소스 코드 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (mdd)/                    # MDD 분석 메인 기능 레이아웃 그룹
│   │   ├── _components/          # 메인 기능 전용 컴포넌트
│   │   ├── _hooks/               # 기능 전용 커스텀 훅
│   │   └── _lib/                 # 스키마(Zod), 쿼리 옵션 등
│   ├── api/                      # 외부 금융 데이터 정제 및 호출 API
│   ├── globals.css               # Material 3 컬러 토큰 및 Tailwind CSS v4 스타일
│   └── layout.tsx                # 루트 레이아웃
├── components/                   # 재사용 가능한 UI 컴포넌트
│   ├── ui/                       # shadcn/ui 기반 Material 3 UI 요소
│   ├── table/                    # TanStack Table 기반 금융 데이터 특화 테이블
│   └── shared/                   # 공통 레이아웃 요소
├── lib/                          # 공용 유틸리티 및 로직
│   ├── finance/                  # 핵심 MDD 및 금융 수학 로직 (Core)
│   ├── http/                     # API 클라이언트 및 통신 설정
│   └── utils.ts                  # Tailwind Merge, clsx 등 공통 유틸리티
├── server/                       # 서버 사이드 전용 코드
│   └── services/                 # 비즈니스 로직 서비스 계층 (API 핸들러 호출용)
└── hooks/                        # 공용 React 훅 (useIsMounted 등)
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
