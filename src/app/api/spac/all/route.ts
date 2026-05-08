import { NextRequest, NextResponse } from 'next/server'
import { aggregateSpacData } from '@/server/services/spacService'

export async function GET(request: NextRequest) {
  const apiKey = process.env.DART_API_KEY
  const estimationBasis = (request.nextUrl.searchParams.get('basis') as 'conservative' | 'aggressive') || 'conservative'

  if (!apiKey) {
    return NextResponse.json({ error: 'DART_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.' }, { status: 500 })
  }

  try {
    const data = await aggregateSpacData(estimationBasis)

    return NextResponse.json({
      items: data,
      sync_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('SPAC All API Error:', error)
    const message = error instanceof Error ? error.message : '데이터 수집 중 오류 발생'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
