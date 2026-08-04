import { queryOptions } from '@tanstack/react-query'
import { browserApiClient } from '@shared/lib/http/axios'
import type { KrStockIntegrationData } from '@entities/kr-stock'

export function krStockQueryOptions(stockCode: string) {
  return queryOptions({
    queryKey: ['kr-stock-integration', stockCode],
    queryFn: async () => {
      const res = await browserApiClient.get<KrStockIntegrationData>(
        `/api/kr-stock?code=${stockCode}`
      )
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}
