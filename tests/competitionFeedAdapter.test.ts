import { describe, expect, it } from 'vitest'
import { BrokerDirectIpoCompetitionAdapter } from '@/server/services/ipo/competitionFeedAdapter'
import { calculatorBroker, dartOffering, liveSource } from './fixtures/ipoFixtures'

describe('broker-direct IPO competition adapter', () => {
  it('identifies an unconfigured broker-direct source without inventing data', async () => {
    const adapter = new BrokerDirectIpoCompetitionAdapter({
      now: () => new Date('2026-09-15T01:00:00.000Z'),
    })

    const result = await adapter.getCompetitionForDate('2026-09-15')

    expect(result.offerings).toEqual([])
    expect(result.source).toMatchObject({
      name: '증권사 공식 직접 원천 브리지 미연결',
      status: 'unavailable',
    })
  })

  it('returns an explicit unavailable state when no broker bridge is configured', async () => {
    const adapter = new BrokerDirectIpoCompetitionAdapter({
      endpoint: '',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
    })

    const result = await adapter.getCompetitionForDate('2026-09-15')

    expect(result.offerings).toEqual([])
    expect(result.source.status).toBe('unavailable')
  })

  it('does not expose malformed provider data as live values', async () => {
    const adapter = new BrokerDirectIpoCompetitionAdapter({
      endpoint: 'https://example.test/ipo-feed',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      fetcher: async () =>
        new Response(JSON.stringify({ source: 'not-normalized' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    })

    const result = await adapter.getCompetitionForDate('2026-09-15')

    expect(result.offerings).toEqual([])
    expect(result.source.status).toBe('delayed')
    expect(result.source.coverage).toContain('정규화 계약')
  })

  it('accepts a normalized response from an authorized broker-direct bridge', async () => {
    const adapter = new BrokerDirectIpoCompetitionAdapter({
      endpoint: 'https://example.test/ipo-feed',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      fetcher: async () =>
        new Response(
          JSON.stringify({
            source: liveSource,
            offerings: [
              {
                ...dartOffering,
                brokers: [
                  {
                    ...calculatorBroker,
                    source: liveSource,
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        ),
    })

    const result = await adapter.getCompetitionForDate('2026-09-15')

    expect(result.source.dataKind).toBe('broker-direct')
    expect(result.offerings[0]?.brokers[0]?.source.name).toBe(
      '테스트 증권사 직접 원천'
    )
  })

  it('rejects a normalized payload that is not marked as broker-direct', async () => {
    const adapter = new BrokerDirectIpoCompetitionAdapter({
      endpoint: 'https://example.test/ipo-feed',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      fetcher: async () =>
        new Response(
          JSON.stringify({
            source: {
              name: '다른 원천',
              dataKind: 'manual',
              sourceAsOf: null,
              fetchedAt: '2026-09-15T10:00:00.000Z',
              status: 'provisional',
              coverage: '직접 증권사 원천이 아닙니다.',
            },
            offerings: [],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        ),
    })

    const result = await adapter.getCompetitionForDate('2026-09-15')

    expect(result.offerings).toEqual([])
    expect(result.source.status).toBe('delayed')
    expect(result.source.coverage).toContain('직접 원천이 아닌')
  })
})
