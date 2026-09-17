import {
  IpoSubscriptionResponseSchema,
  type IpoBrokerSnapshot,
  type IpoCompetitionFeedBroker,
  type IpoCompetitionFeedOffering,
  type IpoDataSource,
  type IpoOfferingSnapshot,
  type IpoSubscriptionResponse,
} from '@entities/ipo'
import {
  type IpoCompetitionFeedAdapter,
} from './ipo/competitionFeedAdapter'
import { CompositeScrapingAdapter } from './ipo/compositeScrapingAdapter'
import { IpoConfigurationError, IpoDataSourceError } from './ipo/errors'
import { normalizeCompanyName } from './ipo/normalizeCompanyName'
import {
  OpenDartIpoAdapter,
  type IpoCalendarAdapter,
} from './ipo/openDartIpoAdapter'
import { createOpenDartSource } from './ipo/source'

export { IpoConfigurationError, IpoDataSourceError }

function unavailableForOffering(source: IpoDataSource): IpoDataSource {
  if (source.status === 'unavailable' || source.status === 'delayed') {
    return source
  }

  return {
    ...source,
    sourceAsOf: null,
    status: 'unavailable',
    coverage: `${source.coverage} 선택 종목 또는 증권사에 대한 경쟁률은 제공되지 않았습니다.`,
  }
}

export function canonicalBrokerBaseName(name: string): string {
  return name.replace(/(?:주식회사|투자증권|증권)/g, '').trim()
}

function matchesBroker(
  dartBroker: IpoBrokerSnapshot,
  feedBroker: IpoCompetitionFeedBroker
): boolean {
  if (feedBroker.id === dartBroker.id) return true
  if (feedBroker.name === dartBroker.name) return true
  if (feedBroker.id.startsWith('unmatched-')) return false
  const dartBase = canonicalBrokerBaseName(dartBroker.name)
  const feedBase = canonicalBrokerBaseName(feedBroker.name)
  return dartBase.length >= 2 && dartBase === feedBase
}

