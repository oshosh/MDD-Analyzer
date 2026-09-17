import type {
  IpoCompetitionFeedBroker,
  IpoCompetitionFeedOffering,
  IpoCompetitionFeedResponse,
} from '@entities/ipo'
import type { IpoCompetitionFeedAdapter } from './competitionFeedAdapter'
import { normalizeCompanyName } from './daishinScrapingAdapter'

const MIRAE_JSON_URL = process.env.MIRAE_IPO_JSON_URL || ''
const MIRAE_DETAIL_JSON_URL = process.env.MIRAE_IPO_DETAIL_JSON_URL || ''
const MIRAE_REFERER = process.env.MIRAE_IPO_REFERER || ''
const MIRAE_ACTIVE_URL = process.env.MIRAE_IPO_ACTIVE_URL || ''
const MIRAE_RATE_URL = process.env.MIRAE_IPO_RATE_URL || ''
const REQUEST_TIMEOUT_MS = 10_000
const SOURCE_NAME = '미래에셋증권 공모주 청약경쟁률 직접 연동'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface MiraeJsonItem {
  itm_nm: string
  itm_no: string
  pbpr: string
  apy_cpt_r: string
  pbff_sc: string
  max_apy_sc: string
  apy_strt_dt: string
  apy_end_dt: string
  rfnd_dt: string
  lstg_dt: string
  apy_fin_tp_nm: string
  pbff_pcd?: string
  apy_yr?: string
  apy_itm_srno?: string
}

export interface MiraeScrapingAdapterOptions {
  fetcher?: Fetcher
  now?: () => Date
}

export interface MiraeActiveOffering {
  bsnm: string
  year: string
  turn: string
  name: string
  normalizedName: string
  startDate: string
  endDate: string
  itmNo?: string
  ratio?: number | null
  offerPrice?: number | null
  underwritingShares?: number | null
  maxLimitShares?: number | null
  refundDate?: string | null
  listingDate?: string | null
  applicantCount?: number | null
  proportionalRatio?: number | null
  totalDeposit?: number | null
  equalAllocationShares?: number | null
  proportionalAllocationShares?: number | null
  equalExpectedAllocation?: number | null
}

export interface MiraeRateResult {
  generalRatio: number | null
  preferentialRatio: number | null
}

function parseDateToIso(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return raw
}

function parseRatio(raw: string): number | null {
  const match = raw.match(/([\d,.]+)\s*:\s*1/)
  if (!match) {
    const val = parseFloat(raw.replace(/,/g, ''))
    return Number.isFinite(val) && val > 0 ? val : null
  }
  const val = parseFloat(match[1].replace(/,/g, ''))
  return Number.isFinite(val) && val > 0 ? val : null
}

/**
 * Parse active offerings from hki3001/m01.do
 */
export function parseMiraeActiveOfferings(
  html: string
): MiraeActiveOffering[] {
  const viewRegex =
    /javascript:view\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]\s*\)/g

  const offerings: MiraeActiveOffering[] = []
  let match: RegExpExecArray | null

  while ((match = viewRegex.exec(html)) !== null) {
    const bsnm = match[1].trim()
    const year = match[2].trim()
    const turn = match[3].trim()
    const rawName = match[4].trim()
    const strtdt = match[5].trim()
    const enddt = match[6].trim()

    if (!rawName || (bsnm !== '공모주' && bsnm !== '실권주')) {
      continue
    }

    offerings.push({
      bsnm,
      year,
      turn,
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
      startDate: parseDateToIso(strtdt),
      endDate: parseDateToIso(enddt),
    })
  }

  return offerings
}

/**
 * Parse competition rate popup HTML (hku4044/p01.do)
 */
