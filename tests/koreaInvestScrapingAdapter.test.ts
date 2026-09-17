import { describe, expect, it, vi } from 'vitest'
import {
  KoreaInvestScrapingAdapter,
  parseKoreaInvestMobileCards,
  parseKoreaInvestDesktopTable,
} from '@/server/services/ipo/koreaInvestScrapingAdapter'
import { IPO_ADAPTER_TEST_ENV } from './fixtures/ipoAdapterEnv'

const sampleMobileHtml = `
<div id="product_ipo" class="card_scroll_inner">
  <a href="#none" class="product_item ipo">
    <div class="data_top">
      <span class="status_badge ing">16시 30분까지 청약</span>
      <strong class="name">카나프테라퓨틱스</strong>
    </div>
    <div class="data_list">
      <dl><dt>청약기간</dt><dd>09.15~09.16</dd></dl>
      <dl><dt>당사 최종 경쟁률</dt><dd>2,237.63:1</dd></dl>
      <dl><dt>공모가</dt><dd>16,000원</dd></dl>
    </div>
  </a>
</div>
`

const sampleDesktopHtml = `
<table>
  <caption>청약종목안내 테이블 입니다.</caption>
  <tbody>
    <tr>
      <td>코스닥시장</td>
      <td>(주)글로벌테크놀로지</td>
      <td>한국투자증권</td>
      <td>2026.09.16~2026.09.17</td>
      <td>2026.09.21</td>
      <td>90,000주</td>
      <td>10,000</td>
    </tr>
  </tbody>
</table>
`

describe('koreaInvestScrapingAdapter', () => {
  it('parses mobile IPO cards with live competition ratios', () => {
    const cards = parseKoreaInvestMobileCards(sampleMobileHtml)
    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('카나프테라퓨틱스')
    expect(cards[0].ratio).toBe(2237.63)
    expect(cards[0].offerPrice).toBe(16000)
    expect(cards[0].badge).toBe('16시 30분까지 청약')
  })

  it('parses desktop IPO table rows', () => {
    const rows = parseKoreaInvestDesktopTable(sampleDesktopHtml)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('(주)글로벌테크놀로지')
    expect(rows[0].underwriter).toBe('한국투자증권')
    expect(rows[0].maxLimitShares).toBe(90000)
    expect(rows[0].offerPrice).toBe(10000)
    expect(rows[0].refundDate).toBe('2026.09.21')
  })

  it('aggregates mobile and desktop data into unified feed response', async () => {
    const mockFetcher = vi.fn().mockImplementation((url: string) => {
      if (url === IPO_ADAPTER_TEST_ENV.KIS_IPO_MOBILE_URL) {
        return Promise.resolve(new Response(sampleMobileHtml, { status: 200 }))
      }
      if (url === IPO_ADAPTER_TEST_ENV.KIS_IPO_DESKTOP_URL) {
        return Promise.resolve(new Response(sampleDesktopHtml, { status: 200 }))
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    })

    const adapter = new KoreaInvestScrapingAdapter({
      fetcher: mockFetcher,
      now: () => new Date('2026-09-16T09:00:00Z'),
    })

    const response = await adapter.getCompetitionForDate('2026-09-16')
    expect(response.source.dataKind).toBe('broker-direct')
    expect(response.source.status).toBe('provisional')
    expect(response.offerings).toHaveLength(2)

    const canaf = response.offerings.find(
      (o) => o.companyName === '카나프테라퓨틱스'
    )
    expect(canaf).toBeDefined()
    expect(canaf?.brokers[0].name).toBe('한국투자증권')
    expect(canaf?.brokers[0].currentTotalCompetitionRatio).toBe(2237.63)
    expect(canaf?.brokers[0].currentProportionalRatio).toBe(4475.26)

    const global = response.offerings.find(
      (o) => o.companyName === '(주)글로벌테크놀로지'
    )
    expect(global).toBeDefined()
    expect(global?.brokers[0].limits[0].maxShares).toBe(90000)
  })
})
