import { describe, expect, it } from 'vitest'
import { IbkScrapingAdapter } from '../src/server/services/ipo/ibkScrapingAdapter'

describe('IbkScrapingAdapter', () => {
  it('parses real wasfCall.jsp response correctly', async () => {
    const mockPayload = {
      WA: {
        SPBSQ010: {
          WASFState: 70000,
          WASFMsg: '작업이 성공적으로 수행되었습니다.!!',
          otb4: {
            HEADER: [
              'zAppyIsuNo',
              'zAppySrtDt',
              'zRebatDt',
              'l3GrpAppyLmtQty',
              'dGnrlCmpetRat',
              'dPrvlgCmpetRat',
              'dAllCmpetRat',
              'zIsuNm',
              'zLstdDt',
              'dFltnPrc',
              'l3GrpAppyLmtAmt',
              'lGnrlAsgnQty',
              'lPrvlgAsgnQty',
              'lAllAsgnQty',
              'zAppyIsuNoGbn',
              'zAppyIsuNo2',
              'zAppyEndDt',
              'zTpNm1',
              'dAppyCmpetRat',
              'lAsgnQty',
              'zAppyCnt',
              'zSumQty',
            ],
            DATAS: [
              [
                '468670',
                '2026/09/17',
                '2026/09/22',
                '15,000',
                '13.1092',
                '26.2184',
                '13.1092',
                '브릴스',
                '2026/10/01',
                '19,500',
                '146,250,000',
                '300,000',
                '150,000',
                '300,000',
                'A',
                '468670',
                '20260918',
                '기업공개',
                '+00000.0000',
                '+000000000000000',
                '32,511',
                '3,932,760',
              ],
            ],
          },
        },
      },
    }

    const mockFetcher = (async () => {
      return new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const adapter = new IbkScrapingAdapter(mockFetcher)
    const result = await adapter.getCompetitionForDate('2026-09-17')

    expect(result.source.status).toBe('provisional')
    expect(result.offerings).toHaveLength(1)

    const offering = result.offerings[0]
    expect(offering.companyName).toBe('브릴스')
    expect(offering.dartCorpCode).toBe('468670')
    expect(offering.offerPrice).toBe(19500)
    expect(offering.listingDate).toBe('2026-10-01')

    const broker = offering.brokers[0]
    expect(broker.name).toBe('아이비케이투자증권')
    expect(broker.generalAllocationShares).toBe(300000)
    expect(broker.equalAllocationShares).toBe(150000)
    expect(broker.proportionalAllocationShares).toBe(150000)
    expect(broker.currentTotalCompetitionRatio).toBe(13.1092)
    expect(broker.currentProportionalRatio).toBe(26.2184)
    expect(broker.applicantCount).toBe(32511)
    expect(broker.minSubscriptionShares).toBe(10)
    expect(broker.subscriptionUnitShares).toBe(10)
    expect(broker.limits[0].maxShares).toBe(15000)
    expect(broker.limits[1].maxShares).toBe(30000)

    // 비례경쟁률(26.2184)은 전체경쟁률(13.1092)의 정확히 2배
    expect(broker.currentProportionalRatio).toBeCloseTo(
      broker.currentTotalCompetitionRatio! * 2,
      2
    )

    // 균등배정 기대 주수: 150,000 / 32,511 = 4.61주
    expect(broker.currentEqualExpectedAllocation).toBe(4.61)
  })

  it('handles empty or unavailable responses gracefully', async () => {
    const mockFetcher = (async () => {
      return new Response(JSON.stringify({ WA: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const adapter = new IbkScrapingAdapter(mockFetcher)
    const result = await adapter.getCompetitionForDate('2026-09-17')

    expect(result.source.status).toBe('unavailable')
    expect(result.offerings).toHaveLength(0)
  })
})
