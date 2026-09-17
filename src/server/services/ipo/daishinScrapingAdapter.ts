import type {
  IpoCompetitionFeedBroker,
  IpoCompetitionFeedResponse,
  IpoDataSource,
} from '@entities/ipo'
import type { IpoCompetitionFeedAdapter } from './competitionFeedAdapter'

const DAISHIN_LIST_URL = process.env.DAISHIN_IPO_LIST_URL || ''
const REQUEST_TIMEOUT_MS = 10_000
const SOURCE_NAME = '대신증권 공모주 경쟁률 페이지 스크래핑'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

/** Raw row extracted from Daishin's SSR HTML table. */
export interface DaishinIpoRow {
  /** e.g. '공모주(당사)' or 'ELS' */
  category: string
  /** Internal code, e.g. '3579' */
  sno: string
  /** Company name, e.g. '(주)와이즈플래닛컴퍼니' */
  name: string
  /** e.g. '2026/09/14~2026/09/15' */
  subscriptionPeriod: string
  /** Issue price in KRW, e.g. 12000 */
  offerPrice: number
  /** Total competition ratio, e.g. 1477.65 */
  totalCompetitionRatio: number
  /** Proportional competition ratio, e.g. 2955.3 */
  proportionalRatio: number
  /** Number of applications, e.g. 165616 */
  applicantCount: number
}

/**
 * Parse a competition ratio string like '1,477.65 : 1' into a number.
 * Returns 0 for '0.00 : 1' or unparseable values.
 */
export function parseRatio(raw: string): number {
  const match = raw.replace(/,/g, '').match(/([\d.]+)\s*:\s*1/)
  if (!match) return 0
  const value = parseFloat(match[1])
  return Number.isFinite(value) ? value : 0
}

/**
 * Parse a Korean number string like '12,000원' or '165,616' into a number.
 */
function parseKrNumber(raw: string): number {
  const cleaned = raw.replace(/[,원\s]/g, '')
  const value = parseFloat(cleaned)
  return Number.isFinite(value) ? value : 0
}

/**
 * Strip HTML tags and decode basic entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .trim()
}

/**
 * Parse the Daishin IPO list page HTML into structured rows.
 *
 * The page at /g.ds?p=1031&v=681&m=194 renders a server-side table with
 * columns: 종목구분 | 종목코드+종목명 | 청약일 | 발행가 | 총경쟁률 | 비례경쟁률 | 청약건수
 *
 * Each IPO row contains `goPbof('3579')` or just the sno code in the text.
 * The table also includes ELS items which we filter out.
 */
export function parseDaishinHtml(html: string): DaishinIpoRow[] {
  // Extract the content area between container and footer
  const containerMatch = html.match(
    /id="container"([\s\S]*?)(?:id="footer"|<\/body>)/
  )
  if (!containerMatch) return []

  const container = containerMatch[1]

  // Find all table rows
  const rowMatches = [
    ...container.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g),
  ]

  const rows: DaishinIpoRow[] = []

  for (const [, rowHtml] of rowMatches) {
    // Extract all cells (td only, skip th header rows)
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (m) => stripHtml(m[1])
    )

    // We need at least 7 cells for a valid data row
    if (cells.length < 7) continue

    const category = cells[0]
    // Only process 공모주 rows, skip ELS/ELB
    if (!category.includes('공모주')) continue

    // Cell 1: "3579 (주)와이즈플래닛컴퍼니" — code + name
    const codeNameMatch = cells[1].match(/^(\d+)\s+(.+)$/)
    if (!codeNameMatch) continue

    const sno = codeNameMatch[1]
    const name = codeNameMatch[2].trim()

    // Cell 2: subscription period
    const subscriptionPeriod = cells[2]

    // Cell 3: offer price
    const offerPrice = parseKrNumber(cells[3])

    // Cell 4: total competition ratio "1,477.65 : 1"
    const totalCompetitionRatio = parseRatio(cells[4])

    // Cell 5: proportional ratio "2,955.3 : 1"
    const proportionalRatio = parseRatio(cells[5])

    // Cell 6: applicant count
    const applicantCount = parseKrNumber(cells[6])

    rows.push({
      category,
      sno,
      name,
      subscriptionPeriod,
      offerPrice,
      totalCompetitionRatio,
      proportionalRatio,
      applicantCount,
    })
  }

  return rows
}

/**
 * Normalize a company name for fuzzy matching.
 * Strips legal entity suffixes, parentheses, spaces, and converts to lowercase.
 */
