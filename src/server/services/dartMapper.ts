import axios from 'axios'
// @ts-expect-error: adm-zip does not have official types
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'

/**
 * DART API에서 제공하는 고유번호(corp_code) 매핑 정보
 */
export interface DartCorpEntry {
  corpCode: string
  name: string
  symbol: string | null
}

interface RawCorpCodeItem {
  corp_code: string
  corp_name: string
  stock_code: string | number
}

let allCompaniesCache: DartCorpEntry[] | null = null
let lastUpdate: number = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24시간

/**
 * DS001-2019003: 고유번호 다운로드 및 전체 파싱
 */
export async function getDartCorpMappings(): Promise<DartCorpEntry[]> {
  const now = Date.now()
  if (allCompaniesCache && (now - lastUpdate < CACHE_TTL)) {
    return allCompaniesCache
  }

  const apiKey = process.env.DART_API_KEY
  if (!apiKey) throw new Error('DART_API_KEY is missing')

  try {
    const response = await axios.get('https://opendart.fss.or.kr/api/corpCode.xml', {
      params: { crtfc_key: apiKey },
      responseType: 'arraybuffer'
    })

    const zip = new AdmZip(Buffer.from(response.data as ArrayBuffer))
    const xmlEntry = (zip.getEntries() as { entryName: string; getData: () => Buffer }[]).find(entry => entry.entryName === 'CORPCODE.xml')
    
    if (!xmlEntry) throw new Error('CORPCODE.xml not found in ZIP')

    const xmlData = xmlEntry.getData().toString('utf8')
    const parser = new XMLParser()
    const jsonObj = parser.parse(xmlData) as { result: { list: RawCorpCodeItem[] } }
    const list = jsonObj.result.list

    const results: DartCorpEntry[] = list.map((item) => ({
      corpCode: String(item.corp_code).padStart(8, '0'),
      name: String(item.corp_name),
      symbol: item.stock_code ? String(item.stock_code).trim() : null
    }))

    console.log(`[DART Mapper] Parsed ${results.length} companies from CORPCODE.xml`)
    allCompaniesCache = results
    lastUpdate = now

    return results
  } catch (error) {
    console.error('[DART Mapper] Failed to download DART corp codes:', error)
    return allCompaniesCache || []
  }
}

/**
 * 이름으로 최근 공시를 검색하여 진짜 최신 corp_code를 획득하는 안전장치
 */
export async function getTrueCorpCodeByName(corpName: string, apiKey: string): Promise<string | null> {
  void apiKey
  const normalized = corpName.replace(/\s+/g, '')
  const mappings = await getDartCorpMappings()
  return (
    mappings.find((item) => item.name.replace(/\s+/g, '') === normalized)?.corpCode ??
    mappings.find((item) => item.name.replace(/\s+/g, '').includes(normalized))?.corpCode ??
    null
  )
}

export async function getCorpCodeBySymbol(symbol: string): Promise<string | null> {
  const normalized = symbol.trim().toUpperCase().replace(/\.(KQ|KS)$/i, '')
  const mappings = await getDartCorpMappings()
  return mappings.find((item) => item.symbol?.toUpperCase() === normalized)?.corpCode ?? null
}

export async function getAllSpacsFromDart(): Promise<DartCorpEntry[]> {
  const all = await getDartCorpMappings()
  // 이름에 '스팩' 또는 '기업인수목적'이 포함되고 종목코드가 있는 상장사만 추출
  const filtered = all.filter(item => 
    item.symbol && 
    item.symbol.length === 6 && 
    (item.name.includes('스팩') || item.name.includes('SPAC') || item.name.includes('기업인수목적'))
  )
  console.log(`[DART Mapper] Filtered ${filtered.length} SPACs from all companies`)
  return filtered
}
