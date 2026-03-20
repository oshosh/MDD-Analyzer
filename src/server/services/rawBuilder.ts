import { roundTo } from '@/lib/format'
import {
  buildCumulative,
  buildDrawdowns,
  buildPeaks,
  buildRecovery,
  buildSummary,
  toChartPoints,
} from '@/lib/finance/calc'
import type {
  AssetType,
  BottomProbability,
  BuySignal,
  DataSourceType,
  FxImpact,
  IntervalType,
  PriceCandle,
  RawApiResponse,
  RawRow,
  RecoveryForecast,
  SummaryRow,
} from '@/lib/types'
import {
  getFx,
  getListingInfo,
  getPrices,
  inferAssetFromSymbol,
  needsFx,
} from '@/server/services/marketData'

function mergeDataSource(
  priceSource: Exclude<DataSourceType, 'MIXED'>,
  fxSource: Exclude<DataSourceType, 'MIXED'> | null
): DataSourceType {
  if (!fxSource || priceSource === fxSource) {
    return priceSource
  }
  return 'MIXED'
}

function validateDrawdownFormula(
  rows: Array<{ close: number; peak: number; drawdown: number }>
) {
  let maxAbsError = 0
  for (const row of rows) {
    const formula = row.peak === 0 ? 0 : (row.close - row.peak) / row.peak
    maxAbsError = Math.max(maxAbsError, Math.abs(formula - row.drawdown))
  }
  return {
    passed: maxAbsError <= 1e-6,
    max_abs_error: roundTo(maxAbsError, 12),
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

function computeRecoveryForecast(
  drawdowns: number[],
  interval: IntervalType
): RecoveryForecast {
  if (drawdowns.length < 2) {
    return {
      current_drawdown: 0,
      sample_count: 0,
      recover_30d_prob: 0,
      recover_60d_prob: 0,
      avg_recovery_days: null,
    }
  }

  const currentDrawdown = drawdowns[drawdowns.length - 1]
  const tradingDaysPerPoint = intervalToTradingDays(interval)
  const points30 = Math.max(1, Math.ceil(30 / tradingDaysPerPoint))
  const points60 = Math.max(1, Math.ceil(60 / tradingDaysPerPoint))
  const recoverEpsilon = -1e-10

  const entries: number[] = []
  for (let i = 0; i < drawdowns.length - 1; i += 1) {
    const enteredNow = drawdowns[i] <= currentDrawdown
    const wasAboveBefore = i === 0 || drawdowns[i - 1] > currentDrawdown
    if (enteredNow && wasAboveBefore) {
      entries.push(i)
    }
  }

  const validEntries = entries.filter(
    (index) => index + points60 < drawdowns.length
  )
  if (validEntries.length === 0) {
    return {
      current_drawdown: roundTo(currentDrawdown, 8),
      sample_count: 0,
      recover_30d_prob: 0,
      recover_60d_prob: 0,
      avg_recovery_days: null,
    }
  }

  let recover30Count = 0
  let recover60Count = 0
  const recoveryDays: number[] = []

  for (const entryIndex of validEntries) {
    let recovered30 = false
    let recovered60 = false
    let firstRecoveryIndex: number | null = null

    const end30 = Math.min(drawdowns.length - 1, entryIndex + points30)
    const end60 = Math.min(drawdowns.length - 1, entryIndex + points60)

    for (let i = entryIndex + 1; i <= end60; i += 1) {
      if (drawdowns[i] >= recoverEpsilon) {
        if (!recovered60) {
          recovered60 = true
        }
        if (i <= end30) {
          recovered30 = true
        }
        if (firstRecoveryIndex === null) {
          firstRecoveryIndex = i
        }
        break
      }
    }

    if (!recovered30) {
      for (let i = entryIndex + 1; i <= end30; i += 1) {
        if (drawdowns[i] >= recoverEpsilon) {
          recovered30 = true
          break
        }
      }
    }

    if (recovered30) {
      recover30Count += 1
    }
    if (recovered60) {
      recover60Count += 1
    }

    if (firstRecoveryIndex !== null) {
      recoveryDays.push((firstRecoveryIndex - entryIndex) * tradingDaysPerPoint)
    }
  }

  const avgRecoveryDays = recoveryDays.length
    ? roundTo(
        recoveryDays.reduce((sum, value) => sum + value, 0) /
          recoveryDays.length,
        2
      )
    : null

  return {
    current_drawdown: roundTo(currentDrawdown, 8),
    sample_count: validEntries.length,
    recover_30d_prob: roundTo(recover30Count / validEntries.length, 8),
    recover_60d_prob: roundTo(recover60Count / validEntries.length, 8),
    avg_recovery_days: avgRecoveryDays,
  }
}

function computeBottomProbability(drawdowns: number[]): BottomProbability {
  if (drawdowns.length === 0) {
    return {
      current_drawdown: 0,
      percentile: 0,
      deeper_probability: 0,
    }
  }

  const currentDrawdown = drawdowns[drawdowns.length - 1]
  const marketPoints = drawdowns.length
  const deeperCount = drawdowns.filter(
    (value) => value < currentDrawdown
  ).length
  const percentile =
    drawdowns.filter((value) => value >= currentDrawdown).length / marketPoints

  return {
    current_drawdown: roundTo(currentDrawdown, 8),
    percentile: roundTo(percentile, 8),
    deeper_probability: roundTo(deeperCount / marketPoints, 8),
  }
}

function computeFxImpact(
  usdSummary: SummaryRow | null,
  krwSummary: SummaryRow
): FxImpact | null {
  if (!usdSummary) {
    return null
  }

  const totalDrawdown = krwSummary.current_drawdown
  const stockContribution = usdSummary.current_drawdown
  const fxContribution = totalDrawdown - stockContribution

  return {
    total_drawdown: roundTo(totalDrawdown, 8),
    stock_contribution: roundTo(stockContribution, 8),
    fx_contribution: roundTo(fxContribution, 8),
  }
}

function buildRawRows(
  asset: AssetType,
  prices: PriceCandle[],
  fxByDate: Map<string, number> | null
): RawRow[] {
  const rows: RawRow[] = []

  // 환율 데이터를 날짜순으로 정렬된 배열로 변환 (날짜 미일치 대비)
  const fxEntries = fxByDate
    ? Array.from(fxByDate.entries())
        .filter(([, rate]) => rate > 0)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    : []

  let peakKrw = Number.NEGATIVE_INFINITY

  for (let i = 0; i < prices.length; i += 1) {
    const price = prices[i]
    if (price.close <= 0) continue

    let currentFx: number | null = null
    if (fxByDate) {
      // 1. 정확한 날짜 매칭 시도
      const exactFx = fxByDate.get(price.date)
      if (exactFx !== undefined && exactFx > 0) {
        currentFx = exactFx
      } else {
        // 2. 일치하는 날짜가 없으면 해당 날짜 이전의 가장 최근 환율 찾기
        for (let j = fxEntries.length - 1; j >= 0; j--) {
          if (fxEntries[j][0] <= price.date) {
            currentFx = fxEntries[j][1]
            break
          }
        }
        // 3. 이전 데이터도 없으면 가장 가까운 미래 환율이라도 사용
        if (!currentFx && fxEntries.length > 0) {
          currentFx = fxEntries[0][1]
        }
      }
    }

    // 환율이 필요한데 끝까지 못 찾은 경우에만 스킵
    if (asset !== 'KR_STOCK' && (!currentFx || currentFx <= 0)) {
      continue
    }

    const closeKrw =
      asset === 'KR_STOCK' ? price.close : price.close * (currentFx ?? 0)

    // 데이터 오류 방어: 가격이 0 이하이거나, 환율이 적용된 원화 가격이 0에 너무 가까운 경우 제외
    if (closeKrw <= 0.001) continue

    // 추가 방어: 이전 가격 대비 비정상적인 급락(예: 90% 이상)이 발생한 경우 데이터 오류로 간주 (Major index 기준)
    // 단, 첫 번째 데이터는 비교 대상이 없으므로 통과
    if (rows.length > 0) {
      const prevKrw = rows[rows.length - 1].close_krw
      const dropRatio = (closeKrw - prevKrw) / prevKrw
      if (dropRatio < -0.9) {
        continue // 90% 이상 하루/한달만에 폭락하는 경우는 데이터 오류로 간주하고 스킵
      }
    }

    peakKrw = Math.max(peakKrw, closeKrw)
    const drawdownKrw = peakKrw === 0 ? 0 : (closeKrw - peakKrw) / peakKrw

    const prevClose = rows.length > 0 ? rows[rows.length - 1].close : null
    const changePercent =
      prevClose === null ? null : price.close / prevClose - 1

    rows.push({
      date: price.date,
      open: roundTo(price.open, 4),
      high: roundTo(price.high, 4),
      low: roundTo(price.low, 4),
      close: roundTo(price.close, 4),
      volume: price.volume,
      change_percent: changePercent === null ? null : roundTo(changePercent, 8),
      peak: 0,
      drawdown: 0,
      fx_usdkrw: asset === 'KR_STOCK' ? null : roundTo(currentFx ?? 0, 4),
      close_krw: roundTo(closeKrw, 4),
      peak_krw: roundTo(peakKrw, 4),
      drawdown_krw: roundTo(drawdownKrw, 8),
    })
  }

  // USD 기반 피크 및 낙폭 재계산 (필터링된 데이터 기준)
  const finalCloses = rows.map((r) => r.close)
  const finalPeaks = buildPeaks(finalCloses)
  const finalDrawdowns = buildDrawdowns(finalCloses, finalPeaks)

  rows.forEach((row, i) => {
    row.peak = roundTo(finalPeaks[i], 4)
    row.drawdown = roundTo(finalDrawdowns[i], 8)
  })

  return rows
}

function computeBuySignal(
  drawdowns: number[],
  closes: number[],
  interval: IntervalType
): BuySignal {
  if (drawdowns.length === 0) {
    return {
      level: 2,
      label: '데이터 부족',
      description: '분석할 데이터가 충분하지 않습니다.',
      color: '#94a3b8',
      score: 0,
      historical_return_6m: null,
      historical_return_1y: null,
      win_rate_1y: null,
    }
  }

  const currentDd = drawdowns[drawdowns.length - 1]
  const marketPoints = drawdowns.length
  // 백분위: 낮을수록(0에 가까울수록) 고점, 높을수록(1에 가까울수록) 저점
  const percentile =
    drawdowns.filter((value) => value >= currentDd).length / marketPoints

  let level: 1 | 2 | 3 | 4 | 5 = 2
  let label = '평이'
  let description = '현재 가격은 역사적 평균 수준입니다.'
  let color = '#94a3b8'

  if (percentile <= 0.2) {
    level = 1
    label = '과열 주의'
    description = '전고점 부근입니다. 신규 매수에 주의가 필요합니다.'
    color = '#ef4444'
  } else if (percentile <= 0.6) {
    level = 2
    label = '평이'
    description = '일상적인 변동성 범위 내에 있습니다.'
    color = '#64748b'
  } else if (percentile <= 0.85) {
    level = 3
    label = '분할매수 추천'
    description =
      '유의미한 조정이 발생했습니다. 분할 매수를 시작하기 좋은 시점입니다.'
    color = '#0ea5e9'
  } else if (percentile <= 0.95) {
    level = 4
    label = '공격적 매수'
    description =
      '강한 하락장입니다. 역사적으로 높은 수익률을 기대할 수 있는 구간입니다.'
    color = '#2563eb'
  } else {
    level = 5
    label = '역사적 기회'
    description =
      '역사적 최저점 수준입니다. 공포를 매수 기회로 삼을 시점입니다.'
    color = '#7c3aed'
  }

  // 과거 유사 낙폭 구간(현재 낙폭 ±2%)에서의 이후 수익률 계산
  const tradingDaysPerPoint = interval === '1d' ? 1 : interval === '1w' ? 5 : 21
  const points6m = Math.ceil(126 / tradingDaysPerPoint)
  const points1y = Math.ceil(252 / tradingDaysPerPoint)

  // 1. 기저 데이터 계산 (전체 기간 평균)
  let totalWins1y = 0
  let totalSum1y = 0
  let totalCount1y = 0
  for (let i = 0; i < drawdowns.length - points1y; i++) {
    const ret1y = closes[i + points1y] / closes[i] - 1
    if (ret1y > 0) totalWins1y++
    totalSum1y += ret1y
    totalCount1y++
  }
  const baselineWinRate = totalCount1y > 0 ? totalWins1y / totalCount1y : null
  const baselineReturn = totalCount1y > 0 ? totalSum1y / totalCount1y : null

  // 2. 독립 이벤트 기반 샘플링 (중복 제거)
  const similarIndices: number[] = []
  const range = 0.02
  const minIntervalBetweenEvents = Math.ceil(20 / tradingDaysPerPoint) // 최소 20거래일 간격

  let lastSampleIdx = -9999
  for (let i = 0; i < drawdowns.length - points1y; i++) {
    if (Math.abs(drawdowns[i] - currentDd) <= range) {
      // 마지막 샘플로부터 일정 기간이 지났을 때만 새로운 이벤트로 기록
      if (i - lastSampleIdx >= minIntervalBetweenEvents) {
        similarIndices.push(i)
        lastSampleIdx = i
      }
    }
  }

  let avg6m = null
  let avg1y = null
  let winRate1y = null
  let worst1y = null
  let best1y = null

  if (similarIndices.length > 0) {
    let sum6m = 0
    let sum1y = 0
    let wins1y = 0
    const returns1y: number[] = []

    similarIndices.forEach((idx) => {
      const ret6m = closes[idx + points6m] / closes[idx] - 1
      const ret1y = closes[idx + points1y] / closes[idx] - 1
      sum6m += ret6m
      sum1y += ret1y
      returns1y.push(ret1y)
      if (ret1y > 0) wins1y++
    })

    avg6m = roundTo(sum6m / similarIndices.length, 8)
    avg1y = roundTo(sum1y / similarIndices.length, 8)
    winRate1y = roundTo(wins1y / similarIndices.length, 8)
    worst1y = roundTo(Math.min(...returns1y), 8)
    best1y = roundTo(Math.max(...returns1y), 8)
  }

  return {
    level,
    label,
    description,
    color,
    score: Math.round(percentile * 100),
    sample_size: similarIndices.length,
    historical_return_6m: avg6m,
    historical_return_1y: avg1y,
    worst_return_1y: worst1y,
    best_return_1y: best1y,
    win_rate_1y: winRate1y,
    baseline_win_rate_1y:
      baselineWinRate !== null ? roundTo(baselineWinRate, 8) : null,
    baseline_return_1y:
      baselineReturn !== null ? roundTo(baselineReturn, 8) : null,
  }
}

export async function buildRawResponse(params: {
  asset: AssetType
  symbol: string
  from: string
  to: string
  interval: IntervalType
  fx: 'USDKRW'
}): Promise<RawApiResponse> {
  const inferredAsset = inferAssetFromSymbol(params.symbol)
  const asset = params.asset === inferredAsset ? params.asset : inferredAsset

  const priceResult = await getPrices({
    asset,
    symbol: params.symbol,
    from: params.from,
    to: params.to,
    interval: params.interval,
  })

  const useFx = needsFx(asset)
  const fxResult = useFx
    ? await getFx({
        pair: params.fx,
        from: params.from,
        to: params.to,
        interval: params.interval,
      })
    : null

  const fxByDate = useFx
    ? new Map((fxResult?.rows ?? []).map((row) => [row.date, row.rate]))
    : null
  const rawRows = buildRawRows(asset, priceResult.rows, fxByDate)

  const dates = rawRows.map((row) => row.date)
  const usdCloses = rawRows.map((row) => row.close)
  // const usdPeaks = rawRows.map((row) => row.peak)
  const usdDrawdowns = rawRows.map((row) => row.drawdown)
  const krwCloses = rawRows.map((row) => row.close_krw)
  // const krwPeaks = rawRows.map((row) => row.peak_krw)
  const krwDrawdowns = rawRows.map((row) => row.drawdown_krw)

  const listingInfo = await getListingInfo({
    symbol: params.symbol,
    asset,
  }).catch(() => null)

  const validationUsd = useFx
    ? validateDrawdownFormula(
        rawRows.map((row) => ({
          close: row.close,
          peak: row.peak,
          drawdown: row.drawdown,
        }))
      )
    : null

  const validationKrw = validateDrawdownFormula(
    rawRows.map((row) => ({
      close: row.close_krw,
      peak: row.peak_krw,
      drawdown: row.drawdown_krw,
    }))
  )

  const source = mergeDataSource(priceResult.source, fxResult?.source ?? null)
  const cumulativeUsd = useFx ? buildCumulative(usdCloses) : null
  const cumulativeKrw = buildCumulative(krwCloses)
  const summaryUsd = useFx
    ? // ? buildSummary(dates, usdCloses, usdDrawdowns, usdPeaks)
      buildSummary(dates, usdCloses, usdDrawdowns)
    : null
  // const summaryKrw = buildSummary(dates, krwCloses, krwDrawdowns, krwPeaks)
  const summaryKrw = buildSummary(dates, krwCloses, krwDrawdowns)
  const analyticsUsd = useFx
    ? {
        recovery_forecast: computeRecoveryForecast(
          usdDrawdowns,
          params.interval
        ),
        bottom_probability: computeBottomProbability(usdDrawdowns),
        fx_impact: null,
      }
    : null
  const analyticsKrw = {
    recovery_forecast: computeRecoveryForecast(krwDrawdowns, params.interval),
    bottom_probability: computeBottomProbability(krwDrawdowns),
    fx_impact: useFx ? computeFxImpact(summaryUsd, summaryKrw) : null,
  }

  return {
    meta: {
      asset,
      symbol: params.symbol,
      from: params.from,
      to: params.to,
      interval: params.interval,
      fx: params.fx,
      data_source: source,
      listing_date: listingInfo?.listing_date ?? dates[0] ?? params.from,
    },
    buy_signal: {
      usd: useFx
        ? computeBuySignal(usdDrawdowns, usdCloses, params.interval)
        : null,
      krw: computeBuySignal(krwDrawdowns, krwCloses, params.interval),
    },
    validation: {
      formula: {
        peak: 'peak[t] = max(close[start..t])',
        drawdown: 'dd[t] = (close[t] - peak[t]) / peak[t]',
        mdd: 'MDD = min(dd[t])',
        recovery: 'recovery(L) = count(dd[t] >= L) / N',
      },
      usd: validationUsd,
      krw: validationKrw,
      note: [
        '외부 사이트와 값 차이는 데이터 소스, 수정주가 반영 여부, 거래일 캘린더 차이로 발생할 수 있습니다.',
        '이 화면의 dd/MDD/회복율은 고정 공식으로 계산됩니다.',
      ],
    },
    summary: {
      usd: summaryUsd,
      krw: summaryKrw,
    },
    recovery: {
      usd: useFx ? buildRecovery(usdDrawdowns, params.interval) : null,
      krw: buildRecovery(krwDrawdowns, params.interval),
    },
    charts: {
      mdd_usd: useFx ? toChartPoints(dates, usdDrawdowns) : null,
      mdd_krw: toChartPoints(dates, krwDrawdowns),
      cumulative_usd:
        useFx && cumulativeUsd ? toChartPoints(dates, cumulativeUsd) : null,
      cumulative_krw: toChartPoints(dates, cumulativeKrw),
    },
    analytics: {
      usd: analyticsUsd,
      krw: analyticsKrw,
    },
    raw: rawRows,
  }
}
