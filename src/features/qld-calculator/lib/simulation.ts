import type { QldPriceCandle, DailySimPoint, QldBarInterval } from '../types'

/**
 * 캔들 데이터를 지정된 봉 주기(1일봉, 5일봉, 1달봉, 3달봉, 6달봉, 1년봉)로 집계합니다.
 */
export function aggregateCandles(
  candles: QldPriceCandle[],
  barInterval: QldBarInterval
): QldPriceCandle[] {
  if (candles.length === 0) return []
  if (barInterval === '1d' || barInterval === 'all') {
    return candles
  }

  // 5일봉: 거래일 기준 5일씩 그룹화
  if (barInterval === '5d') {
    const aggregated: QldPriceCandle[] = []
    const CHUNK_SIZE = 5
    for (let i = 0; i < candles.length; i += CHUNK_SIZE) {
      const chunk = candles.slice(i, i + CHUNK_SIZE)
      if (chunk.length === 0) continue
      const first = chunk[0]
      const last = chunk[chunk.length - 1]
      const high = Math.max(...chunk.map((c) => c.high))
      const low = Math.min(...chunk.map((c) => c.low))

      aggregated.push({
        date: last.date,
        open: first.open,
        high,
        low,
        close: last.close,
      })
    }
    return aggregated
  }

  // 1달봉, 3달봉, 6달봉, 1년봉: 캘린더 주기 기준 그룹화
  const groups = new Map<string, QldPriceCandle[]>()

  for (const c of candles) {
    const year = c.date.slice(0, 4)
    const month = parseInt(c.date.slice(5, 7), 10)
    let key = c.date

    if (barInterval === '1m') {
      key = c.date.slice(0, 7) // 'YYYY-MM'
    } else if (barInterval === '3m') {
      const quarter = Math.ceil(month / 3)
      key = `${year}-Q${quarter}` // 'YYYY-Q1' ~ 'YYYY-Q4'
    } else if (barInterval === '6m') {
      const half = month <= 6 ? 'H1' : 'H2'
      key = `${year}-${half}` // 'YYYY-H1', 'YYYY-H2'
    } else if (barInterval === '1y') {
      key = year // 'YYYY'
    }

    const arr = groups.get(key) || []
    arr.push(c)
    groups.set(key, arr)
  }

  const aggregated: QldPriceCandle[] = []
  for (const [, group] of groups) {
    if (group.length === 0) continue
    const first = group[0]
    const last = group[group.length - 1]
    const high = Math.max(...group.map((g) => g.high))
    const low = Math.min(...group.map((g) => g.low))

    aggregated.push({
      date: last.date,
      open: first.open,
      high,
      low,
      close: last.close,
    })
  }

  return aggregated
}

/**
 * QLD 가격 데이터를 기반으로 DCA vs EVH 전략 백테스트 시뮬레이션을 수행합니다.
 * - startDate ~ endDate 범위 내의 캔들에 대해 월 $1,000 적립 기반 시뮬레이션
 */
