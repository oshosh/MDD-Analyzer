import { assertDateRange } from '@/lib/date'
import { roundTo } from '@/lib/format'
import { createServerApiClient } from '@/lib/http/axios'
import { isHttpApiError } from '@/lib/http/error'
import type {
  AssetType,
  DataSourceType,
  FxPoint,
  Instrument,
  IntervalType,
  PriceCandle,
} from '@/lib/types'

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>
          high?: Array<number | null>
          low?: Array<number | null>
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
      meta?: {
        firstTradeDate?: number
      }
    }> | null
  }
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string
    shortname?: string
    longname?: string
    quoteType?: string
  }>
}

interface SourcedRows<T> {
  rows: T[]
  source: Exclude<DataSourceType, 'MIXED'>
}

const DEFAULT_INSTRUMENTS: Instrument[] = [
  { asset: 'US_STOCK', symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { asset: 'US_STOCK', symbol: 'BTCUSD', name: 'Bitcoin USD' },
  { asset: 'KR_STOCK', symbol: '005930', name: 'Samsung Electronics' },
  { asset: 'KR_STOCK', symbol: '000660', name: 'SK Hynix' },
  { asset: 'GOLD', symbol: 'GCW00', name: 'Gold Futures' },
  { asset: 'FX', symbol: 'USDKRW', name: 'USD/KRW' },
]

interface MemoryCacheEntry<T> {
  value: T
  expires_at: number
}

const memoryCache = new Map<string, MemoryCacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()
const serverApi = createServerApiClient()

function nowMs(): number {
  return Date.now()
}

function toStableParamString(params: Record<string, string>): string {
  const entries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  return entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')
}

function readCache<T>(key: string): T | null {
  const hit = memoryCache.get(key)
  if (!hit) {
    return null
  }
  if (hit.expires_at < nowMs()) {
    memoryCache.delete(key)
    return null
  }
  return hit.value as T
}

function writeCache<T>(key: string, value: T, ttlMs: number): void {
  memoryCache.set(key, {
    value,
    expires_at: nowMs() + ttlMs,
  })

  if (memoryCache.size > 800) {
    for (const [cacheKey, entry] of memoryCache.entries()) {
      if (entry.expires_at < nowMs()) {
        memoryCache.delete(cacheKey)
      }
    }
    while (memoryCache.size > 600) {
      const first = memoryCache.keys().next().value
      if (!first) {
        break
      }
      memoryCache.delete(first)
    }
  }
}

async function withInFlight<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }

  const task = loader().finally(() => {
    inFlight.delete(key)
  }) as Promise<T>
  inFlight.set(key, task)
  return task
}

function getProxyBaseUrl(): string | null {
  const value = process.env.INVESTING_PROXY_URL?.trim()
  if (!value) {
    return null
  }
  return value.endsWith('/') ? value.slice(0, -1) : value
}

async function fetchProxyJson<T>(
  path: string,
  params: Record<string, string>
): Promise<T | null> {
  const baseUrl = getProxyBaseUrl()
  if (!baseUrl) {
    return null
  }

  const cacheKey = `proxy:${path}?${toStableParamString(params)}`
  const cached = readCache<T>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    return await withInFlight(cacheKey, async () => {
      const proxyApi = createServerApiClient(baseUrl)
      const response = await proxyApi.get<T>(path, { params })
      const payload = response.data
      writeCache(cacheKey, payload, 60_000)
      return payload
    })
  } catch {
    return null
  }
}

