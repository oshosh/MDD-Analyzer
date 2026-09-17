import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchIpoSubscription } from '../api/client'

export function ipoSubscriptionQueryOptions(date: string) {
  return queryOptions({
    queryKey: ['ipo-subscription-calendar', date],
    queryFn: () => fetchIpoSubscription(date),
    staleTime: 25_000,
    refetchInterval: 30_000,
    retry: 1,
  })
}

export function useIpoSubscriptionQuery(date: string) {
  return useQuery(ipoSubscriptionQueryOptions(date))
}