function mergeBroker(
  dartBroker: IpoBrokerSnapshot,
  feedBroker: IpoCompetitionFeedBroker
): IpoBrokerSnapshot {
  let generalAllocationShares =
    feedBroker.generalAllocationShares ?? dartBroker.generalAllocationShares

  let equalAllocationShares =
    feedBroker.equalAllocationShares ?? dartBroker.equalAllocationShares

  let proportionalAllocationShares =
    feedBroker.proportionalAllocationShares ??
    dartBroker.proportionalAllocationShares

  // 3차 Fallback: 인수 수량이 있으면 25% 법정 기본 배정 적용 (균등 50% / 비례 50%)
  if (generalAllocationShares === null && dartBroker.underwritingShares !== null) {
    generalAllocationShares = Math.round(dartBroker.underwritingShares * 0.25)
  }
  if (generalAllocationShares !== null) {
    if (equalAllocationShares === null) {
      equalAllocationShares = Math.floor(generalAllocationShares * 0.5)
    }
    if (proportionalAllocationShares === null) {
      proportionalAllocationShares = generalAllocationShares - equalAllocationShares
    }
  }

  let currentTotalCompetitionRatio =
    feedBroker.currentTotalCompetitionRatio ??
    dartBroker.currentTotalCompetitionRatio

  let currentProportionalRatio =
    feedBroker.currentProportionalRatio ?? dartBroker.currentProportionalRatio

  // 전체경쟁률과 비례경쟁률 상호 보완 (50/50 규칙: R_prop = R_total * 2)
  if (currentTotalCompetitionRatio === null && currentProportionalRatio !== null) {
    currentTotalCompetitionRatio = Number((currentProportionalRatio / 2).toFixed(2))
  } else if (currentProportionalRatio === null && currentTotalCompetitionRatio !== null) {
    currentProportionalRatio = Number((currentTotalCompetitionRatio * 2).toFixed(2))
  }

  let expectedFinalProportionalRatio =
    feedBroker.expectedFinalProportionalRatio ??
    dartBroker.expectedFinalProportionalRatio
  if (expectedFinalProportionalRatio === null && currentProportionalRatio !== null) {
    expectedFinalProportionalRatio = currentProportionalRatio
  }

  const applicantCount = feedBroker.applicantCount ?? dartBroker.applicantCount

  let currentEqualExpectedAllocation =
    feedBroker.currentEqualExpectedAllocation ??
    dartBroker.currentEqualExpectedAllocation
  if (
    currentEqualExpectedAllocation === null &&
    equalAllocationShares !== null &&
    applicantCount !== null &&
    applicantCount > 0
  ) {
    currentEqualExpectedAllocation = Number(
      (equalAllocationShares / applicantCount).toFixed(2)
    )
  }

  const expectedEqualAllocation =
    feedBroker.expectedEqualAllocation ??
    dartBroker.expectedEqualAllocation ??
    currentEqualExpectedAllocation

  const minSubscriptionShares =
    feedBroker.minSubscriptionShares ?? dartBroker.minSubscriptionShares
  const subscriptionUnitShares =
    feedBroker.subscriptionUnitShares ?? dartBroker.subscriptionUnitShares
  const applicationFee = feedBroker.applicationFee ?? dartBroker.applicationFee

  const subscriptionUnitTiers =
    feedBroker.subscriptionUnitTiers &&
    feedBroker.subscriptionUnitTiers.length > 0
      ? feedBroker.subscriptionUnitTiers
      : dartBroker.subscriptionUnitTiers &&
          dartBroker.subscriptionUnitTiers.length > 0
        ? dartBroker.subscriptionUnitTiers
        : []

  const limits =
    feedBroker.limits.length > 0
      ? feedBroker.limits
      : dartBroker.limits.length > 0
        ? dartBroker.limits
        : []

  return {
    ...dartBroker,
    role: feedBroker.role ?? dartBroker.role,
    generalAllocationShares,
    equalAllocationShares,
    proportionalAllocationShares,
    currentTotalCompetitionRatio,
    currentProportionalRatio,
    expectedFinalProportionalRatio,
    currentEqualExpectedAllocation,
    expectedEqualAllocation,
    applicantCount,
    currentTotalDeposit:
      feedBroker.currentTotalDeposit ?? dartBroker.currentTotalDeposit,
    expectedFinalTotalDeposit:
      feedBroker.expectedFinalTotalDeposit ??
      dartBroker.expectedFinalTotalDeposit,
    estimatedOneShareDeposit:
      feedBroker.estimatedOneShareDeposit ??
      dartBroker.estimatedOneShareDeposit,
    expectedFinalOneShareDeposit:
      feedBroker.expectedFinalOneShareDeposit ??
      dartBroker.expectedFinalOneShareDeposit,
    applicationFee,
    minSubscriptionShares,
    subscriptionUnitShares,
    subscriptionUnitTiers,
    limits,
    onlineSubscriptionNote:
      feedBroker.onlineSubscriptionNote ?? dartBroker.onlineSubscriptionNote,
    competitionRatioKind:
      feedBroker.competitionRatioKind ?? dartBroker.competitionRatioKind,
    proportionalAllocationRoundingRule:
      feedBroker.proportionalAllocationRoundingRule ??
      dartBroker.proportionalAllocationRoundingRule,
    competitionSource: feedBroker.source,
  }
}

function attachCompetitionSource(
  broker: IpoBrokerSnapshot,
  source: IpoDataSource
): IpoBrokerSnapshot {
  return {
    ...broker,
    competitionSource: broker.competitionSource ?? source,
  }
}

