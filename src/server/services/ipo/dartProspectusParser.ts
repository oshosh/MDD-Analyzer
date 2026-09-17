import zlib from 'node:zlib'
import type { IpoSubscriptionLimit, IpoSubscriptionTier } from '@entities/ipo'

export interface ParsedBrokerProspectusInfo {
  minSubscriptionShares: number | null
  subscriptionUnitShares: number | null
  subscriptionUnitTiers: IpoSubscriptionTier[]
  limits: IpoSubscriptionLimit[]
}

/**
 * OpenDART document.xml ZIP 버퍼에서 원본 XML 문자열을 압축 해제합니다.
 */
export function unzipDartXml(buf: Buffer): string | null {
  try {
    const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06])
    const eocdIdx = buf.lastIndexOf(eocdSig)
    if (eocdIdx === -1) return null

    const cdOffset = buf.readUInt32LE(eocdIdx + 16)
    if (buf.readUInt32LE(cdOffset) !== 0x02014b50) return null

    const compSize = buf.readUInt32LE(cdOffset + 20)
    const localHeaderOffset = buf.readUInt32LE(cdOffset + 42)
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26)
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen
    const compData = buf.subarray(dataStart, dataStart + compSize)

    return zlib.inflateRawSync(compData).toString('utf8')
  } catch {
    return null
  }
}

/**
 * XML 태그와 공백을 정리하여 순수 텍스트로 변환합니다.
 */
export function cleanXmlToPlainText(xmlText: string): string {
  return xmlText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * 증권신고서/투자설명서 텍스트에서 특정 증권사의 청약단위 구간표를 파싱합니다.
 */
export function parseProspectusUnitTiers(
  plainText: string,
  brokerName: string
): IpoSubscriptionTier[] {
  const baseName = brokerName.replace(/(?:주식회사|증권|투자증권)/g, '').trim()
  const searchName = baseName.length >= 2 ? baseName.slice(0, 2) : baseName

  // 증권사별 청약단위 섹션 검색: [XXX 청약단위] or [XXX 청약주식별 청약단위]
  const tableRegex = new RegExp(
    `\\[[^\\]]*?${searchName}[^\\]]*?청약단위[^\\]]*?\\]([\\s\\S]*?)(?=\\[[^\\]]*?(?:증권|청약)[^\\]]*?\\]|\\([0-9]+\\)|다\\.|라\\.|$)`,
    'i'
  )
  const match = plainText.match(tableRegex)
  const targetText = match ? match[1] : plainText

  const stepRegex =
    /(\d[\d,]*)\s*주\s*(?:이상|초과)(?:\s*(?:~|∼|-)\s*(\d[\d,]*)\s*주\s*이하)?\s*(\d[\d,]*)\s*주/g
  const tiers: IpoSubscriptionTier[] = []
  let stepMatch: RegExpExecArray | null

  while ((stepMatch = stepRegex.exec(targetText)) !== null) {
    const fromShares = parseInt(stepMatch[1].replace(/,/g, ''), 10)
    const toShares = stepMatch[2]
      ? parseInt(stepMatch[2].replace(/,/g, ''), 10)
      : null
    const unitShares = parseInt(stepMatch[3].replace(/,/g, ''), 10)

    if (
      !tiers.some(
        (t) =>
          t.fromShares === fromShares &&
          t.toShares === toShares &&
          t.unitShares === unitShares
      )
    ) {
      tiers.push({ fromShares, toShares, unitShares })
    }
  }

  return tiers.sort((left, right) => left.fromShares - right.fromShares)
}

/**
 * 증권신고서/투자설명서 텍스트에서 증권사별 최고 청약한도를 추출합니다.
 */
export function parseProspectusLimits(
  plainText: string,
  brokerName: string
): IpoSubscriptionLimit[] {
  const baseName = brokerName.replace(/(?:주식회사|증권|투자증권)/g, '').trim()
  const searchName = baseName.length >= 2 ? baseName.slice(0, 2) : baseName

  // 증권사 관련 섹션들 수집 (다음 '[' 또는 문서 끝까지)
  const sectionRegex = new RegExp(
    `\\[[^\\]]*?${searchName}[^\\]]*?\\]([\\s\\S]*?)(?=\\[|$)`,
    'g'
  )

  let sm: RegExpExecArray | null
  let brokerSlice = ''
  while ((sm = sectionRegex.exec(plainText)) !== null) {
    brokerSlice += '\n' + sm[0]
  }

  const limits: IpoSubscriptionLimit[] = []

  // 1. 그룹별 한도 (예: 미래에셋 - 우대그룹(200%) 23,000주, 일반그룹(100%) 11,000주)
  const groupRegex =
    /[□■●○\s]*([가-힣A-Za-z0-9()%\s]+?그룹)의?\s*청약한도\s*:\s*(?:(\d[\d,]*)\s*주\s*~\s*)?(\d[\d,]*)\s*주(?:\s*\(([^)]+)\))?/g
  let gm: RegExpExecArray | null
  let limitIndex = 1
  while ((gm = groupRegex.exec(brokerSlice)) !== null) {
    const tier = gm[4] ? `${gm[1].trim()}(${gm[4].trim()})` : gm[1].trim()
    const maxShares = parseInt(gm[3].replace(/,/g, ''), 10)
    limits.push({
      id: `${baseName}-limit-${limitIndex++}`,
      label: tier,
      maxShares,
    })
  }

  // 2. 단일/단순 최고청약한도 (예: 유진투자증권 - 최고청약한도의 100%: 20,000주)
  if (limits.length === 0) {
    const maxRegex = /최고\s*청약한도(?:의\s*100%)?\s*:\s*(\d[\d,]*)\s*주/
    const mm = brokerSlice.match(maxRegex)
    if (mm) {
      const maxShares = parseInt(mm[1].replace(/,/g, ''), 10)
      limits.push({
        id: `${baseName}-limit-1`,
        label: '일반/우대',
        maxShares,
      })
    }
  }

  // 동일 라벨(예: 우대그룹, 일반그룹) 중복 제거 및 확정 최대 한도 유지
  const dedupedMap = new Map<string, number>()
  for (const l of limits) {
    const prev = dedupedMap.get(l.label)
    if (prev === undefined || l.maxShares > prev) {
      dedupedMap.set(l.label, l.maxShares)
    }
  }

  let finalIdx = 1
  return Array.from(dedupedMap.entries()).map(([label, maxShares]) => ({
    id: `${baseName}-limit-${finalIdx++}`,
    label,
    maxShares,
  }))
}

/**
 * 증권사 이름별로 DART 공시 텍스트에서 종합 청약 정보(한도, 단위구간)를 파싱합니다.
 */
export function parseProspectusBrokerInfo(
  xmlText: string,
  brokerName: string
): ParsedBrokerProspectusInfo {
  const plainText = cleanXmlToPlainText(xmlText)
  const subscriptionUnitTiers = parseProspectusUnitTiers(plainText, brokerName)
  const limits = parseProspectusLimits(plainText, brokerName)

  const minSubscriptionShares = subscriptionUnitTiers[0]?.fromShares ?? null
  const subscriptionUnitShares = subscriptionUnitTiers[0]?.unitShares ?? null

  return {
    minSubscriptionShares,
    subscriptionUnitShares,
    subscriptionUnitTiers,
    limits,
  }
}