function toUnixSecond(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00.000Z`).getTime() / 1000)
}

function toIsoDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function toYahooInterval(interval: IntervalType): '1d' | '1wk' | '1mo' {
  if (interval === '1w') {
    return '1wk'
  }
  if (interval === '1m') {
    return '1mo'
  }
  return '1d'
}

export function inferAssetFromSymbol(symbol: string): AssetType {
  const upper = symbol.trim().toUpperCase()
  if (/^\d{6}$/.test(upper) || upper.endsWith('.KS') || upper.endsWith('.KQ')) {
    return 'KR_STOCK'
  }
  if (
    upper === 'GCW00' ||
    upper === 'XAUUSD' ||
    upper === 'GC=F' ||
    upper === 'GOLD'
  ) {
    return 'GOLD'
  }
  return 'US_STOCK'
}

export function needsFx(asset: AssetType): boolean {
  return asset === 'US_STOCK' || asset === 'GOLD'
}

function resolveYahooSymbol(asset: AssetType, symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  if (asset === 'KR_STOCK') {
    if (upper.endsWith('.KS') || upper.endsWith('.KQ')) {
      return upper
    }
    if (/^\d{6}$/.test(upper)) {
      return `${upper}.KS`
    }
    return upper
  }
  if (
    asset === 'GOLD' &&
    (upper === 'GCW00' || upper === 'XAUUSD' || upper === 'GOLD')
  ) {
    return 'GC=F'
  }
  if (upper === 'BTCUSD') {
    return 'BTC-USD'
  }
  return upper
}

function inferAssetFromYahooSearchSymbol(
  symbol: string,
  quoteType?: string
): AssetType {
  const upper = symbol.toUpperCase()
  if (
    upper === 'GC=F' ||
    upper === 'XAUUSD' ||
    upper === 'GCW00' ||
    upper === 'GOLD'
  ) {
    return 'GOLD'
  }
  if (
    /^\d{6}(\.KS|\.KQ)?$/.test(upper) ||
    upper.endsWith('.KS') ||
    upper.endsWith('.KQ')
  ) {
    return 'KR_STOCK'
  }
  if (quoteType === 'FUTURE' && upper.includes('GC')) {
    return 'GOLD'
  }
  return 'US_STOCK'
}

async function fetchYahooChart(
  yahooSymbol: string,
  from: string,
  to: string,
  interval: IntervalType
): Promise<PriceCandle[]> {
  assertDateRange(from, to)

  const cacheKey = `yahoo:chart:${yahooSymbol}:${from}:${to}:${interval}`
  const cached = readCache<PriceCandle[]>(cacheKey)
  if (cached) {
    return cached
  }

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`
  )
  url.searchParams.set('interval', toYahooInterval(interval))
  url.searchParams.set('period1', String(toUnixSecond(from)))
  url.searchParams.set('period2', String(toUnixSecond(to) + 86400))
  url.searchParams.set('events', 'history')

  return withInFlight(cacheKey, async () => {
    let payload: YahooChartResponse
    try {
      const response = await serverApi.get<YahooChartResponse>(url.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0',
          accept: 'application/json',
        },
      })
      payload = response.data
    } catch (error) {
      if (isHttpApiError(error) && error.status === 404) {
        throw new Error('Not Found')
      }
      const status = isHttpApiError(error) ? error.status : 500
      throw new Error(`Yahoo request failed: ${status}`)
    }

    const result = payload.chart.result?.[0]
    const quote = result?.indicators?.quote?.[0]
    const timestamps = result?.timestamp ?? []
    if (!quote) {
      throw new Error('Not Found')
    }

    const rows: PriceCandle[] = []
    const isFx = yahooSymbol.includes('KRW=X') || yahooSymbol.includes('USDKRW')

    for (let i = 0; i < timestamps.length; i += 1) {
      const open = quote.open?.[i]
      const high = quote.high?.[i]
      const low = quote.low?.[i]
      const close = quote.close?.[i]

      if (
        open === null ||
        open === undefined ||
        open <= 0 ||
        high === null ||
        high === undefined ||
        high <= 0 ||
        low === null ||
        low === undefined ||
        low <= 0 ||
        close === null ||
        close === undefined ||
        close <= 0
      ) {
        continue
      }

      // 환율 데이터인데 상식 밖의 값(예: 1.0)인 경우 필터링
      if (isFx && close < 500) {
        continue
      }

      rows.push({
        date: toIsoDate(timestamps[i]),
        open: roundTo(open, 4),
        high: roundTo(high, 4),
        low: roundTo(low, 4),
        close: roundTo(close, 4),
        volume: Math.max(0, Math.round(quote.volume?.[i] ?? 0)),
      })
    }

    rows.sort((a, b) => a.date.localeCompare(b.date))
    writeCache(cacheKey, rows, 5 * 60_000)
    return rows
  })
}

async function searchYahoo(query: string): Promise<Instrument[]> {
  const cacheKey = `yahoo:search:${query.toUpperCase()}`
  const cached = readCache<Instrument[]>(cacheKey)
  if (cached) {
    return cached
  }

  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search')
  url.searchParams.set('q', query)
  url.searchParams.set('quotesCount', '20')
  url.searchParams.set('newsCount', '0')

  const rows = await withInFlight(cacheKey, async () => {
    let payload: YahooSearchResponse
    try {
      const response = await serverApi.get<YahooSearchResponse>(
        url.toString(),
        {
          headers: {
            'user-agent': 'Mozilla/5.0',
            accept: 'application/json',
          },
        }
      )
      payload = response.data
    } catch (error) {
      const status = isHttpApiError(error) ? error.status : 500
      throw new Error(`Yahoo search failed: ${status}`)
    }

    const quotes = payload.quotes ?? []

    return quotes
      .filter((quote) => quote.symbol && (quote.shortname || quote.longname))
      .map((quote) => {
        const symbol = quote.symbol!
        const asset = inferAssetFromYahooSearchSymbol(symbol, quote.quoteType)
        const name = quote.longname ?? quote.shortname ?? symbol

        if (asset === 'KR_STOCK' && symbol.endsWith('.KS')) {
          return { asset, symbol: symbol.replace(/\.KS$/i, ''), name }
        }
        if (asset === 'GOLD' && symbol === 'GC=F') {
          return { asset, symbol: 'GCW00', name }
        }
        if (symbol === 'BTC-USD') {
          return { asset: 'US_STOCK' as const, symbol: 'BTCUSD', name }
        }
        return { asset, symbol, name }
      })
  })
  writeCache(cacheKey, rows, 5 * 60_000)
  return rows
}

