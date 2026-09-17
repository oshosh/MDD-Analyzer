import type {
  IpoCompetitionFeedBroker,
  IpoCompetitionFeedOffering,
  IpoCompetitionFeedResponse,
} from '@entities/ipo'
import type { IpoCompetitionFeedAdapter } from './competitionFeedAdapter'
import { normalizeCompanyName } from './daishinScrapingAdapter'

const KIS_MAIN_URL = process.env.KIS_IPO_MAIN_URL || ''
const KIS_MOBILE_URL = process.env.KIS_IPO_MOBILE_URL || ''
const KIS_DESKTOP_URL = process.env.KIS_IPO_DESKTOP_URL || ''
const REQUEST_TIMEOUT_MS = 10_000
const SOURCE_NAME = '한국투자증권 공모주 실시간 연동'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface KisMobileIpoCard {
  name: string
  normalizedName: string
  period: string
  ratio: number | null
  offerPrice: number | null
  badge: string
}

export interface KisDesktopIpoRow {
  market: string
  name: string
  normalizedName: string
  underwriter: string
  period: string
  refundDate: string
  maxLimitShares: number | null
  offerPrice: number | null
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,원주\s]/g, '')
  const val = parseFloat(cleaned)
  return Number.isFinite(val) && val > 0 ? val : null
}

function parseRatio(raw: string): number | null {
  const match = raw.match(/([\d,.]+)\s*:\s*1/)
  if (!match) {
    return parseNumber(raw)
  }
  return parseNumber(match[1])
}

/**
 * Parse live IPO cards from Main.jsp (#mainContent_ipo)
 */
