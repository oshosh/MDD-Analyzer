export interface DealTrendItem {
  bizdate: string
  foreignerPureBuyQuant: string
  foreignerPureBuyNumber: number
  foreignerBuyValueEstimated: number
  organPureBuyQuant: string
  organPureBuyNumber: number
  organBuyValueEstimated: number
  individualPureBuyQuant: string
  individualPureBuyNumber: number
  individualBuyValueEstimated: number
  foreignerHoldRatio: string
  closePrice: string
  closePriceNumber: number
  accumulatedTradingVolume: string
}

export interface IntradayForeignEstimate {
  bizdate: string
  foreignSellQuant: number
  foreignBuyQuant: number
  foreignNetBuyQuant: number
  foreignNetBuyValue: number
}

export interface KrStockIntegrationData {
  stockCode: string
  stockName: string
  closePrice: string
  closePriceNumber: number
  compareToPreviousPriceText: string
  compareToPreviousPriceNumber: number
  fluctuationsRatio: string
  isRising: boolean
  isFalling: boolean
  intradayEstimate: IntradayForeignEstimate | null
  dealTrends: DealTrendItem[]
  totalInfos: Record<string, string>
  fetchedAt: string
}
