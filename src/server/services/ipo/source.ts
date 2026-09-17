import type { IpoDataSource } from '@entities/ipo'

export function createUnavailableCompetitionSource(
  fetchedAt: string,
  coverage =
    '증권사 공식 SDK 또는 제휴 API를 호출하는 직접 원천 브리지가 연결되지 않아 경쟁률·청약조건은 제공하지 않습니다.'
): IpoDataSource {
  return {
    name: '증권사 공식 직접 원천 미연결',
    dataKind: 'broker-direct',
    sourceAsOf: null,
    fetchedAt,
    status: 'unavailable',
    coverage,
  }
}

export function createOpenDartSource(
  sourceAsOf: string | null,
  fetchedAt: string
): IpoDataSource {
  return {
    name: 'OpenDART 증권신고서',
    dataKind: 'open-dart',
    sourceAsOf,
    fetchedAt,
    status: 'final',
    coverage:
      '증권신고서 일반공모 기준 정보입니다. 장중 경쟁률·청약한도·정확한 청약시간은 포함하지 않습니다.',
  }
}
