// src/app/(mdd)/_lib/ragNewsFetcher.ts

import axios from 'axios'

export interface RealtimeNewsSnippet {
  title: string
  snippet: string
  pubDate?: string
}

// 하락/악재/위기 관련 키워드 검증
const NEGATIVE_SIGNAL_KEYWORDS = [
  '하락',
  '폭락',
  '위기',
  '우려',
  '적자',
  '실적악화',
  '감산',
  '충격',
  '급락',
  '손실',
  '잔혹사',
  '둔화',
  '냉기',
  '비상',
  '악재',
  '쇼크',
  '조정',
  '불황',
  '주저앉',
  '밀려',
  '최저',
  '신저가',
]

/**
 * 특정 종목 및 폭락 시기(연도/월)의 "실제 하락/악재/위기 관련 뉴스"만을 정밀 파싱합니다.
 */
export async function fetchRealtimeNewsForPeriod(
  symbol: string,
  peakDate: string,
  troughDate: string
): Promise<RealtimeNewsSnippet[]> {
  const peakYear = peakDate.slice(0, 4)
  const troughYear = troughDate.slice(0, 4)
  const yearQuery = peakYear === troughYear ? peakYear : `${peakYear}..${troughYear}`

  // 종목 한글명 매핑 (삼성전자, SK하이닉스 등 주요 종목 키워드 보정)
  let cleanName = symbol.toUpperCase()
  if (cleanName.includes('005930')) cleanName = '삼성전자'
  else if (cleanName.includes('000660')) cleanName = 'SK하이닉스'

  // 하락/악재 키워드를 포함시킨 정밀 검색어 조합
  const negativeQuery = '(하락 OR 폭락 OR 위기 OR 우려 OR 적자 OR 실적악화 OR 감산 OR 급락 OR 쇼크)'
  const rawQuery = `${cleanName} ${negativeQuery} ${yearQuery}`
  const query = encodeURIComponent(rawQuery)
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`

  try {
    const response = await axios.get(rssUrl, {
      timeout: 3500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const xml = response.data as string
    const items: RealtimeNewsSnippet[] = []

    const matches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>/g)
    for (const match of matches) {
      if (items.length >= 5) break
      const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()
      const snippet = match[2].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()

      // 🔍 검증: 하락/악재 키워드가 포함된 기사만 엄선 (홍보성/자랑성 기사 제거)
      const fullText = `${title} ${snippet}`
      const isNegativeSignal = NEGATIVE_SIGNAL_KEYWORDS.some((kw) => fullText.includes(kw))

      if (title && (isNegativeSignal || items.length === 0)) {
        items.push({ title, snippet })
      }
    }

    return items
  } catch (error) {
    console.warn(`[RAG News Fetcher] Failed to fetch live negative news for ${cleanName} (${yearQuery}):`, error)
    return []
  }
}

