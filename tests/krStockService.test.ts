import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/server/services/serverCache', () => ({
  readJsonCache: vi.fn(async () => null),
  writeJsonCache: vi.fn(async () => undefined),
}))

import { fetchKrStockIntegration } from '../src/server/services/krStockService'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('krStockService response normalization', () => {
  it('normalizes fixture responses and keeps intraday data separate from confirmed history', async () => {
    const fetchMock = vi.fn()
    const intradayHtml = '<caption>외국계추정합</caption><span class="tah p11">-1,000</span><span class="tah p11">+2,500</span>'
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          closePrice: '70,000',
          compareToPreviousClosePrice: '-500',
          fluctuationsRatio: '-0.71',
          compareToPreviousPrice: { name: 'FALLING' },
          stockName: '삼성전자',
        }),
      )
      .mockResolvedValueOnce(
        new Response('EUC-KR fixture body'),
      )
      .mockResolvedValueOnce(
        Response.json({
          stockName: '삼성전자',
          dealTrendInfos: [
            {
              bizdate: '20260912',
              foreignerPureBuyQuant: '1,200',
              organPureBuyQuant: '-300',
              individualPureBuyQuant: '-900',
              closePrice: '70,000',
              foreignerHoldRatio: '52.1%',
              accumulatedTradingVolume: '10,000,000',
            },
          ],
          totalInfos: [{ code: 'marketCap', value: '418조' }],
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('TextDecoder', class {
      decode(): string {
        return intradayHtml
      }
    })

    const data = await fetchKrStockIntegration('005930')

    expect(data.stockCode).toBe('005930')
    expect(data.stockName).toBe('삼성전자')
    expect(data.closePriceNumber).toBe(70_000)
    expect(data.isFalling).toBe(true)
    expect(data.intradayEstimate).toMatchObject({
      foreignSellQuant: 1_000,
      foreignBuyQuant: 2_500,
      foreignNetBuyQuant: 1_500,
      foreignNetBuyValue: 1,
    })
    expect(data.dealTrends).toHaveLength(1)
    expect(data.dealTrends[0]).toMatchObject({
      bizdate: '20260912',
      foreignerPureBuyNumber: 1_200,
      foreignerBuyValueEstimated: 1,
    })
    expect(data.totalInfos).toEqual({ marketCap: '418조' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
