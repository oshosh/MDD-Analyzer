import { NextRequest, NextResponse } from 'next/server'
import { createServerApiClient } from '@/lib/http/axios'
import { KrStockQuerySchema } from '@/server/services/requestSchema'

export const dynamic = 'force-dynamic'

interface NaverBasicResponse {
  stockName?: string
  closePrice?: string
  compareToPreviousClosePrice?: string
  fluctuationsRatio?: string
  compareToPreviousPrice?: {
    name?: string
  }
}

const serverClient = createServerApiClient('https://m.stock.naver.com')

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

  const code = parsed.data.code

  try {
    const response = await serverClient.get<NaverBasicResponse>(`/api/stock/${code}/basic`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    })

    const raw = response.data
    const priceDirection = String(raw.compareToPreviousPrice?.name || '')

    return NextResponse.json({
      stockCode: code,
      stockName: String(raw.stockName || code),
      closePrice: String(raw.closePrice || '0'),
      compareToPreviousPriceText: String(raw.compareToPreviousClosePrice || '0'),
      fluctuationsRatio: String(raw.fluctuationsRatio || '0'),
      isRising: priceDirection === 'RISING',
      isFalling: priceDirection === 'FALLING',
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price'
    return NextResponse.json({ error: 'Bad Gateway', details: message }, { status: 502 })
  }
}

