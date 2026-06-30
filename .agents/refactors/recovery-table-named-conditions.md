# Refactoring: RecoveryTable.tsx - Naming Complex Conditions

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 복잡하거나 반복되는 조건식에 명시적인 이름을 부여하여 코드의 의도를 한눈에 파악할 수 있도록 만듭니다.

**Description of Change:**
`RecoveryTable.tsx` 컴포넌트 내에서 `levelPercent` 값에 따라 UI (`Badge`의 `variant` 및 `className`, 아이콘)를 결정하는 복잡하고 반복적인 조건식(`levelPercent <= -70`, `levelPercent <= -50`, `levelPercent <= -20`)에 명시적인 이름을 부여하는 변수 (`isCriticalDrawdown`, `isSevereDrawdown`, `isModerateDrawdown`)를 도입했습니다. 또한, `strategy` 컬럼의 조건문에도 유사한 명명 규칙을 적용했습니다.

**Reasoning for Change:**
`condition-name.md` 예제에서 제시된 "복잡한 조건에 이름 붙이기" 원칙과 같이, 조건식이 여러 번 반복되거나 그 의미를 즉시 파악하기 어려운 경우 이름을 부여하여 **가독성**을 크게 향상시킬 수 있습니다.
1.  **가독성 향상:** 이제 개발자는 `levelPercent <= -70`과 같은 숫자를 직접 해석할 필요 없이 `isCriticalDrawdown`과 같은 명확한 변수 이름을 통해 해당 조건이 의미하는 바를 즉시 이해할 수 있습니다. 이는 코드의 흐름을 따라가는 인지 부하를 줄여줍니다.
2.  **의도 명확화:** 조건이 나타내는 의미(예: 심각한 낙폭, 보통 낙폭)가 코드 자체에 명시되므로, 주석 없이도 코드의 목적을 명확하게 전달합니다.
3.  **유지보수 용이성:** 조건 값이 변경될 경우, 정의된 변수만 수정하면 되므로 여러 곳에 흩어져 있는 동일한 조건을 일일이 찾아서 수정하는 실수를 방지하고 유지보수성을 높입니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 원칙을 준수하여 `RecoveryTable.tsx`의 품질을 향상시킵니다.
