import { NextRequest, NextResponse } from 'next/server'
import { FxQuerySchema } from '@/server/services/requestSchema'
import { getFx } from '@/server/services/marketData'

export async function GET(request: NextRequest) {
  const parsed = FxQuerySchema.safeParse({
    pair: request.nextUrl.searchParams.get('pair') ?? undefined,
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
    interval: request.nextUrl.searchParams.get('interval') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
  }

  try {
    const result = await getFx(parsed.data)
    return NextResponse.json({
      meta: {
        ...parsed.data,
        data_source: result.source,
      },
      rows: result.rows,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
