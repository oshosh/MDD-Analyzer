import type {
  IpoCompetitionFeedBroker,
  IpoCompetitionFeedOffering,
  IpoCompetitionFeedResponse,
  IpoDataSource,
} from '@entities/ipo'
import type { IpoCompetitionFeedAdapter } from './competitionFeedAdapter'
import { normalizeCompanyName } from './daishinScrapingAdapter'

const EUGENE_LIST_URL = process.env.EUGENE_IPO_LIST_URL || ''
const EUGENE_SEARCH_URL = process.env.EUGENE_IPO_SEARCH_URL || ''
const SOURCE_NAME = '유진투자증권 공모주 경쟁률 페이지 스크래핑'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface EugeneOption {
  code: string
  gubun: string
  name: string
  normalizedName: string
}

export interface EugeneCompetitionDetail {
  code: string
  name: string
  startDate: string
  endDate: string
  refundDate: string
  listingDate: string
  offerPrice: number
  sharesAllocated: number
  competitionRatio: number
  applicantCount: number
  equalExpectedAllocation: number
}

function parseKrNumber(raw: string): number {
  const cleaned = raw.replace(/[,원\s]/g, '')
  const val = parseFloat(cleaned)
  return Number.isFinite(val) ? val : 0
}

/**
 * Parse the select options in svsr410.do
 */
