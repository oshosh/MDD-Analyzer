---
name: frontend-state-management
description: 'Jotai 및 React Query 상태 관리 패턴 적용 (FSD 아키텍처 준수)'
---

# 상태 관리 패턴 보일러플레이트 및 규칙 (FSD 기준)

1. **글로벌 상태 (Jotai)**:
   - React Context 대신 Jotai를 우선 사용합니다.
   - 공용 UI 상태/테마 전역 아톰은 `@shared/lib/theme` 등에 위치하며, 기능 전용 아톰은 해당 Feature의 `queries/` 또는 `lib/`에 배치합니다.
2. **서버 상태 (React Query)**:
   - **`queryOptions` 패턴**: 쿼리 키와 페칭 로직의 중앙 관리를 위해 `queryOptions()`를 필수 사용합니다.
   - **FSD Segment 규칙**: 쿼리 옵션 및 커스텀 훅은 해당 Feature의 `queries/` Segment(예: `src/features/mdd-analysis/queries/queryOptions.ts`)에 작성합니다.
   - App Router 환경에서 `HydrationBoundary`와 `dehydrate` 패턴을 사용하여 서버 사이드 프리페치를 클라이언트로 넘깁니다.
3. **Server Action 연동**:
   - 서버 전용 로직/비즈니스 연산은 해당 Feature의 `actions/` Segment(예: `actions/actions.ts`)에 작성하고, `queries/` 또는 `api/`에서 이를 호출합니다.
4. **에러 핸들링 및 복구**:
   - `QueryErrorResetBoundary`를 활용하여 개별 쿼리 실패 시 사용자에게 재시도(Retry) 기능을 제공합니다.
   - 쿼리 `staleTime`과 `gcTime`은 금융 데이터의 실시간 성격에 맞춰 적절히 설정합니다.
5. **비동기 UI 처리**:
   - 컴포넌트를 `Suspense`로 감싸 선언적으로 로딩 상태(Skeleton UI)를 보여줍니다.
   - 로딩 스켈레톤의 구조는 실제 데이터 표출 구조와 최대한 일치하도록 구성합니다.
