import { describe, expect, it } from 'vitest'
import {
  DaishinScrapingAdapter,
  normalizeCompanyName,
  parseDaishinHtml,
  parseRatio,
} from '../src/server/services/ipo/daishinScrapingAdapter'

// Minimal HTML fixture replicating the Daishin IPO list page structure.
// Captured from https://www.daishin.com/g.ds?p=1031&v=681&m=194 on 2026-09-15.
const DAISHIN_HTML_FIXTURE = `
<!DOCTYPE html>
<html>
<head><title>공모주 종목/청약일정 조회 - 대신증권</title></head>
<body>
<div id="container">
<table>
<thead>
<tr>
  <th>종목구분</th>
  <th>종목코드</th>
  <th>청약일</th>
  <th>발행가</th>
  <th>총 경쟁률</th>
  <th>비례경쟁률</th>
  <th>청약건수</th>
</tr>
</thead>
<tbody>
<tr>
  <td>공모주(당사)</td>
  <td><a href="javascript:goPbof('3574')">3574 네오사피엔스(주)</a></td>
  <td>2026/09/10~2026/09/11</td>
  <td>10,000원</td>
  <td>1,047.78 : 1</td>
  <td>2,095.56 : 1</td>
  <td>107,233</td>
</tr>
<tr>
  <td>공모주(당사)</td>
  <td><a href="javascript:goPbof('3575')">3575 덕산넵코어스(주)</a></td>
  <td>2026/09/16~2026/09/17</td>
  <td>14,600원</td>
  <td>0.00 : 1</td>
  <td>0.00 : 1</td>
  <td>0</td>
</tr>
<tr>
  <td>공모주(당사)</td>
  <td><a href="javascript:goPbof('3579')">3579 (주)와이즈플래닛컴퍼니</a></td>
  <td>2026/09/14~2026/09/15</td>
  <td>12,000원</td>
  <td>1,477.65 : 1</td>
  <td>2,955.3 : 1</td>
  <td>165,616</td>
</tr>
<tr>
  <td>공모주(당사)</td>
  <td><a href="javascript:goPbof('3586')">3586 (주)핀텔</a></td>
  <td>2026/09/07~2026/09/08</td>
  <td>1,129원</td>
  <td>1.46 : 1</td>
  <td>1.46 : 1</td>
  <td>308</td>
</tr>
<tr>
  <td>ELS</td>
  <td>8038 대신[Balance] ELB 182회</td>
  <td>2026/08/26~2026/09/01</td>
  <td>1원</td>
  <td>0.55 : 1</td>
  <td>0.55 : 1</td>
  <td>213</td>
</tr>
</tbody>
</table>
</div>
<div id="footer"></div>
</body>
</html>
`