export function parseEugeneSelectOptions(html: string): EugeneOption[] {
  const selectMatch = html.match(
    /<select[^>]*name=["']?input01["']?[^>]*>([\s\S]*?)<\/select>/i
  )
  if (!selectMatch) return []

  const options: EugeneOption[] = []
  const matches = selectMatch[1].matchAll(
    /<option[^>]*value=["']([^"']*)["'][^>]*title=["']([^"']*)["'][^>]*>([^<]*)/gi
  )

  for (const m of matches) {
    const code = m[1].trim()
    const gubun = m[2].trim()
    const rawName = m[3].trim()
    if (!code || !rawName) continue

    options.push({
      code,
      gubun,
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
    })
  }

  return options
}

/**
 * Parse the detail table returned by svsr410/search.do
 */
export function parseEugeneDetailTable(
  html: string,
  option: EugeneOption
): EugeneCompetitionDetail | null {
  const tableMatch = html.match(/청약경쟁률 정보[\s\S]*?<\/table>/i)
  if (!tableMatch) return null

  const tableHtml = tableMatch[0]

  // Extract cell values via regex or table row parsing
  const startDateMatch = tableHtml.match(
    /청약시작일[\s\S]*?<td[^>]*>([\d.]+)<\/td>/i
  )
  const endDateMatch = tableHtml.match(
    /청약종료일[\s\S]*?<td[^>]*>([\d.]+)<\/td>/i
  )
  const refundDateMatch = tableHtml.match(
    /환불일[\s\S]*?<td[^>]*>([\d.]+)<\/td>/i
  )
  const listingDateMatch = tableHtml.match(
    /상장예정일[\s\S]*?<td[^>]*>([\d.]+)<\/td>/i
  )
  const offerPriceMatch = tableHtml.match(
    /공모가[\s\S]*?<td[^>]*>([\d,]+)<\/td>/i
  )
  const sharesMatch = tableHtml.match(
    /당사공모주수[\s\S]*?<td[^>]*>([\d,]+)<\/td>/i
  )
  const ratioMatch = tableHtml.match(
    /일반고객[\s\S]*?<td[^>]*>([\d,.]+)<\/td>/i
  )
  const applicantMatch = tableHtml.match(/<div id="div_in1">([\d,]+)<\/div>/i)
  const equalMatch = tableHtml.match(/<div id="div_in2">([\d,.]+)<\/div>/i)

  const startDate = startDateMatch ? startDateMatch[1].replace(/\./g, '-') : ''
  const endDate = endDateMatch ? endDateMatch[1].replace(/\./g, '-') : ''
  const refundDate = refundDateMatch ? refundDateMatch[1].replace(/\./g, '-') : ''
  const listingDate = listingDateMatch ? listingDateMatch[1].replace(/\./g, '-') : ''
  const offerPrice = offerPriceMatch ? parseKrNumber(offerPriceMatch[1]) : 0
  const sharesAllocated = sharesMatch ? parseKrNumber(sharesMatch[1]) : 0
  const competitionRatio = ratioMatch ? parseKrNumber(ratioMatch[1]) : 0
  const applicantCount = applicantMatch ? parseKrNumber(applicantMatch[1]) : 0
  const equalExpectedAllocation = equalMatch ? parseKrNumber(equalMatch[1]) : 0

  return {
    code: option.code,
    name: option.name,
    startDate,
    endDate,
    refundDate,
    listingDate,
    offerPrice,
    sharesAllocated,
    competitionRatio,
    applicantCount,
    equalExpectedAllocation,
  }
}

function createEugeneSource(
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

function detailToBroker(
  detail: EugeneCompetitionDetail,
  source: IpoDataSource
): IpoCompetitionFeedBroker {
  const generalAllocationShares =
    detail.sharesAllocated > 0 ? detail.sharesAllocated : null
  const equalAllocationShares = generalAllocationShares
    ? Math.floor(generalAllocationShares / 2)
    : null
  const proportionalAllocationShares =
    generalAllocationShares && equalAllocationShares
      ? generalAllocationShares - equalAllocationShares
      : null

  // Korean IPO proportional ratio is 2x total competition ratio (50% proportional pool)
  const currentProportionalRatio =
    detail.competitionRatio > 0
      ? Math.round(detail.competitionRatio * 2 * 100) / 100
      : null

  // Equal allocation per applicant (prefer broker reported number, or calculate equalAllocationShares / applicantCount)
  const currentEqualExpectedAllocation =
    detail.equalExpectedAllocation > 0
      ? detail.equalExpectedAllocation
      : equalAllocationShares && detail.applicantCount > 0
        ? Math.round((equalAllocationShares / detail.applicantCount) * 100) / 100
        : null


  const maxNormalShares = generalAllocationShares
    ? Math.min(Math.floor(generalAllocationShares * 0.1), 20_000)
    : 20_000
  const limits = [
    {
      id: 'eugene-limit-1',
      label: '일반/우대',
      maxShares: maxNormalShares,
    },
  ]

  return {
    id: 'eugene',
    name: '유진투자증권',
    role: null,
    generalAllocationShares,
    equalAllocationShares,
    proportionalAllocationShares,
    currentTotalCompetitionRatio:
      detail.competitionRatio > 0 ? detail.competitionRatio : null,
    currentProportionalRatio,
    expectedFinalProportionalRatio: null,
    currentEqualExpectedAllocation,
    expectedEqualAllocation: null,
    applicantCount: detail.applicantCount > 0 ? detail.applicantCount : null,
    currentTotalDeposit: null,
    expectedFinalTotalDeposit: null,
    estimatedOneShareDeposit: null,
    expectedFinalOneShareDeposit: null,
    applicationFee: 2000,
    minSubscriptionShares: 10,
    subscriptionUnitShares: 10,
    subscriptionUnitTiers: [],
    limits,
    onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (미배정시 환불)',
    competitionRatioKind: 'broker-proportional',
    proportionalAllocationRoundingRule: null,
    source,
  }
}

export interface EugeneScrapingAdapterOptions {
  fetcher?: Fetcher
  now?: () => Date
}

export class EugeneScrapingAdapter implements IpoCompetitionFeedAdapter {
  private readonly fetcher: Fetcher
  private readonly now: () => Date

  constructor(options: EugeneScrapingAdapterOptions = {}) {
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(
    _date: string
  ): Promise<IpoCompetitionFeedResponse> {
    void _date
    const fetchedAt = this.now().toISOString()

    if (!EUGENE_LIST_URL || !EUGENE_SEARCH_URL) {
      return this.delayedResponse(
        fetchedAt,
        '유진투자증권 실시간 엔드포인트 미설정 (DART 공시 모드 유지)'
      )
    }

    try {
      // 1. Get options list
      const listRes = await this.fetcher(EUGENE_LIST_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      })

      if (!listRes.ok) {
        return this.delayedResponse(
          fetchedAt,
          `유진투자증권 목록 응답 오류 (HTTP ${listRes.status})`
        )
      }

      const listHtml = await listRes.text()
      const options = parseEugeneSelectOptions(listHtml)

      if (options.length === 0) {
        return {
          source: createEugeneSource(
            fetchedAt,
            'provisional',
            '유진투자증권 공모주 청약 목록이 비어 있습니다.'
          ),
          offerings: [],
        }
      }

      // Check top active options (latest 3)
      const topOptions = options.slice(0, 3)
      const details: EugeneCompetitionDetail[] = []

      for (const opt of topOptions) {
        try {
          const body = new URLSearchParams({
            input01: opt.code,
            gubunvalue: opt.gubun,
          })

          const searchRes = await this.fetcher(EUGENE_SEARCH_URL, {
            method: 'POST',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'text/html',
              'Content-Type': 'application/x-www-form-urlencoded',
              Referer: EUGENE_LIST_URL,
            },
            body: body.toString(),
          })

          if (searchRes.ok) {
            const searchHtml = await searchRes.text()
            const detail = parseEugeneDetailTable(searchHtml, opt)
            if (detail) {
              details.push(detail)
            }
          }
        } catch {
          // ignore single item fetch error
        }
      }

      const source = createEugeneSource(
        fetchedAt,
        'provisional',
        `유진투자증권 공모주 경쟁률 페이지에서 ${details.length}건의 데이터를 수집했습니다.`
      )

      const offerings: IpoCompetitionFeedOffering[] = details.map((det) => ({
        dartCorpCode: det.code.padStart(8, '0'),
        companyName: det.name,
        offerPrice: det.offerPrice > 0 ? det.offerPrice : null,
        offeringKind: 'ipo' as const,
        depositRate: 0.5,
        listingDate: det.listingDate || null,
        subscriptionOpenAt: det.startDate || null,
        subscriptionCloseAt: det.endDate || null,
        expectedFinalDeposit: null,
        expectedFinalOneShareCost: null,
        marketPrice: null,
        disparityRate: null,
        brokers: [detailToBroker(det, source)],
      }))

      return { source, offerings }
    } catch {
      return this.delayedResponse(
        fetchedAt,
        '유진투자증권 페이지 연결에 실패했습니다.'
      )
    }
  }

  private delayedResponse(
    fetchedAt: string,
    coverage: string
  ): IpoCompetitionFeedResponse {
    return {
      source: createEugeneSource(fetchedAt, 'delayed', coverage),
      offerings: [],
    }
  }
}
