---
trigger: glob
description: 'FSD (Feature-Sliced Design) 아키텍처 및 레이어 의존성 규칙'
globs: 'src/**/*, package.json, next.config.*, tsconfig.json'
---

# 🏛️ Feature-Sliced Design (FSD) 레이어 구조

본 프로젝트는 정통 **Feature-Sliced Design (FSD)** 아키텍처를 준수합니다.

### 1. Layers (수직 레이어 - 아래에서 위로만 참조 가능)

- `shared/` (`@shared/*`): 전역 공용 UI(shadcn), 유틸리티, 훅, 테이블, 프로바이더
- `entities/` (`@entities/*`): 비즈니스 도메인 엔티티 모델 (`instrument/`, `mdd/`, `kr-stock/`)
- `features/` (`@features/*`): 사용자 기능 모듈 (`mdd-analysis/`, `ai-cycle-analysis/`, `kr-stock-trend/`)
- `widgets/` (`@widgets/*`): 복수 Feature/Entity를 조합한 대형 UI 블록 (`mdd-dashboard/`)
- `app/`: Next.js App Router (라우팅, RSC 엔트리, API 라우트)
- `server/`: Next.js 전용 백엔드 비즈니스 로직 (FSD 계층 외부)

### 2. Slices (수평 분할)

- 각 Layer 안에는 도메인/기능 단위로 Slice를 나눕니다.
- **동일 Layer 내 Slice 간 교차 참조는 엄격히 금지됩니다.** (예: `features/kr-stock-trend`가 `features/mdd-analysis`를 direct import 금지)

### 3. Segments (Slice 내부 역할 분할)

각 Slice 내부는 역할에 따라 Segment 폴더로 구성합니다:
- `ui/`: 시각적 컴포넌트
- `model/`: 상태, 훅, 쿼리 옵션, Zod 스키마, Server Actions
- `api/`: 클라이언트 API 페칭 함수
- `lib/`: 순수 유틸리티 / 계산 로직

### 4. Barrel Exports (Public API)

- 모든 Slice/Layer는 `index.ts`를 통해 외부로 공개할 요소만 캡슐화하여 Export합니다.

# 🔒 의존성 방향 규칙

```
app/ ➔ widgets/ ➔ features/ ➔ entities/ ➔ shared/
```
- 상위 Layer는 하위 Layer만 참조할 수 있습니다.
- 역참조(하위 → 상위) 및 동일 Layer 간 참조는 금지됩니다.