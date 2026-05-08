import axios from 'axios'
// @ts-expect-error: adm-zip does not have official types
import AdmZip from 'adm-zip'
import * as cheerio from 'cheerio'
import iconv from 'iconv-lite'
import { getAllSpacsFromDart } from './dartMapper'
import { getListingInfo, getPrices } from './marketData'
import { calculateSpacMetrics } from '@/app/spac/_lib/calculations'
import { MergerStage, SpacTableRow } from '@/app/spac/_lib/types'
import { readDartCache, writeDartCache } from './dartCache'

const DART_BASE_URL = 'https://opendart.fss.or.kr/api'
const DART_CACHE_VERSION = 8
const DART_BEGIN_DATE = '20150101'

interface DartReport {
  corp_code: string
  corp_name: string
  stock_code?: string
  corp_cls: string
  report_nm: string
  rcept_no: string
  flr_nm: string
  rcept_dt: string
  rm?: string
}

interface DartListResponse {
  status: string
  message: string
  total_count?: string
  total_page?: string
  list?: DartReport[]
}

interface DartCompanyResponse {
  status?: string
  corp_name: string
  est_dt?: string
  reprsnt_nm?: string
}

interface DartEstkGroup {
  title: string
  list?: Record<string, string> | Record<string, string>[]
}

interface DartEstkResponse {
  status: string
  message: string
  group?: DartEstkGroup | DartEstkGroup[]
}

interface DartCmpMgResponse {
  status: string
  message: string
  list?: Array<{
    rcept_no: string
    mgptncmp_cmpnm?: string
    nmgcmp_cmpnm?: string
  }>
}

interface ExtractedDocumentInfo {
  interestRates: { year1: number; year2: number; year3: number }
  promoter: string
  promotersAll: string[]
  promotersRep: string[]
  capitalIncreaseDate?: string
}

interface ExtractedIssueResultInfo {
  capitalIncreaseDate?: string
  listingDate?: string
}

interface EstkInfo {
  issueSize: number
  offerPrice: number
  capitalIncreaseDate?: string
  securitiesCompany: string
  rceptNo?: string
}

interface RateChangeInfo {
  before: number
  after: number
  changedAt?: string
  rceptNo: string
}

interface DetailedSpacInfo {
  issuer: string
  securitiesCompany: string
  issueSize: number
  basePrice: number
  promoter: string
  promotersAll: string[]
  promotersRep: string[]
  capitalIncreaseDate?: string
  listingDate?: string
  interestRates: { year1: number; year2: number; year3: number }
  mergerStage: MergerStage
  mergerSuccess: '성공' | '실패' | '진행중'
  candidateCompany: string
  managementDate?: string
  delistingDate?: string
  actualDelistingDate?: string
}

function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function todayYmd(): string {
  return todayIso().replace(/-/g, '')
}

function normalizeReportName(value: string): string {
  return value.replace(/\s+/g, '')
}

