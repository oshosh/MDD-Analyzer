import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { calendarResponse } from './fixtures/ipoFixtures'

const serviceMock = vi.hoisted(() => {
  class ConfigurationError extends Error {}
  class DataSourceError extends Error {}

  return {
    getCalendar: vi.fn(),
    ConfigurationError,
    DataSourceError,
  }
})

vi.mock('@/server/services/ipoSubscriptionService', () => ({
  getIpoSubscriptionCalendar: serviceMock.getCalendar,
  IpoConfigurationError: serviceMock.ConfigurationError,
  IpoDataSourceError: serviceMock.DataSourceError,
}))

import { GET } from '@/app/api/ipo/route'

describe('GET /api/ipo', () => {
  beforeEach(() => {
    serviceMock.getCalendar.mockReset()
    serviceMock.getCalendar.mockResolvedValue(calendarResponse)
  })

  it('returns a dynamic calendar response for an explicit KST date', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/ipo?date=2026-09-15')
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(serviceMock.getCalendar).toHaveBeenCalledWith('2026-09-15')
    expect(body).toMatchObject({
      requestedDate: '2026-09-15',
      offerings: [{ id: 'dart-01722066-20260903000077' }],
    })
  })

  it('returns 400 for a missing or invalid calendar date', async () => {
    const missingResponse = await GET(new NextRequest('http://localhost/api/ipo'))
    const invalidResponse = await GET(
      new NextRequest('http://localhost/api/ipo?date=2026-02-30')
    )

    expect(missingResponse.status).toBe(400)
    expect(invalidResponse.status).toBe(400)
  })

  it('distinguishes upstream failures from missing server configuration', async () => {
    serviceMock.getCalendar.mockRejectedValueOnce(
      new serviceMock.DataSourceError('upstream')
    )
    const upstreamResponse = await GET(
      new NextRequest('http://localhost/api/ipo?date=2026-09-15')
    )

    serviceMock.getCalendar.mockRejectedValueOnce(
      new serviceMock.ConfigurationError('missing key')
    )
    const configurationResponse = await GET(
      new NextRequest('http://localhost/api/ipo?date=2026-09-15')
    )

    expect(upstreamResponse.status).toBe(502)
    expect(configurationResponse.status).toBe(500)
  })
})
