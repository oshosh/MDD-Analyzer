// src/app/(mdd)/_lib/ragNewsFetcher.ts

import axios from 'axios'

export interface RealtimeNewsSnippet {
  title: string
  snippet: string
  pubDate?: string
}

/**
 * 전 세계 자산(미국주식, 한국주식, 일본주식, 크립토 등)의 폭락 시기 뉴스 파싱 파이프라인.
 * 하드코딩 매핑 0개! 글로벌 다국어(영문/국문) 쿼리 자동 생성.
 */
export async function fetchRealtimeNewsForPeriod(
  symbol: string,
  peakDate: string,
  troughDate: string
): Promise<RealtimeNewsSnippet[]> {
  const peakYear = peakDate.slice(0, 4)
  const troughYear = troughDate.slice(0, 4)
  const yearQuery = peakYear === troughYear ? peakYear : `${peakYear}..${troughYear}`

  // 티커 클린업 (예: 005930.KS -> 005930, 7203.T -> 7203)
  const cleanSymbol = symbol.trim().split('.')[0].toUpperCase()

  // 1. 한국 종목 여부 판별 (6자리 숫자)
  const isKrCode = /^\d{6}$/.test(cleanSymbol)

  // 2. 다국어 글로벌 리스크 쿼리 생성 (하드코딩 없음)
  const queryText = isKrCode
    ? `${cleanSymbol} (하락 OR 폭락 OR 위기 OR 실적 OR slump OR drop) ${yearQuery}`
    : `${cleanSymbol} (drop OR crash OR decline OR loss OR crisis OR slump OR earnings) ${yearQuery}`

  const encodedQuery = encodeURIComponent(queryText)

  // 3. 글로벌 / 한국 RSS URL 세팅
  const rssUrl = isKrCode
    ? `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`
    : `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`

  try {
    const response = await axios.get(rssUrl, {
      timeout: 3500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const xml = response.data as string
    const items: RealtimeNewsSnippet[] = []

    const matches = xml.matchAll(
      /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>/g
    )
    for (const match of matches) {
      if (items.length >= 5) break
      const title = match[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim()
      const snippet = match[2]
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim()

      if (title && title.length > 5) {
        items.push({ title, snippet })
      }
    }

    return items
  } catch (error) {
    console.warn(
      `[RAG News Fetcher] Failed to fetch global news for ${cleanSymbol} (${yearQuery}):`,
      error
    )
    return []
  }
}


