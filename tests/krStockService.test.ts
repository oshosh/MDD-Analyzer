import { describe, it, expect } from 'vitest'
import { fetchKrStockIntegration } from '../src/server/services/krStockService'

describe('krStockService Unit & Integration Test (Split Intraday & Official History)', () => {
  it('fetches intraday foreign estimate and official 5-day history for Samsung Electronics (005930)', { timeout: 15000 }, async () => {
    const data = await fetchKrStockIntegration('005930')

    expect(data).toBeDefined()
    expect(data.stockCode).toBe('005930')
    expect(data.stockName).toBe('삼성전자')
    expect(data.closePriceNumber).toBeGreaterThan(0)
    expect(data.dealTrends.length).toBeGreaterThanOrEqual(1)

    console.log('=== 삼성전자 (005930) 수급 검증 ===')
    console.log(`현재가: ${data.closePrice}원 (${data.fluctuationsRatio}%)`)

    if (data.intradayEstimate) {
      console.log('⚡ [장중 외국계 거래원 가집계 추정치]')
      console.log(`  외국계 매도 총합: ${data.intradayEstimate.foreignSellQuant.toLocaleString()}주`)
      console.log(`  외국계 매수 총합: ${data.intradayEstimate.foreignBuyQuant.toLocaleString()}주`)
      console.log(`  외국계 순매수량: ${data.intradayEstimate.foreignNetBuyQuant.toLocaleString()}주 (약 ${data.intradayEstimate.foreignNetBuyValue}억원)`)
    }

    console.log('\n📊 [공시 마감 5영업일 이력]')
    data.dealTrends.forEach((t) => {
      console.log(`  [${t.bizdate}] 외인: ${t.foreignerPureBuyQuant}주 (${t.foreignerBuyValueEstimated}억원) | 기관: ${t.organPureBuyQuant}주 | 개인: ${t.individualPureBuyQuant}주 | 종가: ${t.closePrice}원`)
    })

    // 공시 5일 데이터에는 오늘 가집계가 섞여있지 않아야 함
    expect(data.dealTrends[0].bizdate).not.toBe(data.intradayEstimate?.bizdate)
  })
})
