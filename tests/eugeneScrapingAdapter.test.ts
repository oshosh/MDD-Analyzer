import { describe, expect, it } from 'vitest'
import {
  EugeneScrapingAdapter,
  parseEugeneDetailTable,
  parseEugeneSelectOptions,
} from '../src/server/services/ipo/eugeneScrapingAdapter'
import { IPO_ADAPTER_TEST_ENV } from './fixtures/ipoAdapterEnv'

const EUGENE_LIST_FIXTURE = `
<select name="input01" id="input01">
  <option value="2026908" title="030">(주)크라우드웍스</option>
  <option value="2026906" title="040">빅웨이브로보틱스(주)</option>
</select>
`

const EUGENE_DETAIL_FIXTURE = `
<div class="tbl_hType tbl_type2 tbl_line">
  <table>
    <caption>청약경쟁률 정보</caption>
    <tbody>
      <tr>
        <th scope="row">청약시작일</th>
        <td>2026.09.15</td>
        <th>청약종료일</th>
        <td>2026.09.16</td>
        <th scope="row" rowspan="2">공모주<br />경쟁률</th>
        <th scope="row" rowspan="2">일반고객</th>
        <td rowspan="2">50.58</td>
      </tr>
      <tr>
        <th scope="row">추가납입일</th>
        <td>2026.09.17</td>
        <th>액면가</th>
        <td>100</td>
      </tr>
      <tr>
        <th scope="row">환불일</th>
        <td>2026.09.18</td>
        <th>공모가</th>
        <td>18,000</td>
        <th scope="row" rowspan="4">실권주<br />경쟁률</th>
        <th scope="row">일반청약</th>
        <td>0.00</td>
      </tr>
      <tr>
        <th scope="row">상장예정일</th>
        <td>2026.09.29</td>
        <th>당사공모주수</th>
        <td>204,000</td>
        <th scope="row">하이일드펀드</th>
        <td>0.00</td>
      </tr>
      <tr>
        <th scope="row"><div id="div_txt1">일반청약건수</div></th>
        <td><div id="div_in1">21,348</div></td>
        <th><div id="div_txt2">균등예상수량</div></th>
        <td><div id="div_in2">4</div></td>
        <th scope="row">벤처펀드</th>
        <td>0.00</td>
      </tr>
    </tbody>
  </table>
</div>
`

describe('EugeneScrapingAdapter', () => {
  describe('parseEugeneSelectOptions', () => {
    it('extracts options with code, title, and normalized names', () => {
      const options = parseEugeneSelectOptions(EUGENE_LIST_FIXTURE)
      expect(options).toHaveLength(2)
      expect(options[0].code).toBe('2026908')
      expect(options[0].gubun).toBe('030')
      expect(options[0].normalizedName).toBe('크라우드웍스')

      expect(options[1].code).toBe('2026906')
      expect(options[1].gubun).toBe('040')
      expect(options[1].name).toBe('빅웨이브로보틱스(주)')
      expect(options[1].normalizedName).toBe('빅웨이브로보틱스')
    })
  })

  describe('parseEugeneDetailTable', () => {
    it('correctly parses real-time competition table', () => {
      const opt = {
        code: '2026906',
        gubun: '040',
        name: '빅웨이브로보틱스(주)',
        normalizedName: '빅웨이브로보틱스',
      }
      const detail = parseEugeneDetailTable(EUGENE_DETAIL_FIXTURE, opt)
      expect(detail).not.toBeNull()
      expect(detail!.startDate).toBe('2026-09-15')
      expect(detail!.endDate).toBe('2026-09-16')
      expect(detail!.offerPrice).toBe(18000)
      expect(detail!.sharesAllocated).toBe(204000)
      expect(detail!.competitionRatio).toBe(50.58)
      expect(detail!.applicantCount).toBe(21348)
      expect(detail!.equalExpectedAllocation).toBe(4)
    })
  })

  describe('Adapter getCompetitionForDate', () => {
    it('fetches and returns normalized offerings', async () => {
      const mockFetcher = async (url: string) => {
        if (url === IPO_ADAPTER_TEST_ENV.EUGENE_IPO_SEARCH_URL) {
          return new Response(EUGENE_DETAIL_FIXTURE, { status: 200 })
        }
        return new Response(EUGENE_LIST_FIXTURE, { status: 200 })
      }

      const adapter = new EugeneScrapingAdapter({
        fetcher: mockFetcher,
        now: () => new Date('2026-09-15T15:00:00Z'),
      })

      const res = await adapter.getCompetitionForDate('2026-09-15')
      expect(res.source.dataKind).toBe('broker-direct')
      expect(res.source.status).toBe('provisional')
      expect(res.offerings.length).toBeGreaterThan(0)

      const broker = res.offerings[0].brokers[0]
      expect(broker.name).toBe('유진투자증권')
      expect(broker.currentTotalCompetitionRatio).toBe(50.58)
      expect(broker.applicantCount).toBe(21348)
      expect(broker.currentEqualExpectedAllocation).toBe(4)
    })
  })
})