async function fetchYahooListingDate(
  asset: AssetType,
  symbol: string
): Promise<string> {
  const yahooSymbol = resolveYahooSymbol(asset, symbol)
  const cacheKey = `yahoo:listing:${yahooSymbol}`
  const cached = readCache<string>(cacheKey)
  if (cached) {
    return cached
  }

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`
  )
  url.searchParams.set('range', 'max')
  url.searchParams.set('interval', '1d')
  url.searchParams.set('events', 'history')

  const listingDate = await withInFlight(cacheKey, async () => {
    let payload: YahooChartResponse
    try {
      const response = await serverApi.get<YahooChartResponse>(url.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0',
          accept: 'application/json',
        },
      })
      payload = response.data
    } catch (error) {
      if (isHttpApiError(error) && error.status === 404) {
        throw new Error('Not Found')
      }
      const status = isHttpApiError(error) ? error.status : 500
      throw new Error(`Yahoo request failed: ${status}`)
    }

    const result = payload.chart.result?.[0]
    const firstTradeDate =
      result?.meta?.firstTradeDate ?? result?.timestamp?.[0]
    if (!firstTradeDate) {
      throw new Error('Not Found')
    }
    return toIsoDate(firstTradeDate)
  })

  writeCache(cacheKey, listingDate, 24 * 60 * 60_000)
  return listingDate
}

export async function searchInstruments(query: string): Promise<Instrument[]> {
  const normalized = query.trim()
  if (normalized.length === 0) {
    return DEFAULT_INSTRUMENTS
  }

  const proxy = await fetchProxyJson<{ rows: Instrument[] }>('/search', {
    q: normalized,
  })
  if (proxy?.rows?.length) {
    return proxy.rows
  }

  const yahoo = await searchYahoo(normalized)
  if (yahoo.length) {
    return yahoo
  }

  const q = normalized.toLowerCase()
  return DEFAULT_INSTRUMENTS.filter(
    (row) =>
      row.symbol.toLowerCase().includes(q) || row.name.toLowerCase().includes(q)
  )
}

export async function getPrices(params: {
  asset: AssetType
  symbol: string
  from: string
  to: string
  interval: IntervalType
}): Promise<SourcedRows<PriceCandle>> {
  const inferredAsset = inferAssetFromSymbol(params.symbol)
  const asset = inferredAsset === params.asset ? params.asset : inferredAsset

  const proxy = await fetchProxyJson<{ rows: PriceCandle[] }>('/prices', {
    asset,
    symbol: params.symbol,
    from: params.from,
    to: params.to,
    interval: params.interval,
  })
  if (proxy?.rows?.length) {
    return { rows: proxy.rows, source: 'INVESTING_PROXY' }
  }

  const rows = await fetchYahooChart(
    resolveYahooSymbol(asset, params.symbol),
    params.from,
    params.to,
    params.interval
  )
  return { rows, source: 'YAHOO' }
}

export async function getFx(params: {
  pair: string
  from: string
  to: string
  interval: IntervalType
}): Promise<SourcedRows<FxPoint>> {
  assertDateRange(params.from, params.to)
  if (params.pair !== 'USDKRW') {
    throw new Error('Not Found')
  }

  const proxy = await fetchProxyJson<{ rows: FxPoint[] }>('/fx', {
    pair: params.pair,
    from: params.from,
    to: params.to,
    interval: params.interval,
  })
  if (proxy?.rows?.length) {
    return { rows: proxy.rows, source: 'INVESTING_PROXY' }
  }

  const rows = await fetchYahooChart(
    'KRW=X',
    params.from,
    params.to,
    params.interval
  )
  return {
    rows: rows.map((row) => ({ date: row.date, rate: row.close })),
    source: 'YAHOO',
  }
}

export async function getListingInfo(params: {
  symbol: string
  asset?: AssetType
}): Promise<{
  symbol: string
  asset: AssetType
  listing_date: string
  source: Exclude<DataSourceType, 'MIXED'>
}> {
  const symbol = params.symbol.trim().toUpperCase()
  const inferredAsset = inferAssetFromSymbol(symbol)
  const asset =
    params.asset && params.asset === inferredAsset
      ? params.asset
      : inferredAsset

  const proxy = await fetchProxyJson<{ listing_date: string }>('/listing', {
    asset,
    symbol,
  })
  if (proxy?.listing_date) {
    return {
      symbol,
      asset,
      listing_date: proxy.listing_date,
      source: 'INVESTING_PROXY',
    }
  }

  const listingDate = await fetchYahooListingDate(asset, symbol)
  return {
    symbol,
    asset,
    listing_date: listingDate,
    source: 'YAHOO',
  }
}