export function normalizeCompanyName(name?: string): string {
  if (!name) return ''
  return name
    .replace(/\(주\)|\(유\)|주식회사|㈜/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function createDaishinSource(
  fetchedAt: string,
  status: 'provisional' | 'unavailable' | 'delayed',
  coverage: string
): IpoDataSource {
  return {
    name: SOURCE_NAME,
    dataKind: 'broker-direct',
    sourceAsOf: fetchedAt,
    fetchedAt,
    status,
    coverage,
  }
}

function rowToBroker(
  row: DaishinIpoRow,
  source: IpoDataSource
): IpoCompetitionFeedBroker {
  return {
    id: 'daishin',
    name: '대신증권',
    role: null,
    generalAllocationShares: null,
    equalAllocationShares: null,
    proportionalAllocationShares: null,
    currentTotalCompetitionRatio:
      row.totalCompetitionRatio > 0 ? row.totalCompetitionRatio : null,
    currentProportionalRatio:
      row.proportionalRatio > 0 ? row.proportionalRatio : null,
    expectedFinalProportionalRatio: null,
    currentEqualExpectedAllocation: null,
    expectedEqualAllocation: null,
    applicantCount: row.applicantCount > 0 ? row.applicantCount : null,
    currentTotalDeposit: null,
    expectedFinalTotalDeposit: null,
    estimatedOneShareDeposit: null,
    expectedFinalOneShareDeposit: null,
    applicationFee: 2000,
    minSubscriptionShares: 10,
    subscriptionUnitShares: 10,
    subscriptionUnitTiers: [],
    limits: [],

    onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (미배정시 환불)',
    competitionRatioKind: 'broker-proportional',
    proportionalAllocationRoundingRule: null,
    source,
  }
}

export interface DaishinScrapingAdapterOptions {
  fetcher?: Fetcher
  now?: () => Date
}

/**
 * Scrapes the Daishin Securities public IPO subscription page directly.
 *
 * This adapter uses the configured DAISHIN_IPO_LIST_URL environment variable,
 * which points to a server-side rendered page that does NOT require login and
 * contains real-time competition rate data in an HTML table.
 *
 * The adapter returns data keyed by **normalized company name** instead of
 * dartCorpCode, since the Daishin page does not contain DART corp codes.
 * The service layer must perform name-based matching to merge with DART data.
 */
export class DaishinScrapingAdapter implements IpoCompetitionFeedAdapter {
  private readonly fetcher: Fetcher
  private readonly now: () => Date

  constructor(options: DaishinScrapingAdapterOptions = {}) {
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(
    _date: string
  ): Promise<IpoCompetitionFeedResponse> {
    void _date
    const fetchedAt = this.now().toISOString()

    if (!DAISHIN_LIST_URL) {
      return this.errorResponse(
        fetchedAt,
        '대신증권 실시간 엔드포인트 미설정 (DART 공시 모드 유지)'
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await this.fetcher(DAISHIN_LIST_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!response.ok) {
        return this.errorResponse(
          fetchedAt,
          `대신증권 페이지 응답 오류 (HTTP ${response.status})`
        )
      }

      const html = await response.text()
      const rows = parseDaishinHtml(html)

      if (rows.length === 0) {
        return {
          source: createDaishinSource(
            fetchedAt,
            'provisional',
            '대신증권 페이지에 현재 진행 중인 공모주 청약이 없습니다.'
          ),
          offerings: [],
        }
      }

      const source = createDaishinSource(
        fetchedAt,
        'provisional',
        `대신증권 공모주 경쟁률 페이지에서 ${rows.length}건의 공모주 데이터를 수집했습니다.`
      )

      // Group rows by company name (in case there are duplicates)
      // Each row becomes one offering with Daishin as the single broker
      const offerings = rows.map((row) => ({
        dartCorpCode: row.sno.padStart(8, '0'),
        companyName: row.name,
        offerPrice: row.offerPrice > 0 ? row.offerPrice : null,
        offeringKind: 'ipo' as const,
        depositRate: 0.5,
        listingDate: null,
        subscriptionOpenAt: null,
        subscriptionCloseAt: null,
        expectedFinalDeposit: null,
        expectedFinalOneShareCost: null,
        marketPrice: null,
        disparityRate: null,
        brokers: [rowToBroker(row, source)],
      }))

      return { source, offerings }
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? '대신증권 페이지 요청 시간이 초과되었습니다.'
          : '대신증권 페이지 연결에 실패했습니다.'
      return this.errorResponse(fetchedAt, message)
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Returns the parsed rows with their normalized names.
   * Used by the service layer for name-based matching.
   */
  async scrapeRawRows(): Promise<{
    rows: DaishinIpoRow[]
    fetchedAt: string
  }> {
    const fetchedAt = this.now().toISOString()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await this.fetcher(DAISHIN_LIST_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!response.ok) return { rows: [], fetchedAt }

      const html = await response.text()
      return { rows: parseDaishinHtml(html), fetchedAt }
    } catch {
      return { rows: [], fetchedAt }
    } finally {
      clearTimeout(timeout)
    }
  }

  private errorResponse(
    fetchedAt: string,
    coverage: string
  ): IpoCompetitionFeedResponse {
    return {
      source: createDaishinSource(fetchedAt, 'delayed', coverage),
      offerings: [],
    }
  }
}
