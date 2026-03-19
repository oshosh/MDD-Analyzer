import { NextRequest, NextResponse } from 'next/server'
import { getListingInfo } from '@/server/services/marketData'
import { ListingQuerySchema } from '@/server/services/requestSchema'

export async function GET(request: NextRequest) {
  const parsed = ListingQuerySchema.safeParse({
    symbol: request.nextUrl.searchParams.get('symbol'),
    asset: request.nextUrl.searchParams.get('asset') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
  }

  try {
    const listing = await getListingInfo(parsed.data)
    return NextResponse.json(listing, { status: 200 })
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