function brokerFromFeed(
  feedBroker: IpoCompetitionFeedBroker
): IpoBrokerSnapshot {
  const generalAllocationShares = feedBroker.generalAllocationShares
  let equalAllocationShares = feedBroker.equalAllocationShares
  let proportionalAllocationShares = feedBroker.proportionalAllocationShares

  if (generalAllocationShares !== null) {
    if (equalAllocationShares === null) {
      equalAllocationShares = Math.floor(generalAllocationShares * 0.5)
    }
    if (proportionalAllocationShares === null) {
      proportionalAllocationShares = generalAllocationShares - equalAllocationShares
    }
  }

  let currentTotalCompetitionRatio = feedBroker.currentTotalCompetitionRatio
  let currentProportionalRatio = feedBroker.currentProportionalRatio

  if (currentTotalCompetitionRatio === null && currentProportionalRatio !== null) {
    currentTotalCompetitionRatio = Number((currentProportionalRatio / 2).toFixed(2))
  } else if (currentProportionalRatio === null && currentTotalCompetitionRatio !== null) {
    currentProportionalRatio = Number((currentTotalCompetitionRatio * 2).toFixed(2))
  }

  let currentEqualExpectedAllocation = feedBroker.currentEqualExpectedAllocation
  if (
    currentEqualExpectedAllocation === null &&
    equalAllocationShares !== null &&
    feedBroker.applicantCount !== null &&
    feedBroker.applicantCount > 0
  ) {
    currentEqualExpectedAllocation = Number(
      (equalAllocationShares / feedBroker.applicantCount).toFixed(2)
    )
  }

  return {
    id: feedBroker.id,
    name: feedBroker.name,
    role: feedBroker.role,
    underwritingShares: null,
    underwritingAmount: null,
    underwritingMethod: null,
    generalAllocationShares,
    equalAllocationShares,
    proportionalAllocationShares,
    currentTotalCompetitionRatio,
    currentProportionalRatio,
    expectedFinalProportionalRatio:
      feedBroker.expectedFinalProportionalRatio ?? currentProportionalRatio,
    currentEqualExpectedAllocation,
    expectedEqualAllocation:
      feedBroker.expectedEqualAllocation ?? currentEqualExpectedAllocation,
    applicantCount: feedBroker.applicantCount,
    currentTotalDeposit: feedBroker.currentTotalDeposit,
    expectedFinalTotalDeposit: feedBroker.expectedFinalTotalDeposit,
    estimatedOneShareDeposit: feedBroker.estimatedOneShareDeposit,
    expectedFinalOneShareDeposit: feedBroker.expectedFinalOneShareDeposit,
    applicationFee: feedBroker.applicationFee,
    minSubscriptionShares: feedBroker.minSubscriptionShares,
    subscriptionUnitShares: feedBroker.subscriptionUnitShares,
    subscriptionUnitTiers: feedBroker.subscriptionUnitTiers ?? [],
    limits: feedBroker.limits,
    onlineSubscriptionNote: feedBroker.onlineSubscriptionNote,
    competitionRatioKind: feedBroker.competitionRatioKind,
    proportionalAllocationRoundingRule:
      feedBroker.proportionalAllocationRoundingRule,
    competitionSource: feedBroker.source,
  }
}

function ensureBrokerAllocationPools(
  broker: IpoBrokerSnapshot,
  totalOfferingShares?: number | null
): IpoBrokerSnapshot {
  let generalAllocationShares = broker.generalAllocationShares
  let equalAllocationShares = broker.equalAllocationShares
  let proportionalAllocationShares = broker.proportionalAllocationShares

  const baseShares = broker.underwritingShares ?? totalOfferingShares ?? null
  if (generalAllocationShares === null && baseShares !== null) {
    generalAllocationShares = Math.round(baseShares * 0.25)
  }

  if (generalAllocationShares !== null) {
    if (equalAllocationShares === null) {
      equalAllocationShares = Math.floor(generalAllocationShares * 0.5)
    }
    if (proportionalAllocationShares === null) {
      proportionalAllocationShares = generalAllocationShares - equalAllocationShares
    }
  }

  return {
    ...broker,
    generalAllocationShares,
    equalAllocationShares,
    proportionalAllocationShares,
  }
}

