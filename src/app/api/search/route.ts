import { NextRequest, NextResponse } from 'next/server'
import { SearchQuerySchema } from '@/server/services/requestSchema'
import { searchInstruments } from '@/server/services/marketData'

export async function GET(request: NextRequest) {
  const parsed = SearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get('q') ?? '',
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
  }

  try {
    const rows = await searchInstruments(parsed.data.q)
    return NextResponse.json({ rows }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
