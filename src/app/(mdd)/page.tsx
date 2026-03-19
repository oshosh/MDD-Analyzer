import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { getQueryClient } from '@/components/provider/react-query-provider/getQueryClient'
import MddContents from '@/app/(mdd)/_components/MddContents'
import MddSkeleton from '@/app/(mdd)/_components/MddSkeleton'
import { mddQueryOptions } from '@/app/(mdd)/_lib/queryOptions'
import { MddQueryInputSchema } from '@/app/(mdd)/_lib/schemas'

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

  const headerStore = await headers()
  const host = headerStore.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  await queryClient.prefetchQuery(mddQueryOptions(query, baseUrl))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<MddSkeleton />}>
        <MddContents />
      </Suspense>
    </HydrationBoundary>
  )
}
