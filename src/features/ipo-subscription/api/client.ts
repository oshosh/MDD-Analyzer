import type { IpoSubscriptionResponse } from '@entities/ipo'
import { browserApiClient } from '@shared/lib/http/axios'

export async function fetchIpoSubscription(
  date: string
): Promise<IpoSubscriptionResponse> {
  const response = await browserApiClient.get<IpoSubscriptionResponse>(
    '/api/ipo',
    {
      params: { date },
    }
  )

  return response.data
}