export function parseKoreaInvestMainCards(html: string): KisMobileIpoCard[] {
  const ipoBlockMatch = html.match(/id=["']?mainContent_ipo["']?[\s\S]*?id=["']?ipoList["']?[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i)
  if (!ipoBlockMatch) return []

  const targetHtml = ipoBlockMatch[0]
  const slides = targetHtml.split(/class=["']product_items\s+swiper-slide["']/i).slice(1)

  const cards: KisMobileIpoCard[] = []
  for (const slide of slides) {
    const nameMatch = slide.match(/<div\s+class=["']mid["']>\s*<strong>([^<]+)<\/strong>/i)
    if (!nameMatch) continue

    const rawName = nameMatch[1].trim()
    const titMatch = slide.match(/<div\s+class=["']items_tit[^"']*["']>\s*([^<]+)\s*<\/div>/i)
    const badge = titMatch ? titMatch[1].trim() : ''

    const periodMatch = slide.match(/<span>\s*청약기간\s*<\/span>\s*<strong>([^<]+)<\/strong>/i)
    const period = periodMatch ? periodMatch[1].trim() : ''

    const ratioMatch = slide.match(/<span>\s*[^<]*경쟁률\s*<\/span>\s*<strong>([^<]+)<\/strong>/i)
    let ratio: number | null = null
    if (ratioMatch) {
      const rText = ratioMatch[1].trim()
      const m = rText.match(/([\d,.]+)\s*:\s*1/)
      if (m) {
        ratio = parseFloat(m[1].replace(/,/g, ''))
      } else {
        const val = parseFloat(rText.replace(/,/g, ''))
        ratio = Number.isFinite(val) ? val : null
      }
    }

    const priceMatch = slide.match(/<span>\s*공모가\s*<\/span>\s*<strong>([^<]+)<\/strong>/i)
    let offerPrice: number | null = null
    if (priceMatch) {
      const pText = priceMatch[1].replace(/[,원\s]/g, '')
      const parsedPrice = parseFloat(pText)
      if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
        offerPrice = parsedPrice
      }
    }

    cards.push({
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
      period,
      ratio,
      offerPrice,
      badge,
    })
  }

  return cards
}

/**
 * Parse mobile index cards from <div id="product_ipo">
 */
export function parseKoreaInvestMobileCards(html: string): KisMobileIpoCard[] {
  const ipoBlockMatch = html.match(/id=["']?product_ipo["']?[\s\S]*?<\/div>\s*<\/div>/i)
  const targetHtml = ipoBlockMatch ? ipoBlockMatch[0] : html

  const cardMatches = targetHtml.matchAll(
    /<a[^>]*class=["'][^"']*product_item\s+ipo[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
  )

  const cards: KisMobileIpoCard[] = []

  for (const match of cardMatches) {
    const cardHtml = match[1]

    const nameMatch = cardHtml.match(/<strong\s+class=["']?name["']?[^>]*>([^<]+)<\/strong>/i)
    if (!nameMatch) continue

    const rawName = nameMatch[1].trim()
    const badgeMatch = cardHtml.match(/<span\s+class=["']?status_badge[^"']*["']?[^>]*>([^<]+)<\/span>/i)
    const badge = badgeMatch ? badgeMatch[1].trim() : ''

    const periodMatch = cardHtml.match(/<dt>청약기간<\/dt>\s*<dd>([^<]+)<\/dd>/i)
    const period = periodMatch ? periodMatch[1].trim() : ''

    const ratioMatch = cardHtml.match(/<dt>[^<]*경쟁률<\/dt>\s*<dd>([^<]+)<\/dd>/i)
    const ratio = ratioMatch ? parseRatio(ratioMatch[1]) : null

    const priceMatch = cardHtml.match(/<dt>공모가<\/dt>\s*<dd>([^<]+)<\/dd>/i)
    const offerPrice = priceMatch ? parseNumber(priceMatch[1]) : null

    cards.push({
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
      period,
      ratio,
      offerPrice,
      badge,
    })
  }

  return cards
}

/**
 * Parse desktop table from Ipo.jsp?cmd=TF09ad020000
 */
export function parseKoreaInvestDesktopTable(
  html: string
): KisDesktopIpoRow[] {
  const tableMatch = html.match(/청약종목안내 테이블[\s\S]*?<\/table>/i)
  if (!tableMatch) return []

  const rowsHtml = tableMatch[0]
  const trMatches = rowsHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)

  const results: KisDesktopIpoRow[] = []

  for (const tr of trMatches) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((td) =>
      td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    )

    if (cells.length < 7) continue

    const market = cells[0]
    const rawName = cells[1]
    const underwriter = cells[2]
    const period = cells[3]
    const refundDate = cells[4]
    const maxLimitShares = parseNumber(cells[5])
    const offerPrice = parseNumber(cells[6])

    if (!rawName || rawName === '기업명') continue

    results.push({
      market,
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
      underwriter,
      period,
      refundDate,
      maxLimitShares,
      offerPrice,
    })
  }

  return results
}

export interface KoreaInvestScrapingAdapterOptions {
  fetcher?: Fetcher
  now?: () => Date
}

export class KoreaInvestScrapingAdapter implements IpoCompetitionFeedAdapter {
  private readonly fetcher: Fetcher
  private readonly now: () => Date

  constructor(options: KoreaInvestScrapingAdapterOptions = {}) {
    this.fetcher = options.fetcher ?? (globalThis.fetch as unknown as Fetcher)
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(
    date: string
  ): Promise<IpoCompetitionFeedResponse> {
    void date
    const fetchedAt = this.now().toISOString()

    // 1. Fetch live cards from Main.jsp, mobile index, and desktop table
    const [mainCards, mobileCards, desktopRows] = await Promise.all([
      this.fetchMainCards(),
      this.fetchMobileCards(),
      this.fetchDesktopRows(),
    ])

    // Merge cards (mainCards take precedence for real-time competition rates)
    const cardMap = new Map<string, KisMobileIpoCard>()
    for (const card of mobileCards) {
      cardMap.set(card.normalizedName, card)
    }
    for (const card of mainCards) {
      cardMap.set(card.normalizedName, card)
    }
    const combinedCards = Array.from(cardMap.values())

    if (combinedCards.length === 0 && desktopRows.length === 0) {
      return this.buildEmptyResponse(
        fetchedAt,
        '한국투자증권에서 현재 진행 중인 공모주 청약 일정이 없습니다.'
      )
    }

    const offerings: IpoCompetitionFeedOffering[] = []

    // Build unified offerings
    for (const card of combinedCards) {
      const desktopMatch = desktopRows.find(
        (r) => r.normalizedName === card.normalizedName
      )

      const totalRatio = card.ratio
      const propRatio = totalRatio !== null ? Math.round(totalRatio * 2 * 100) / 100 : null
      const offerPrice = card.offerPrice ?? desktopMatch?.offerPrice ?? null
      const oneShareDep =
        propRatio !== null && offerPrice !== null
          ? Math.round(propRatio * offerPrice * 0.5)
          : null

      const broker: IpoCompetitionFeedBroker = {
        id: 'koreainvest-direct',
        name: '한국투자증권',
        role: null,
        generalAllocationShares: null,
        equalAllocationShares: null,
        proportionalAllocationShares: null,
        currentTotalCompetitionRatio: totalRatio,
        currentProportionalRatio: propRatio,
        expectedFinalProportionalRatio: null,
        currentEqualExpectedAllocation: null,
        expectedEqualAllocation: null,
        applicantCount: null,
        currentTotalDeposit: null,
        expectedFinalTotalDeposit: null,
        estimatedOneShareDeposit: oneShareDep,
        expectedFinalOneShareDeposit: null,
        applicationFee: 2000,
        minSubscriptionShares: 10,
        subscriptionUnitShares: 10,
        subscriptionUnitTiers: [],
        limits:
          desktopMatch?.maxLimitShares
            ? [
                {
                  id: 'kis-limit-1',
                  label: '최고청약한도',
                  maxShares: desktopMatch.maxLimitShares,
                },
              ]
            : [],
        onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (뱅키스 우대 시 무료)',
        competitionRatioKind: 'broker-proportional',
        proportionalAllocationRoundingRule: null,
        source: {
          name: SOURCE_NAME,
          dataKind: 'broker-direct',
          sourceAsOf: fetchedAt,
          fetchedAt,
          status: card.ratio !== null && card.ratio > 0 ? 'provisional' : 'unavailable',
          coverage:
            card.ratio !== null && card.ratio > 0
              ? '한국투자증권 실시간 공모주 연동'
              : '한국투자증권 공모주 일정 (실시간 경쟁률은 비로그인 미제공/MTS 전용)',
        },
      }

      offerings.push({
        dartCorpCode: '00000000',
        companyName: card.name,
        offeringKind: 'ipo',
        listingDate: null,
        subscriptionOpenAt: null,
        subscriptionCloseAt: null,
        expectedFinalDeposit: null,
        expectedFinalOneShareCost: null,
        offerPrice: card.offerPrice ?? desktopMatch?.offerPrice ?? null,
        depositRate: 0.5,
        marketPrice: null,
        disparityRate: null,
        brokers: [broker],
      })
    }

    // Also include desktop rows if not already in mobile cards
    for (const row of desktopRows) {
      if (offerings.some((o) => o.companyName === row.name)) continue

      const broker: IpoCompetitionFeedBroker = {
        id: 'koreainvest-direct',
        name: '한국투자증권',
        role: null,
        generalAllocationShares: null,
        equalAllocationShares: null,
        proportionalAllocationShares: null,
        currentTotalCompetitionRatio: null,
        currentProportionalRatio: null,
        expectedFinalProportionalRatio: null,
        currentEqualExpectedAllocation: null,
        expectedEqualAllocation: null,
        applicantCount: null,
        currentTotalDeposit: null,
        expectedFinalTotalDeposit: null,
        estimatedOneShareDeposit: null,
        expectedFinalOneShareDeposit: null,
        applicationFee: 2000,
        minSubscriptionShares: 10,
        subscriptionUnitShares: 10,
        subscriptionUnitTiers: [],
        limits: row.maxLimitShares
          ? [
              {
                id: 'kis-limit-1',
                label: '최고청약한도',
                maxShares: row.maxLimitShares,
              },
            ]
          : [],
        onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (뱅키스 우대 시 무료)',
        competitionRatioKind: 'broker-proportional',
        proportionalAllocationRoundingRule: null,
        source: {
          name: SOURCE_NAME,
          dataKind: 'broker-direct',
          sourceAsOf: fetchedAt,
          fetchedAt,
          status: 'unavailable',
          coverage: '한국투자증권 공모주 일정/한도 (실시간 경쟁률은 비로그인 미제공/MTS 전용)',
        },
      }

      offerings.push({
        dartCorpCode: '00000000',
        companyName: row.name,
        offeringKind: 'ipo',
        listingDate: null,
        subscriptionOpenAt: null,
        subscriptionCloseAt: null,
        expectedFinalDeposit: null,
        expectedFinalOneShareCost: null,
        offerPrice: row.offerPrice,
        depositRate: 0.5,
        marketPrice: null,
        disparityRate: null,
        brokers: [broker],
      })
    }

    return {
      source: {
        name: SOURCE_NAME,
        dataKind: 'broker-direct',
        sourceAsOf: fetchedAt,
        fetchedAt,
        status: 'provisional',
        coverage: `한국투자증권 공모주 ${offerings.length}건 실시간 연동 완료`,
      },
      offerings,
    }
  }

  private async fetchMainCards(): Promise<KisMobileIpoCard[]> {
    if (!KIS_MAIN_URL) return []
    try {
      const res = await this.fetcher(KIS_MAIN_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return []

      const html = await res.text()
      return parseKoreaInvestMainCards(html)
    } catch {
      return []
    }
  }

  private async fetchMobileCards(): Promise<KisMobileIpoCard[]> {
    if (!KIS_MOBILE_URL) return []
    try {
      const res = await this.fetcher(KIS_MOBILE_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return []

      const html = await res.text()
      return parseKoreaInvestMobileCards(html)
    } catch {
      return []
    }
  }

  private async fetchDesktopRows(): Promise<KisDesktopIpoRow[]> {
    if (!KIS_DESKTOP_URL) return []
    try {
      const res = await this.fetcher(KIS_DESKTOP_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return []

      const html = await res.text()
      return parseKoreaInvestDesktopTable(html)
    } catch {
      return []
    }
  }

  private buildEmptyResponse(
    fetchedAt: string,
    coverage: string
  ): IpoCompetitionFeedResponse {
    return {
      source: {
        name: SOURCE_NAME,
        dataKind: 'broker-direct',
        sourceAsOf: fetchedAt,
        fetchedAt,
        status: 'unavailable',
        coverage,
      },
      offerings: [],
    }
  }
}
