export class HttpApiError extends Error {
  status: number
  url?: string
  payload?: unknown

  constructor(
    message: string,
    status: number,
    options?: { url?: string; payload?: unknown }
  ) {
    super(message)
    this.name = 'HttpApiError'
    this.status = status
    this.url = options?.url
    this.payload = options?.payload
  }
}

export function isHttpApiError(error: unknown): error is HttpApiError {
  return error instanceof HttpApiError
}

export function toErrorMessage(
  error: unknown,
  fallback = '요청 처리에 실패했습니다.'
): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
