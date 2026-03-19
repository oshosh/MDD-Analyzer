---
description: 'MDD 수학 검증: 공식 정의 및 데이터 무결성 검증 기준'
globs: 'src/**/calc*.ts, src/**/mdd*.ts, src/**/recovery*.ts, src/**/raw*.ts, tests/**/*, src/lib/math/**/*'
alwaysApply: false
---

# 계산 정의 (변경 금지)

- **공식 무결성**: 핵심 공식은 엑셀 수식과 100% 일치해야 하며 오차 0을 원칙으로 한다.
- **데이터 연속성**: 시계열 데이터에 누락된 날짜(Gap)가 없는지 반드시 확인한다.

## 핵심 공식 (Single Source of Truth)

- **Peak (ATH)**: `P(t) = max(v(i))` (0 <= i <= t)
- **Drawdown (DD)**: `DD(t) = (v(t) - P(t)) / P(t)`
- **Maximum Drawdown (MDD)**: `MDD = min(DD(i))` (전체 기간 중 최솟값)
- **KRW Price**: `close_krw[t] = close_usd[t] * usdkrw[t]` (환노출 자산용)
- **회복율 (Recovery Rate)**: `R(L) = count(DD(i) >= L) / 전체 거래일 * 100` (L: 0, -5, -10 등)

# 검증 및 비교 기준

1. **내부 검증**: `src/lib/finance/calc.ts` 수정 시 `tests/calc.test.ts` 통과 필수.
2. **환율 변동성**: USD MDD와 KRW MDD의 차이를 분석하여 환율의 리스크 완화/증폭 효과를 검증한다.
3. **벤치마크 비교**: S&P 500(SPY) 또는 KOSPI 지수를 리스크 지표의 기준점으로 활용하여 상대적 위험도를 평가한다.
