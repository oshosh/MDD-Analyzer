import type { AssetType, DataSourceType, IntervalType } from '@entities/instrument'

export interface RawRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change_percent: number | null
  peak: number
  drawdown: number
  fx_usdkrw: number | null
  close_krw: number
  peak_krw: number
  drawdown_krw: number
}

export interface SummaryRow {
  start_price: number
  current_price: number
  cumulative_return: number
  ath: number
  current_drawdown: number
  mdd: number
  max_drawdown_date: string
  sharpe_ratio: number
  sortino_ratio: number
}

export interface RecoveryRow {
  range_label: string
  recovery_rate: number
  condition_points: number
  market_points: number
  condition_days: number
  market_days: number
}

export interface RecoveryForecast {
  current_drawdown: number
  sample_count: number
  recover_30d_prob: number
  recover_60d_prob: number
  avg_recovery_days: number | null
}

export interface FxImpact {
  total_drawdown: number
  stock_contribution: number
  fx_contribution: number
}

export interface BottomProbability {
  current_drawdown: number
  percentile: number
  deeper_probability: number
}

export interface ChartPoint {
  date: string
  value: number
}

export interface DrawdownCycle {
  peakDate: string
  peakPrice: number
  troughDate: string
  troughPrice: number
  drawdown: number
  isCurrent: boolean
}

export interface BuySignal {
  level: 1 | 2 | 3 | 4 | 5
  label: string
  description: string
  color: string
  score: number
  sample_size?: number
  historical_return_6m: number | null
  historical_return_1y: number | null
  worst_return_1y: number | null
  best_return_1y: number | null
  win_rate_1y: number | null
  baseline_win_rate_1y: number | null
  baseline_return_1y: number | null
}

export interface RawApiResponse {
  meta: {
    asset: AssetType
    symbol: string
    name?: string
    from: string
    to: string
    interval: IntervalType
    fx: 'USDKRW'
    data_source: DataSourceType
    listing_date: string
  }
  buy_signal: {
    usd: BuySignal | null
    krw: BuySignal
  }
  validation: {
    formula: {
      peak: string
      drawdown: string
      mdd: string
      recovery: string
    }
    usd: {
      passed: boolean
      max_abs_error: number
    } | null
    krw: {
      passed: boolean
      max_abs_error: number
    }
    note: string[]
  }
  summary: {
    usd: SummaryRow | null
    krw: SummaryRow
  }
  recovery: {
    usd: RecoveryRow[] | null
    krw: RecoveryRow[]
  }
  charts: {
    mdd_usd: ChartPoint[] | null
    mdd_krw: ChartPoint[]
    cumulative_usd: ChartPoint[] | null
    cumulative_krw: ChartPoint[]
  }
  analytics: {
    usd: {
      recovery_forecast: RecoveryForecast
      bottom_probability: BottomProbability
      fx_impact: FxImpact | null
    } | null
    krw: {
      recovery_forecast: RecoveryForecast
      bottom_probability: BottomProbability
      fx_impact: FxImpact | null
    }
  }
  drawdown_cycles: {
    usd: DrawdownCycle[] | null
    krw: DrawdownCycle[]
  }
  raw: RawRow[]
}
