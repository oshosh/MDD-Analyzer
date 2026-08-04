import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchMddRaw } from '../api/client'
import type { MddQueryInput } from '../schemas/schemas'

export function mddQueryOptions(params: MddQueryInput) {
  return queryOptions({
    queryKey: ['mdd', params.symbol, params.from, params.to, params.interval],
    queryFn: () => fetchMddRaw(params),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  })
}
