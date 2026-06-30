# Refactoring: MddContents.tsx - Section Titles Readability

**Date:** 2026-03-26

**Applied Code Quality Principles:**
*   **가독성 (Readability):** 코드를 읽고 이해하기 쉽게 만듭니다. 불필요한 중첩을 줄이고 컴포넌트의 의도를 명확히 합니다.

**Description of Change:**
`MddContents.tsx` 내의 각 섹션 제목 (`Buy Strategy`, `Risk Analysis`, `Performance Analytics`) 구조를 리팩토링했습니다. 기존에는 `CardTitle` 내부에 `div`로 감싸진 `h3` 태그로 제목을 표현했습니다.

**Reasoning for Change:**
`shadcn/ui`의 `CardTitle` 컴포넌트는 기본적으로 `div` 태그를 렌더링하며, 제목의 시맨틱과 스타일링을 담당하도록 설계되었습니다. `CardTitle` 내부에 또 다른 `div`와 `h3` 태그를 중첩하는 것은 불필요한 DOM 복잡성을 야기하고, 제목의 실제 내용과 스타일이 어디서 정의되는지 파악하기 어렵게 만들어 **가독성**을 저해합니다.

이번 리팩토링을 통해 `flex`, `items-center`, `gap-2`, `text-lg`, `font-bold`와 같은 스타일링 클래스를 `CardTitle` 컴포넌트 자체에 직접 적용하고, `h3` 태그를 제거했습니다. 이는 다음과 같은 이점을 제공합니다:
1.  **DOM 구조 단순화:** 불필요한 중첩을 제거하여 코드를 더 간결하게 만듭니다.
2.  **의도 명확화:** `CardTitle`이 제목의 모든 부분을 직접 관리하게 되어, 해당 컴포넌트가 무엇을 하는지 더욱 명확하게 드러냅니다.
3.  **유지보수 용이성:** 스타일 변경 시 하나의 컴포넌트만 수정하면 되므로 유지보수 복잡도를 낮춥니다.

이러한 변경은 코드의 가독성을 높이고, 컴포넌트의 역할을 더욱 예측 가능하게 만들어 `08-code-quality-standards.md`에 정의된 **가독성** 원칙을 준수합니다.
