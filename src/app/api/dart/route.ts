import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { getCorpCodeBySymbol } from '@/server/services/dartMapper'

export async function GET(request: NextRequest) {
  let corp_code = request.nextUrl.searchParams.get('corp_code')
  const symbol = request.nextUrl.searchParams.get('symbol') // 종목코드
  const bgn_de =
    request.nextUrl.searchParams.get('bgn_de') ||
    request.nextUrl.searchParams.get('bgn_date') ||
    '20200101'
  
  const apiKey = process.env.DART_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'DART_API_KEY is not configured' }, { status: 500 })
  }

  // If corp_code is not provided but symbol is, we might need to find corp_code first.
  // Open DART uses corp_code (8 digits) for most requests.
  
  try {
    if (!corp_code && symbol) {
      corp_code = await getCorpCodeBySymbol(symbol)
    }

    if (!corp_code) {
      return NextResponse.json({ error: 'corp_code를 찾을 수 없습니다.' }, { status: 404 })
    }

    const response = await axios.get('https://opendart.fss.or.kr/api/list.json', {
      params: {
        crtfc_key: apiKey,
        corp_code,
        bgn_de,
        end_de: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        page_count: 100,
      }
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('DART API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch from DART' }, { status: 502 })
  }
}
