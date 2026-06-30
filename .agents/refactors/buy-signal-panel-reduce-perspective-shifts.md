# Refactoring: BuySignalPanel.tsx - Reducing Perspective Shifts

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 코드를 위에서 아래로 자연스럽게 읽을 수 있도록 하여, 개발자가 맥락을 파악하기 위해 코드의 여러 부분을 오가는 "시점 이동"을 줄입니다.

**Description of Change:**
`BuySignalPanel.tsx` 컴포넌트의 `SignalCard` 내에서 신호 등급(`signal.level`)에 따라 아이콘을 결정하는 `getIcon` 함수를 제거하고, 이를 매핑 객체(`ICON_MAP`)를 사용하거나 JSX 내에서 직접 처리하도록 변경했습니다.

**Reasoning for Change:**
`user-policy.md` 예제에서 제시된 "시점 이동 줄이기" 원칙과 같이, 간단한 조건부 UI 로직을 별도의 함수로 분리하면 코드를 읽는 흐름이 끊길 수 있습니다.
1.  **가독성 향상:** 아이콘이 결정되는 로직이 JSX 렌더링 위치와 가까워지거나, 한눈에 파악 가능한 객체 형태로 정의됨으로써 개발자가 코드를 위아래로 오가며 읽어야 하는 번거로움을 줄여줍니다.
2.  **맥락 유지:** `SignalCard`가 어떻게 구성되는지 파악할 때, 별도의 함수 정의를 찾으러 시점을 이동할 필요 없이 선형적으로 코드를 읽어 내려갈 수 있습니다.
3.  **단순화:** 간단한 분기 로직은 복잡한 추상화보다 직관적인 표현 방식(예: 객체 매핑)이 전체적인 코드 파악 속도를 높이는 데 유리합니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 원칙을 준수하여 `BuySignalPanel.tsx`의 품질을 향상시킵니다.
