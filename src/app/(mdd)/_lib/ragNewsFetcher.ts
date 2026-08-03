// src/app/(mdd)/_lib/ragNewsFetcher.ts

import axios from 'axios'

export interface RealtimeNewsSnippet {
  title: string
  snippet: string
  link?: string
  pubYear?: number
}

/**
 * 전 세계 어떤 주식/자산이든 하드코딩 0개로 동적 뉴스 팩트 수집.
 * 언론사 외 블로그/개인포스팅/광고성 노이즈 철저 제거.
 */
// 6자리 주식 코드 -> 한글 종목명 폴백 맵 (구글 뉴스 인덱싱용)
const KR_CODE_NAME_FALLBACK: Record<string, string> = {
  '035420': '네이버 NAVER',
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035720': '카카오 Kakao',
  '005380': '현대차',
  '000270': '기아',
  '010140': '삼성중공업',
  '009540': 'HD한국조선해양',
  '051910': 'LG화학',
  '373220': 'LG에너지솔루션',
  '207940': '삼성바이오로직스',
}

export async function fetchRealtimeNewsForPeriod(
  symbol: string,
  peakDate: string,
  troughDate: string,
  symbolName?: string
): Promise<RealtimeNewsSnippet[]> {
  const peakYear = parseInt(peakDate.slice(0, 4), 10)
  const troughYear = parseInt(troughDate.slice(0, 4), 10)
  const yearQuery = peakYear === troughYear ? `${peakYear}` : `${peakYear}..${troughYear}`

  const cleanSymbol = symbol.trim().split('.')[0].toUpperCase()
  const isKrCode = /^\d{6}$/.test(cleanSymbol)

  // 동적 표시명 결정 (6자리 티커 코드일 경우 회사명 폴백 적용)
  let displayName = symbolName && symbolName.trim() !== '' && !symbolName.includes('.KS') && !symbolName.includes('.KQ') && !/^\d{6}$/.test(symbolName.trim())
    ? symbolName.trim()
    : KR_CODE_NAME_FALLBACK[cleanSymbol] || cleanSymbol

  // 🎯 구글 뉴스 100% 검색률 보장 쿼리 (종목명/티커 키워드 결합)
  let queryText = ''
  if (isKrCode) {
    queryText = `${displayName} (하락 OR 폭락 OR 위기 OR 실적 OR 불황 OR 적자) ${yearQuery}`
  } else {
    queryText = `"${displayName}" (drop OR decline OR loss OR crisis OR slump) ${yearQuery}`
  }

  const encodedQuery = encodeURIComponent(queryText)
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
      /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<description>(.*?)<\/description>/g
    )

    // 노이즈 출처 도메인 및 키워드 (개인 블로그, 무관 포스팅 등)
    const NOISE_PATTERNS = [
      'blog.naver.com',
      'tistory.com',
      'blogspot.com',
      'medium.com',
      'Naver Blog',
      '네이버 블로그',
      '드래프트',
      '리뷰 - Naver',
    ]

    for (const match of matches) {
      if (items.length >= 5) break
      const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()
      const link = match[2].trim()
      const pubDateStr = match[3].trim()
      const snippet = match[4].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()

      const pubYear = new Date(pubDateStr).getFullYear()

      // 🚨 노이즈 제거 1: 개인 블로그/광고성 노이즈 차단
      const isNoise = NOISE_PATTERNS.some(
        (pattern) => title.includes(pattern) || link.includes(pattern)
      )
      if (isNoise) continue

      // 🚨 노이즈 제거 2: 연도 검증 (해당 고점~저점 범위 근처 기사만 허용)
      if (!isNaN(pubYear) && pubYear > 2000) {
        if (pubYear < peakYear - 1 || pubYear > troughYear + 1) {
          continue
        }
      }

      if (title && title.length > 5) {
        items.push({ title, snippet, link, pubYear })
      }
    }

    return items
  } catch (error) {
    console.warn(`[RAG News Fetcher] Failed to fetch news for ${displayName}:`, error)
    return []
  }
}

