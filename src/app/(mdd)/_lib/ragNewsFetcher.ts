// src/app/(mdd)/_lib/ragNewsFetcher.ts

import axios from 'axios'

export interface RealtimeNewsSnippet {
  title: string
  snippet: string
  pubDate?: string
}

/**
 * 특정 종목 및 폭락 시기(연도/월)의 실제 뉴스 헤드라인과 스니펫을 실시간으로 수집합니다.
 * API Key 없이 사용할 수 있는 Google News RSS 파이프라인 활용
 */
export async function fetchRealtimeNewsForPeriod(
  symbol: string,
  peakDate: string,
  troughDate: string
): Promise<RealtimeNewsSnippet[]> {
  const peakYear = peakDate.slice(0, 4)
  const troughYear = troughDate.slice(0, 4)
  const queryYear = peakYear === troughYear ? peakYear : `${peakYear} ${troughYear}`
  
  // 검색어 조합 (예: "SK하이닉스 2001 2003" 또는 "000660 2008")
  const query = encodeURIComponent(`${symbol} ${queryYear}`)
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`

  try {
    const response = await axios.get(rssUrl, {
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const xml = response.data as string
    const items: RealtimeNewsSnippet[] = []

    // 간단하고 빠른 XML 뉴스 아이템 파싱
    const matches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>/g)
    for (const match of matches) {
      if (items.length >= 5) break
      const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()
      const snippet = match[2].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()
      if (title) {
        items.push({ title, snippet })
      }
    }

    return items
  } catch (error) {
    console.warn(`[RAG News Fetcher] Failed to fetch live news for ${symbol} (${queryYear}):`, error)
    return []
  }
}
