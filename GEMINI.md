# 프로젝트: MDD 계산기 (MDD Analyzer)

**Core Application** - 투자 리스크 분석 및 최대 낙폭(MDD) 측정을 위한 전문 핀테크 대시보드

## 🎯 프로젝트 목적과 역할

본 애플리케이션은 투자자의 핵심 리스크 지표인 **MDD(최대 낙폭, Maximum Drawdown)**를 정밀하게 분석하여, 데이터 기반의 객관적인 투자 인사이트를 제공하는 모던 웹 대시보드입니다.

- **정밀 리스크 분석**: 특정 자산의 기간별 현재 낙폭, MDD, 전고점(ATH), 누적 수익률을 USD/KRW 기준으로 산출합니다.
- **통계 기반 매수 전략**: 과거 하락 사건들을 전수 분석하여 현재 구간의 통계적 우위(Alpha)와 승률, 기대 수익률을 시각화합니다.
- **환노출(KRW) 실질 리스크 분석**: 환율 변동성을 반영하여 한국 투자자가 체감하는 원화 기준 실질 리스크와 매수 적기를 별도로 도출합니다.
- **데이터 투명성 검증**: 계산에 사용된 모든 RAW 데이터를 투명하게 공개하고, 수학적 공식 일치 여부를 검증 패널을 통해 보장합니다.

## 📁 주요 파일 및 설정

@.gemini/rules/01-project-scope.md

### 핵심 설정
- **`package.json`**: Next.js 15.1.6, React 19.0.0 기반의 풀스택 의존성 관리
- **`next.config.ts`**: Turbopack 및 최적화 설정이 포함된 Next.js 설정
- **`tsconfig.json`**: 엄격한 타입을 위한 TypeScript 5.7.3 설정
- **`postcss.config.mjs`**: Tailwind CSS 4.2.1 처리를 위한 PostCSS 설정

@.gemini/rules/00-tech-stack.md
@.gemini/rules/06-quality-standards.md

## 🚀 개발 및 구현 규칙 (Core Mandates)

@.gemini/rules/02-frontend-ui.md
@.gemini/rules/03-data-api.md
@.gemini/rules/04-math-validation.md
@.gemini/rules/05-folder-architecture.md

## 📊 핵심 기능

- **실시간 MDD 대시보드**: 자산별 리스크 지표(MDD, ATH, 수익률) 요약
- **환율 영향도 분석**: 환노출에 따른 실질 수익률 변동 원인 분해
- **과거 회복 탄력성 분석**: 유사 낙폭 구간 기반의 회복 확률 및 기간 통계
- **RAW 데이터 검증**: 일자별 모든 계산 과정 및 수식 공개

---

**주의 사항**: 이 프로젝트는 금융 데이터를 다루므로 수식의 정확성이 최우선입니다. 모든 로직 변경 후에는 `tests/` 폴더의 테스트를 실행하여 무결성을 확인하십시오.
