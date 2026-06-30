# Refactoring: rawBuilder.ts - Simplifying Ternary Operators

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 중첩된 삼항 연산자를 보다 직관적인 구조(객체 매핑 또는 분기문)로 변경하여 조건에 따른 값 할당 로직을 한눈에 파악할 수 있도록 만듭니다.

**Description of Change:**
`rawBuilder.ts` 파일에서 `interval` 값에 따라 `tradingDaysPerPoint`를 결정하는 중첩된 삼항 연산자 로직을 객체 매핑(`TRADING_DAYS_MAP`) 방식으로 변경했습니다.

**Reasoning for Change:**
`ternary-operator.md` 예제에서 제시된 "삼항 연산자 단순하게 하기" 원칙과 같이, 중첩된 삼항 연산자는 조건의 우선순위와 결과 값을 파악하는 데 인지 부하를 주어 **가독성**을 저해합니다.
1.  **가독성 향상:** `interval === '1d' ? 1 : interval === '1w' ? 5 : 21`와 같은 표현은 읽는 흐름이 매끄럽지 않습니다. 이를 매핑 객체로 변환하면 "어떤 입력에 대해 어떤 출력이 나오는지"를 테이블 형태로 보는 것처럼 직관적으로 이해할 수 있습니다.
2.  **확장성:** 향후 새로운 `interval` 타입이 추가될 경우, 중첩된 삼항 연산자를 계속 이어 붙이는 대신 매핑 객체에 새로운 키-값 쌍만 추가하면 되므로 코드 관리가 훨씬 수월해집니다.
3.  **명확한 기본값:** 매핑 객체에서 찾을 수 없는 경우에 대한 기본값 처리가 더욱 명확해집니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 원칙을 준수하여 `rawBuilder.ts`의 품질을 향상시킵니다.
