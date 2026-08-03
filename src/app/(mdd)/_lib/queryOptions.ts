import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchMddRaw } from '@/app/(mdd)/_lib/client'
import { browserApiClient } from '@/lib/http/axios'
import type { KrStockIntegrationData } from '@/lib/types'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'

export function mddQueryOptions(params: MddQueryInput) {
  return queryOptions({
    queryKey: ['mdd', params.symbol, params.from, params.to, params.interval],
    queryFn: () => fetchMddRaw(params),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  })
}

export function krStockQueryOptions(stockCode: string) {
  return queryOptions({
    queryKey: ['kr-stock-integration', stockCode],
    queryFn: async () => {
      const res = await browserApiClient.get<KrStockIntegrationData>(`/api/kr-stock?code=${stockCode}`)
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}