function normalizeDate(value?: string): string | undefined {
  if (!value || value === '-') return undefined
  const match = value.match(/((?:19|20)\d{2})\D{0,5}(\d{1,2})\D{0,5}(\d{1,2})/)
  const shortMatch = !match
    ? value.match(/['‘’](\d{2})\D{0,5}(\d{1,2})\D{0,5}(\d{1,2})/)
    : undefined
  if (!match && !shortMatch) return undefined

  const year = match ? Number(match[1]) : 2000 + Number(shortMatch![1])
  const month = Number(match?.[2] ?? shortMatch![2])
  const day = Number(match?.[3] ?? shortMatch![3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseNumber(value?: string): number {
  if (!value || value === '-') return 0
  const normalized = value.replace(/[^\d.-]/g, '')
  if (!normalized || normalized === '-') return 0
  return Number(normalized)
}

function parseWonToEok(value?: string): number {
  const won = parseNumber(value)
  return won > 0 ? won / 100000000 : 0
}

function textOnly(html: string): string {
  return cheerio
    .load(html)
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, '').trim()
}

function normalizeCompanyName(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/^\d+[.)]?/, '')
    .replace(/^[①-⑳]/, '')
    .replace(/[,:;]+$/g, '')
    .trim()
}

function isLikelyCompanyName(value: string): boolean {
  const name = normalizeCompanyName(value)
  if (name.length < 2) return false
  if (name.length > 80) return false
  if (/^(?:㈜|\(주\)|주식회사)?(\d+|에서|를|본|가|는|은|의|와|과|및)?$/.test(name)) return false
  if (/(전환사채|인수하였|발기인인|보유비율|\d+백만원|\d+주의|발행가격|취득가액)/.test(name)) {
    return false
  }
  if (
    /^(구분|성명|명칭|회사명|주주명|관계|비고|합계|계|기타|대상자|보유자|채무증권|지분증권|증권의종류)$/.test(
      name
    )
  ) {
    return false
  }
  if (/^(투자|증권|금융|운용|한국증권)$/.test(name)) return false
  if (/인수인/.test(name)) return false
  if (/^(기업어음증권|단기사채|회사채|조건부자본증권|채무증권|지분증권|유가증권)/.test(name)) {
    return false
  }
  if (/\d{4}년|\d{1,3}(,\d{3})+|^\d+(\.\d+)?%?$/.test(name)) return false
  if (/^(㈜|\(주\))(및|와|과|는|은|이|가)/.test(name)) return false
  if (/(입니다|합니다|이며|이고|하는|있는|없는|의|는|은|이|가|및|와|과)$/.test(name)) return false
  if (
    /스팩|기업인수목적|지분증권|공모|합병상장|발기인참여|당사|위험|투자자|규정|은행|자기자본|완료시|신탁|예치|보통주|종류주식/.test(
      name
    )
  ) {
    return false
  }
  return (
    name.includes('(주)') ||
    name.includes('㈜') ||
    name.includes('주식회사') ||
    /(증권|투자|인베스트|자산운용|벤처|파트너스|캐피탈|어드바이저|금융|은행|창업|기술|컨설팅|홀딩스|에셋|ACPC|아셈스|지오원)$/i.test(
      name
    )
  )
}

function addUnique(target: string[], value: string) {
  const name = normalizeCompanyName(value)
  if (!isLikelyCompanyName(name)) return
  const key = name.replace(/\(주\)|㈜|주식회사/g, '')
  if (target.some((item) => item.replace(/\(주\)|㈜|주식회사/g, '') === key)) return
  target.push(name)
}

function canonicalCompanyKey(value: string): string {
  return normalizeCompanyName(value)
    .replace(/\(주\)|㈜|주식회사/g, '')
    .replace(/^에스케이/, 'SK')
    .replace(/^케이비/, 'KB')
    .replace(/^엔에이치/, 'NH')
    .replace(/^디비/, 'DB')
    .replace(/^아이비케이에스/, 'IBKS')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function uniqueCompanyList(values: string[]): string[] {
  const result: string[] = []
  for (const value of values) {
    const name = normalizeCompanyName(value)
    if (!isLikelyCompanyName(name)) continue
    const key = canonicalCompanyKey(name)
    if (result.some((item) => canonicalCompanyKey(item) === key)) continue
    result.push(name)
  }
  return result
}

function chooseRepresentativePromoters(
  extracted: ExtractedDocumentInfo,
  securitiesCompany: string
): string[] {
  const reps = uniqueCompanyList(extracted.promotersRep)
  const all = uniqueCompanyList(extracted.promotersAll)
  const securitiesKey = canonicalCompanyKey(securitiesCompany)

  if (reps.length >= 2) return reps.slice(0, 2)

  const result = reps.length ? [...reps] : []
  const hasSecuritiesOnly =
    result.length === 1 && canonicalCompanyKey(result[0]) === securitiesKey

  for (const company of all) {
    if (result.some((item) => canonicalCompanyKey(item) === canonicalCompanyKey(company))) continue
    if (hasSecuritiesOnly && canonicalCompanyKey(company) === securitiesKey) continue
    result.push(company)
    if (result.length >= 2) break
  }

  return result.length > 0 ? result : all.slice(0, 2)
}

function extractCompanyNamesFromText(value: string): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim()
  const patterns = [
    /(?:\([^)]+\)|㈜)?\s*[가-힣A-Za-z0-9]+(?:투자증권|증권|인베스트먼트|자산운용|투자금융|벤처파트너스|파트너스|캐피탈|어드밴테스|어드바이저|주식회사|\(주\)|㈜|ACPC|아셈스)/g,
    /(?:\([^)]+\)|㈜)\s*[가-힣A-Za-z0-9]+/g,
  ]
  return patterns
    .flatMap((pattern) => normalized.match(pattern) ?? [])
    .map(normalizeCompanyName)
    .filter(isLikelyCompanyName)
}

function decodeDartEntry(buffer: Buffer): string {
  const candidates = [
    buffer.toString('utf8'),
    iconv.decode(buffer, 'euc-kr'),
    iconv.decode(buffer, 'cp949'),
  ]

  return candidates
    .map((content) => ({
      content,
      score:
        (content.match(/[가-힣]/g)?.length ?? 0) +
        (content.includes('발기인') ? 500 : 0) +
        (content.includes('예치') ? 300 : 0) +
        (content.includes('이자율') ? 300 : 0) -
        (content.match(/\uFFFD/g)?.length ?? 0) * 20,
    }))
    .sort((a, b) => b.score - a.score)[0].content
}

