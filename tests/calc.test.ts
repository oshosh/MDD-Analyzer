import { describe, expect, it } from 'vitest'
import {
  buildDrawdowns,
  buildPeaks,
  buildRecovery,
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
