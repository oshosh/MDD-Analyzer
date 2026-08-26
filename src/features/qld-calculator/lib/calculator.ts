import type {
  QldAccountInput,
  QldCalculationResult,
  QldPriceCandle,
} from '../types'

export function calculateQldMetrics(
  input: QldAccountInput,
  candles: QldPriceCandle[]
): QldCalculationResult {
  const { shares, avgPrice, cash, livePrice } = input

  let ath = 0
  let sma120 = 0
  let vol20 = 0
  let isDowntrend = false

  if (candles.length > 0) {
    // 1. ATH
    for (const c of candles) {
      if (c.high > ath) ath = c.high
      if (c.close > ath) ath = c.close
    }

    // 2. 120-day SMA
    if (candles.length >= 120) {
      let sum = 0
      for (let i = candles.length - 120; i < candles.length; i++) {
        sum += candles[i].close
      }
      sma120 = sum / 120
    }

    // 3. 20-day Volatility
    if (candles.length >= 21) {
      const n = 20
      const rets: number[] = []
      for (let i = candles.length - n; i < candles.length; i++) {
        if (candles[i].close > 0 && candles[i - 1].close > 0) {
          rets.push(Math.log(candles[i].close / candles[i - 1].close))
        }
      }
      if (rets.length >= 10) {
        const mu = rets.reduce((a, b) => a + b, 0) / rets.length
        const variance =
          rets.reduce((a, r) => a + (r - mu) ** 2, 0) / (rets.length - 1)
        vol20 = Math.sqrt(variance) * Math.sqrt(252)
      }
    }

    // 4. Downtrend detection (3 consecutive closes below 120 SMA)
    if (sma120 > 0 && candles.length >= 3) {
      const recent3 = candles.slice(-3)
      isDowntrend = recent3.every((c) => c.close < sma120)
    }
  }

  // Fallback for ATH if candles empty
  if (ath === 0 && livePrice > 0) {
    ath = livePrice
  }

  const stockVal = shares * livePrice
  const totalVal = stockVal + cash
  const weight = totalVal > 0 ? stockVal / totalVal : 0
  const mdd = ath > 0 && livePrice > 0 ? (livePrice - ath) / ath : 0

  // Determine dynamic bands
  const hasData = candles.length > 0
  const isDefenseMode = hasData && isDowntrend
  const bands = isDefenseMode
    ? { lower: 0.7, target: 0.75, upper: 0.85, mode: 'defense' as const }
    : { lower: 0.75, target: 0.8, upper: 0.88, mode: 'normal' as const }

  // Calculate needed deposits for deposit calculator
  const neededForTarget = Math.max(0, stockVal / bands.target - totalVal)
  const neededForLower = Math.max(0, stockVal / bands.lower - totalVal)

  // Order & Status calculation
  if (weight >= bands.upper) {
    // Check Loss Guard: if livePrice < avgPrice -> Loss block!
    if (livePrice < avgPrice) {
      const lossRate = ((livePrice - avgPrice) / avgPrice) * 100
      return {
        stockVal,
        totalVal,
        weight,
        mdd,
        ath,
        sma120,
        vol20,
        isDowntrend,
        bands,
        status: {
          type: 'upper_loss',
          title: `⚠️ [비중 과다 + 손실 구간] W ${(weight * 100).toFixed(1)}% ≥ ${(bands.upper * 100).toFixed(0)}%`,
          description: `현재가($${livePrice.toFixed(2)}) < 평단가($${avgPrice.toFixed(2)}) (손실률 ${lossRate.toFixed(1)}%). 확정 손실(손절) 매도는 절대 금지하며, 현금 추가 입금으로 비중을 조절하세요.`,
        },
        orders: {
          type: 'loss_blocked',
          neededForTarget,
          neededForLower,
        },
        depositCalc: {
          neededForTarget,
          neededForLower,
        },
      }
    }

    // Profit Zone Sell
    const profitRate = ((livePrice - avgPrice) / avgPrice) * 100
    const excessVal = stockVal - totalVal * bands.target
    const sellQty = Math.max(1, Math.floor(excessVal / livePrice))
    const sellRevenue = sellQty * livePrice

    return {
      stockVal,
      totalVal,
      weight,
      mdd,
      ath,
      sma120,
      vol20,
      isDowntrend,
      bands,
      status: {
        type: 'upper_profit',
        title: `🔴 [상단 과열 구간] W ${(weight * 100).toFixed(1)}% ≥ ${(bands.upper * 100).toFixed(0)}%`,
        description: `목표 비중(${(bands.target * 100).toFixed(0)}%) 초과분을 부분 익절(수익률 +${profitRate.toFixed(1)}%)하여 현금 20%를 복원합니다.`,
      },
      orders: {
        type: 'sell',
        sellQty,
        sellRevenue,
        profitRate,
      },
      depositCalc: {
        neededForTarget,
        neededForLower,
      },
    }
  }

  if (weight <= bands.lower) {
    const regimeMult = isDefenseMode ? 0.5 : 1.0
    const volMult = hasData && vol20 > 0.5 ? 0.5 : 1.0
    const combinedScale = Math.max(0.25, regimeMult * volMult)

    const cashFloor = totalVal * 0.05
    const availableCash = Math.max(0, cash - cashFloor)
    const floorActive = cash <= cashFloor

    const deployRatio = Math.min(0.3, 0.1 * (1 + 2 * Math.abs(mdd)))
    const rawBudget = availableCash * deployRatio
    const scaledBudget = rawBudget * combinedScale

    const totalBuyShares = floorActive
      ? 0
      : Math.max(
          2,
          Math.min(
            Math.floor(scaledBudget / livePrice),
            Math.floor(availableCash / livePrice)
          )
        )

    const buy1Qty = Math.ceil(totalBuyShares / 2)
    const buy2Qty = Math.floor(totalBuyShares / 2)
    const buy1Price = avgPrice
    const buy2Price = livePrice * 0.985
    const estSpent = buy1Qty * buy1Price + buy2Qty * buy2Price

    const modifiers: string[] = []
    if (regimeMult < 1) modifiers.push('🔴 하락 방어 ×0.5')
    if (volMult < 1) modifiers.push('⚡ 고변동성 ×0.5')
    if (floorActive) modifiers.push('🛡️ 현금 플로어 보호')

    return {
      stockVal,
      totalVal,
      weight,
      mdd,
      ath,
      sma120,
      vol20,
      isDowntrend,
      bands,
      status: {
        type: 'lower',
        title: `🔵 [하단 매집 구간] W ${(weight * 100).toFixed(1)}% ≤ ${(bands.lower * 100).toFixed(0)}%`,
        description: `비축된 현금을 투입하여 평단가를 낮춥니다. (낙폭 가중 ${(deployRatio * 100).toFixed(1)}% × 스케일 ${combinedScale.toFixed(2)})`,
      },
      orders: {
        type: 'buy',
        buy1Qty,
        buy1Price,
        buy2Qty,
        buy2Price,
        totalBuyShares,
        estSpent,
        modifiers,
        floorActive,
      },
      depositCalc: {
        neededForTarget,
        neededForLower,
      },
    }
  }

  // Normal Hold Zone
  return {
    stockVal,
    totalVal,
    weight,
    mdd,
    ath,
    sma120,
    vol20,
    isDowntrend,
    bands,
    status: {
      type: 'normal',
      title: `🟢 [정상 항해 구간] W ${(weight * 100).toFixed(1)}% (${(bands.lower * 100).toFixed(0)}% ~ ${(bands.upper * 100).toFixed(0)}% 유지)`,
      description: `목표 비중(${(bands.target * 100).toFixed(0)}%)이 이상적으로 유지되고 있습니다. 매수와 매도를 모두 쉬고 100% 홀딩합니다.`,
    },
    orders: {
      type: 'hold',
    },
    depositCalc: {
      neededForTarget,
      neededForLower,
    },
  }
}
