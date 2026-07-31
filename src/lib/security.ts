/**
 * API 요청 서명 유틸리티
 *
 * HMAC-SHA256 요청 서명을 통해 클라이언트만 API를 호출할 수 있도록 보호합니다.
 *
 * 동작 원리:
 * 1. 클라이언트(browserApiClient)가 매 요청에 타임스탬프 + 경로를 HMAC 서명하여 헤더에 첨부
 * 2. 서버(middleware.ts)가 같은 비밀키로 서명을 재생성하여 일치 여부 검증
 * 3. 서명 불일치 또는 30초 초과 요청은 403 차단 → JSON 리턴 값 자체를 노출하지 않음
 */

// 서버/클라이언트 공용 상수
export const SIGNATURE_HEADER = 'x-mdd-signature'
export const TIMESTAMP_HEADER = 'x-mdd-timestamp'
export const SIGNATURE_MAX_AGE_MS = 30_000 // 30초

/**
 * 빌드 타임에 결정되는 내부 서명 키.
 * NEXT_PUBLIC_ 접두어가 붙어야 클라이언트 번들에도 포함됩니다.
 * 실제 운영에서는 .env에 랜덤 키를 설정하세요.
 */
function getSigningKey(): string {
  return process.env.NEXT_PUBLIC_MDD_SIGNING_KEY || 'mdd-default-signing-key-change-me'
}

// ─── 브라우저용 (Web Crypto API) ───

async function hmacBrowser(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── 서버용 (Node.js crypto) ───

async function hmacServer(message: string, key: string): Promise<string> {
  // Dynamic import to avoid bundling Node crypto in client
  const { createHmac } = await import('node:crypto')
  return createHmac('sha256', key).update(message).digest('hex')
}

// ─── 공용 인터페이스 ───

/**
 * 클라이언트에서 호출: 요청 서명에 필요한 헤더 값을 생성합니다.
 */
export async function createRequestSignature(pathname: string): Promise<{
  signature: string
  timestamp: string
}> {
  const timestamp = String(Date.now())
  const message = `${timestamp}:${pathname}`
  const key = getSigningKey()

  const signature = typeof window !== 'undefined'
    ? await hmacBrowser(message, key)
    : await hmacServer(message, key)

  return { signature, timestamp }
}

/**
 * 서버에서 호출: 수신한 요청의 서명을 검증합니다.
 */
export async function verifyRequestSignature(
  pathname: string,
  signature: string | null,
  timestamp: string | null
): Promise<{ valid: boolean; reason?: string }> {
  if (!signature || !timestamp) {
    return { valid: false, reason: 'Missing signature headers' }
  }

  const ts = Number(timestamp)
  if (Number.isNaN(ts)) {
    return { valid: false, reason: 'Invalid timestamp' }
  }

  const age = Math.abs(Date.now() - ts)
  if (age > SIGNATURE_MAX_AGE_MS) {
    return { valid: false, reason: 'Request expired' }
  }

  const message = `${timestamp}:${pathname}`
  const key = getSigningKey()
  const expected = await hmacServer(message, key)

  if (expected !== signature) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true }
}
