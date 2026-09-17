import {
  type IpoCompetitionFeedBroker,
  type IpoCompetitionFeedOffering,
  type IpoCompetitionFeedResponse,
  type IpoDataSource,
} from '@entities/ipo'
import { IpoDataSourceError } from './errors'

const IBK_GATEWAY_URL = process.env.IBK_IPO_GATEWAY_URL || ''
const IBK_TR_CODE = process.env.IBK_IPO_TR_CODE || ''
const IBK_FORM_NAME = process.env.IBK_IPO_FORM_NAME || ''
const IBK_REFERER = process.env.IBK_IPO_REFERER || ''
const IBK_ORIGIN = process.env.IBK_IPO_ORIGIN || ''
const REQUEST_TIMEOUT_MS = 10_000

interface IbkWasfResponse {
  WA?: Record<
    string,
    {
      WASFState?: number
      WASFMsg?: string
      otb4?: {
        HEADER?: string[]
        DATAS?: string[][]
      }
    }
  >
}

export class IbkScrapingAdapter {
  private readonly fetcher: typeof fetch

  constructor(fetcher: typeof fetch = fetch) {
    this.fetcher = fetcher
  }

  async getCompetitionForDate(date: string): Promise<IpoCompetitionFeedResponse> {
    const fetchedAt = new Date().toISOString()
    const cleanDate = date.replaceAll('-', '')

    const source: IpoDataSource = {
      name: 'IBK투자증권 실시간 웹 청약 시스템',
      fetchedAt,
      sourceAsOf: date,
      status: 'provisional',
      dataKind: 'broker-direct',
      coverage: '아이비케이투자증권 실시간 청약건수, 전체경쟁률, 비례경쟁률 직접 연동',
    }

    if (!IBK_GATEWAY_URL || !IBK_TR_CODE || !IBK_FORM_NAME) {
      return {
        source: {
          ...source,
          status: 'unavailable',
          coverage: 'IBK 실시간 엔드포인트 미설정 (DART 공시 모드 유지)',
        },
        offerings: [],
      }
    }

    try {
      const items = await this.fetchIpoList(cleanDate)
      const offerings: IpoCompetitionFeedOffering[] = []

      for (const item of items) {
        offerings.push(this.transformToOffering(item, date, source))
      }

      return {
        source: offerings.length > 0 ? source : { ...source, status: 'unavailable' },
        offerings,
      }
    } catch (err) {
      console.error('[IBK Adapter Error]:', err)
      return {
        source: { ...source, status: 'unavailable' },
        offerings: [],
      }
    }
  }

  private async fetchIpoList(cleanDate: string): Promise<Record<string, string>[]> {
    const param = {
      WA: [IBK_TR_CODE],
      request: {
        zAppySrtDt: cleanDate,
      },
      FORMS: [IBK_FORM_NAME],
    }

    const postBody = `jsonobj=${encodeURIComponent(
      encodeURIComponent(JSON.stringify(param))
    )}&pclog_data=`

    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        if (IBK_REFERER) reqHeaders.Referer = IBK_REFERER
        if (IBK_ORIGIN) reqHeaders.Origin = IBK_ORIGIN

        const response = await this.fetcher(IBK_GATEWAY_URL, {
          method: 'POST',
          headers: reqHeaders,
          body: postBody,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new IpoDataSourceError(`IBK request failed with ${response.status}`)
        }

        const buf = await response.arrayBuffer()
        let text = new TextDecoder('utf-8').decode(buf)
        if (text.includes('\ufffd') || !text.includes('작업이')) {
          try {
            const euckrCandidate = new TextDecoder('euc-kr').decode(buf)
            if (euckrCandidate.includes('작업이') || euckrCandidate.includes('WASF')) {
              text = euckrCandidate
            }
          } catch {
            // fallback to original utf-8
          }
        }

        const json = JSON.parse(text) as IbkWasfResponse
        const otb4 = json?.WA?.[IBK_TR_CODE]?.otb4
        if (!otb4?.HEADER || !otb4?.DATAS || otb4.DATAS.length === 0) {
          return []
        }

        const headers = otb4.HEADER
        return otb4.DATAS.map((row) => {
          const entry: Record<string, string> = {}
          headers.forEach((h, idx) => {
            entry[h] = row[idx] ?? ''
          })
          return entry
        })
      } catch (err) {
        lastError = err
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
        }
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError ?? new IpoDataSourceError('IBK request failed after retries')
  }

