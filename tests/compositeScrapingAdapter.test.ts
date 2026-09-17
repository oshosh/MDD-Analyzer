import { describe, expect, it } from 'vitest'
import { CompositeScrapingAdapter } from '../src/server/services/ipo/compositeScrapingAdapter'
import type { IpoCompetitionFeedResponse } from '@entities/ipo'

describe('CompositeScrapingAdapter', () => {
  const FIXED_TIME = new Date('2026-09-15T15:00:00Z')

  const mockEmpty = {
    getCompetitionForDate: async (): Promise<IpoCompetitionFeedResponse> => ({
      source: {
        name: 'empty',
        dataKind: 'broker-direct',
        sourceAsOf: FIXED_TIME.toISOString(),
        fetchedAt: FIXED_TIME.toISOString(),
        status: 'unavailable',
        coverage: 'none',
      },
      offerings: [],
    }),
  } as any

  it('uses bridge response if bridge has offerings', async () => {
    const mockBridge = {
      getCompetitionForDate: async (): Promise<IpoCompetitionFeedResponse> => ({
        source: {
          name: '증권사 공식 직접 원천 브리지',
          dataKind: 'broker-direct',
          sourceAsOf: FIXED_TIME.toISOString(),
          fetchedAt: FIXED_TIME.toISOString(),
          status: 'provisional',
          coverage: '브리지 응답',
        },
        offerings: [
          {
            dartCorpCode: '01234567',
            companyName: '테스트기업',
            depositRate: null,
            listingDate: null,
            subscriptionOpenAt: null,
            subscriptionCloseAt: null,
            expectedFinalDeposit: null,
            expectedFinalOneShareCost: null,
            marketPrice: null,
            disparityRate: null,
            brokers: [],
          },
        ],
      }),
    }

    const adapter = new CompositeScrapingAdapter({
      bridgeAdapter: mockBridge,
      now: () => FIXED_TIME,
    })

    const res = await adapter.getCompetitionForDate('2026-09-15')
    expect(res.source.name).toBe('증권사 공식 직접 원천 브리지')
    expect(res.offerings).toHaveLength(1)
  })

  it('falls back to scrapers when bridge is unavailable', async () => {
    const mockBridge = {
      getCompetitionForDate: async (): Promise<IpoCompetitionFeedResponse> => ({
        source: {
          name: '증권사 공식 직접 원천 브리지 미연결',
          dataKind: 'broker-direct',
          sourceAsOf: null,
          fetchedAt: FIXED_TIME.toISOString(),
          status: 'unavailable',
          coverage: '미연결',
        },
        offerings: [],
      }),
    }

    const mockDaishin = {
      getCompetitionForDate: async (): Promise<IpoCompetitionFeedResponse> => ({
        source: {
          name: '대신증권',
          dataKind: 'broker-direct',
          sourceAsOf: FIXED_TIME.toISOString(),
          fetchedAt: FIXED_TIME.toISOString(),
          status: 'provisional',
          coverage: '대신',
        },
        offerings: [
          {
            dartCorpCode: '00003579',
            companyName: '와이즈플래닛컴퍼니',
            depositRate: null,
            listingDate: null,
            subscriptionOpenAt: null,
            subscriptionCloseAt: null,
            expectedFinalDeposit: null,
            expectedFinalOneShareCost: null,
            marketPrice: null,
            disparityRate: null,
            brokers: [],
          },
        ],
      }),
    } as any

    const mockEugene = {
      getCompetitionForDate: async (): Promise<IpoCompetitionFeedResponse> => ({
        source: {
          name: '유진투자증권',
          dataKind: 'broker-direct',
          sourceAsOf: FIXED_TIME.toISOString(),
          fetchedAt: FIXED_TIME.toISOString(),
          status: 'provisional',
          coverage: '유진',
        },
        offerings: [
          {
            dartCorpCode: '02026906',
            companyName: '빅웨이브로보틱스',
            depositRate: null,
            listingDate: null,
            subscriptionOpenAt: null,
            subscriptionCloseAt: null,
            expectedFinalDeposit: null,
            expectedFinalOneShareCost: null,
            marketPrice: null,
            disparityRate: null,
            brokers: [],
          },
        ],
      }),
    } as any

    const adapter = new CompositeScrapingAdapter({
      bridgeAdapter: mockBridge,
      daishinAdapter: mockDaishin,
      eugeneAdapter: mockEugene,
      miraeAdapter: mockEmpty,
      koreaInvestAdapter: mockEmpty,
      ibkAdapter: mockEmpty,
      now: () => FIXED_TIME,
    })

    const res = await adapter.getCompetitionForDate('2026-09-15')
    expect(res.source.status).toBe('provisional')
    expect(res.offerings).toHaveLength(2)
    expect(res.source.name).toContain('대신증권')
    expect(res.source.name).toContain('유진투자증권')
  })

  it('aggregates all 4 brokers and merges co-underwriters for the same offering', async () => {
    const mockDaishin = {
      getCompetitionForDate: async () => ({
        source: { name: '대신', status: 'provisional' },
        offerings: [
          {
            dartCorpCode: '00000001',
            companyName: '와이즈플래닛컴퍼니',
            brokers: [{ id: 'daishin-1', name: '대신증권', currentProportionalRatio: 500 }],
          },
        ],
      }),
    } as any

    const mockEugene = {
      getCompetitionForDate: async () => ({
        source: { name: '유진', status: 'provisional' },
        offerings: [
          {
            dartCorpCode: '00000002',
            companyName: '빅웨이브로보틱스',
            brokers: [{ id: 'eugene-1', name: '유진투자증권', currentProportionalRatio: 1000 }],
          },
        ],
      }),
    } as any

    const mockMirae = {
      getCompetitionForDate: async () => ({
        source: { name: '미래', status: 'provisional' },
        offerings: [
          {
            dartCorpCode: '00000003',
            companyName: '빅웨이브로보틱스',
            brokers: [{ id: 'mirae-1', name: '미래에셋증권', currentProportionalRatio: 1200 }],
          },
        ],
      }),
    } as any

    const mockKis = {
      getCompetitionForDate: async () => ({
        source: { name: '한투', status: 'provisional' },
        offerings: [
          {
            dartCorpCode: '00000004',
            companyName: '카나프테라퓨틱스',
            brokers: [{ id: 'kis-1', name: '한국투자증권', currentProportionalRatio: 2200 }],
          },
        ],
      }),
    } as any

    const adapter = new CompositeScrapingAdapter({
      daishinAdapter: mockDaishin,
      eugeneAdapter: mockEugene,
      miraeAdapter: mockMirae,
      koreaInvestAdapter: mockKis,
      ibkAdapter: mockEmpty,
      now: () => FIXED_TIME,
    })

    const res = await adapter.getCompetitionForDate('2026-09-16')
    expect(res.source.status).toBe('provisional')
    // 3 distinct offerings: 와이즈플래닛컴퍼니, 빅웨이브로보틱스, 카나프테라퓨틱스
    expect(res.offerings).toHaveLength(3)

    const bigwave = res.offerings.find((o) => o.companyName === '빅웨이브로보틱스')
    expect(bigwave).toBeDefined()
    // Co-underwriters merged into 1 offering
    expect(bigwave?.brokers).toHaveLength(2)
    expect(bigwave?.brokers.map((b) => b.name)).toEqual(['유진투자증권', '미래에셋증권'])
  })
})
