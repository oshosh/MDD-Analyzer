import { describe, expect, it } from 'vitest'
import type { IpoCompetitionFeedResponse } from '@entities/ipo'
import {
  createIpoSubscriptionService,
  type IpoSubscriptionService,
} from '@/server/services/ipoSubscriptionService'
import type { IpoCompetitionFeedAdapter } from '@/server/services/ipo/competitionFeedAdapter'
import type { IpoCalendarAdapter } from '@/server/services/ipo/openDartIpoAdapter'
import {
  calculatorBroker,
  dartOffering,
  liveSource,
  unavailableSource,
} from './fixtures/ipoFixtures'

function createCalendarAdapter(): IpoCalendarAdapter {
  return {
    async getOfferingsForDate(): Promise<(typeof dartOffering)[]> {
      return [dartOffering]
    },
  }
}

function createService(
  competition: IpoCompetitionFeedResponse
): IpoSubscriptionService {
  const competitionAdapter: IpoCompetitionFeedAdapter = {
    async getCompetitionForDate(): Promise<IpoCompetitionFeedResponse> {
      return competition
    },
  }

  return createIpoSubscriptionService(
    createCalendarAdapter(),
    competitionAdapter,
    () => new Date('2026-09-15T10:00:00.000Z')
  )
}

describe('IPO calendar composition', () => {
  it('returns DART calendar data while live competition is unavailable', async () => {
    const result = await createService({
      source: unavailableSource,
      offerings: [],
    }).getCalendar('2026-09-15')

    expect(result.dataMode).toBe('dart-only')
    expect(result.offerings).toHaveLength(1)
    expect(result.offerings[0].name).toBe('빅웨이브로보틱스')
    expect(result.offerings[0].brokers[0].currentProportionalRatio).toBeNull()
    expect(result.offerings[0].brokers[0].competitionSource.status).toBe(
      'unavailable'
    )
    expect(result.offerings[0].depositRate).toBeNull()
    expect(result.offerings[0].brokers[0]).toMatchObject({
      generalAllocationShares: 204_000,
      equalAllocationShares: 102_000,
      proportionalAllocationShares: 102_000,
      applicationFee: null,
      minSubscriptionShares: null,
      subscriptionUnitShares: null,
      limits: [],
    })
  })

  it('merges a live broker only when its DART id or exact disclosed name matches', async () => {
    const result = await createService({
      source: liveSource,
      offerings: [
        {
          dartCorpCode: dartOffering.dartCorpCode,
          offeringKind: 'ipo',
          depositRate: 0.5,
          listingDate: '2026-09-23',
          subscriptionOpenAt: '2026-09-15T10:00:00+09:00',
          subscriptionCloseAt: '2026-09-16T16:00:00+09:00',
          expectedFinalDeposit: 3_630_000_000_000,
          expectedFinalOneShareCost: 18_126_000,
          marketPrice: null,
          disparityRate: null,
          brokers: [
            {
              ...calculatorBroker,
              source: liveSource,
            },
            {
              ...calculatorBroker,
              id: 'unmatched-name',
              name: '유진투자증권',
              source: liveSource,
            },
          ],
        },
      ],
    }).getCalendar('2026-09-15')

    const offering = result.offerings[0]
    expect(result.dataMode).toBe('broker-live')
    expect(offering.listingDate).toBe('2026-09-23')
    expect(offering.brokers).toHaveLength(2)
    expect(offering.brokers[0].currentProportionalRatio).toBe(1_264)
    expect(offering.brokers[0].underwritingShares).toBe(816_000)
    expect(offering.brokers[1].name).toBe('유진투자증권')
    expect(offering.brokers[1].underwritingShares).toBeNull()
  })

  it('automatically infers proportional ratio (2x) when only total ratio is given, and vice-versa', async () => {
    const result = await createService({
      source: liveSource,
      offerings: [
        {
          dartCorpCode: dartOffering.dartCorpCode,
          offeringKind: 'ipo',
          depositRate: 0.5,
          listingDate: '2026-09-23',
          subscriptionOpenAt: '2026-09-15T10:00:00+09:00',
          subscriptionCloseAt: '2026-09-16T16:00:00+09:00',
          expectedFinalDeposit: null,
          expectedFinalOneShareCost: null,
          marketPrice: null,
          disparityRate: null,
          brokers: [
            {
              ...calculatorBroker,
              currentTotalCompetitionRatio: 1478.15,
              currentProportionalRatio: null,
              source: liveSource,
            },
          ],
        },
      ],
    }).getCalendar('2026-09-15')

    const broker = result.offerings[0].brokers[0]
    expect(broker.currentTotalCompetitionRatio).toBe(1478.15)
    // 1478.15 * 2 = 2956.3
    expect(broker.currentProportionalRatio).toBe(2956.3)
  })

  it('automatically infers 25% general and 50/50 equal/proportional pool from underwritingShares', async () => {
    const dartWithUnderwriting = {
      ...dartOffering,
      brokers: [
        {
          ...dartOffering.brokers[0],
          underwritingShares: 1_200_000,
          generalAllocationShares: null,
          equalAllocationShares: null,
          proportionalAllocationShares: null,
        },
      ],
    }

    const calendarAdapter: IpoCalendarAdapter = {
      async getOfferingsForDate() {
        return [dartWithUnderwriting]
      },
    }

    const service = createIpoSubscriptionService(
      calendarAdapter,
      {
        async getCompetitionForDate() {
          return { source: unavailableSource, offerings: [] }
        },
      },
      () => new Date('2026-09-17T10:00:00.000Z')
    )

    const result = await service.getCalendar('2026-09-17')
    const broker = result.offerings[0].brokers[0]

    // 1,200,000 * 25% = 300,000주
    expect(broker.generalAllocationShares).toBe(300_000)
    // 300,000 * 50% = 150,000주
    expect(broker.equalAllocationShares).toBe(150_000)
    expect(broker.proportionalAllocationShares).toBe(150_000)
  })
})

