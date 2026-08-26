import { describe, it, expect } from 'vitest'
import {
  runQldBacktestSimulation,
  aggregateCandles,
} from '@/features/qld-calculator/lib/simulation'
import type { QldPriceCandle } from '@/features/qld-calculator/types'

describe('QLD Backtest Simulation & Candle Aggregation', () => {
  const sampleCandles: QldPriceCandle[] = [
    { date: '2020-01-02', open: 50, high: 52, low: 49, close: 50 },
    { date: '2020-01-03', open: 50, high: 55, low: 50, close: 54 },
    { date: '2020-01-06', open: 54, high: 56, low: 53, close: 55 },
    { date: '2020-01-07', open: 55, high: 57, low: 54, close: 56 },
    { date: '2020-01-08', open: 56, high: 58, low: 55, close: 57 },
    { date: '2020-02-03', open: 57, high: 60, low: 56, close: 58 },
    { date: '2020-03-02', open: 58, high: 60, low: 35, close: 36 },
    { date: '2020-04-01', open: 36, high: 45, low: 36, close: 44 },
    { date: '2020-05-01', open: 44, high: 50, low: 43, close: 48 },
    { date: '2020-07-01', open: 48, high: 52, low: 47, close: 50 },
  ]

  it('correctly runs DCA and EVH backtest simulations across months', () => {
    const results = runQldBacktestSimulation(sampleCandles, '2020-01-01', '2020-07-31', 1000)

    expect(results.length).toBe(sampleCandles.length)
    
    // First month deposit = $1,000
    const first = results[0]
    expect(first.totalDeposited).toBe(1000)
    expect(first.dcaShares).toBe(20) // 1000 / 50
    expect(first.dcaTotalVal).toBe(1000)
    expect(first.evhShares).toBe(16) // 800 / 50
    expect(first.evhCash).toBe(200)
    expect(first.evhTotalVal).toBe(1000)

    // Last point
    const last = results[results.length - 1]
    expect(last.totalDeposited).toBe(6000) // Jan, Feb, Mar, Apr, May, Jul
    expect(last.dcaTotalVal).toBeGreaterThan(0)
    expect(last.evhTotalVal).toBeGreaterThan(0)
  })

  it('aggregates candles into 5일봉 (5-day chunks)', () => {
    const fiveDay = aggregateCandles(sampleCandles, '5d')
    expect(fiveDay.length).toBe(2) // 10 candles / 5 = 2
    expect(fiveDay[0].open).toBe(50)
    expect(fiveDay[0].high).toBe(58)
    expect(fiveDay[0].close).toBe(57)
  })

  it('aggregates candles into 1달봉 (monthly)', () => {
    const monthly = aggregateCandles(sampleCandles, '1m')
    expect(monthly.length).toBe(6) // Jan, Feb, Mar, Apr, May, Jul
    expect(monthly[0].open).toBe(50)
    expect(monthly[0].high).toBe(58)
    expect(monthly[0].close).toBe(57)
  })

  it('aggregates candles into 3달봉 (quarterly) and 1년봉 (yearly)', () => {
    const quarterly = aggregateCandles(sampleCandles, '3m')
    expect(quarterly.length).toBe(3) // Q1 (Jan-Mar), Q2 (Apr-May), Q3 (Jul)

    const yearly = aggregateCandles(sampleCandles, '1y')
    expect(yearly.length).toBe(1) // 2020
    expect(yearly[0].open).toBe(50)
    expect(yearly[0].close).toBe(50)
  })

  it('handles empty candle input gracefully', () => {
    const results = runQldBacktestSimulation([])
    expect(results).toEqual([])

    const agg = aggregateCandles([], '5d')
    expect(agg).toEqual([])
  })
})
