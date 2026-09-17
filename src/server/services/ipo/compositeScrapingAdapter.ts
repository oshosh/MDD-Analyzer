import type {
  IpoCompetitionFeedOffering,
  IpoCompetitionFeedResponse,
  IpoDataSource,
} from '@entities/ipo'
import {
  BrokerDirectIpoCompetitionAdapter,
  type IpoCompetitionFeedAdapter,
} from './competitionFeedAdapter'
import {
  DaishinScrapingAdapter,
  normalizeCompanyName,
} from './daishinScrapingAdapter'
import { EugeneScrapingAdapter } from './eugeneScrapingAdapter'
import { IbkScrapingAdapter } from './ibkScrapingAdapter'
import { KoreaInvestScrapingAdapter } from './koreaInvestScrapingAdapter'
import { MiraeScrapingAdapter } from './miraeScrapingAdapter'

export interface CompositeScrapingAdapterOptions {
  bridgeAdapter?: IpoCompetitionFeedAdapter
  daishinAdapter?: DaishinScrapingAdapter
  eugeneAdapter?: EugeneScrapingAdapter
  miraeAdapter?: MiraeScrapingAdapter
  koreaInvestAdapter?: KoreaInvestScrapingAdapter
  ibkAdapter?: IbkScrapingAdapter
  now?: () => Date
}

/**
 * Composite competition feed adapter that tries:
 * 1. Broker direct bridge (if configured via env IPO_BROKER_DIRECT_BRIDGE_URL)
 * 2. Scrapes Daishin, Eugene, Mirae Asset, Korea Investment, and IBK Securities directly
 */
export class CompositeScrapingAdapter implements IpoCompetitionFeedAdapter {
  private readonly bridgeAdapter: IpoCompetitionFeedAdapter
  private readonly daishinAdapter: DaishinScrapingAdapter
  private readonly eugeneAdapter: EugeneScrapingAdapter
  private readonly miraeAdapter: MiraeScrapingAdapter
  private readonly koreaInvestAdapter: KoreaInvestScrapingAdapter
  private readonly ibkAdapter: IbkScrapingAdapter
  private readonly now: () => Date

  constructor(options: CompositeScrapingAdapterOptions = {}) {
    this.bridgeAdapter =
      options.bridgeAdapter ?? new BrokerDirectIpoCompetitionAdapter()
    this.daishinAdapter =
      options.daishinAdapter ?? new DaishinScrapingAdapter()
    this.eugeneAdapter =
      options.eugeneAdapter ?? new EugeneScrapingAdapter()
    this.miraeAdapter =
      options.miraeAdapter ?? new MiraeScrapingAdapter()
    this.koreaInvestAdapter =
      options.koreaInvestAdapter ?? new KoreaInvestScrapingAdapter()
    this.ibkAdapter =
      options.ibkAdapter ?? new IbkScrapingAdapter()
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(
    date: string
  ): Promise<IpoCompetitionFeedResponse> {
    const fetchedAt = this.now().toISOString()

    // 1. Try bridge adapter first
    const bridgeResult = await this.bridgeAdapter
      .getCompetitionForDate(date)
      .catch(() => null)

    if (
      bridgeResult &&
      bridgeResult.source.status !== 'unavailable' &&
      bridgeResult.offerings.length > 0
    ) {
      return bridgeResult
    }

    // 2. Fall back to direct scraping of brokers (Daishin + Eugene + Mirae + Korea Investment + IBK)
    const [daishinResult, eugeneResult, miraeResult, kisResult, ibkResult] =
      await Promise.allSettled([
        this.daishinAdapter.getCompetitionForDate(date),
        this.eugeneAdapter.getCompetitionForDate(date),
        this.miraeAdapter.getCompetitionForDate(date),
        this.koreaInvestAdapter.getCompetitionForDate(date),
        this.ibkAdapter.getCompetitionForDate(date),
      ])

    const rawOfferings: IpoCompetitionFeedOffering[] = []
    const sources: string[] = []

    if (
      daishinResult.status === 'fulfilled' &&
      daishinResult.value.offerings.length > 0
    ) {
      rawOfferings.push(...daishinResult.value.offerings)
      sources.push('대신증권')
    }

    if (
      eugeneResult.status === 'fulfilled' &&
      eugeneResult.value.offerings.length > 0
    ) {
      rawOfferings.push(...eugeneResult.value.offerings)
      sources.push('유진투자증권')
    }

    if (
      miraeResult.status === 'fulfilled' &&
      miraeResult.value.offerings.length > 0
    ) {
      rawOfferings.push(...miraeResult.value.offerings)
      sources.push('미래에셋증권')
    }

    if (
      kisResult.status === 'fulfilled' &&
      kisResult.value.offerings.length > 0
    ) {
      rawOfferings.push(...kisResult.value.offerings)
      sources.push('한국투자증권')
    }

    if (
      ibkResult.status === 'fulfilled' &&
      ibkResult.value.offerings.length > 0
    ) {
      rawOfferings.push(...ibkResult.value.offerings)
      sources.push('IBK투자증권')
    }

    if (rawOfferings.length === 0) {
      return {
        source: {
          name: '증권사 실시간 직접 스크래핑',
          dataKind: 'broker-direct',
          sourceAsOf: fetchedAt,
          fetchedAt,
          status: 'unavailable',
          coverage: '현재 청약 진행 중인 증권사 실시간 경쟁률 데이터가 없습니다.',
        },
        offerings: [],
      }
    }

    // Merge offerings by normalized name to group multi-broker IPOs
    const offeringMap = new Map<string, IpoCompetitionFeedOffering>()

    for (const offering of rawOfferings) {
      const name = offering.companyName ?? ''
      const normKey = normalizeCompanyName(name)
      const existing = offeringMap.get(normKey)
      if (existing) {
        for (const b of offering.brokers) {
          if (
            !existing.brokers.some(
              (eb) => eb.name === b.name || eb.id === b.id
            )
          ) {
            existing.brokers.push(b)
          }
        }
      } else {
        offeringMap.set(normKey, {
          ...offering,
          brokers: [...offering.brokers],
        })
      }
    }

    const mergedOfferings = Array.from(offeringMap.values())

    const source: IpoDataSource = {
      name: `${sources.join(', ')} 실시간 직접 스크래핑`,
      dataKind: 'broker-direct',
      sourceAsOf: fetchedAt,
      fetchedAt,
      status: 'provisional',
      coverage: `${sources.join(', ')}에서 총 ${mergedOfferings.length}건의 공모주 실시간 경쟁률을 수집했습니다.`,
    }

    return {
      source,
      offerings: mergedOfferings,
    }
  }
}
