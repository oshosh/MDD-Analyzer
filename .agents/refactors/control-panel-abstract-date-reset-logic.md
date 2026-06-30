# Refactoring: ControlPanel.tsx - Abstract Date Reset Logic

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 복잡한 로직을 추상화하여 컴포넌트의 주요 흐름을 더 쉽게 이해할 수 있도록 만듭니다.
*   **응집도 (Cohesion):** 특정 기능과 관련된 로직(심볼 변경에 따른 날짜 재설정)을 한 곳으로 모아 응집도를 높입니다.
*   **예측 가능성 (Predictability):** 커스텀 훅은 명확한 인터페이스를 제공하여 해당 로직의 동작을 더 예측 가능하게 만듭니다.

**Description of Change:**
`ControlPanel.tsx` 컴포넌트의 폼 `onSubmit` 핸들러 내부에 있던, 심볼 변경 시 해당 심볼의 상장일을 조회하여 `from` 및 `to` 날짜를 재설정하는 로직을 별도의 커스텀 훅 `useSymbolDateReset`으로 분리했습니다.

**Reasoning for Change:**
`login-start-page.md` 예제에서 제시된 "구현 상세 추상화하기" 원칙과 같이, 컴포넌트의 주요 역할과 직접적으로 관련되지 않는 복잡한 로직은 추상화하여 **가독성**을 높일 수 있습니다.
1.  **가독성 향상:** `ControlPanel`의 `onSubmit` 핸들러는 이제 날짜 재설정의 세부 구현을 알 필요 없이, 추상화된 훅을 통해 `from`, `to` 값을 받아올 수 있습니다. 이는 `onSubmit` 핸들러의 코드를 더 간결하게 만들어 주요 제출 로직을 파악하기 쉽게 합니다.
2.  **응집도 증가:** 심볼 변경 감지, 상장일 API 호출, `from`/`to` 날짜 업데이트 로직은 모두 "심볼 변경에 따른 날짜 재설정"이라는 하나의 책임 아래에 있습니다. 이 로직을 커스텀 훅으로 캡슐화함으로써, 관련 로직의 **응집도**가 높아집니다.
3.  **예측 가능성 향상:** 커스텀 훅은 명확한 인터페이스(입력 심볼, 출력 `from`/`to`)를 제공하여 해당 로직의 동작을 더 예측 가능하게 만듭니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 및 **응집도**, **예측 가능성** 원칙을 준수하여 `ControlPanel.tsx`의 품질을 향상시킵니다.
