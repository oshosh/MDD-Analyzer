import { NextRequest, NextResponse } from 'next/server'
import { fetchKrStockIntegration } from '@/server/services/krStockService'
import { KrStockQuerySchema } from '@/server/services/requestSchema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = KrStockQuerySchema.safeParse({
    code: request.nextUrl.searchParams.get('code') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Request', details: parsed.error.format() },
      { status: 400 }
    )
  }

  try {
    const data = await fetchKrStockIntegration(parsed.data.code)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('404')) {
      return NextResponse.json({ error: 'Not Found', details: message }, { status: 404 })
    }
    if (message.includes('HTTP error') || message.includes('fetch')) {
      return NextResponse.json({ error: 'Bad Gateway', details: message }, { status: 502 })
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    )
  }
}

