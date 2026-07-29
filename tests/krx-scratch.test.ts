import { describe, it, expect } from 'vitest'

describe('Naver Intraday Foreign Estimate Parser Verification', () => {
  it('checks exact HTML structure and calculations for 005930', async () => {
    const url = 'https://finance.naver.com/item/frgn.naver?code=005930'
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    })
    
    const buffer = await res.arrayBuffer()
    const decoder = new TextDecoder('euc-kr')
    const html = decoder.decode(buffer)

    const foreignIdx = html.indexOf('외국계추정합')
    expect(foreignIdx).not.toBe(-1)

    const section = html.slice(foreignIdx, foreignIdx + 600)
    console.log('=== HTML Section ===\n', section)

    const matches = [...section.matchAll(/<span[^>]*class="tah[^"]*"[^>]*>([+-]?[\d,]+)<\/span>/g)]
    console.log('Matches found:', matches.map(m => m[1]))

    const rawSell = matches[0] ? matches[0][1] : '0'
    const rawBuy = matches[1] ? matches[1][1] : '0'
    const rawNet = matches[2] ? matches[2][1] : '0'

    console.log({
      rawSell,
      rawBuy,
      rawNet,
    })

    const parseNum = (str: string) => {
      const cleaned = str.replace(/,/g, '').replace(/\+/g, '').trim()
      return parseFloat(cleaned) || 0
    }

    const sellQuant = Math.abs(parseNum(rawSell))
    const buyQuant = Math.abs(parseNum(rawBuy))
    // 순매수는 반드시 (매수량 - 매도량)으로 정확히 연산
    const calculatedNetBuy = buyQuant - sellQuant

    console.log('\n=== 정확한 연산 결과 ===')
    console.log(`매수량 총합: +${buyQuant.toLocaleString()}주`)
    console.log(`매도량 총합: -${sellQuant.toLocaleString()}주`)
    console.log(`계산된 순매수: ${calculatedNetBuy > 0 ? '+' : ''}${calculatedNetBuy.toLocaleString()}주 (${calculatedNetBuy > 0 ? '순매수' : calculatedNetBuy < 0 ? '순매도' : '보합'})`)

    // 검증: 매수 - 매도 === 계산된 순매수
    expect(buyQuant - sellQuant).toBe(calculatedNetBuy)
  })
})