describe('Daishin Scraping Adapter', () => {
  describe('parseRatio', () => {
    it('parses a standard ratio string', () => {
      expect(parseRatio('1,477.65 : 1')).toBe(1477.65)
    })

    it('parses a ratio without comma', () => {
      expect(parseRatio('1.46 : 1')).toBe(1.46)
    })

    it('returns 0 for zero ratio', () => {
      expect(parseRatio('0.00 : 1')).toBe(0)
    })

    it('returns 0 for unparseable input', () => {
      expect(parseRatio('invalid')).toBe(0)
    })

    it('parses a large ratio with commas', () => {
      expect(parseRatio('2,955.3 : 1')).toBe(2955.3)
    })
  })

  describe('normalizeCompanyName', () => {
    it('strips (주) prefix', () => {
      expect(normalizeCompanyName('(주)와이즈플래닛컴퍼니')).toBe(
        '와이즈플래닛컴퍼니'
      )
    })

    it('strips (주) suffix', () => {
      expect(normalizeCompanyName('네오사피엔스(주)')).toBe('네오사피엔스')
    })

    it('strips 주식회사', () => {
      expect(normalizeCompanyName('주식회사 삼성전자')).toBe('삼성전자')
    })

    it('strips spaces', () => {
      expect(normalizeCompanyName('덕산 넵 코어스')).toBe('덕산넵코어스')
    })
  })

  describe('parseDaishinHtml', () => {
    it('extracts only 공모주 rows, filtering out ELS', () => {
      const rows = parseDaishinHtml(DAISHIN_HTML_FIXTURE)
      expect(rows).toHaveLength(4)
      expect(rows.every((r) => r.category.includes('공모주'))).toBe(true)
    })

    it('correctly parses 와이즈플래닛컴퍼니 data', () => {
      const rows = parseDaishinHtml(DAISHIN_HTML_FIXTURE)
      const wise = rows.find((r) => r.name.includes('와이즈플래닛'))
      expect(wise).toBeDefined()
      expect(wise!.sno).toBe('3579')
      expect(wise!.offerPrice).toBe(12000)
      expect(wise!.totalCompetitionRatio).toBe(1477.65)
      expect(wise!.proportionalRatio).toBe(2955.3)
      expect(wise!.applicantCount).toBe(165616)
    })

    it('correctly parses a row with zero competition', () => {
      const rows = parseDaishinHtml(DAISHIN_HTML_FIXTURE)
      const deoksan = rows.find((r) => r.name.includes('덕산'))
      expect(deoksan).toBeDefined()
      expect(deoksan!.totalCompetitionRatio).toBe(0)
      expect(deoksan!.proportionalRatio).toBe(0)
      expect(deoksan!.applicantCount).toBe(0)
    })

    it('returns empty array for HTML without container', () => {
      expect(parseDaishinHtml('<html><body></body></html>')).toEqual([])
    })

    it('returns empty array for empty table', () => {
      const html = `<div id="container"><table></table></div><div id="footer"></div>`
      expect(parseDaishinHtml(html)).toEqual([])
    })
  })

  describe('DaishinScrapingAdapter', () => {
    const FIXED_TIME = new Date('2026-09-15T15:30:00+09:00')

    function createMockFetcher(html: string, status = 200) {
      return async (_url: string, _init?: RequestInit): Promise<Response> => {
        return new Response(html, {
          status,
          headers: { 'content-type': 'text/html; charset=UTF-8' },
        })
      }
    }

    it('returns parsed offerings from live HTML', async () => {
      const adapter = new DaishinScrapingAdapter({
        fetcher: createMockFetcher(DAISHIN_HTML_FIXTURE),
        now: () => FIXED_TIME,
      })

      const result = await adapter.getCompetitionForDate('2026-09-15')
      expect(result.source.status).toBe('provisional')
      expect(result.source.dataKind).toBe('broker-direct')
      expect(result.offerings).toHaveLength(4)

      const wise = result.offerings.find((o) =>
        o.brokers.some(
          (b) =>
            b.currentTotalCompetitionRatio !== null &&
            b.currentTotalCompetitionRatio > 1400
        )
      )
      expect(wise).toBeDefined()
      expect(wise!.brokers[0].name).toBe('대신증권')
      expect(wise!.brokers[0].currentTotalCompetitionRatio).toBe(1477.65)
      expect(wise!.brokers[0].currentProportionalRatio).toBe(2955.3)
      expect(wise!.brokers[0].applicantCount).toBe(165616)
    })

    it('returns delayed status on HTTP error', async () => {
      const adapter = new DaishinScrapingAdapter({
        fetcher: createMockFetcher('', 500),
        now: () => FIXED_TIME,
      })

      const result = await adapter.getCompetitionForDate('2026-09-15')
      expect(result.source.status).toBe('delayed')
      expect(result.offerings).toHaveLength(0)
    })

    it('returns delayed status on network error', async () => {
      const adapter = new DaishinScrapingAdapter({
        fetcher: async () => {
          throw new Error('ECONNREFUSED')
        },
        now: () => FIXED_TIME,
      })

      const result = await adapter.getCompetitionForDate('2026-09-15')
      expect(result.source.status).toBe('delayed')
      expect(result.offerings).toHaveLength(0)
    })

    it('returns provisional with empty offerings for no IPO data', async () => {
      const emptyHtml = `<div id="container"><table><tr><td>ELS</td><td>8038 대신ELB</td><td>2026/08/26</td><td>1원</td><td>0.55 : 1</td><td>0.55 : 1</td><td>213</td></tr></table></div><div id="footer"></div>`
      const adapter = new DaishinScrapingAdapter({
        fetcher: createMockFetcher(emptyHtml),
        now: () => FIXED_TIME,
      })

      const result = await adapter.getCompetitionForDate('2026-09-15')
      expect(result.source.status).toBe('provisional')
      expect(result.offerings).toHaveLength(0)
    })

    it('sets null for zero competition ratios in broker data', async () => {
      const adapter = new DaishinScrapingAdapter({
        fetcher: createMockFetcher(DAISHIN_HTML_FIXTURE),
        now: () => FIXED_TIME,
      })

      const result = await adapter.getCompetitionForDate('2026-09-15')
      const deoksan = result.offerings.find((o) =>
        o.dartCorpCode.includes('3575')
      )
      expect(deoksan).toBeDefined()
      expect(deoksan!.brokers[0].currentTotalCompetitionRatio).toBeNull()
      expect(deoksan!.brokers[0].currentProportionalRatio).toBeNull()
      expect(deoksan!.brokers[0].applicantCount).toBeNull()
    })
  })
})