function mergeOffering(
  dartOffering: IpoOfferingSnapshot,
  feedOffering: IpoCompetitionFeedOffering | undefined,
  feedSource: IpoDataSource
): IpoOfferingSnapshot {
  const fallbackSource = unavailableForOffering(feedSource)

  if (feedOffering === undefined) {
    return {
      ...dartOffering,
      competitionSource: fallbackSource,
      brokers: dartOffering.brokers.map((broker) =>
        attachCompetitionSource(
          ensureBrokerAllocationPools(
            { ...broker, competitionSource: fallbackSource },
            dartOffering.totalOfferingShares
          ),
          fallbackSource
        )
      ),
    }
  }

  const mergedDartBrokers = dartOffering.brokers.map((dartBroker) => {
    const feedBroker = feedOffering.brokers.find((candidate) =>
      matchesBroker(dartBroker, candidate)
    )
    return feedBroker === undefined
      ? attachCompetitionSource(
          { ...dartBroker, competitionSource: fallbackSource },
          fallbackSource
        )
      : mergeBroker(dartBroker, feedBroker)
  })

  const feedOnlyBrokers = feedOffering.brokers
    .filter(
      (feedBroker) =>
        !dartOffering.brokers.some((dartBroker) =>
          matchesBroker(dartBroker, feedBroker)
        )
    )
    .map(brokerFromFeed)

  const allBrokers = [...mergedDartBrokers, ...feedOnlyBrokers].map((b) =>
    attachCompetitionSource(b, feedSource)
  )

  return {
    ...dartOffering,
    offerPrice: feedOffering.offerPrice ?? dartOffering.offerPrice,
    depositRate: feedOffering.depositRate ?? dartOffering.depositRate,
    offeringKind: feedOffering.offeringKind ?? dartOffering.offeringKind,
    listingDate: feedOffering.listingDate ?? dartOffering.listingDate,
    subscriptionOpenAt:
      feedOffering.subscriptionOpenAt ?? dartOffering.subscriptionOpenAt,
    subscriptionCloseAt:
      feedOffering.subscriptionCloseAt ?? dartOffering.subscriptionCloseAt,
    expectedFinalDeposit:
      feedOffering.expectedFinalDeposit ?? dartOffering.expectedFinalDeposit,
    expectedFinalOneShareCost:
      feedOffering.expectedFinalOneShareCost ??
      dartOffering.expectedFinalOneShareCost,
    marketPrice: feedOffering.marketPrice ?? dartOffering.marketPrice,
    disparityRate: feedOffering.disparityRate ?? dartOffering.disparityRate,
    competitionSource: feedSource,
    brokers: allBrokers,
  }
}

export interface IpoSubscriptionService {
  getCalendar(date: string): Promise<IpoSubscriptionResponse>
}

export function createIpoSubscriptionService(
  calendarAdapter: IpoCalendarAdapter,
  competitionAdapter: IpoCompetitionFeedAdapter,
  now: () => Date = () => new Date()
): IpoSubscriptionService {
  return {
    async getCalendar(date: string): Promise<IpoSubscriptionResponse> {
      const [dartOfferings, competition] = await Promise.all([
        calendarAdapter.getOfferingsForDate(date),
        competitionAdapter.getCompetitionForDate(date),
      ])
      const feedByCorpCode = new Map(
        competition.offerings.map((offering) => [
          offering.dartCorpCode,
          offering,
        ])
      )
      const feedByName = new Map(
        competition.offerings
          .filter((offering) => Boolean(offering.companyName))
          .map((offering) => [
            normalizeCompanyName(offering.companyName!),
            offering,
          ])
      )
      const offerings = dartOfferings.map((offering) => {
        const matchedFeed =
          feedByCorpCode.get(offering.dartCorpCode) ??
          feedByName.get(normalizeCompanyName(offering.name))
        return mergeOffering(offering, matchedFeed, competition.source)
      })
      const hasMatchedLiveFeed = offerings.some(
        (offering) =>
          offering.competitionSource.dataKind === 'broker-direct' &&
          (offering.competitionSource.status === 'provisional' ||
            offering.competitionSource.status === 'final') &&
          competition.offerings.some(
            (feedOffering) =>
              feedOffering.dartCorpCode === offering.dartCorpCode ||
              (feedOffering.companyName &&
                normalizeCompanyName(feedOffering.companyName) ===
                  normalizeCompanyName(offering.name))
          )
      )
      const generatedAt = now().toISOString()
      const response = {
        requestedDate: date,
        generatedAt,
        dataMode: hasMatchedLiveFeed ? 'broker-live' : 'dart-only',
        calendarSource: createOpenDartSource(null, generatedAt),
        competitionSource: competition.source,
        offerings,
      }
      const parsed = IpoSubscriptionResponseSchema.safeParse(response)

      if (!parsed.success) {
        console.error(
          'IPO ZOD PARSE ERROR:',
          JSON.stringify(parsed.error.issues, null, 2)
        )
        throw new IpoDataSourceError('IPO data could not be normalized')
      }

      return parsed.data
    },
  }
}

export function getIpoSubscriptionCalendar(
  date: string
): Promise<IpoSubscriptionResponse> {
  const service = createIpoSubscriptionService(
    new OpenDartIpoAdapter(),
    new CompositeScrapingAdapter()
  )
  return service.getCalendar(date)
}
