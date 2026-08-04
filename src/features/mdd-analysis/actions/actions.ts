'use server'

import { buildRawResponse } from '@/server/services/rawBuilder'
import { RawQuerySchema } from '@/server/services/requestSchema'
import { readJsonCache, writeJsonCache } from '@/server/services/serverCache'
import { fetchKrStockIntegration } from '@/server/services/krStockService'
import { searchInstruments } from '@/server/services/marketData'
import type { RawApiResponse } from '@entities/mdd'
import type { KrStockIntegrationData } from '@entities/kr-stock'
import type { MddQueryInput } from '../schemas/schemas'

function toCacheKey(params: {
  asset: string
  symbol: string
  from: string
  to: string
  interval: string
  fx: string
}): string {
  return [
    'raw_api_v1',
    params.asset.toUpperCase(),
    params.symbol.toUpperCase(),
    params.from,
    params.to,
    params.interval,
    params.fx,
  ].join(':')
}

export async function getMddRawAction(params: MddQueryInput): Promise<RawApiResponse> {
  const parsed = RawQuerySchema.safeParse({
    asset: 'US_STOCK',
    symbol: params.symbol,
    from: params.from,
    to: params.to,
    interval: params.interval,
    fx: 'USDKRW',
  })

  if (!parsed.success) {
    console.error('getMddRawAction parse error:', parsed.error.format())
    throw new Error(`Invalid MDD query parameters: ${parsed.error.message}`)
  }

  const cacheKey = toCacheKey(parsed.data)
  const cached = await readJsonCache<RawApiResponse>(cacheKey)
  if (cached) {
    return cached
  }

  const response = await buildRawResponse(parsed.data)
  await writeJsonCache(cacheKey, response, 120)
  return response
}

export async function getKrStockIntegrationAction(
  code: string
): Promise<KrStockIntegrationData> {
  if (!code || !/^\d{6}$/.test(code)) {
    throw new Error('Invalid 6-digit stock code')
  }
  return await fetchKrStockIntegration(code)
}

export interface KrPriceResponse {
  stockCode: string
  stockName: string
  closePrice: string
  compareToPreviousPriceText: string
  fluctuationsRatio: string
  isRising: boolean
  isFalling: boolean
  fetchedAt: string
}

export async function getKrStockPriceAction(
  code: string
): Promise<KrPriceResponse> {
  if (!code || !/^\d{6}$/.test(code)) {
    throw new Error('Invalid 6-digit stock code')
  }
  const integration = await fetchKrStockIntegration(code)
  return {
    stockCode: integration.stockCode,
    stockName: integration.stockName || code,
    closePrice: integration.closePrice,
    compareToPreviousPriceText: integration.compareToPreviousPriceText,
    fluctuationsRatio: integration.fluctuationsRatio,
    isRising: integration.isRising,
    isFalling: integration.isFalling,
    fetchedAt: integration.fetchedAt,
  }
}

export async function searchSymbolsAction(query: string) {
  if (!query || query.trim().length === 0) {
    return []
  }
  return await searchInstruments(query)
}
