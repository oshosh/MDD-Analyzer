import { NextRequest, NextResponse } from 'next/server'
import { getPrices } from '@/server/services/marketData'
import { PricesQuerySchema } from '@/server/services/requestSchema'

export async function GET(request: NextRequest) {
  const parsed = PricesQuerySchema.safeParse({
    asset: request.nextUrl.searchParams.get('asset') ?? undefined,
    symbol: request.nextUrl.searchParams.get('symbol'),
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
    interval: request.nextUrl.searchParams.get('interval') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
  }

  try {
    const result = await getPrices(parsed.data)
    return NextResponse.json({
      meta: {
        ...parsed.data,
        data_source: result.source,
      },
      rows: result.rows,
    })
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
