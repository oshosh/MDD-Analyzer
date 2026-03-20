---
description: '개발 환경 및 코드 품질 기준 정의'
globs: '*'
alwaysApply: true
---

# 🛠️ 개발 환경 설정 (Environment Setup)

### 의존성 관리

- **pnpm**: 패키지 매니저로 `pnpm`을 사용합니다.
- `pnpm install`: 의존성 설치
- `pnpm dev`: 개발 서버 실행 (Turbopack 활성화)
- `pnpm build`: 프로덕션 빌드
- `pnpm test`: 단위 테스트 실행

# 📋 코드 품질 표준 (Code Quality Standards)

### 테스트 및 품질 관리 도구

- **Vitest 3.0.7**: 고성능 단위 테스트 프레임워크
- **ESLint 8.57.0 / Next.js Config**: 코드 품질 및 스타일 가이드 준수 (안정성을 위해 8.x 사용)
- **Prettier 3.5.1**: 자동 코드 포맷팅 및 Tailwind 클래스 정렬
- **Knip**: 사용되지 않는 파일, 타입, 의존성 감지

### 품질 준수 규칙

- **정적 분석**: 커밋 전 `pnpm typecheck` 및 `pnpm knip`을 통해 오류 및 불필요한 코드를 점검합니다.
- **코드 스타일**: Prettier 설정을 준수하며, ESLint 경고를 무시하지 않습니다.
- **테스트 필수**: 핵심 MDD 계산 로직(`src/lib/finance/calc.ts`) 수정 시 `tests/calc.test.ts`를 통과해야 합니다.