  private transformToOffering(
    item: Record<string, string>,
    date: string,
    source: IpoDataSource
  ): IpoCompetitionFeedOffering {
    const rawName = item.zIsuNm ?? ''
    const cleanName = rawName.trim()
    const stockCode = item.zAppyIsuNo ?? item.zAppyIsuNo2 ?? ''

    const offerPrice = parseInt((item.dFltnPrc ?? '').replace(/,/g, ''), 10) || null
    const totalCompetitionRate = parseFloat(item.dAllCmpetRat ?? item.dGnrlCmpetRat ?? '0') || null
    let proportionalCompetitionRate = parseFloat(item.dPrvlgCmpetRat ?? '0') || null

    // 비례경쟁률은 일반(전체)경쟁률의 정확히 2배 (50% 균등 + 50% 비례 배분 규칙)
    if (proportionalCompetitionRate === null && totalCompetitionRate !== null) {
      proportionalCompetitionRate = Number((totalCompetitionRate * 2).toFixed(2))
    }

    const generalAllocationShares =
      parseInt((item.lAllAsgnQty ?? item.lGnrlAsgnQty ?? '').replace(/,/g, ''), 10) || null
    const equalAllocationShares =
      parseInt((item.lPrvlgAsgnQty ?? '').replace(/,/g, ''), 10) ||
      (generalAllocationShares ? Math.floor(generalAllocationShares * 0.5) : null)
    const proportionalAllocationShares =
      generalAllocationShares && equalAllocationShares
        ? generalAllocationShares - equalAllocationShares
        : equalAllocationShares

    const applicantCount = parseInt((item.zAppyCnt ?? '').replace(/,/g, ''), 10) || null
    const totalAppliedShares = parseInt((item.zSumQty ?? '').replace(/,/g, ''), 10) || null

    const currentTotalDeposit =
      offerPrice !== null && totalAppliedShares !== null
        ? Math.round(totalAppliedShares * offerPrice * 0.5)
        : null

    const estimatedOneShareDeposit =
      offerPrice !== null && proportionalCompetitionRate !== null
        ? Math.round(offerPrice * proportionalCompetitionRate * 0.5)
        : null

    const currentEqualExpectedAllocation =
      equalAllocationShares !== null && applicantCount !== null && applicantCount > 0
        ? Number((equalAllocationShares / applicantCount).toFixed(2))
        : null

    const maxLimitShares = parseInt((item.l3GrpAppyLmtQty ?? '').replace(/,/g, ''), 10) || 15_000

    const broker: IpoCompetitionFeedBroker = {
      id: 'ibk-broker-1',
      name: '아이비케이투자증권',
      role: '대표주관회사',
      generalAllocationShares,
      equalAllocationShares,
      proportionalAllocationShares,
      currentTotalCompetitionRatio: totalCompetitionRate,
      currentProportionalRatio: proportionalCompetitionRate,
      expectedFinalProportionalRatio: proportionalCompetitionRate,
      currentEqualExpectedAllocation,
      expectedEqualAllocation: currentEqualExpectedAllocation,
      applicantCount,
      currentTotalDeposit,
      expectedFinalTotalDeposit: currentTotalDeposit,
      estimatedOneShareDeposit,
      expectedFinalOneShareDeposit: estimatedOneShareDeposit,
      applicationFee: 2000,
      minSubscriptionShares: 10,
      subscriptionUnitShares: 10,
      subscriptionUnitTiers: [
        { fromShares: 10, toShares: 100, unitShares: 10 },
        { fromShares: 100, toShares: 500, unitShares: 50 },
        { fromShares: 500, toShares: 1000, unitShares: 100 },
        { fromShares: 1000, toShares: 30000, unitShares: 500 },
        { fromShares: 30000, toShares: null, unitShares: 1000 },
      ],
      limits: [
        {
          id: 'ibk-limit-1',
          label: '일반고객(100%)',
          maxShares: maxLimitShares,
        },
        {
          id: 'ibk-limit-2',
          label: '우대고객(200%)',
          maxShares: maxLimitShares * 2,
        },
      ],
      onlineSubscriptionNote: 'IBK투자증권 온라인(MTS/WTS) 청약 가능 (당일 개설 계좌 청약 불가 유의)',
      competitionRatioKind: 'broker-proportional',
      proportionalAllocationRoundingRule: 'five-round-six-up',
      source,
    }

    return {
      dartCorpCode: stockCode,
      companyName: cleanName,
      offerPrice,
      depositRate: 0.5,
      offeringKind: 'ipo',
      listingDate: (item.zLstdDt ?? '').replaceAll('/', '-') || null,
      subscriptionOpenAt: `${date}T08:00:00+09:00`,
      subscriptionCloseAt: `${(item.zAppyEndDt ?? date).replaceAll('/', '-')}T16:00:00+09:00`,
      expectedFinalDeposit: currentTotalDeposit,
      expectedFinalOneShareCost: estimatedOneShareDeposit,
      marketPrice: null,
      disparityRate: null,
      brokers: [broker],
    }
  }
}
