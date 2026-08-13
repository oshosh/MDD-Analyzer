# USD Normal Distribution & Recovery Simulation Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore and display USD Drawdown Normal Distribution Chart and USD Recovery Simulation Table alongside KRW components in `MddContentDisplay.tsx`.

**Architecture:** Check `hasUsdData` in `MddContentDisplay.tsx` and render USD and KRW components in responsive 2-column grids (`grid grid-cols-1 gap-4 lg:grid-cols-2`).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, TypeScript 5.7, Vitest.

---

### Task 1: Update `MddContentDisplay.tsx` to render USD and KRW components side-by-side

**Files:**
- Modify: `src/widgets/mdd-dashboard/ui/MddContentDisplay.tsx`

- [ ] **Step 1: Check `hasUsdData` condition and wrap NormalDistributionChart & RecoveryTable in 2-column grids when USD data is available**

Edit `src/widgets/mdd-dashboard/ui/MddContentDisplay.tsx` to:
1. Define `hasUsdData`:
```tsx
const hasUsdData = Boolean(
  data.summary.usd && data.charts.mdd_usd && data.recovery.usd
)
```
2. Render Normal Distribution section:
```tsx
{hasUsdData ? (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <NormalDistributionChart
      drawdowns={data.charts.mdd_usd!.map((d) => d.value)}
      currentDrawdown={data.summary.usd!.current_drawdown}
      title="달러(USD) 기준 낙폭 정규분포"
    />
    <NormalDistributionChart
      drawdowns={data.charts.mdd_krw.map((d) => d.value)}
      currentDrawdown={data.summary.krw.current_drawdown}
      title="원화(KRW) 기준 낙폭 정규분포"
    />
  </div>
) : (
  <NormalDistributionChart
    drawdowns={data.charts.mdd_krw.map((d) => d.value)}
    currentDrawdown={data.summary.krw.current_drawdown}
    title="원화(KRW) 기준 낙폭 정규분포"
  />
)}
```
3. Render Recovery Simulation section:
```tsx
{hasUsdData ? (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <RecoveryTable
      title="달러(USD) 기준 회복 시뮬레이션"
      rows={data.recovery.usd}
      interval={query.interval}
      currentDrawdown={data.summary.usd!.current_drawdown}
    />
    <RecoveryTable
      title="원화(KRW) 기준 회복 시뮬레이션"
      rows={data.recovery.krw}
      interval={query.interval}
      currentDrawdown={data.summary.krw.current_drawdown}
    />
  </div>
) : (
  <RecoveryTable
    title="원화(KRW) 기준 회복 시뮬레이션"
    rows={data.recovery.krw}
    interval={query.interval}
    currentDrawdown={data.summary.krw.current_drawdown}
  />
)}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 3: Run Vitest test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 4: Commit changes**

```bash
git add src/widgets/mdd-dashboard/ui/MddContentDisplay.tsx
git commit -m "feat: restore USD normal distribution chart and recovery simulation table"
```
