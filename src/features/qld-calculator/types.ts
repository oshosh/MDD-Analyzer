export interface QldAccountInput {
  shares: number
  avgPrice: number
  cash: number
  livePrice: number
}

export interface QldPriceCandle {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export type QldBarInterval =
  | '1d' // 1일봉
  | '5d' // 5일봉
  | '1m' // 1달봉
  | '3m' // 3달봉 (분기봉)
  | '6m' // 6달봉 (반기봉)
  | '1y' // 1년봉
  | 'all' // 전체

export interface DailySimPoint {
  time: string // 'YYYY-MM-DD'
  qldClose: number
  totalDeposited: number // 누적 입금 원금 ($)
  
  // DCA Strategy (Strategy A)
  dcaTotalVal: number
  dcaShares: number
  dcaCash: number
  dcaMdd: number // DCA 최대 낙폭 (%)

  // EVH Strategy (Strategy B)
  evhTotalVal: number
  evhShares: number
  evhCash: number
  evhWeight: number
  evhMdd: number // EVH 최대 낙폭 (%)
  actionNote?: string
}

export interface QldCalculationResult {
  stockVal: number
  totalVal: number
  weight: number
  mdd: number
  ath: number
  sma120: number
  vol20: number
  isDowntrend: boolean
  bands: {
    lower: number
    target: number
    upper: number
    mode: 'normal' | 'defense'
  }
  status: {
    type: 'upper_loss' | 'upper_profit' | 'lower' | 'normal'
    title: string
    description: string
  }
  orders: {
    type: 'sell' | 'buy' | 'hold' | 'loss_blocked'
    sellQty?: number
    sellRevenue?: number
    profitRate?: number
    buy1Qty?: number
    buy1Price?: number
    buy2Qty?: number
    buy2Price?: number
    totalBuyShares?: number
    estSpent?: number
    modifiers?: string[]
    neededForTarget?: number
    neededForLower?: number
    floorActive?: boolean
  }
  depositCalc: {
    neededForTarget: number
    neededForLower: number
  }
}
