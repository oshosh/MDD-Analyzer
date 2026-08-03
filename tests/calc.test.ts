import { describe, expect, it } from 'vitest'
import {
  buildDrawdowns,
  buildPeaks,
  buildRecovery,
  buildSummary,
  calculateSharpeRatio,
  calculateSortinoRatio,
  detectMajorDrawdownCycles,
  findMdd,
} from '@/lib/finance/calc'

describe('MDD formulas', () => {
  it('builds rolling peak correctly', () => {
    const closes = [100, 95, 110, 90]
    expect(buildPeaks(closes)).toEqual([100, 100, 110, 110])
  })

  it('builds drawdown from peak', () => {
    const closes = [100, 95, 110, 90]
    const peaks = buildPeaks(closes)
    const dd = buildDrawdowns(closes, peaks)
    expect(dd[0]).toBe(0)
    expect(dd[1]).toBeCloseTo(-0.05, 10)
    expect(dd[2]).toBe(0)
    expect(dd[3]).toBeCloseTo(-0.1818181818, 10)
  })

  it('finds mdd min', () => {
    const dd = [0, -0.03, -0.2, -0.1]
    const mdd = findMdd(dd)
    expect(mdd.value).toBe(-0.2)
    expect(mdd.index).toBe(2)
  })

  it('calculates sharpe ratio and sortino ratio correctly', () => {
    // 5일간 종가 변화: [100, 102, 101, 105, 108]
    const closes = [100, 102, 101, 105, 108]
    const sharpe = calculateSharpeRatio(closes, 0.03)
    const sortino = calculateSortinoRatio(closes, 0.03)

    expect(sharpe).toBeGreaterThan(0)
    expect(sortino).toBeGreaterThan(0)
    // Sortino should be greater than or equal to Sharpe for upward trend (less downside risk)
    expect(sortino).toBeGreaterThanOrEqual(sharpe)
  })

  it('builds summary with sharpe_ratio and sortino_ratio', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']
    const closes = [100, 102, 101, 105, 108]
    const peaks = buildPeaks(closes)
    const dds = buildDrawdowns(closes, peaks)
    const summary = buildSummary(dates, closes, dds)

    expect(summary.sharpe_ratio).toBeDefined()
    expect(summary.sortino_ratio).toBeDefined()
    expect(typeof summary.sharpe_ratio).toBe('number')
    expect(typeof summary.sortino_ratio).toBe('number')
  })

  it('builds recovery rows with count(dd >= L) / N', () => {
    const dd = [0, -0.02, -0.1, -0.3]
    const rows = buildRecovery(dd, '1d')
    const zero = rows.find((row) => row.range_label === '0%')
    const minus10 = rows.find((row) => row.range_label === '-10%')
    expect(zero?.condition_points).toBe(1)
    expect(zero?.market_points).toBe(4)
    expect(zero?.condition_days).toBe(1)
    expect(zero?.market_days).toBe(4)
    expect(zero?.recovery_rate).toBeCloseTo(0.25, 10)
    expect(minus10?.condition_days).toBe(3)
    expect(minus10?.recovery_rate).toBeCloseTo(0.75, 10)
  })
})

describe('detectMajorDrawdownCycles', () => {
  it('detects a single completed cycle with -50% drawdown', () => {
    // 가격: 100 → 50 → 120 (50% 하락 후 회복)
    const dates = ['2020-01', '2020-02', '2020-03', '2020-04', '2020-05']
    const closes = [100, 70, 50, 80, 120]
    const peaks = buildPeaks(closes)
    const dds = buildDrawdowns(closes, peaks)

    const cycles = detectMajorDrawdownCycles(dates, closes, dds, -0.4)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].drawdown).toBeCloseTo(-0.5, 4)
    expect(cycles[0].peakDate).toBe('2020-01')
    expect(cycles[0].troughDate).toBe('2020-03')
    expect(cycles[0].isCurrent).toBe(false)
  })

  it('detects multiple cycles like SK Hynix pattern', () => {
    // 시뮬레이션: 고점100 → 저점1 (99% 폭락) → 회복200 → 저점80 (60% 하락) → 아직 미회복
    const dates = [
      '2000-01', '2001-01', '2002-01', '2003-01', // 1차 폭락
      '2015-01', '2020-01',                       // 회복 + 새 고점
      '2024-01', '2025-01',                        // 2차 하락 (진행 중)
    ]
    const closes = [100, 30, 5, 1, 150, 200, 120, 80]
    const peaks = buildPeaks(closes)
    const dds = buildDrawdowns(closes, peaks)

    const cycles = detectMajorDrawdownCycles(dates, closes, dds, -0.4)
    expect(cycles.length).toBeGreaterThanOrEqual(2)

    // 1차: -99% 폭락
    expect(cycles[0].drawdown).toBeLessThanOrEqual(-0.9)
    expect(cycles[0].isCurrent).toBe(false)

    // 마지막 사이클은 진행 중
    const lastCycle = cycles[cycles.length - 1]
    expect(lastCycle.isCurrent).toBe(true)
    expect(lastCycle.drawdown).toBeLessThanOrEqual(-0.4)
  })

  it('returns empty when no drawdown exceeds threshold', () => {
    const dates = ['2020-01', '2020-02', '2020-03', '2020-04']
    const closes = [100, 90, 95, 105]
    const peaks = buildPeaks(closes)
    const dds = buildDrawdowns(closes, peaks)

    const cycles = detectMajorDrawdownCycles(dates, closes, dds, -0.4)
    expect(cycles).toHaveLength(0)
  })

  it('marks last cycle as isCurrent when still in drawdown', () => {
    const dates = ['2020-01', '2020-02', '2020-03']
    const closes = [100, 50, 40]
    const peaks = buildPeaks(closes)
    const dds = buildDrawdowns(closes, peaks)

    const cycles = detectMajorDrawdownCycles(dates, closes, dds, -0.4)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].isCurrent).toBe(true)
    expect(cycles[0].drawdown).toBeCloseTo(-0.6, 4)
  })
})

