import { NextRequest, NextResponse } from 'next/server'
import {
  getIpoSubscriptionCalendar,
  IpoConfigurationError,
  IpoDataSourceError,
} from '@/server/services/ipoSubscriptionService'
import { IpoSubscriptionQuerySchema } from '@/server/services/requestSchema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = IpoSubscriptionQuerySchema.safeParse({
    date: request.nextUrl.searchParams.get('date') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid IPO subscription request',
        code: 'IPO_INVALID_QUERY',
        details: parsed.error.format(),
      },
      { status: 400 }
    )
  }

  try {
    const snapshot = await getIpoSubscriptionCalendar(parsed.data.date)
    return NextResponse.json(snapshot, { status: 200 })
  } catch (error) {
    if (error instanceof IpoConfigurationError) {
      return NextResponse.json(
        {
          error: 'IPO data source is not configured',
          code: 'IPO_SOURCE_CONFIGURATION_ERROR',
        },
        { status: 500 }
      )
    }

    if (error instanceof IpoDataSourceError) {
      return NextResponse.json(
        {
          error: 'IPO data source is unavailable',
          code: 'IPO_SOURCE_UNAVAILABLE',
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'IPO_INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
