import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { Suspense } from 'react'
import { getQueryClient } from '@shared/providers/getQueryClient'
import { MddContents } from '@widgets/mdd-dashboard'
import {
  MddSkeleton,
  mddQueryOptions,
  MddQueryInputSchema,
} from '@features/mdd-analysis'

interface MddPageProps {
  searchParams: Promise<{
    symbol?: string
    from?: string
    to?: string
    interval?: string
  }>
}

export default async function MddPage({ searchParams }: MddPageProps) {
  const queryClient = getQueryClient()
  const resolved = await searchParams
  const parsed = MddQueryInputSchema.safeParse(resolved)
  const query = parsed.success ? parsed.data : MddQueryInputSchema.parse({})

  await queryClient.prefetchQuery(mddQueryOptions(query))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<MddSkeleton />}>
        <MddContents />
      </Suspense>
    </HydrationBoundary>
  )
}
