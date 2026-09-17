import {
  IpoCompetitionFeedResponseSchema,
  type IpoCompetitionFeedResponse,
} from '@entities/ipo'
import { createUnavailableCompetitionSource } from './source'

const REQUEST_TIMEOUT_MS = 8_000

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>
const DIRECT_BRIDGE_NAME = '증권사 공식 직접 원천 브리지'

export interface IpoCompetitionFeedAdapter {
  getCompetitionForDate(date: string): Promise<IpoCompetitionFeedResponse>
}

export interface BrokerDirectIpoCompetitionAdapterOptions {
  endpoint?: string
  bridgeToken?: string
  fetcher?: Fetcher
  now?: () => Date
}

/**
 * The bridge is a private process that calls only broker-authorized SDKs or
 * partner APIs. It owns broker credentials and returns the normalized contract
 * below; the browser never sees a broker session, SDK, or raw response.
 */
export class BrokerDirectIpoCompetitionAdapter
  implements IpoCompetitionFeedAdapter
{
  private readonly endpoint: string | null
  private readonly bridgeToken: string | null
  private readonly fetcher: Fetcher
  private readonly now: () => Date

  constructor(options: BrokerDirectIpoCompetitionAdapterOptions = {}) {
    const endpoint =
      options.endpoint ?? process.env.IPO_BROKER_DIRECT_BRIDGE_URL ?? null
    this.endpoint = endpoint?.trim() || null
    const bridgeToken =
      options.bridgeToken ?? process.env.IPO_BROKER_DIRECT_BRIDGE_TOKEN ?? null
    this.bridgeToken = bridgeToken?.trim() || null
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
  }

  async getCompetitionForDate(date: string): Promise<IpoCompetitionFeedResponse> {
    const fetchedAt = this.now().toISOString()
    if (this.endpoint === null) {
      return {
        source: {
          ...createUnavailableCompetitionSource(fetchedAt),
          name: `${DIRECT_BRIDGE_NAME} 미연결`,
        },
        offerings: [],
      }
    }

    let url: URL
    try {
      url = new URL(this.endpoint)
      url.searchParams.set('date', date)
    } catch {
      return {
        source: {
          ...createUnavailableCompetitionSource(
            fetchedAt,
            '증권사 직접 원천 브리지 URL 형식이 올바르지 않습니다.'
          ),
          name: `${DIRECT_BRIDGE_NAME} 설정 오류`,
          status: 'unavailable',
        },
        offerings: [],
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const headers = new Headers({ accept: 'application/json' })
      if (this.bridgeToken !== null) {
        headers.set('authorization', `Bearer ${this.bridgeToken}`)
      }

      const response = await this.fetcher(url.toString(), {
        headers,
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) {
        return this.delayedResponse(
          fetchedAt,
          '증권사 직접 원천 브리지가 응답하지 않습니다.'
        )
      }

      const payload: unknown = await response.json().catch(() => null)
      const parsed = IpoCompetitionFeedResponseSchema.safeParse(payload)
      if (!parsed.success) {
        return this.delayedResponse(
          fetchedAt,
          '증권사 직접 원천 브리지 응답 형식이 정규화 계약과 일치하지 않습니다.'
        )
      }

      if (!isBrokerDirectResponse(parsed.data)) {
        return this.delayedResponse(
          fetchedAt,
          '증권사 공식 직접 원천이 아닌 응답은 경쟁률 데이터로 사용하지 않습니다.'
        )
      }

      return parsed.data
    } catch {
      return this.delayedResponse(
        fetchedAt,
        '증권사 직접 원천 브리지 연결이 지연되었습니다.'
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  private delayedResponse(
    fetchedAt: string,
    coverage: string
  ): IpoCompetitionFeedResponse {
    return {
      source: {
        ...createUnavailableCompetitionSource(fetchedAt, coverage),
        name: `${DIRECT_BRIDGE_NAME} 지연`,
        status: 'delayed',
      },
      offerings: [],
    }
  }
}

function isBrokerDirectResponse(response: IpoCompetitionFeedResponse): boolean {
  return (
    response.source.dataKind === 'broker-direct' &&
    response.offerings.every((offering) =>
      offering.brokers.every(
        (broker) => broker.source.dataKind === 'broker-direct'
      )
    )
  )
}
