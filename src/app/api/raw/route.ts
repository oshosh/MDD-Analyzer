import { NextRequest, NextResponse } from 'next/server'
import { RawQuerySchema } from '@/server/services/requestSchema'
import { buildRawResponse } from '@/server/services/rawBuilder'
import type { RawApiResponse } from '@/lib/types'

interface RawCacheEntry {
  value: RawApiResponse
  expires_at: number
}

const rawCache = new Map<string, RawCacheEntry>()
const RAW_CACHE_TTL_MS = 2 * 60_000

function toCacheKey(params: {
  asset: string
  symbol: string
  from: string
  to: string
  interval: string
  fx: string
}): string {
  return [
    params.asset.toUpperCase(),
    params.symbol.toUpperCase(),
    params.from,
    params.to,
    params.interval,
    params.fx,
  ].join(':')
}

function readRawCache(key: string): RawApiResponse | null {
  const hit = rawCache.get(key)
  if (!hit) {
    return null
  }
  if (hit.expires_at < Date.now()) {
    rawCache.delete(key)
    return null
  }
  return hit.value
}

function writeRawCache(key: string, value: RawApiResponse): void {
  rawCache.set(key, {
    value,
    expires_at: Date.now() + RAW_CACHE_TTL_MS,
  })
  if (rawCache.size > 200) {
    for (const [cacheKey, entry] of rawCache.entries()) {
      if (entry.expires_at < Date.now()) {
        rawCache.delete(cacheKey)
      }
    }
    while (rawCache.size > 120) {
      const first = rawCache.keys().next().value
      if (!first) {
        break
      }
      rawCache.delete(first)
    }
  }
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
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
  }

  try {
    const cacheKey = toCacheKey(parsed.data)
    const cached = readRawCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { status: 200 })
    }

    const response = await buildRawResponse(parsed.data)
    writeRawCache(cacheKey, response)
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
