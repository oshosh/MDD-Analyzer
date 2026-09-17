import { z } from 'zod'
import type {
  IpoBrokerSnapshot,
  IpoOfferingKind,
  IpoOfferingSnapshot,
} from '@entities/ipo'
import { todayKstIso } from '@shared/lib/date'
import { readJsonCache, writeJsonCache } from '../serverCache'
import { IpoConfigurationError, IpoDataSourceError } from './errors'
import {
  createOpenDartSource,
  createUnavailableCompetitionSource,
} from './source'
import {
  parseProspectusBrokerInfo,
  unzipDartXml,
} from './dartProspectusParser'


const OPEN_DART_API_BASE_URL = 'https://opendart.fss.or.kr/api'
// OpenDART's disclosure-list endpoint accepts at most a three-month range.
const DEFAULT_LOOKBACK_DAYS = 90
const DEFAULT_MAX_PAGES = 40
const DEFAULT_CONCURRENCY = 4
const CACHE_TTL_SECONDS = 15 * 60
const REQUEST_TIMEOUT_MS = 12_000

const DartListItemSchema = z.object({
  corp_code: z.string(),
  corp_name: z.string(),
  stock_code: z.string().nullable().optional(),
  report_nm: z.string(),
  rcept_no: z.string(),
  rcept_dt: z.string(),
})

const DartListResponseSchema = z.object({
  status: z.string(),
  total_page: z.coerce.number().int().nonnegative().optional(),
  list: z.array(DartListItemSchema).optional().default([]),
})

const DartGroupSchema = z.object({
  title: z.string(),
  list: z.array(z.record(z.unknown())).optional().default([]),
})

const DartEstkResponseSchema = z.object({
  status: z.string(),
  group: z.array(DartGroupSchema).optional().default([]),
})

type DartListItem = z.infer<typeof DartListItemSchema>
type DartRow = Record<string, unknown>
type DartGroup = z.infer<typeof DartGroupSchema>

export interface IpoCalendarAdapter {
  getOfferingsForDate(date: string): Promise<IpoOfferingSnapshot[]>
}

