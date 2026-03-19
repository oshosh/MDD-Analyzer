---
description: '승격 구조 아키텍처 적용 및 폴더 미러링'
globs: 'src/**/*, package.json, next.config.*, tsconfig.json'
alwaysApply: false
---

# 승격 구조 아키텍처 (Promotion Structure)

- **승격 원칙**: 모든 자산은 최초에 해당 도메인(`src/app/(도메인)/_components`) 내에 작성하며, 공통 사용 시에만 전역 폴더로 승격시킨다.
- **폴더 미러링**: 로컬 폴더(`_` 접두어) 내부는 루트 구조(`_components`, `_hooks`, `_lib`)를 미러링하여 응집도를 높인다.

# 상태 관리 및 Provider

- **글로벌 상태 (Jotai)**: 도메인 전용 아톰은 로컬 폴더에서 관리한다.
- **서버 상태 (React Query)**: `queryOptions` 패턴을 사용하여 도메인 내에서 쿼리를 관리한다.
- **프로바이더 합성**: `src/components/provider/AppProviders.tsx`를 통해 전역 설정을 중앙 집중화한다.

# 의존성 규칙

- 하위(Local) 전용 자산은 해당 도메인 외부에서 참조할 수 없으며, 상위(Global)에서 하위(Local)를 참조하는 역참조를 금지한다.
