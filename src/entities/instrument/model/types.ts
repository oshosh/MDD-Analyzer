export const ASSET_TYPES = ['US_STOCK', 'KR_STOCK', 'GOLD'] as const
export type AssetType = (typeof ASSET_TYPES)[number]

export const INTERVALS = ['1d', '1w', '1m'] as const
export type IntervalType = (typeof INTERVALS)[number]

export interface Instrument {
  asset: AssetType | 'FX'
  symbol: string
  name: string
}

export type DataSourceType = 'INVESTING_PROXY' | 'YAHOO' | 'MIXED'

export interface PriceCandle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface FxPoint {
  date: string
  rate: number
}
