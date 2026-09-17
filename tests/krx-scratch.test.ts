import { describe, expect, it } from 'vitest'
import { parseIntradayForeignEstimate } from '../src/server/services/krStockService'

describe('Naver Intraday Foreign Estimate Parser Verification', () => {
  it('parses a captured foreign-broker section and calculates buy minus sell', () => {
    const html = `
      <table>
        <caption>외국계추정합</caption>
        <tr>
          <td><span class="tah p11">-1,200</span></td>
          <td><span class="tah p11">+2,000</span></td>
          <td><span class="tah p11">+800</span></td>
        </tr>
      </table>
    `

    expect(parseIntradayForeignEstimate(html, 70_000, '20260914')).toEqual({
      bizdate: '20260914',
      foreignSellQuant: 1_200,
      foreignBuyQuant: 2_000,
      foreignNetBuyQuant: 800,
      foreignNetBuyValue: 1,
    })
  })

  it('returns a zero-value fallback when the source section is unavailable', () => {
    expect(parseIntradayForeignEstimate('<html></html>', 70_000, '20260914')).toEqual({
      bizdate: '20260914',
      foreignSellQuant: 0,
      foreignBuyQuant: 0,
      foreignNetBuyQuant: 0,
      foreignNetBuyValue: 0,
    })
  })
})