async function fetchDartDocumentParts(
  rceptNo: string,
  apiKey: string
): Promise<string[]> {
  const response = await axios.get(`${DART_BASE_URL}/document.xml`, {
    params: { crtfc_key: apiKey, rcept_no: rceptNo },
    responseType: 'arraybuffer',
    timeout: 15000,
  })

  const zip = new AdmZip(Buffer.from(response.data))
  return (zip.getEntries() as { entryName: string; getData: () => Buffer }[])
    .filter((entry) => /\.(xml|html?)$/i.test(entry.entryName))
    .map((entry) => decodeDartEntry(entry.getData()))
}

function extractInterestRates(parts: string[]): {
  year1: number
  year2: number
  year3: number
} {
  const joinedText = parts.map(textOnly).join(' ')
  const windows: string[] = []
  const keywords = ['1주당 지급 예상금액', '지급 예상금액', '신탁자금', '예치자금', '이자율', '수익률']

  for (const keyword of keywords) {
    let start = 0
    while (true) {
      const index = joinedText.indexOf(keyword, start)
      if (index === -1) break
      windows.push(joinedText.slice(Math.max(0, index - 500), index + 2000))
      start = index + keyword.length
    }
  }

  const searchArea = windows.length ? windows.join(' ') : joinedText

  const findYearRate = (year: 1 | 2 | 3): number => {
    const patterns = [
      new RegExp(`${year}\\s*(?:년차|차년도|년|차)\\D{0,80}(\\d+(?:\\.\\d+)?)\\s*%`, 'i'),
      new RegExp(`${year}\\D{0,20}(?:이자율|수익률)\\D{0,80}(\\d+(?:\\.\\d+)?)\\s*%`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = searchArea.match(pattern)
      if (match) {
        const rate = Number(match[1])
        if (rate > 0 && rate < 20) return rate
      }
    }
    return 0
  }

  let year1 = findYearRate(1)
  let year2 = findYearRate(2)
  let year3 = findYearRate(3)

  const commonRatePatterns = [
    /이자율(?:\([A-Z]\))?\D{0,30}(\d+(?:\.\d+)?)\s*%/i,
    /수익률(?:\([A-Z]\))?\D{0,30}(\d+(?:\.\d+)?)\s*%/i,
    /연\s*(\d+(?:\.\d+)?)\s*%/i,
  ]

  const commonRate = commonRatePatterns
    .map((pattern) => searchArea.match(pattern)?.[1])
    .filter(Boolean)
    .map(Number)
    .find((rate) => rate > 0 && rate < 20)

  if (!year1 && commonRate) year1 = commonRate
  if (!year2) year2 = year1
  if (!year3) year3 = year2 || year1

  return { year1, year2, year3 }
}

function extractRateChange(parts: string[], rceptNo: string): RateChangeInfo | null {
  const text = parts.map(textOnly).join(' ')
  const before = text.match(/변경\s*전\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%/)?.[1]
  const after = text.match(/변경\s*후\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%/)?.[1]
  if (!before || !after) return null

  const beforeRate = Number(before)
  const afterRate = Number(after)
  if (beforeRate <= 0 || beforeRate >= 20 || afterRate <= 0 || afterRate >= 20) return null

  const changedAtIndex = text.indexOf('변경 일자')
  const changedAt =
    changedAtIndex >= 0 ? normalizeDate(text.slice(changedAtIndex, changedAtIndex + 80)) : undefined

  return { before: beforeRate, after: afterRate, changedAt, rceptNo }
}

function extractCapitalIncreaseDate(parts: string[]): string | undefined {
  const text = parts.map(textOnly).join(' ')
  const keywords = ['증자등기일', '주금납입일']
  for (const keyword of keywords) {
    const index = text.indexOf(keyword)
    if (index === -1) continue
    const window = text.slice(index, index + 200)
    const date = normalizeDate(window)
    if (date) return date
  }
  return undefined
}

function extractIssueResultDates(parts: string[]): ExtractedIssueResultInfo {
  const text = parts.map(textOnly).join(' ')
  const listingPatterns = [
    /상장일\s*\(\s*매매개시일\s*\)\s*((?:19|20)\d{2}\D{0,5}\d{1,2}\D{0,5}\d{1,2})/,
    /매매개시일\s*\)?\s*((?:19|20)\d{2}\D{0,5}\d{1,2}\D{0,5}\d{1,2})/,
  ]

  const listingDate = listingPatterns
    .map((pattern) => normalizeDate(text.match(pattern)?.[1]))
    .find(Boolean)

  return {
    capitalIncreaseDate: extractCapitalIncreaseDate(parts),
    listingDate,
  }
}

