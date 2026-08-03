import { roundTo } from '@/lib/format'
import type {
  ChartPoint,
  IntervalType,
  RecoveryRow,
  SummaryRow,
} from '@/lib/types'

export const RECOVERY_LEVELS = [
  0, -0.05, -0.1, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4, -0.45, -0.5, -0.55,
  -0.6, -0.65, -0.7, -0.75, -0.8, -0.85, -0.9,
]

export function buildPeaks(values: number[]): number[] {
  const peaks: number[] = []
  let currentPeak = Number.NEGATIVE_INFINITY

  for (const value of values) {
    currentPeak = Math.max(currentPeak, value)
    peaks.push(currentPeak)
  }

  return peaks
}

export function buildDrawdowns(values: number[], peaks: number[]): number[] {
  return values.map((value, index) => {
    const peak = peaks[index]
    return peak === 0 ? 0 : (value - peak) / peak
  })
}

export function buildCumulative(values: number[]): number[] {
  if (values.length === 0) {
    return []
  }
  const first = values[0]
  if (first === 0) {
    return values.map(() => 0)
  }
  return values.map((value) => value / first - 1)
}

export function findMdd(drawdowns: number[]): { value: number; index: number } {
  if (drawdowns.length === 0) {
    return { value: 0, index: 0 }
  }
  let minValue = drawdowns[0]
  let minIndex = 0

  drawdowns.forEach((value, index) => {
    if (value < minValue) {
      minValue = value
      minIndex = index
    }
  })

  return { value: minValue, index: minIndex }
}

function getDailyReturns(closes: number[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }
  }
  return returns
}

export function calculateSharpeRatio(closes: number[], riskFreeRate: number = 0.03): number {
  if (closes.length < 2) return 0

  const returns = getDailyReturns(closes)
  if (returns.length === 0) return 0

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const annualizedReturn = meanReturn * 252

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1 || 1)
  const dailyStdDev = Math.sqrt(variance)
  const annualizedStdDev = dailyStdDev * Math.sqrt(252)

  if (annualizedStdDev === 0) return 0
  return roundTo((annualizedReturn - riskFreeRate) / annualizedStdDev, 4)
}

export function calculateSortinoRatio(closes: number[], riskFreeRate: number = 0.03): number {
  if (closes.length < 2) return 0

  const returns = getDailyReturns(closes)
  if (returns.length === 0) return 0

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const annualizedReturn = meanReturn * 252

  const downsideSquaredSum = returns.reduce((sum, r) => {
    const downside = Math.min(0, r)
    return sum + Math.pow(downside, 2)
  }, 0)
  const dailyDownsideDev = Math.sqrt(downsideSquaredSum / (returns.length - 1 || 1))
  const annualizedDownsideDev = dailyDownsideDev * Math.sqrt(252)

  if (annualizedDownsideDev === 0) {
    return roundTo(annualizedReturn > riskFreeRate ? 99.99 : 0, 4)
  }

  return roundTo((annualizedReturn - riskFreeRate) / annualizedDownsideDev, 4)
}

export function buildSummary(
  dates: string[],
  closes: number[],
  drawdowns: number[],
  riskFreeRate: number = 0.03
): SummaryRow {
  if (closes.length === 0) {
    throw new Error('Cannot build summary from empty closes')
  }

  const mdd = findMdd(drawdowns)
  const cumulative = closes[closes.length - 1] / closes[0] - 1
  const sharpe = calculateSharpeRatio(closes, riskFreeRate)
  const sortino = calculateSortinoRatio(closes, riskFreeRate)

  return {
    start_price: roundTo(closes[0], 4),
    current_price: roundTo(closes[closes.length - 1], 4),
    cumulative_return: roundTo(cumulative, 8),
    ath: roundTo(Math.max(...closes), 4),
    current_drawdown: roundTo(drawdowns[drawdowns.length - 1], 8),
    mdd: roundTo(mdd.value, 8),
    max_drawdown_date: dates[mdd.index],
    sharpe_ratio: sharpe,
    sortino_ratio: sortino,
  }
}

function intervalToTradingDays(interval: IntervalType): number {
  if (interval === '1w') {
    return 5
  }
  if (interval === '1m') {
    return 21
  }
  return 1
}

export function buildRecovery(
  drawdowns: number[],
  interval: IntervalType
): RecoveryRow[] {
  const tradingDaysPerPoint = intervalToTradingDays(interval)
  const marketPoints = drawdowns.length
  const marketDays = marketPoints * tradingDaysPerPoint

  return RECOVERY_LEVELS.map((level) => {
    const conditionPoints = drawdowns.filter((value) => value >= level).length
    return {
      range_label: `${Math.trunc(level * 100)}%`,
      recovery_rate:
        marketPoints === 0 ? 0 : roundTo(conditionPoints / marketPoints, 8),
      condition_points: conditionPoints,
      market_points: marketPoints,
      condition_days: conditionPoints * tradingDaysPerPoint,
      market_days: marketDays,
    }
  })
}

export function toChartPoints(dates: string[], values: number[]): ChartPoint[] {
  return values.map((value, index) => ({
    date: dates[index],
    value: roundTo(value, 8),
  }))
}
