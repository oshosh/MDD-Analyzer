import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchMddRaw } from '@/app/(mdd)/_lib/client'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'

export function mddQueryOptions(params: MddQueryInput, baseUrl?: string) {
  return queryOptions({
    queryKey: ['mdd', params.symbol, params.from, params.to, params.interval],
    queryFn: () => fetchMddRaw(params, baseUrl),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  })
}