export function runQldBacktestSimulation(
  candles: QldPriceCandle[],
  startDate?: string,
  endDate?: string,
  monthlyDeposit = 1000
): DailySimPoint[] {
  if (!candles || candles.length === 0) return []

  // 1. Sort ascending
  const sorted = [...candles].sort((a, b) => (a.date > b.date ? 1 : -1))

  // 2. Filter by date range if provided
  let filtered = sorted
  if (startDate) {
    filtered = filtered.filter((c) => c.date >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter((c) => c.date <= endDate)
  }

  if (filtered.length === 0) return []

  // Strategy A: DCA
  let dcaShares = 0
  const dcaCash = 0
  let dcaPeak = 0
  let dcaMaxMdd = 0
  let totalDeposited = 0

  // Strategy B: EVH
  let evhShares = 0
  let evhCash = 0
  let evhPeak = 0
  let evhMaxMdd = 0
  let athPrice = filtered[0].close

  let lastMonthSeen = ''
  const results: DailySimPoint[] = []

  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i]
    const price = c.close
    const curMonth = c.date.slice(0, 7) // 'YYYY-MM'

    if (price > athPrice) athPrice = price
    const mdd = (price - athPrice) / athPrice

    let actionNote: string | undefined

    // Monthly Deposit on the 1st trading candle of each month
    if (curMonth !== lastMonthSeen) {
      lastMonthSeen = curMonth
      totalDeposited += monthlyDeposit

      // Strategy A: 100% QLD immediate buy
      const dcaBoughtShares = monthlyDeposit / price
      dcaShares += dcaBoughtShares

      // Strategy B: 80% QLD stock + 20% Cash reserve
      const evhStockDeposit = monthlyDeposit * 0.8
      const evhCashDeposit = monthlyDeposit * 0.2
      const evhBoughtShares = evhStockDeposit / price
      evhShares += evhBoughtShares
      evhCash += evhCashDeposit
    }

    // Daily Valuation
    const dcaTotalVal = dcaShares * price + dcaCash
    let evhStockVal = evhShares * price
    let evhTotalVal = evhStockVal + evhCash
    let evhWeight = evhTotalVal > 0 ? evhStockVal / evhTotalVal : 0

    // Peak & MDD for DCA
    if (dcaTotalVal > dcaPeak) dcaPeak = dcaTotalVal
    const curDcaMdd = dcaPeak > 0 ? (dcaTotalVal - dcaPeak) / dcaPeak : 0
    if (curDcaMdd < dcaMaxMdd) dcaMaxMdd = curDcaMdd

    // EVH Rebalancing Logic
    // 1) Upper Overheat (W >= 88%): Sell excess above 80%
    if (evhWeight >= 0.88) {
      const targetStockVal = evhTotalVal * 0.8
      const excessVal = evhStockVal - targetStockVal
      const sellShares = excessVal / price
      evhShares -= sellShares
      evhCash += excessVal
      actionNote = `💰 상단 익절: ${sellShares.toFixed(1)}주 매도 ($${Math.round(excessVal)} 현금 챙김)`
    }
    // 2) Lower Accumulation (W <= 75%): Buy QLD with cash
    else if (evhWeight <= 0.75 && evhCash > 50) {
      const absMdd = Math.abs(mdd)
      const budgetRatio = Math.min(0.3, 0.1 * (1 + 2 * absMdd))
      const buyBudget = evhCash * budgetRatio
      const buyShares = buyBudget / price
      evhCash -= buyBudget
      evhShares += buyShares
      actionNote = `🛒 하단 매집: ${buyShares.toFixed(1)}주 매수 ($${Math.round(buyBudget)} 현금 투입)`
    }

    // Recalculate after daily rebalance
    evhStockVal = evhShares * price
    evhTotalVal = evhStockVal + evhCash
    evhWeight = evhTotalVal > 0 ? evhStockVal / evhTotalVal : 0

    // Peak & MDD for EVH
    if (evhTotalVal > evhPeak) evhPeak = evhTotalVal
    const curEvhMdd = evhPeak > 0 ? (evhTotalVal - evhPeak) / evhPeak : 0
    if (curEvhMdd < evhMaxMdd) evhMaxMdd = curEvhMdd

    results.push({
      time: c.date,
      qldClose: Math.round(price * 100) / 100,
      totalDeposited,
      dcaTotalVal: Math.round(dcaTotalVal),
      dcaShares: Math.round(dcaShares * 10) / 10,
      dcaCash: Math.round(dcaCash),
      dcaMdd: Math.round(dcaMaxMdd * 1000) / 10,
      evhTotalVal: Math.round(evhTotalVal),
      evhShares: Math.round(evhShares * 10) / 10,
      evhCash: Math.round(evhCash),
      evhWeight: Math.round(evhWeight * 100),
      evhMdd: Math.round(evhMaxMdd * 1000) / 10,
      actionNote,
    })
  }

  return results
}
