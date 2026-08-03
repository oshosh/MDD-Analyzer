import { readJsonCache, writeJsonCache } from './serverCache'
import type {
  DealTrendItem,
  IntradayForeignEstimate,
  KrStockIntegrationData,
} from '@/lib/types'

export type { DealTrendItem, IntradayForeignEstimate, KrStockIntegrationData }

function parseNumber(val: string | number | undefined): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  const cleaned = String(val).replace(/,/g, '').replace(/\+/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
} as const

/**
 * 네이버 금융 PC페이지(EUC-KR)의 거래원정보에서
 * 당일 외국계추정합 (매도량 총합, 매수량 총합)을 파싱한 후
 * 순매수량 = (매수량 - 매도량)을 정확히 수학적으로 계산합니다.
 */
async function fetchIntradayForeignEstimate(stockCode: string, currentPrice: number): Promise<IntradayForeignEstimate | null> {
  const nowKst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const todayBizdate = nowKst.toISOString().slice(0, 10).replace(/-/g, '')
  const fallback: IntradayForeignEstimate = {
    bizdate: todayBizdate,
    foreignSellQuant: 0,
    foreignBuyQuant: 0,
    foreignNetBuyQuant: 0,
    foreignNetBuyValue: 0,
  }

  try {
    const url = `https://finance.naver.com/item/frgn.naver?code=${stockCode}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!res.ok) return fallback

    const buffer = await res.arrayBuffer()
    const decoder = new TextDecoder('euc-kr')
    const html = decoder.decode(buffer)

    const foreignIdx = html.indexOf('외국계추정합')
    if (foreignIdx === -1) return fallback

    const section = html.slice(foreignIdx, foreignIdx + 600)
    const matches = [...section.matchAll(/<span[^>]*class="tah[^"]*"[^>]*>([+-]?[\d,]+)<\/span>/g)]
    if (matches.length >= 2) {
      // 1번째 수치: 매도량 총합
      const sellQuant = Math.abs(parseNumber(matches[0][1]))
      // 2번째 수치: 매수량 총합
      const buyQuant = Math.abs(parseNumber(matches[1][1]))
      // 정확한 순매수 계산 = (매수량 - 매도량)
      const netBuyQuant = buyQuant - sellQuant
      const netBuyValue = Math.round((netBuyQuant * currentPrice) / 100000000)

      return {
        bizdate: todayBizdate,
        foreignSellQuant: sellQuant,
        foreignBuyQuant: buyQuant,
        foreignNetBuyQuant: netBuyQuant,
        foreignNetBuyValue: netBuyValue,
      }
    }
    return fallback
  } catch (err) {
    console.error(`[krStockService] Intraday Foreign Estimate Error (${stockCode}):`, err)
    return fallback
  }
}

/**
 * 네이버 모바일 /api/stock/{code}/basic 엔드포인트에서
 * 실시간 현재가, 전일대비, 등락률, 등락방향을 가져옵니다.
 */
async function fetchNaverBasicPrice(stockCode: string): Promise<{
  closePrice: string
  closePriceNumber: number
  compareToPreviousPriceText: string
  compareToPreviousPriceNumber: number
  fluctuationsRatio: string
  isRising: boolean
  isFalling: boolean
  stockName: string
}> {
  const url = `https://m.stock.naver.com/api/stock/${stockCode}/basic`
  const res = await fetch(url, { headers: NAVER_HEADERS, cache: 'no-store' })

  if (!res.ok) {
    throw new Error(`Naver basic API HTTP error! status: ${res.status}`)
  }

  const raw = await res.json()
  const priceDirection = String(raw.compareToPreviousPrice?.name || '')

  return {
    closePrice: String(raw.closePrice || '0'),
    closePriceNumber: parseNumber(raw.closePrice),
    compareToPreviousPriceText: String(raw.compareToPreviousClosePrice || '0'),
    compareToPreviousPriceNumber: parseNumber(raw.compareToPreviousClosePrice),
    fluctuationsRatio: String(raw.fluctuationsRatio || '0'),
    isRising: priceDirection === 'RISING',
    isFalling: priceDirection === 'FALLING',
    stockName: String(raw.stockName || stockCode),
  }
}

/**
 * 한국 주식 종합 데이터를 가져옵니다.
 */
export async function fetchKrStockIntegration(stockCode: string): Promise<KrStockIntegrationData> {
  const cacheKey = `kr_stock_integration_v5_${stockCode}`
  const cached = await readJsonCache<KrStockIntegrationData>(cacheKey)
  if (cached) {
    return cached
  }

  // 1. 실시간 현재가 및 장중 거래원 추정치 수집
  const basicPrice = await fetchNaverBasicPrice(stockCode)
  const intradayEstimate = await fetchIntradayForeignEstimate(stockCode, basicPrice.closePriceNumber)

  // 2. 공시 확정 수급 이력 수집
  const integrationUrl = `https://m.stock.naver.com/api/stock/${stockCode}/integration`
  const integrationRes = await fetch(integrationUrl, {
    headers: NAVER_HEADERS,
    cache: 'no-store',
  })

  if (!integrationRes.ok) {
    throw new Error(`Naver integration API HTTP error! status: ${integrationRes.status}`)
  }

  const raw = await integrationRes.json()
  const stockName = String(raw.stockName || basicPrice.stockName || stockCode)
  const rawTrends = (raw.dealTrendInfos || []) as Array<Record<string, unknown>>

  // 공시 확정 5영업일 수급 데이터 파싱
  const dealTrends: DealTrendItem[] = rawTrends.map((item) => {
    const foreignerStr = String(item.foreignerPureBuyQuant || '0')
    const organStr = String(item.organPureBuyQuant || '0')
    const indivStr = String(item.individualPureBuyQuant || '0')
    const closeStr = String(item.closePrice || '0')

    const foreignerNum = parseNumber(foreignerStr)
    const organNum = parseNumber(organStr)
    const indivNum = parseNumber(indivStr)
    const closeNum = parseNumber(closeStr)

    const foreignerVal = Math.round((foreignerNum * closeNum) / 100000000)
    const organVal = Math.round((organNum * closeNum) / 100000000)
    const indivVal = Math.round((indivNum * closeNum) / 100000000)

    return {
      bizdate: String(item.bizdate || ''),
      foreignerPureBuyQuant: foreignerStr,
      foreignerPureBuyNumber: foreignerNum,
      foreignerBuyValueEstimated: foreignerVal,
      organPureBuyQuant: organStr,
      organPureBuyNumber: organNum,
      organBuyValueEstimated: organVal,
      individualPureBuyQuant: indivStr,
      individualPureBuyNumber: indivNum,
      individualBuyValueEstimated: indivVal,
      foreignerHoldRatio: String(item.foreignerHoldRatio || '0%'),
      closePrice: closeStr,
      closePriceNumber: closeNum,
      accumulatedTradingVolume: String(item.accumulatedTradingVolume || '0'),
    }
  }).slice(0, 5)

  // 종합 정보 파싱
  const totalInfosMap: Record<string, string> = {}
  if (Array.isArray(raw.totalInfos)) {
    for (const info of raw.totalInfos) {
      if (info && typeof info === 'object' && 'code' in info && 'value' in info) {
        totalInfosMap[String(info.code)] = String(info.value)
      }
    }
  }

  const result: KrStockIntegrationData = {
    stockCode,
    stockName,
    closePrice: basicPrice.closePrice,
    closePriceNumber: basicPrice.closePriceNumber,
    compareToPreviousPriceText: basicPrice.compareToPreviousPriceText,
    compareToPreviousPriceNumber: basicPrice.compareToPreviousPriceNumber,
    fluctuationsRatio: basicPrice.fluctuationsRatio,
    isRising: basicPrice.isRising,
    isFalling: basicPrice.isFalling,
    intradayEstimate,
    dealTrends,
    totalInfos: totalInfosMap,
    fetchedAt: new Date().toISOString(),
  }

  await writeJsonCache(cacheKey, result, 30)
  return result
}
