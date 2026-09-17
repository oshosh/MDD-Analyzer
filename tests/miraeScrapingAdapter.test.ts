import { describe, expect, it, vi } from 'vitest'
import {
  MiraeScrapingAdapter,
  parseMiraeActiveOfferings,
  parseMiraeRatePopup,
} from '@/server/services/ipo/miraeScrapingAdapter'
import { IPO_ADAPTER_TEST_ENV } from './fixtures/ipoAdapterEnv'

const sampleActiveHtml = `
<table>
  <tr>
    <td>공모주</td>
    <td><a href="javascript:view('공모주','2026','1','빅웨이브로보틱스','20260915','20260916')">빅웨이브로보틱스 청약하기</a></td>
  </tr>
  <tr>
    <td>실권주</td>
    <td><a href="javascript:view('실권주','2026','2','에이치엘비제약','20260915','20260916')">에이치엘비제약 청약하기</a></td>
  </tr>
</table>
`

const samplePopupHtml = `
<div id="wrap-pop">
  <dl class="ipo_info">
    <dt><img src="..." alt="일반(개인+법인)" /></dt>
    <dd>1,264.50 : 1</dd>
    <dt><img src="..." alt="우대(개인)" /></dt>
    <dd>1,890.00 : 1</dd>
  </dl>
</div>
`

describe('miraeScrapingAdapter', () => {
  it('parses active offerings from table markup', () => {
    const offerings = parseMiraeActiveOfferings(sampleActiveHtml)
    expect(offerings).toHaveLength(2)

    expect(offerings[0].name).toBe('빅웨이브로보틱스')
    expect(offerings[0].bsnm).toBe('공모주')
    expect(offerings[0].year).toBe('2026')
    expect(offerings[0].turn).toBe('1')
    expect(offerings[0].startDate).toBe('2026-09-15')
    expect(offerings[0].endDate).toBe('2026-09-16')

    expect(offerings[1].name).toBe('에이치엘비제약')
    expect(offerings[1].bsnm).toBe('실권주')
  })

  it('parses competition ratios from rate popup HTML', () => {
    const result = parseMiraeRatePopup(samplePopupHtml)
    expect(result.generalRatio).toBe(1264.5)
    expect(result.preferentialRatio).toBe(1890)
  })

  it('fetches and maps competition data end-to-end', async () => {
    const mockFetcher = vi.fn().mockImplementation((url: string) => {
      if (url === IPO_ADAPTER_TEST_ENV.MIRAE_IPO_ACTIVE_URL) {
        return Promise.resolve(
          new Response(new TextEncoder().encode(sampleActiveHtml), {
            status: 200,
          })
        )
      }
      if (url.startsWith(IPO_ADAPTER_TEST_ENV.MIRAE_IPO_RATE_URL)) {
        return Promise.resolve(
          new Response(new TextEncoder().encode(samplePopupHtml), {
            status: 200,
          })
        )
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    })

    const adapter = new MiraeScrapingAdapter({
      fetcher: mockFetcher,
      now: () => new Date('2026-09-16T09:00:00Z'),
    })

    const response = await adapter.getCompetitionForDate('2026-09-16')
    expect(response.source.dataKind).toBe('broker-direct')
    expect(response.source.status).toBe('provisional')
    expect(response.offerings).toHaveLength(2)

    const bigwave = response.offerings.find(
      (o) => o.companyName === '빅웨이브로보틱스'
    )
    expect(bigwave).toBeDefined()
    expect(bigwave?.brokers).toHaveLength(1)
    expect(bigwave?.brokers[0].name).toBe('미래에셋증권')
    expect(bigwave?.brokers[0].currentProportionalRatio).toBe(1264.5)
  })

  it('returns unavailable status when no offerings match date', async () => {
    const mockFetcher = vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode(sampleActiveHtml), {
        status: 200,
      })
    )

    const adapter = new MiraeScrapingAdapter({
      fetcher: mockFetcher,
      now: () => new Date('2026-09-16T09:00:00Z'),
    })

    const response = await adapter.getCompetitionForDate('2026-12-31')
    expect(response.source.status).toBe('unavailable')
    expect(response.offerings).toHaveLength(0)
  })

  it('fetches and maps mobile JSON detail (applicant count & 50/50 allocation)', async () => {
    const sampleA01Json = {
      result: 'success',
      GRID: [
        {
          itm_nm: '빅웨이브로보틱스',
          itm_no: 'A0035S0',
          pbpr: '18000',
          apy_cpt_r: '1327.84',
          pbff_sc: '196000',
          max_apy_sc: '23000',
          apy_strt_dt: '20260915',
          apy_end_dt: '20260916',
          rfnd_dt: '20260918',
          lstg_dt: '20260929',
          apy_fin_tp_nm: '청약완료',
          pbff_pcd: '01',
        },
      ],
    }

    const sampleP01Json = {
      targetObj: {
        isu_q: '196000',
        gnrl_cs_apy_acq: '161196',
        prptn_cpt_r: '2655.68',
        al_cpt_r: '1327.84',
        now_ofr_a: '4684622040000',
        apy_sc: '260256780',
      },
    }

    const mockFetcher = vi.fn().mockImplementation((url: string) => {
      if (url === IPO_ADAPTER_TEST_ENV.MIRAE_IPO_JSON_URL) {
        return Promise.resolve(
          new Response(JSON.stringify(sampleA01Json), { status: 200 })
        )
      }
      if (url === IPO_ADAPTER_TEST_ENV.MIRAE_IPO_DETAIL_JSON_URL) {
        return Promise.resolve(
          new Response(JSON.stringify(sampleP01Json), { status: 200 })
        )
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    })

    const adapter = new MiraeScrapingAdapter({
      fetcher: mockFetcher,
      now: () => new Date('2026-09-16T09:00:00Z'),
    })

    const response = await adapter.getCompetitionForDate('2026-09-16')
    expect(response.offerings).toHaveLength(1)

    const bigwave = response.offerings[0]
    expect(bigwave.companyName).toBe('빅웨이브로보틱스')

    const broker = bigwave.brokers[0]
    expect(broker.applicantCount).toBe(161196) // 청약건수 확인!
    expect(broker.generalAllocationShares).toBe(196000)
    expect(broker.equalAllocationShares).toBe(98000) // 50% 균등배정!
    expect(broker.proportionalAllocationShares).toBe(98000) // 50% 비례배정!
    expect(broker.currentProportionalRatio).toBe(2655.68) // 비례경쟁률!
    expect(broker.currentTotalCompetitionRatio).toBe(1327.84) // 종합경쟁률!
    expect(broker.currentEqualExpectedAllocation).toBe(0.61) // 98000 / 161196
    expect(broker.currentTotalDeposit).toBe(4684622040000) // 총증거금!
  })
})
