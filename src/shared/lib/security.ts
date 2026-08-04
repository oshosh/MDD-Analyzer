/**
 * API 요청 서명 — 공용 유틸리티 (클라이언트 + Edge Runtime 호환)
 *
 * Web Crypto API만 사용하여 HMAC-SHA256 서명을 생성/검증합니다.
 * node:crypto를 참조하지 않으므로 클라이언트 번들 및 Edge Runtime에서 안전합니다.
 */

// 서버/클라이언트 공용 상수
export const SIGNATURE_HEADER = 'x-mdd-signature'
export const TIMESTAMP_HEADER = 'x-mdd-timestamp'
export const SIGNATURE_MAX_AGE_MS = 30_000 // 30초

/**
 * 빌드 타임에 결정되는 내부 서명 키.
 * NEXT_PUBLIC_ 접두어가 붙어야 클라이언트 번들에도 포함됩니다.
 */
function getSigningKey(): string {
  return process.env.NEXT_PUBLIC_MDD_SIGNING_KEY || 'mdd-default-signing-key-change-me'
}

/**
 * Web Crypto API 기반 HMAC-SHA256 서명 생성
 * 브라우저, Edge Runtime, Node.js 18+ 모두에서 동작합니다.
 */
async function hmac(message: string, key: string): Promise<string> {
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
  const signature = await hmac(message, key)
  return { signature, timestamp }
}

/**
 * 서버/Edge에서 호출: 수신한 요청의 서명을 검증합니다.
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
  const expected = await hmac(message, key)

  if (expected !== signature) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true }
}
