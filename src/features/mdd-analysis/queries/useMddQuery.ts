'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { mddQueryOptions } from './queryOptions'
import type { MddQueryInput } from '../schemas/schemas'

export function useMddQuery(params: MddQueryInput) {
  return useSuspenseQuery(mddQueryOptions(params))
}