function extractPromoters(parts: string[]): {
  promoter: string
  promotersAll: string[]
  promotersRep: string[]
} {
  const promotersAll: string[] = []
  const promotersRep: string[] = []
  const sectionKeywords = [
    '발기인',
    '대표발기인',
    '공모가격 결정방법',
    '모집 이전 발행된 주권',
    '의무보유 대상자',
  ]

  for (const html of parts) {
    const $ = cheerio.load(html)

    $('table').each((_, table) => {
      const tableText = compactText($(table).text())
      if (!sectionKeywords.some((keyword) => tableText.includes(compactText(keyword)))) return
      if (!/(발기인|대표발기인|인수자|의무보유|공모가격|주권의인수)/.test(tableText)) return
      if (/발기인참여|합병상장완료|주요경력|근무처|경력/.test(tableText)) return
      if (
        !/(대표발기인|발기인현황|발기인에관한사항|성명|명칭|주주명|회사명|인수자|보유자|대상자|주식수|소유주식|비고)/.test(
          tableText
        )
      ) {
        return
      }

      $(table)
        .find('tr')
        .each((__, row) => {
          const cells = $(row)
            .find('th,td')
            .map((___, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
            .get()
            .filter(Boolean)

          if (cells.length === 0) return
          const rowText = cells.join(' ')
          if (/성명|명칭|회사명|주주명|보유자|인수자/.test(rowText) && cells.length <= 3) return

          const candidates = cells.flatMap(extractCompanyNamesFromText)
          for (const candidate of candidates) {
            addUnique(promotersAll, candidate)
            if (rowText.includes('대표발기인') || rowText.includes('대표 발기인')) {
              addUnique(promotersRep, candidate)
            }
          }
        })
    })

    const plainText = textOnly(html)
    let representativeIndex = 0
    while (true) {
      const index = plainText.indexOf('대표발기인', representativeIndex)
      if (index === -1) break
      const window = plainText.slice(Math.max(0, index - 120), index + 180)
      for (const company of extractCompanyNamesFromText(window)) {
        addUnique(promotersRep, company)
        addUnique(promotersAll, company)
      }
      representativeIndex = index + '대표발기인'.length
    }

    const representativeMatches = plainText.matchAll(
      /대표\s*발기인(?:인|은|는|:)?\s*([^.\n]{2,120})/g
    )
    for (const match of representativeMatches) {
      match[1]
        .split(/,|및|와|과|ㆍ|·|\//)
        .map((value) => value.trim())
        .forEach((value) => {
          addUnique(promotersRep, value)
          addUnique(promotersAll, value)
        })
    }
  }

  const promoter = promotersRep.length > 0 ? promotersRep.join(', ') : promotersAll[0] || ''
  return { promoter, promotersAll, promotersRep }
}

function extractDocumentInfo(parts: string[]): ExtractedDocumentInfo {
  const interestRates = extractInterestRates(parts)
  const promoters = extractPromoters(parts)
  return {
    interestRates,
    ...promoters,
    capitalIncreaseDate: extractCapitalIncreaseDate(parts),
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getEstkGroup(response: DartEstkResponse, title: string): Record<string, string>[] {
  return asArray(response.group)
    .filter((group) => compactText(group.title).includes(compactText(title)))
    .flatMap((group) => asArray(group.list))
}

async function fetchEstkInfo(corpCode: string, apiKey: string): Promise<EstkInfo> {
  try {
    const response = await axios.get<DartEstkResponse>(`${DART_BASE_URL}/estkRs.json`, {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bgn_de: DART_BEGIN_DATE,
        end_de: todayYmd(),
      },
      timeout: 15000,
    })

    if (response.data.status !== '000') {
      return { issueSize: 0, offerPrice: 2000, securitiesCompany: '' }
    }

    const securitiesRows = getEstkGroup(response.data, '증권의종류')
    const generalRows = getEstkGroup(response.data, '일반사항')
    const underwriterRows = getEstkGroup(response.data, '인수인정보')
    const latestRceptNo = [...securitiesRows, ...generalRows, ...underwriterRows]
      .map((row) => row.rcept_no)
      .filter(Boolean)
      .sort()
      .at(-1)

    const securitiesRow =
      securitiesRows.find((row) => row.rcept_no === latestRceptNo && row.stksen?.includes('보통')) ??
      securitiesRows.find((row) => row.rcept_no === latestRceptNo) ??
      securitiesRows[0]
    const generalRow = generalRows.find((row) => row.rcept_no === latestRceptNo) ?? generalRows[0]
    const underwriterRow =
      underwriterRows.find(
        (row) => row.rcept_no === latestRceptNo && /대표|주관/.test(row.actsen ?? '')
      ) ??
      underwriterRows.find((row) => row.rcept_no === latestRceptNo) ??
      underwriterRows[0]

    return {
      issueSize: parseWonToEok(securitiesRow?.slta),
      offerPrice: parseNumber(securitiesRow?.slprc) || 2000,
      capitalIncreaseDate: normalizeDate(generalRow?.pymd),
      securitiesCompany: normalizeCompanyName(underwriterRow?.actnmn ?? ''),
      rceptNo: latestRceptNo,
    }
  } catch {
    return { issueSize: 0, offerPrice: 2000, securitiesCompany: '' }
  }
}

async function fetchCapitalIncreaseDateFromRegularReport(
  corpCode: string,
  apiKey: string,
  bsnsYear?: string,
  offerPrice?: number
): Promise<string | undefined> {
  if (!bsnsYear) return undefined

  try {
    const response = await axios.get<{
      status: string
      list?: Array<{
        isu_dcrs_de?: string
        isu_dcrs_stle?: string
        isu_dcrs_mstvdv_amount?: string
      }>
    }>(`${DART_BASE_URL}/irdsSttus.json`, {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bsns_year: bsnsYear,
        reprt_code: '11011',
      },
      timeout: 15000,
    })

    if (response.data.status !== '000') return undefined
    const rows = response.data.list ?? []
    const target =
      rows.find(
        (row) =>
          row.isu_dcrs_stle?.includes('일반공모') &&
          (!offerPrice || parseNumber(row.isu_dcrs_mstvdv_amount) === offerPrice)
      ) ?? rows.find((row) => row.isu_dcrs_stle?.includes('일반공모'))

    return normalizeDate(target?.isu_dcrs_de)
  } catch {
    return undefined
  }
}

async function fetchDisclosures(corpCode: string, apiKey: string): Promise<DartReport[]> {
  const reports: DartReport[] = []
  let page = 1
  let totalPage = 1

  do {
    const response = await axios.get<DartListResponse>(`${DART_BASE_URL}/list.json`, {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bgn_de: DART_BEGIN_DATE,
        end_de: todayYmd(),
        page_no: page,
        page_count: 100,
      },
      timeout: 15000,
    })

    if (response.data.status !== '000') break
    reports.push(...(response.data.list ?? []))
    totalPage = Number(response.data.total_page ?? 1)
    page += 1
  } while (page <= totalPage)

  return reports.sort((a, b) => b.rcept_dt.localeCompare(a.rcept_dt))
}

function selectSecuritiesReports(reports: DartReport[]): DartReport[] {
  return reports
    .filter((report) => {
      const name = normalizeReportName(report.report_nm)
      return (
        name.includes('증권신고서(지분증권)') &&
        !name.includes('합병') &&
        !name.includes('철회')
      )
    })
    .sort((a, b) => b.rcept_no.localeCompare(a.rcept_no))
}

function selectIssuanceResultReports(reports: DartReport[]): DartReport[] {
  return reports
    .filter((report) => normalizeReportName(report.report_nm).includes('증권발행실적보고서'))
    .sort((a, b) => b.rcept_no.localeCompare(a.rcept_no))
}

async function extractFromSecuritiesReports(
  reports: DartReport[],
  apiKey: string
): Promise<ExtractedDocumentInfo> {
  const empty: ExtractedDocumentInfo = {
    interestRates: { year1: 0, year2: 0, year3: 0 },
    promoter: '',
    promotersAll: [],
    promotersRep: [],
  }

  for (const report of reports) {
    try {
      const parts = await fetchDartDocumentParts(report.rcept_no, apiKey)
      const extracted = extractDocumentInfo(parts)
      empty.interestRates =
        extracted.interestRates.year1 > 0 ? extracted.interestRates : empty.interestRates
      empty.capitalIncreaseDate = extracted.capitalIncreaseDate ?? empty.capitalIncreaseDate
      for (const promoter of extracted.promotersAll) addUnique(empty.promotersAll, promoter)
      for (const promoter of extracted.promotersRep) addUnique(empty.promotersRep, promoter)

      if (
        empty.interestRates.year1 > 0 &&
        (empty.promotersAll.length > 0 || empty.promotersRep.length > 0)
      ) {
        break
      }
    } catch {
      // Keep trying older corrected securities reports for the same corporation only.
    }
  }

  empty.promoter =
    empty.promotersRep.length > 0 ? empty.promotersRep.join(', ') : empty.promotersAll[0] || ''

  return empty
}

async function extractFromIssuanceResultReports(
  reports: DartReport[],
  apiKey: string
): Promise<ExtractedIssueResultInfo> {
  const result: ExtractedIssueResultInfo = {}

  for (const report of reports) {
    try {
      const parts = await fetchDartDocumentParts(report.rcept_no, apiKey)
      const extracted = extractIssueResultDates(parts)
      result.capitalIncreaseDate = extracted.capitalIncreaseDate ?? result.capitalIncreaseDate
      result.listingDate = extracted.listingDate ?? result.listingDate

      if (result.capitalIncreaseDate && result.listingDate) break
    } catch {
      // Older or exchange-origin documents can fail to expose the original ZIP.
    }
  }

  return result
}

async function extractRateChanges(
  reports: DartReport[],
  apiKey: string
): Promise<RateChangeInfo[]> {
  const rateReports = reports.filter((report) => {
    const name = normalizeReportName(report.report_nm)
    return /예치|신탁|이자/.test(name)
  }).sort((a, b) => a.rcept_dt.localeCompare(b.rcept_dt) || a.rcept_no.localeCompare(b.rcept_no))

  const changes: RateChangeInfo[] = []

  for (const report of rateReports) {
    try {
      const parts = await fetchDartDocumentParts(report.rcept_no, apiKey)
      const change = extractRateChange(parts, report.rcept_no)
      if (change) changes.push(change)
    } catch {
      // Some KRX-origin disclosures do not expose document.xml; ignore and keep scanning.
    }
  }

  return changes
}

function mergeInterestRateHistory(
  initialRates: { year1: number; year2: number; year3: number },
  changes: RateChangeInfo[]
): { year1: number; year2: number; year3: number } {
  if (changes.length === 0) return initialRates

  const sequence = [changes[0].before, ...changes.map((change) => change.after)].filter(
    (rate) => rate > 0 && rate < 20
  )
  const year1 = sequence[0] ?? initialRates.year1
  const year2 = sequence[1] ?? year1
  const year3 = sequence[2] ?? year2
  return { year1, year2, year3 }
}

function reportToStage(report: DartReport): MergerStage | null {
  const name = normalizeReportName(report.report_nm)
  if (/합병.*(철회|취소|부인)|철회.*합병|합병결정철회/.test(name)) return '합병 철회'
  if (/상장폐지|해산사유|청산/.test(name) && !/우려|예고|안내/.test(name)) {
    return '상장폐지 진행'
  }
  if (/임시주주총회결과|합병승인/.test(name)) return '주총 승인'
  if (/주주총회소집(결의|공고)/.test(name) && /임시|합병/.test(name)) return '주총 준비'
  if (/상장예비심사결과|예비심사.*승인/.test(name)) return '예심 승인'
  if (/회사합병결정|SPAC합병|스팩합병/.test(name)) return '합병 발표'
  return null
}

function classifyMergerStage(reports: DartReport[], hasMergerDisclosure: boolean): MergerStage {
  for (const report of reports) {
    const stage = reportToStage(report)
    if ((stage === '주총 준비' || stage === '주총 승인' || stage === '예심 승인') && !hasMergerDisclosure) {
      continue
    }
    if (stage) return stage
  }
  return '일반 운용'
}

function classifyMergerSuccess(reports: DartReport[]): '성공' | '실패' | '진행중' {
  const relevantNames = reports.map((report) => normalizeReportName(report.report_nm)).join(' ')
  if (/합병종료|합병등기|합병완료|피흡수합병|소멸합병|합병에따른상장폐지/.test(relevantNames)) {
    return '성공'
  }
  if (/합병.*(철회|취소|부인)|해산사유|청산|잔여재산|상장폐지사유발생/.test(relevantNames)) {
    return '실패'
  }
  return '진행중'
}

async function fetchCandidateCompany(
  corpCode: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.get<DartCmpMgResponse>(`${DART_BASE_URL}/cmpMgDecsn.json`, {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bgn_de: DART_BEGIN_DATE,
        end_de: todayYmd(),
      },
      timeout: 15000,
    })

    if (response.data.status !== '000') return ''
    const latest = response.data.list?.sort((a, b) => b.rcept_no.localeCompare(a.rcept_no))[0]
    return (latest?.mgptncmp_cmpnm ?? latest?.nmgcmp_cmpnm ?? '').replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

async function extractEventDateFromDocument(
  report: DartReport | undefined,
  apiKey: string,
  keywords: string[]
): Promise<string | undefined> {
  if (!report) return undefined

  try {
    const parts = await fetchDartDocumentParts(report.rcept_no, apiKey)
    const text = parts.map(textOnly).join(' ')
    for (const keyword of keywords) {
      const index = text.indexOf(keyword)
      if (index === -1) continue
      const date = normalizeDate(text.slice(index, index + 250))
      if (date) return date
    }
  } catch {
    // Exchange-origin disclosures may not have downloadable original documents.
  }

  return normalizeDate(report.rcept_dt)
}

function inferSecuritiesCompany(corpName: string, fallback: string): string {
  if (fallback) return fallback
  return corpName
    .replace(/기업인수목적.*/, '')
    .replace(/제\d+호.*/, '')
    .replace(/\(주\)|주식회사/g, '')
    .trim()
}

export async function getDartDetailedInfo(
  corpCode: string,
  apiKey: string
): Promise<DetailedSpacInfo | null> {
  try {
    const [companyResponse, reports, estkInfo, candidateCompany] = await Promise.all([
      axios.get<DartCompanyResponse>(`${DART_BASE_URL}/company.json`, {
        params: { crtfc_key: apiKey, corp_code: corpCode },
        timeout: 15000,
      }),
      fetchDisclosures(corpCode, apiKey),
      fetchEstkInfo(corpCode, apiKey),
      fetchCandidateCompany(corpCode, apiKey),
    ])

    const company = companyResponse.data
    const securitiesReports = selectSecuritiesReports(reports)
    const issuanceResultReports = selectIssuanceResultReports(reports)
    const documentInfo = await extractFromSecuritiesReports(securitiesReports, apiKey)
    const issueResultInfo = await extractFromIssuanceResultReports(issuanceResultReports, apiKey)
    const rateChanges = await extractRateChanges(reports, apiKey)
    const interestRates = mergeInterestRateHistory(documentInfo.interestRates, rateChanges)
    const capitalIncreaseDateFromReport = await fetchCapitalIncreaseDateFromRegularReport(
      corpCode,
      apiKey,
      estkInfo.capitalIncreaseDate?.slice(0, 4),
      estkInfo.offerPrice
    )

    const managementReport = reports.find((report) => {
      const name = normalizeReportName(report.report_nm)
      return /관리종목지정/.test(name)
    })
    const delistingReport = reports.find((report) => {
      const name = normalizeReportName(report.report_nm)
      return /상장폐지(결정|예정|정리매매)|해산사유|청산/.test(name) && !/우려|예고|안내|사유발생/.test(name)
    })
    const actualDelistingReport = reports.find((report) => {
      const name = normalizeReportName(report.report_nm)
      return /주권매매거래정지/.test(name) && /상장폐지사유/.test(name)
    })

    const [managementDate, delistingDate, actualDelistingDate] = await Promise.all([
      extractEventDateFromDocument(managementReport, apiKey, [
        '관리종목 지정일',
        '관리종목지정일',
        '지정예정일',
        '지정 예정일',
      ]),
      extractEventDateFromDocument(delistingReport, apiKey, ['상장폐지일', '상장폐지 예정일', '정리매매']),
      extractEventDateFromDocument(actualDelistingReport, apiKey, ['상장폐지일', '정리매매기간']),
    ])

    const securitiesCompany = inferSecuritiesCompany(company.corp_name, estkInfo.securitiesCompany)
    const promotersRep = chooseRepresentativePromoters(documentInfo, securitiesCompany)

    return {
      issuer: company.corp_name,
      securitiesCompany,
      issueSize: estkInfo.issueSize,
      basePrice: estkInfo.offerPrice || 2000,
      promoter: promotersRep.join(', ') || documentInfo.promoter || company.reprsnt_nm || '',
      promotersAll: documentInfo.promotersAll,
      promotersRep,
      capitalIncreaseDate:
        capitalIncreaseDateFromReport ??
        issueResultInfo.capitalIncreaseDate ??
        documentInfo.capitalIncreaseDate ??
        estkInfo.capitalIncreaseDate ??
        undefined,
      listingDate: issueResultInfo.listingDate,
      interestRates,
      mergerStage: classifyMergerStage(
        reports,
        Boolean(candidateCompany) ||
          reports.some((report) => /회사합병결정|SPAC합병|스팩합병|증권신고서\(합병\)/.test(normalizeReportName(report.report_nm)))
      ),
      mergerSuccess: classifyMergerSuccess(reports),
      candidateCompany,
      managementDate,
      delistingDate,
      actualDelistingDate,
    }
  } catch (error) {
    console.error(`[DART Detail Error] ${corpCode}:`, error)
    return null
  }
}

function isCacheItemUsable(item: ReturnType<typeof readDartCache>[string] | undefined): boolean {
  if (!item) return false
  if (item.cacheVersion !== DART_CACHE_VERSION) return false
  if (Date.now() - new Date(item.updatedAt).getTime() > 1000 * 60 * 60 * 12) return false
  if (!item.issueSize || !item.interestRates?.year1) return false
  return true
}

function isPotentiallyActiveSpacSymbol(symbol: string): boolean {
  if (!/^\d{6}$/.test(symbol)) return true
  return Number(symbol) >= 440000
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export async function aggregateSpacData(
  estimationBasis: 'conservative' | 'aggressive'
): Promise<SpacTableRow[]> {
  const apiKey = process.env.DART_API_KEY
  if (!apiKey) throw new Error('DART_API_KEY is missing')

  const allSpacsFromDart = (await getAllSpacsFromDart()).filter((spac) =>
    isPotentiallyActiveSpacSymbol(spac.symbol!)
  )
  const cache = readDartCache()
  let cacheChanged = false

  const results: Array<SpacTableRow | null> = await mapWithConcurrency(
    allSpacsFromDart,
    5,
    async (spac): Promise<SpacTableRow | null> => {
    try {
      const symbol = spac.symbol!
      const yahooSymbol = `${symbol}.KQ`

      const listing = await getListingInfo({ symbol: yahooSymbol, asset: 'KR_STOCK' })
      let dartInfo = cache[symbol]
      if (!isCacheItemUsable(dartInfo)) {
        const detailed = await getDartDetailedInfo(spac.corpCode, apiKey)
        if (!detailed) return null

        dartInfo = {
          ...detailed,
          cacheVersion: DART_CACHE_VERSION,
          updatedAt: new Date().toISOString(),
        }
        cache[symbol] = dartInfo
        cacheChanged = true
      }

      if (dartInfo.mergerSuccess === '성공') return null
      if (dartInfo.delistingDate && dartInfo.delistingDate < todayIso()) return null

      const listingDate = dartInfo.listingDate ?? listing.listing_date
      const prices = await getPrices({
        symbol: yahooSymbol,
        asset: 'KR_STOCK',
        from: listingDate,
        to: new Date().toISOString().split('T')[0],
        interval: '1d',
      })
      if (!prices.rows.length) return null

      const lastRow = prices.rows[prices.rows.length - 1]
      const prevRow = prices.rows[prices.rows.length - 2] || lastRow

      const basePrice = dartInfo.basePrice || 2000
      const estimatedSchedule = calculateSpacMetrics(
        listingDate,
        lastRow.close,
        basePrice,
        dartInfo.interestRates,
        estimationBasis,
        {
          management: dartInfo.managementDate,
          interestStart: dartInfo.capitalIncreaseDate,
          valueEndBasis: 'management',
        }
      )
      const useLiquidationValueBasis =
        Boolean(dartInfo.actualDelistingDate) &&
        dartInfo.actualDelistingDate !== estimatedSchedule.delistingDate
      const metrics = calculateSpacMetrics(
        listingDate,
        lastRow.close,
        basePrice,
        dartInfo.interestRates,
        estimationBasis,
        {
          management: dartInfo.managementDate,
          delisting: dartInfo.delistingDate,
          interestStart: dartInfo.capitalIncreaseDate,
          valueEndBasis: useLiquidationValueBasis ? 'liquidation' : 'management',
        }
      )

      return {
        id: symbol,
        symbol,
        name: spac.name,
        issuer: dartInfo.issuer,
        securitiesCompany: dartInfo.securitiesCompany,
        issueSize: dartInfo.issueSize,
        listingDate,
        basePrice,
        interestRates: dartInfo.interestRates,
        interestRate1Yr: dartInfo.interestRates.year1,
        interestRate2Yr: dartInfo.interestRates.year2,
        interestRate3Yr: dartInfo.interestRates.year3,
        ...metrics,
        currentPrice: lastRow.close,
        changeRate: prevRow.close ? (lastRow.close / prevRow.close - 1) * 100 : 0,
        changeAmount: lastRow.close - prevRow.close,
        mergerStage: dartInfo.mergerStage,
        mergerSuccess: dartInfo.mergerSuccess,
        candidateCompany: dartInfo.candidateCompany,
        volumeAmount: (lastRow.volume * lastRow.close) / 100000000,
        promoter: dartInfo.promoter,
        promotersAll: dartInfo.promotersAll || [],
        promotersRep: dartInfo.promotersRep || [],
        capitalIncreaseDate: dartInfo.capitalIncreaseDate ?? listingDate,
        isManagementEstimated: !dartInfo.managementDate,
        isDelistingEstimated: !dartInfo.delistingDate,
      }
    } catch {
      return null
    }
  })

  if (cacheChanged) writeDartCache(cache)

  return results
    .filter((item): item is SpacTableRow => item !== null)
    .sort((a, b) => b.annualYield - a.annualYield)
}
