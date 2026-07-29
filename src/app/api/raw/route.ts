import { NextRequest, NextResponse } from 'next/server'
import { RawQuerySchema } from '@/server/services/requestSchema'
import { buildRawResponse } from '@/server/services/rawBuilder'
import { readJsonCache, writeJsonCache } from '@/server/services/serverCache'
import type { RawApiResponse } from '@/lib/types'

function toCacheKey(params: {
  asset: string
  symbol: string
  from: string
  to: string
  interval: string
  fx: string
}): string {
  return [
    'raw_api_v1',
    params.asset.toUpperCase(),
    params.symbol.toUpperCase(),
    params.from,
    params.to,
    params.interval,
    params.fx,
  ].join(':')
}

export async function GET(request: NextRequest) {
  const parsed = RawQuerySchema.safeParse({
    asset: request.nextUrl.searchParams.get('asset') ?? undefined,
    symbol: request.nextUrl.searchParams.get('symbol'),
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
    interval: request.nextUrl.searchParams.get('interval') ?? undefined,
    fx: request.nextUrl.searchParams.get('fx') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Request', details: parsed.error.format() },
      { status: 400 }
    )
  }

  try {
    const cacheKey = toCacheKey(parsed.data)
    const cached = await readJsonCache<RawApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { status: 200 })
    }

    const response = await buildRawResponse(parsed.data)
    await writeJsonCache(cacheKey, response, 120) // 2분 캐싱
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Not Found') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
