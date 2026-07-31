import { NextRequest, NextResponse } from 'next/server'
import {
  verifyRequestSignature,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from '@/lib/security'

/**
 * Next.js Middleware — API 게이트웨이
 *
 * /api/* 경로에 대해 다중 레이어 보안 검증을 수행합니다.
 *
 * Layer 1: Sec-Fetch-Site 검증 (브라우저 주소창 직접 입력 차단)
 * Layer 2: HMAC-SHA256 요청 서명 검증 (외부 스크립트/크롤러 차단)
 *
 * 검증 실패 시 JSON 리턴 값을 노출하지 않고 빈 403 응답을 반환합니다.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api 경로만 보호
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // ─── Layer 1: Sec-Fetch-Site 검증 ───
  // 브라우저 주소창 직접 입력(none) 또는 외부 사이트(cross-site) 차단
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'none' || fetchSite === 'cross-site') {
    return new NextResponse(null, { status: 403, statusText: 'Forbidden' })
  }

  // ─── Layer 2: HMAC 요청 서명 검증 ───
  const signature = request.headers.get(SIGNATURE_HEADER)
  const timestamp = request.headers.get(TIMESTAMP_HEADER)

  const result = await verifyRequestSignature(pathname, signature, timestamp)

  if (!result.valid) {
    // 서명 검증 실패: 빈 응답으로 데이터 노출 차단
    return new NextResponse(null, { status: 403, statusText: 'Forbidden' })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
