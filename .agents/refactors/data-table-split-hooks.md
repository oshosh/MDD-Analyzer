# Refactoring: useDataTable.ts - Splitting Combined Hooks

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 복잡한 로직을 작은 단위로 분할하여 각 단위의 책임과 역할을 명확히 하여 코드를 읽고 이해하기 쉽게 만듭니다.
*   **응집도 (Cohesion):** 각 훅이 단일 책임(TanStack Table 설정 또는 TanStack Virtualizer 설정)을 갖도록 하여, 관련 로직의 응집도를 높입니다.
*   **예측 가능성 (Predictability):** 훅의 이름만으로도 어떤 기능을 수행하는지 명확히 알 수 있게 되어, 코드의 동작을 더 쉽게 예측할 수 있습니다.

**Description of Change:**
기존 `useDataTable` 훅은 TanStack Table의 기본 설정(`useReactTable`)과 TanStack Virtualizer의 설정(`useVirtualizer`)을 모두 처리하고 있었습니다. 이를 두 개의 독립적인 훅(`useTanstackTable` 및 `useTanstackVirtualizer`)으로 분리했습니다. `useTanstackTable`은 `useReactTable` 관련 로직을 담당하고, `useTanstackVirtualizer`는 `useTanstackTable`에서 반환된 행(`rows`)을 입력으로 받아 가상화 로직을 처리합니다.

**Reasoning for Change:**
`use-page-state-readability.md` 예제에서 제시된 "로직 종류에 따라 합쳐진 함수 쪼개기" 원칙과 같이, 하나의 훅이 여러 종류의 로직을 처리하면 **가독성**과 **응집도**를 저해합니다.
1.  **가독성 향상:** `useDataTable` 훅의 코드가 짧아지고, 각 훅이 명확한 단일 책임을 가지게 됩니다. 이는 `DataTable.tsx` 컴포넌트나 다른 곳에서 이 훅들을 사용할 때, 어떤 훅이 어떤 기능을 제공하는지 더 쉽게 파악할 수 있게 합니다.
2.  **응집도 증가:** `useTanstackTable`은 데이터 테이블의 핵심 논리(정렬, 필터링, 페이지네이션 등)에 집중하고, `useTanstackVirtualizer`는 오직 가상 스크롤링의 논리에 집중합니다. 각 훅의 책임이 명확해져 **응집도**가 높아집니다.
3.  **예측 가능성 향상:** 훅의 이름(`useTanstackTable`, `useTanstackVirtualizer`)이 해당 훅의 기능을 명확하게 나타내므로, 개발자가 훅의 동작을 더 쉽게 예측할 수 있습니다. 이는 향후 기능 추가나 변경 시 영향을 미 미칠 부분을 예측하는 데 도움이 됩니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성**, **응집도**, **예측 가능성** 원칙을 준수하여 `useDataTable.ts`의 품질을 향상시킵니다.
