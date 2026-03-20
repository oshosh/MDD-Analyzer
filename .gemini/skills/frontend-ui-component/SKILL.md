---
name: frontend-ui-component
description: 'Next.js App Router용 프론트엔드 UI 컴포넌트 생성 규격'
---

# 프론트엔드 UI 컴포넌트 생성 스킬

1. **위치 및 승격 구조**:
   - 전역 UI는 `src/components/ui`, `src/components/table`에 위치합니다.
   - 특정 페이지 전용은 `src/app/(도메인)/_components`에 작성하며, **폴더 미러링** 원칙을 따릅니다.
   - 2개 이상의 페이지에서 공통 사용이 확정될 때만 전역 폴더로 승격(이동)시킵니다.
2. **스타일링 (Tailwind v4 & Material 3)**:
   - 반드시 `globals.css`의 `--md-sys-color-*` 토큰을 사용하며, Tailwind v4 `@theme` 변수와 통합하여 일관된 색상을 유지합니다.
   - Glassmorphism, Elevation(그림자), 정교한 타이포그래피 규칙을 준수합니다.
3. **규칙 준수 (MDD Lock)**:
   - 기획 이미지와 1:1 일치를 원칙으로 하며, 데이터 없는 날짜(빈 값)를 임의로 0으로 채우지 않고 원본 데이터를 유지합니다.
4. **결과물 포맷팅**:
   - `src/lib/format.ts`의 유틸리티를 사용하여 퍼센트, 천단위 구분, 날짜 등을 일관되게 출력합니다.
5. **서버/클라이언트 분리**:
   - RSC(Server Component)를 기본으로 하며, 인터랙션이 필요한 말단 컴포넌트만 `"use client";`를 명시합니다.
   - 클라이언트 전용 로직은 최대한 `_hooks`로 분리하여 컴포넌트 복잡도를 낮춥니다.