export function parseMiraeRatePopup(html: string): MiraeRateResult {
  let generalRatio: number | null = null
  let preferentialRatio: number | null = null

  // Extract <dl class="ipo_info"> block
  const dlMatch = html.match(/<dl\s+class=["']?ipo_info["']?[^>]*>([\s\S]*?)<\/dl>/i)
  const targetHtml = dlMatch ? dlMatch[1] : html

  // Pattern: <dt>...일반...</dt>\s*<dd>1,264.50 : 1</dd>
  const pairs = targetHtml.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)

  for (const pair of pairs) {
    const dtText = pair[1].replace(/<[^>]+>/g, '').trim()
    const ddText = pair[2].replace(/<[^>]+>/g, '').trim()
    const ratio = parseRatio(ddText)

    if (dtText.includes('우대')) {
      preferentialRatio = ratio
    } else if (dtText.includes('일반')) {
      generalRatio = ratio
    }
  }

  // Fallback: look for any valid "XX.XX : 1" (ratio > 0) in body if DL was structured differently
  if (generalRatio === null && preferentialRatio === null) {
    const ratios = [...html.matchAll(/([\d,.]+)\s*:\s*1/g)]
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((val) => Number.isFinite(val) && val > 0)

    if (ratios.length > 0) {
      generalRatio = ratios[0]
      if (ratios.length > 1) {
        preferentialRatio = ratios[1]
      }
    }
  }

  // Ensure 0 is never returned as a valid competition ratio (0:1 is an empty/unpopulated placeholder)
  if (generalRatio !== null && generalRatio <= 0) {
    generalRatio = null
  }
  if (preferentialRatio !== null && preferentialRatio <= 0) {
    preferentialRatio = null
  }

  return { generalRatio, preferentialRatio }
}

export function parseMiraeJsonItems(json: unknown): MiraeActiveOffering[] {
  if (!json || typeof json !== 'object') return []
  const data = json as { GRID?: MiraeJsonItem[] }
  if (!Array.isArray(data.GRID)) return []

  const offerings: MiraeActiveOffering[] = []
  for (const item of data.GRID) {
    if (item.pbff_pcd === '04') continue // 제외 항목
    const rawName = item.itm_nm?.trim()
    if (!rawName) continue

    const ratioVal = parseFloat(item.apy_cpt_r?.replace(/,/g, '') ?? '')
    const priceVal = parseFloat(item.pbpr?.replace(/,/g, '') ?? '')
    const underVal = parseFloat(item.pbff_sc?.replace(/,/g, '') ?? '')
    const maxVal = parseFloat(item.max_apy_sc?.replace(/,/g, '') ?? '')

    offerings.push({
      bsnm: item.pbff_pcd === '05' ? '실권주' : '공모주',
      year: item.apy_yr || '',
      turn: item.apy_itm_srno || '',
      name: rawName,
      normalizedName: normalizeCompanyName(rawName),
      startDate: parseDateToIso(item.apy_strt_dt || ''),
      endDate: parseDateToIso(item.apy_end_dt || ''),
      itmNo: item.itm_no || '',
      ratio: Number.isFinite(ratioVal) && ratioVal > 0 ? ratioVal : null,
      offerPrice: Number.isFinite(priceVal) && priceVal > 0 ? priceVal : null,
      underwritingShares: Number.isFinite(underVal) && underVal > 0 ? underVal : null,
      maxLimitShares: Number.isFinite(maxVal) && maxVal > 0 ? maxVal : null,
      refundDate: parseDateToIso(item.rfnd_dt || ''),
      listingDate: parseDateToIso(item.lstg_dt || ''),
    })
  }

  return offerings
}


export function decodeHtmlBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('\uFFFD')) {
    return utf8
  }
  return new TextDecoder('euc-kr').decode(buffer)
}

export class MiraeScrapingAdapter implements IpoCompetitionFeedAdapter {
  private readonly fetcher: Fetcher
  private readonly now: () => Date

