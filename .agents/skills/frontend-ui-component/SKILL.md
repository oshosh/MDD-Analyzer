---
name: frontend-ui-component
description: 'Next.js App Router용 프론트엔드 UI 컴포넌트 생성 규격 (FSD 아키텍처 준수)'
---

# 프론트엔드 UI 컴포넌트 생성 스킬 (FSD 기준)

1. **위치 및 FSD Layer 배치**:
   - **Shared Layer (`src/shared/ui`, `src/shared/table`)**: 모든 곳에서 재사용 가능한 공용 UI 컴포넌트 (shadcn/ui, TanStack Table 등).
   - **Feature Layer (`src/features/(기능명)/ui`)**: 특정 기능에 귀속된 시각적 컴포넌트.
   - **Widget Layer (`src/widgets/(위젯명)/ui`)**: 2개 이상의 Feature/Entity를 조합하는 복합 UI 레이아웃.
2. **스타일링 (Tailwind v4 & Material 3 & shadcn UI)**:
   - 반드시 `globals.css`의 `--md-sys-color-*` 토큰을 사용하며, Tailwind v4 `@theme` 변수와 통합하여 일관된 색상을 유지합니다.
   - Glassmorphism, Elevation(그림자), 정교한 타이포그래피 규칙을 준수합니다.
   - **shadcn UI 준수**: `@shared/ui/` 아래의 shadcn 컴포넌트를 사용하며, 레이아웃은 Tailwind 유틸리티를 사용합니다.
3. **규칙 준수 (MDD Lock)**:
   - 기획 이미지와 1:1 일치를 원칙으로 하며, 데이터 없는 날짜(빈 값)를 임의로 0으로 채우지 않고 원본 데이터를 유지합니다.
4. **결과물 포맷팅**:
   - `@shared/lib/format`의 유틸리티를 사용하여 퍼센트, 천단위 구분, 날짜 등을 일관되게 출력합니다.
5. **서버/클라이언트 분리**:
   - RSC(Server Component)를 기본으로 하며, 인터랙션이 필요한 말단 컴포넌트만 `"use client";`를 명시합니다.
   - 클라이언트 전용 로직은 해당 Feature의 `queries/` 또는 `lib/`으로 분리하여 컴포넌트 복잡도를 낮춥니다.