export interface IpoCache {
  read<T>(key: string): Promise<T | null>
  write<T>(key: string, value: T, ttlSeconds: number): Promise<void>
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface OpenDartIpoAdapterOptions {
  apiKey?: string
  fetcher?: Fetcher
  cache?: IpoCache
  now?: () => Date
  lookbackDays?: number
  maxPages?: number
  concurrency?: number
  enableProspectusXml?: boolean
}


function createDefaultCache(): IpoCache {
  return {
    read: readJsonCache,
    write: writeJsonCache,
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return formatUtcDate(date)
}

function firstOf<T>(items: T[]): T | null {
  return items.length > 0 ? items[0] : null
}

function stringValue(row: DartRow, field: string): string | null {
  const value = row[field]
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

/** DART's money/share fields are whole-number strings; ranges/text are unknown. */
export function parseDartWholeNumber(
  value: string | null,
  allowZero = false
): number | null {
  if (value === null) return null

  const normalized = value.replaceAll(',', '').replaceAll(' ', '')
  if (!/^\d+$/.test(normalized)) return null

  const number = Number(normalized)
  if (!Number.isSafeInteger(number) || number < 0) return null
  if (!allowZero && number === 0) return null

  return number
}

function koreanDateToIso(
  yearText: string,
  monthText: string,
  dayText: string
): string | null {
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const candidate = `${yearText.padStart(4, '0')}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  return isIsoDate(candidate) ? candidate : null
}

/** Parses only explicit Korean date tokens, never invented trading hours. */
export function parseDartDateRange(
  value: string | null
): { startDate: string; endDate: string } | null {
  if (value === null) return null

  const matcher = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g
  const dates = [...value.matchAll(matcher)]
    .map((match) => koreanDateToIso(match[1], match[2], match[3]))
    .filter((date): date is string => date !== null)

  const startDate = firstOf(dates)
  const endDate = dates.at(-1)
  if (!startDate || !endDate || startDate > endDate) return null

  return { startDate, endDate }
}

function parseDartEventDate(value: string | null): string | null {
  if (value === null) return null
  if (/^\d{8}$/.test(value)) {
    const isoDate = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    return isIsoDate(isoDate) ? isoDate : null
  }

  return parseDartDateRange(value)?.startDate ?? null
}

function isDartCorpCode(value: string): boolean {
  return /^\d{8}$/.test(value)
}

function isDartReceiptNumber(value: string): boolean {
  return /^\d{14}$/.test(value)
}

export function isEligibleIpoDisclosure(item: DartListItem): boolean {
  const stockCode = item.stock_code?.trim() ?? ''
  return (
    isDartCorpCode(item.corp_code) &&
    isDartReceiptNumber(item.rcept_no) &&
    /^\d{8}$/.test(item.rcept_dt) &&
    stockCode.length === 0 &&
    /증권신고서\s*\(\s*지분증권\s*\)/.test(item.report_nm)
  )
}

function classifyOffering(name: string): IpoOfferingKind {
  return /기업인수목적|스팩/.test(name) ? 'spac' : 'ipo'
}

function groupRows(groups: DartGroup[], title: string): DartRow[] {
  return groups.find((group) => group.title === title)?.list ?? []
}

function createDartBroker(
  row: DartRow,
  index: number,
  corpCode: string,
  competitionSource: IpoBrokerSnapshot['competitionSource']
): IpoBrokerSnapshot | null {
  const name = stringValue(row, 'actnmn')
  if (name === null) return null

  const underwritingShares = parseDartWholeNumber(stringValue(row, 'udtcnt'))
  // 일반청약자 배정 비율: 총 인수 수량의 25% (균등 50%, 비례 50%)
  const generalAllocationShares =
    underwritingShares !== null ? Math.round(underwritingShares * 0.25) : null
  const equalAllocationShares =
    generalAllocationShares !== null
      ? Math.floor(generalAllocationShares * 0.5)
      : null
  const proportionalAllocationShares =
    generalAllocationShares !== null && equalAllocationShares !== null
      ? generalAllocationShares - equalAllocationShares
      : null

  return {
    id: `dart-${corpCode}-broker-${index + 1}`,
    name,
    role: stringValue(row, 'actsen'),
    underwritingShares,
    underwritingAmount: parseDartWholeNumber(
      stringValue(row, 'udtamt'),
      true
    ),
    underwritingMethod: stringValue(row, 'udtmth'),
    generalAllocationShares,
    equalAllocationShares,
    proportionalAllocationShares,
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
    applicationFee: null,
    minSubscriptionShares: null,
    subscriptionUnitShares: null,
    subscriptionUnitTiers: [],
    limits: [],

    onlineSubscriptionNote: null,
    competitionRatioKind: null,
    proportionalAllocationRoundingRule: null,
    competitionSource,
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(values[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  )

  return results
}

export class OpenDartIpoAdapter implements IpoCalendarAdapter {
  private readonly apiKey: string
  private readonly fetcher: Fetcher
  private readonly cache: IpoCache
  private readonly now: () => Date
  private readonly lookbackDays: number
  private readonly maxPages: number
  private readonly concurrency: number
  private readonly enableProspectusXml: boolean

  constructor(options: OpenDartIpoAdapterOptions = {}) {
    const apiKey = options.apiKey ?? process.env.DART_API_KEY
    if (!apiKey) {
      throw new IpoConfigurationError('DART_API_KEY is not configured')
    }

    this.apiKey = apiKey
    this.fetcher = options.fetcher ?? fetch
    this.cache = options.cache ?? createDefaultCache()
    this.now = options.now ?? (() => new Date())
    this.lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
    this.maxPages = options.maxPages ?? DEFAULT_MAX_PAGES
    this.concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
    this.enableProspectusXml = options.enableProspectusXml ?? true
  }


  async getOfferingsForDate(date: string): Promise<IpoOfferingSnapshot[]> {
    if (!isIsoDate(date)) {
      throw new IpoDataSourceError('IPO date must be a valid ISO date')
    }

    const cacheKey = `ipo:opendart:v1:${date}`
    const cached = await this.cache.read<IpoOfferingSnapshot[]>(cacheKey)
    if (cached !== null) return cached

    const candidates = await this.discoverCandidates(date)
    const details = await mapWithConcurrency(
      candidates,
      this.concurrency,
      async (candidate) => this.fetchOffering(candidate, date)
    )
    const offerings = details.filter(
      (offering): offering is IpoOfferingSnapshot => offering !== null
    )

    await this.cache.write(cacheKey, offerings, CACHE_TTL_SECONDS)
    return offerings
  }

  private async discoverCandidates(date: string): Promise<DartListItem[]> {
    const { startDate, endDate } = this.discoveryWindow(date)

    if (startDate > endDate) return []

    const cacheKey = `ipo:opendart:disclosures:v1:${startDate}:${endDate}`
    const cached = await this.cache.read<DartListItem[]>(cacheKey)
    if (cached !== null) return cached

    const firstPage = await this.fetchDisclosurePage(startDate, endDate, 1)
    if (firstPage.status === '013') return []
    if (firstPage.status !== '000') {
      throw new IpoDataSourceError('OpenDART disclosure search failed')
    }

    const pageCount = Math.min(firstPage.total_page ?? 1, this.maxPages)
    const otherPageNumbers = Array.from(
      { length: Math.max(pageCount - 1, 0) },
      (_, index) => index + 2
    )
    const otherPages = await mapWithConcurrency(
      otherPageNumbers,
      this.concurrency,
      async (pageNo) => this.fetchDisclosurePage(startDate, endDate, pageNo)
    )
    const pages = [firstPage, ...otherPages]
    const candidates = pages.flatMap((page) => {
      if (page.status === '013') return []
      if (page.status !== '000') {
        throw new IpoDataSourceError('OpenDART disclosure search failed')
      }

      return page.list.filter((item) => isEligibleIpoDisclosure(item))
    })

    const latestByCorpCode = new Map<string, DartListItem>()
    for (const candidate of candidates) {
      const existing = latestByCorpCode.get(candidate.corp_code)
      if (!existing || candidate.rcept_no > existing.rcept_no) {
        latestByCorpCode.set(candidate.corp_code, candidate)
      }
    }

    const normalizedCandidates = [...latestByCorpCode.values()]
    await this.cache.write(cacheKey, normalizedCandidates, CACHE_TTL_SECONDS)
    return normalizedCandidates
  }

  private discoveryWindow(date: string): {
    startDate: string
    endDate: string
  } {
    const today = todayKstIso(this.now())
    const nearTermStart = addDays(today, -this.lookbackDays)
    const nearTermEnd = addDays(today, this.lookbackDays)

    // A user commonly moves one day at a time through a current offering. Reuse
    // the same three-month disclosure search for that range instead of making
    // dozens of identical DART list requests for each date.
    if (date >= nearTermStart && date <= nearTermEnd) {
      return { startDate: nearTermStart, endDate: today }
    }

    return {
      startDate: addDays(date, -this.lookbackDays),
      endDate: date < today ? date : today,
    }
  }

  private async fetchDisclosurePage(
    startDate: string,
    endDate: string,
    pageNo: number
  ): Promise<z.infer<typeof DartListResponseSchema>> {
    const payload = await this.fetchOpenDart('/list.json', {
      bgn_de: startDate.replaceAll('-', ''),
      end_de: endDate.replaceAll('-', ''),
      corp_cls: 'E',
      pblntf_ty: 'C',
      pblntf_detail_ty: 'C001',
      last_reprt_at: 'Y',
      page_no: String(pageNo),
      page_count: '100',
      sort: 'date',
      sort_mth: 'desc',
    })
    const parsed = DartListResponseSchema.safeParse(payload)
    if (!parsed.success) {
      throw new IpoDataSourceError('OpenDART disclosure response is invalid')
    }

    return parsed.data
  }

  private async fetchOffering(
    candidate: DartListItem,
    requestedDate: string
  ): Promise<IpoOfferingSnapshot | null> {
    const endDate = requestedDate < todayKstIso(this.now())
      ? requestedDate
      : todayKstIso(this.now())
    const payload = await this.fetchOpenDart('/estkRs.json', {
      corp_code: candidate.corp_code,
      bgn_de: addDays(requestedDate, -365).replaceAll('-', ''),
      end_de: endDate.replaceAll('-', ''),
    })
    const parsed = DartEstkResponseSchema.safeParse(payload)
    if (!parsed.success) {
      throw new IpoDataSourceError('OpenDART securities report is invalid')
    }

    if (parsed.data.status === '013') return null
    if (parsed.data.status !== '000') {
      throw new IpoDataSourceError('OpenDART securities report lookup failed')
    }

    const general = firstOf(groupRows(parsed.data.group, '일반사항'))
    const security = groupRows(parsed.data.group, '증권의종류').find(
      (row) => stringValue(row, 'slmthn') === '일반공모'
    )
    if (general === null || security === undefined) return null
    if (stringValue(general, 'corp_cls') !== 'E') return null

    const period = parseDartDateRange(stringValue(general, 'sbd'))
    if (
      period === null ||
      requestedDate < period.startDate ||
      requestedDate > period.endDate
    ) {
      return null
    }

    const fetchedAt = this.now().toISOString()
    const metadataReceiptCandidate = stringValue(general, 'rcept_no')
    const metadataReceiptNo =
      metadataReceiptCandidate !== null && isDartReceiptNumber(metadataReceiptCandidate)
        ? metadataReceiptCandidate
        : candidate.rcept_no
    const metadataSource = createOpenDartSource(
      `${candidate.rcept_dt.slice(0, 4)}-${candidate.rcept_dt.slice(4, 6)}-${candidate.rcept_dt.slice(6, 8)}`,
      fetchedAt
    )
    const competitionSource = createUnavailableCompetitionSource(fetchedAt)
    const initialBrokers = groupRows(parsed.data.group, '인수인정보')
      .map((row, index) =>
        createDartBroker(row, index, candidate.corp_code, competitionSource)
      )
      .filter((broker): broker is IpoBrokerSnapshot => broker !== null)

    let brokers = initialBrokers
    if (this.enableProspectusXml) {
      try {
        const xmlText = await this.fetchDisclosureXml(candidate.rcept_no)
        if (xmlText !== null) {
          brokers = initialBrokers.map((broker) => {
            const info = parseProspectusBrokerInfo(xmlText, broker.name)
            return {
              ...broker,
              minSubscriptionShares: info.minSubscriptionShares,
              subscriptionUnitShares: info.subscriptionUnitShares,
              subscriptionUnitTiers: info.subscriptionUnitTiers,
              limits: info.limits.length > 0 ? info.limits : broker.limits,
            }
          })
        }
      } catch {
        // Fallback gracefully to basic broker info
      }
    }

    const issuerName = stringValue(general, 'corp_name') ?? candidate.corp_name

    return {
      id: `dart-${candidate.corp_code}-${metadataReceiptNo}`,
      offeringKind: classifyOffering(issuerName),
      dartCorpCode: candidate.corp_code,
      dartReceiptNo: metadataReceiptNo,
      latestDisclosureReceiptNo: candidate.rcept_no,
      name: issuerName,
      subscriptionStartDate: period.startDate,
      subscriptionEndDate: period.endDate,
      subscriptionOpenAt: null,
      subscriptionCloseAt: null,
      paymentDate: parseDartEventDate(stringValue(general, 'pymd')),
      allocationNoticeDate: parseDartEventDate(stringValue(general, 'asand')),
      listingDate: null,
      offerPrice: parseDartWholeNumber(stringValue(security, 'slprc')),
      depositRate: null,
      totalOfferingShares: parseDartWholeNumber(stringValue(security, 'stkcnt')),
      expectedFinalDeposit: null,
      expectedFinalOneShareCost: null,
      marketPrice: null,
      disparityRate: null,
      metadataSource,
      competitionSource,
      brokers,
    }
  }

  private async fetchDisclosureXml(rceptNo: string): Promise<string | null> {
    const cacheKey = `dart:doc-xml:${rceptNo}`
    const cached = await this.cache.read<string>(cacheKey)
    if (cached !== null) return cached

    try {
      const url = new URL(`${OPEN_DART_API_BASE_URL}/document.xml`)
      url.searchParams.set('crtfc_key', this.apiKey)
      url.searchParams.set('rcept_no', rceptNo)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await this.fetcher(url.toString(), {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return null

        const arrayBuf = await response.arrayBuffer()
        const buf = Buffer.from(arrayBuf)
        const xml = unzipDartXml(buf)
        if (xml !== null) {
          await this.cache.write(cacheKey, xml, 86400)
        }
        return xml
      } finally {
        clearTimeout(timeout)
      }
    } catch {
      return null
    }
  }


  private async fetchOpenDart(
    path: string,
    parameters: Record<string, string>
  ): Promise<unknown> {
    const url = new URL(`${OPEN_DART_API_BASE_URL}${path}`)
    url.searchParams.set('crtfc_key', this.apiKey)
    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await this.fetcher(url.toString(), {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new IpoDataSourceError('OpenDART request failed')
      }

      try {
        return await response.json()
      } catch {
        throw new IpoDataSourceError('OpenDART returned non-JSON data')
      }
    } catch (error) {
      if (error instanceof IpoDataSourceError) throw error
      throw new IpoDataSourceError('OpenDART request is unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }
}
