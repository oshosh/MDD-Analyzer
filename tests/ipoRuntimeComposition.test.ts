import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dartOffering, unavailableSource } from './fixtures/ipoFixtures'

const runtimeAdapters = vi.hoisted(() => ({
  getOfferingsForDate: vi.fn(),
  getCompetitionForDate: vi.fn(),
}))

vi.mock('@/server/services/ipo/openDartIpoAdapter', () => ({
  OpenDartIpoAdapter: class {
    getOfferingsForDate = runtimeAdapters.getOfferingsForDate
  },
}))

vi.mock('@/server/services/ipo/compositeScrapingAdapter', () => ({
  CompositeScrapingAdapter: class {
    getCompetitionForDate = runtimeAdapters.getCompetitionForDate
  },
}))

import { getIpoSubscriptionCalendar } from '@/server/services/ipoSubscriptionService'

describe('production IPO composition', () => {
  beforeEach(() => {
    runtimeAdapters.getOfferingsForDate.mockReset()
    runtimeAdapters.getCompetitionForDate.mockReset()
    runtimeAdapters.getOfferingsForDate.mockResolvedValue([dartOffering])
    runtimeAdapters.getCompetitionForDate.mockResolvedValue({
      source: unavailableSource,
      offerings: [],
    })
  })

  it('uses the authorized direct bridge path and leaves unavailable competition unknown', async () => {
    const result = await getIpoSubscriptionCalendar('2026-09-16')

    expect(runtimeAdapters.getOfferingsForDate).toHaveBeenCalledWith('2026-09-16')
    expect(runtimeAdapters.getCompetitionForDate).toHaveBeenCalledWith('2026-09-16')
    expect(result.dataMode).toBe('dart-only')
    expect(result.offerings[0]?.brokers[0]?.currentProportionalRatio).toBeNull()
    expect(result.offerings[0]?.brokers[0]?.competitionSource.status).toBe(
      'unavailable'
    )
  })
})
