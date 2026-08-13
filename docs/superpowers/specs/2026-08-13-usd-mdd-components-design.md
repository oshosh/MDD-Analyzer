# USD Normal Distribution & Recovery Simulation Components Design

## Overview
This design document specifies the restoration and layout enhancement of USD-denominated Normal Distribution (`NormalDistributionChart`) and Recovery Simulation (`RecoveryTable`) components within the MDD Dashboard (`src/widgets/mdd-dashboard/ui/MddContentDisplay.tsx`).

While the backend (`src/server/services/rawBuilder.ts`) calculates both USD and KRW metrics for foreign assets (US Stocks, Crypto, ETFs), the main content display currently only renders the KRW versions of the Drawdown Normal Distribution Chart and the Recovery Simulation Table.

## Key Changes

### 1. `src/widgets/mdd-dashboard/ui/MddContentDisplay.tsx`
- Add USD availability check:
  ```tsx
  const hasUsdData = Boolean(
    data.summary.usd && data.charts.mdd_usd && data.recovery.usd
  )
  ```

- **Drawdown Normal Distribution Section**:
  - When `hasUsdData` is `true`:
    - Display a 2-column responsive grid (`grid grid-cols-1 gap-4 lg:grid-cols-2`).
    - **Left Column**: `<NormalDistributionChart drawdowns={data.charts.mdd_usd.map((d) => d.value)} currentDrawdown={data.summary.usd.current_drawdown} title="달러(USD) 기준 낙폭 정규분포" />`
    - **Right Column**: `<NormalDistributionChart drawdowns={data.charts.mdd_krw.map((d) => d.value)} currentDrawdown={data.summary.krw.current_drawdown} title="원화(KRW) 기준 낙폭 정규분포" />`
  - When `hasUsdData` is `false`:
    - Display single full-width KRW Normal Distribution chart.

- **Recovery Simulation Section**:
  - When `hasUsdData` is `true`:
    - Display a 2-column responsive grid (`grid grid-cols-1 gap-4 lg:grid-cols-2`).
    - **Left Column**: `<RecoveryTable title="달러(USD) 기준 회복 시뮬레이션" rows={data.recovery.usd} interval={query.interval} currentDrawdown={data.summary.usd.current_drawdown} />`
    - **Right Column**: `<RecoveryTable title="원화(KRW) 기준 회복 시뮬레이션" rows={data.recovery.krw} interval={query.interval} currentDrawdown={data.summary.krw.current_drawdown} />`
  - When `hasUsdData` is `false`:
    - Display single full-width KRW Recovery Table.

## Architecture & Quality Standards
- **FSD Alignment**: Keep imports clean via `@features/mdd-analysis` public API export.
- **Mobile-First & Grid**: Use `grid-cols-1 lg:grid-cols-2` for seamless mobile responsiveness.
- **Type Safety**: Strictly leverage existing `RawApiResponse` types.
