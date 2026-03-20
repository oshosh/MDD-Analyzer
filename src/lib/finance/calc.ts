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

export function buildSummary(
  dates: string[],
  closes: number[],
  drawdowns: number[]
  //peaks: number[]
): SummaryRow {
  if (closes.length === 0) {
    throw new Error('Cannot build summary from empty closes')
  }

  const mdd = findMdd(drawdowns)
  const cumulative = closes[closes.length - 1] / closes[0] - 1

  return {
    start_price: roundTo(closes[0], 4),
    current_price: roundTo(closes[closes.length - 1], 4),
    cumulative_return: roundTo(cumulative, 8),
    ath: roundTo(Math.max(...closes), 4),
    current_drawdown: roundTo(drawdowns[drawdowns.length - 1], 8),
    mdd: roundTo(mdd.value, 8),
    max_drawdown_date: dates[mdd.index],
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
