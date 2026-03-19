'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { mddQueryOptions } from '@/app/(mdd)/_lib/queryOptions'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'

export function useMddQuery(params: MddQueryInput) {
  return useSuspenseQuery(mddQueryOptions(params))
}
