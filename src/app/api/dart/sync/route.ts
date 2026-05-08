import { NextRequest, NextResponse } from 'next/server'
import { getAllSpacsFromDart } from '@/server/services/dartMapper'

/**
 * DART API를 통해 현재 상장된 모든 스팩(SPAC) 종목을 검색하고
 * 기본 정보를 동기화하는 엔드포인트
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.DART_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'DART_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.' 
    }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  try {
    const allSpacs = await getAllSpacsFromDart()
    const spacs = allSpacs
      .filter((item) => !query || item.name.includes(query) || item.symbol?.includes(query))
      .map((item) => ({
        symbol: item.symbol,
        name: item.name,
        corp_code: item.corpCode,
      }))

    // 3. 각 스팩의 상세 정보(상장일 등)는 주가 API와 결합하여 처리하도록 반환
    return NextResponse.json({
      count: spacs.length,
      last_sync: new Date().toISOString(),
      items: spacs
    })

  } catch (error) {
    console.error('DART Sync Error:', error)
    return NextResponse.json({ error: 'DART 데이터 동기화 실패' }, { status: 502 })
  }
}
