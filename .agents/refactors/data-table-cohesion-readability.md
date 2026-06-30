# Refactoring: DataTable.tsx - Cohesion and Readability for Row Rendering

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 반복되는 코드를 제거하고 로직을 한 곳으로 모아 코드를 읽고 이해하기 쉽게 만듭니다.
*   **응집도 (Cohesion):** 함께 변경될 가능성이 있는 코드를 한 곳에 모아, 특정 기능을 담당하는 부분이 더욱 긴밀하게 연결되도록 합니다.

**Description of Change:**
`DataTable.tsx` 컴포넌트 내 `TableBody` 섹션에서 가상화된 (`virtualized`) 행과 비가상화된 행을 렌더링하는 로직이 중복되어 있었습니다. 이 두 개의 유사한 `map` 함수 블록을 단일 헬퍼 함수 `renderRow`로 추상화하여 중복을 제거했습니다.

**Reasoning for Change:**
1.  **가독성 향상:** 동일한 목적(테이블 행 렌더링)을 가진 로직이 두 번 반복되면, 각 블록을 개별적으로 읽고 이해해야 하므로 코드의 가독성이 저하됩니다. `renderRow` 헬퍼 함수를 사용함으로써, 실제 렌더링 로직은 한 곳에만 존재하게 되어 `TableBody`의 전체적인 구조를 파악하기 용이해집니다.
2.  **응집도 증가:** 행을 렌더링하는 상세 로직은 `DataTable` 컴포넌트 내에서 `renderRow`라는 단일 책임 함수로 캡슐화됩니다. 이는 행 렌더링 방식이 변경될 경우, 오직 이 헬퍼 함수만 수정하면 되도록 하여 코드 변경의 범위를 한정하고, 관련 로직의 응집도를 높입니다.
3.  **유지보수 용이성:** 로직의 중복 제거는 향후 기능 추가나 버그 수정 시 발생할 수 있는 오류를 줄이고, 한 곳만 변경하면 되므로 유지보수 비용을 절감합니다.

이러한 변경은 `08-code-quality-standards.md`에 정의된 **가독성** 및 **응집도** 원칙을 준수하여 `DataTable.tsx`의 품질을 향상시킵니다.
