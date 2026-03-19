---
name: frontend-state-management
description: 'Jotai 및 React Query 상태 관리 패턴 적용'
---

# 상태 관리 패턴 보일러플레이트 및 규칙

1. **글로벌 상태 (Jotai)**:
   - React Context 대신 Jotai를 우선 사용합니다.
   - **승격 원칙**: 특정 도메인 전용 아톰은 `src/app/(도메인)/_lib/atoms.ts`에서 시작하여, 전역에서 사용될 때만 `src/lib/store`로 승격시킵니다.
2. **서버 상태 (React Query)**:
   - **`queryOptions` 패턴**: 쿼리 키와 페칭 로직의 중앙 관리를 위해 `queryOptions()`를 필수 사용합니다.
   - **Folder Mirroring**: 도메인 전용 쿼리는 `src/app/(도메인)/_lib/queryOptions.ts`에 정의합니다.
   - App Router 환경에서 `HydrationBoundary`와 `dehydrate` 패턴을 사용하여 서버 사이드 프리페치를 클라이언트로 넘깁니다.
3. **에러 핸들링 및 복구**:
   - `QueryErrorResetBoundary`를 활용하여 개별 쿼리 실패 시 사용자에게 재시도(Retry) 기능을 제공합니다.
   - 쿼리 `staleTime`과 `gcTime`은 금융 데이터의 실시간 성격에 맞춰 적절히 설정합니다.
4. **비동기 UI 처리**:
   - 컴포넌트를 `Suspense`로 감싸 선언적으로 로딩 상태(Skeleton UI)를 보여줍니다.
   - 로딩 스켈레톤의 구조는 실제 데이터 표출 구조와 최대한 일치하도록 구성합니다.
