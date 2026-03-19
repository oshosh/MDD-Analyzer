import type { RawApiResponse } from '@/lib/types'
import { browserApiClient, createServerApiClient } from '@/lib/http/axios'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'

export async function fetchMddRaw(
  params: MddQueryInput,
  baseUrl?: string
): Promise<RawApiResponse> {
  const query = {
    symbol: params.symbol,
    from: params.from,
    to: params.to,
    interval: params.interval,
    fx: 'USDKRW',
  }
  const api = baseUrl ? createServerApiClient(baseUrl) : browserApiClient
  const response = await api.get<RawApiResponse>('/api/raw', { params: query })
  return response.data
}