  constructor(options: MiraeScrapingAdapterOptions = {}) {
    this.fetcher = options.fetcher ?? (globalThis.fetch as unknown as Fetcher)
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(
    date: string
  ): Promise<IpoCompetitionFeedResponse> {
    const fetchedAt = this.now().toISOString()

    // 1. Try modern mobile JSON endpoint first
    const jsonList = await this.fetchJsonOfferings(date)
    const jsonMatched = jsonList.filter(
      (item) => (item.startDate <= date && date <= item.endDate) || (!item.startDate && !item.endDate)
    )

    if (jsonMatched.length > 0) {
      const offerings: IpoCompetitionFeedOffering[] = await Promise.all(
        jsonMatched.map(async (item) => {
          const detail = await this.fetchDetailJson(item, date)
          const underShares = detail?.underwritingShares ?? item.underwritingShares ?? null
          const equalShares = underShares ? Math.floor(underShares * 0.5) : null
          const propShares = underShares && equalShares ? underShares - equalShares : null

          const appCount = detail?.applicantCount ?? null
          const totalRatio = detail?.totalRatio ?? item.ratio ?? null
          const propRatio = detail?.proportionalRatio ?? (totalRatio ? totalRatio * 2 : null)
          const totalDeposit = detail?.totalDeposit ?? null
          const equalExpected =
            equalShares && appCount && appCount > 0
              ? Math.round((equalShares / appCount) * 100) / 100
              : null

          const broker: IpoCompetitionFeedBroker = {
            id: 'mirae-direct',
            name: '미래에셋증권',
            role: null,
            generalAllocationShares: underShares,
            equalAllocationShares: equalShares,
            proportionalAllocationShares: propShares,
            currentTotalCompetitionRatio: totalRatio,
            currentProportionalRatio: propRatio,
            expectedFinalProportionalRatio: null,
            currentEqualExpectedAllocation: equalExpected,
            expectedEqualAllocation: equalExpected,
            applicantCount: appCount,
            currentTotalDeposit: totalDeposit,
            expectedFinalTotalDeposit: null,
            estimatedOneShareDeposit: null,
            expectedFinalOneShareDeposit: null,
            applicationFee: 2000,
            minSubscriptionShares: 10,
            subscriptionUnitShares: 10,
            subscriptionUnitTiers: [],
            limits: item.maxLimitShares
              ? [
                  {
                    id: 'mirae-limit-1',
                    label: '최고청약한도',
                    maxShares: item.maxLimitShares,
                  },
                ]
              : [],
            onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (우대등급 무료)',
            competitionRatioKind: 'broker-proportional',
            proportionalAllocationRoundingRule: null,
            source: {
              name: SOURCE_NAME,
              dataKind: 'broker-direct',
              sourceAsOf: fetchedAt,
              fetchedAt,
              status: propRatio !== null ? 'provisional' : 'unavailable',
              coverage: '미래에셋증권 공모주 실시간 경쟁률 및 청약건수 연동',
            },
          }

          return {
            dartCorpCode: item.turn ? item.turn.padStart(8, '0') : '00000000',
            companyName: item.name,
            offeringKind: item.bsnm === '실권주' ? 'rights' : 'ipo',
            listingDate: item.listingDate ?? null,
            subscriptionOpenAt: null,
            subscriptionCloseAt: null,
            expectedFinalDeposit: totalDeposit,
            expectedFinalOneShareCost: null,
            offerPrice: item.offerPrice ?? null,
            depositRate: 0.5,
            marketPrice: null,
            disparityRate: null,
            brokers: [broker],
          }
        })
      )

      return {
        source: {
          name: SOURCE_NAME,
          dataKind: 'broker-direct',
          sourceAsOf: fetchedAt,
          fetchedAt,
          status: 'provisional',
          coverage: `미래에셋증권 공모주 ${offerings.length}건 실시간 연동 완료`,
        },
        offerings,
      }
    }

    // 2. Fallback to desktop scraping (hki3001/m01.do + hku4044/p01.do)
    const activeList = await this.fetchActiveOfferings()

    if (activeList.length === 0) {
      return this.buildEmptyResponse(
        fetchedAt,
        '미래에셋증권에서 현재 진행 중인 공모주 청약 일정이 없습니다.'
      )
    }

    const matchedOfferings = activeList.filter(
      (item) => item.startDate <= date && date <= item.endDate
    )

    if (matchedOfferings.length === 0) {
      return this.buildEmptyResponse(
        fetchedAt,
        `미래에셋증권에서 ${date}에 해당하는 청약 일정을 찾을 수 없습니다.`
      )
    }

    const offerings: IpoCompetitionFeedOffering[] = []

    for (const item of matchedOfferings) {
      const rateResult = await this.fetchRatePopup(item)
      const ratio = rateResult?.generalRatio ?? null

      const broker: IpoCompetitionFeedBroker = {
        id: 'mirae-direct',
        name: '미래에셋증권',
        role: null,
        generalAllocationShares: null,
        equalAllocationShares: null,
        proportionalAllocationShares: null,
        currentTotalCompetitionRatio: ratio,
        currentProportionalRatio: ratio,
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
        limits: [],
        onlineSubscriptionNote: '온라인 청약 수수료 2,000원 (우대등급 무료)',
        competitionRatioKind: 'broker-proportional',
        proportionalAllocationRoundingRule: null,
        source: {
          name: SOURCE_NAME,
          dataKind: 'broker-direct',
          sourceAsOf: fetchedAt,
          fetchedAt,
          status: ratio !== null ? 'provisional' : 'unavailable',
          coverage: '미래에셋증권 공모주 실시간 경쟁률',
        },
      }

      offerings.push({
        dartCorpCode: item.turn ? item.turn.padStart(8, '0') : '00000000',
        companyName: item.name,
        offeringKind: item.bsnm === '실권주' ? 'rights' : 'ipo',
        listingDate: null,
        subscriptionOpenAt: null,
        subscriptionCloseAt: null,
        expectedFinalDeposit: null,
        expectedFinalOneShareCost: null,
        offerPrice: null,
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
        coverage: `미래에셋증권 공모주 ${offerings.length}건 실시간 연동 완료`,
      },
      offerings,
    }
  }

  private async fetchJsonOfferings(date: string): Promise<MiraeActiveOffering[]> {
    if (!MIRAE_JSON_URL) return []
    try {
      const d = new Date(date)
      const startDateStr = isNaN(d.getTime())
        ? date.replace(/-/g, '')
        : new Date(d.getTime() - 14 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')
      const endDateStr = isNaN(d.getTime())
        ? date.replace(/-/g, '')
        : new Date(d.getTime() + 14 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')

      const params = new URLSearchParams({
        pbff_pcd: '01',
        apy_fin_tcd: '00',
        apy_strt_dt: startDateStr,
        apy_end_dt: endDateStr,
        next_apy_yr: '',
        next_pbff_pcd: '',
        next_itm_no: '',
        next_apy_itm_srno: '',
        next_rgt_bas_dt: '',
      })

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      }
      if (MIRAE_REFERER) headers.Referer = MIRAE_REFERER

      const res = await this.fetcher(MIRAE_JSON_URL, {
        method: 'POST',
        headers,
        body: params.toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return []
      const json: unknown = await res.json().catch(() => null)
      return parseMiraeJsonItems(json)
    } catch {
      return []
    }
  }

  private async fetchDetailJson(
    item: MiraeActiveOffering,
    date: string
  ): Promise<{
    applicantCount: number | null
    proportionalRatio: number | null
    totalRatio: number | null
    totalDeposit: number | null
    underwritingShares: number | null
  } | null> {
    if (!item.itmNo || !MIRAE_DETAIL_JSON_URL) return null
    try {
      const d = new Date(date)
      const startDateStr = isNaN(d.getTime())
        ? (item.startDate || date).replace(/-/g, '')
        : new Date(d.getTime() - 14 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')
      const endDateStr = isNaN(d.getTime())
        ? (item.endDate || date).replace(/-/g, '')
        : new Date(d.getTime() + 14 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')

      const params = new URLSearchParams({
        pbff_pcd: item.bsnm === '실권주' ? '05' : '01',
        apy_fin_tcd: '00',
        apy_strt_dt: startDateStr,
        apy_end_dt: endDateStr,
        itm_no: item.itmNo,
      })

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      }
      if (MIRAE_REFERER) headers.Referer = MIRAE_REFERER

      const res = await this.fetcher(MIRAE_DETAIL_JSON_URL, {
        method: 'POST',
        headers,
        body: params.toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return null
      const data = (await res.json().catch(() => null)) as {
        targetObj?: {
          isu_q?: string
          gnrl_cs_apy_acq?: string
          prptn_cpt_r?: string
          al_cpt_r?: string
          now_ofr_a?: string
        }
      } | null

      const obj = data?.targetObj
      if (!obj) return null

      const appCount = parseInt(obj.gnrl_cs_apy_acq?.replace(/,/g, '') ?? '', 10)
      const propRatio = parseFloat(obj.prptn_cpt_r?.replace(/,/g, '') ?? '')
      const totRatio = parseFloat(obj.al_cpt_r?.replace(/,/g, '') ?? '')
      const totDep = parseFloat(obj.now_ofr_a?.replace(/,/g, '') ?? '')
      const underShares = parseFloat(obj.isu_q?.replace(/,/g, '') ?? '')

      return {
        applicantCount: Number.isFinite(appCount) && appCount > 0 ? appCount : null,
        proportionalRatio: Number.isFinite(propRatio) && propRatio > 0 ? propRatio : null,
        totalRatio: Number.isFinite(totRatio) && totRatio > 0 ? totRatio : null,
        totalDeposit: Number.isFinite(totDep) && totDep > 0 ? totDep : null,
        underwritingShares: Number.isFinite(underShares) && underShares > 0 ? underShares : null,
      }
    } catch {
      return null
    }
  }

  private async fetchActiveOfferings(): Promise<MiraeActiveOffering[]> {
    try {
      const res = await this.fetcher(MIRAE_ACTIVE_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return []

      const buffer = await res.arrayBuffer()
      const html = decodeHtmlBuffer(buffer)
      return parseMiraeActiveOfferings(html)
    } catch {
      return []
    }
  }

  private async fetchRatePopup(
    item: MiraeActiveOffering
  ): Promise<MiraeRateResult | null> {
    try {
      const rghtSect = item.bsnm === '실권주' ? '13' : '16'
      const url = `${MIRAE_RATE_URL}?year=${item.year}&turn=${item.turn}&rghtSect=${rghtSect}&itemnm=${encodeURIComponent(item.name)}`

      const res = await this.fetcher(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) return null

      const buffer = await res.arrayBuffer()
      const html = decodeHtmlBuffer(buffer)
      return parseMiraeRatePopup(html)
    } catch {
      return null
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
