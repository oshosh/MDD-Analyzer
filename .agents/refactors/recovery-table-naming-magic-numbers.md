# Refactoring: RecoveryTable.tsx - Naming Magic Numbers

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 소스 코드 내에 직접 선언된 숫자 값(매직 넘버)에 명확한 이름을 가진 상수를 부여하여 코드의 맥락과 의도를 쉽게 파악할 수 있도록 만듭니다.

**Description of Change:**
`RecoveryTable.tsx` 컴포넌트에서 낙폭 구간을 판단하는 데 사용되는 숫자 값들(-70, -50, -30, -20, -15)과 현재 위치를 판단하는 오차 범위(0.025)를 명확한 이름을 가진 상수로 정의했습니다.

**Reasoning for Change:**
`magic-number-readability.md` 예제에서 제시된 "매직 넘버에 이름 붙이기" 원칙과 같이, 의미를 알 수 없는 숫자를 직접 사용하면 코드를 읽는 사람이 해당 숫자의 맥락을 파악하기 어렵습니다.
1.  **가독성 향상:** `levelPercent <= -70` 대신 `levelPercent <= CRITICAL_DRAWDOWN_THRESHOLD`와 같이 상수를 사용함으로써, 해당 숫자가 "심각한 낙폭 임계치"를 의미함을 즉시 알 수 있습니다.
2.  **맥락 제공:** 숫자가 어떤 의도로 사용되었는지(예: 공격적 비중 확대 시점, 분할 매수 유효 시점 등)를 상수 이름을 통해 명확히 전달할 수 있습니다.
3.  **유지보수 용이성:** 특정 임계치를 변경해야 할 경우, 파일 상단에 정의된 상수 값만 수정하면 되므로 코드 전체를 뒤져서 숫자를 바꿀 필요가 없으며, 오타로 인한 실수를 방지할 수 있습니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 원칙을 준수하여 `RecoveryTable.tsx`의 품질을 향상시킵니다.
