import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { HttpApiError } from '@shared/lib/http/error'

export interface AxiosMiddleware {
  onRequest?: (
    config: InternalAxiosRequestConfig
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
  onResponse?: <T>(
    response: AxiosResponse<T>
  ) => AxiosResponse<T> | Promise<AxiosResponse<T>>
  onError?: (error: unknown) => unknown | Promise<unknown>
}

interface ApiClientOptions {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  middlewares?: AxiosMiddleware[]
}

function parseAxiosError(error: AxiosError): HttpApiError {
  const status = error.response?.status ?? 500
  const url = error.config?.url
  const payload = error.response?.data

  const payloadMessage =
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : undefined

  const message = payloadMessage ?? error.message ?? `HTTP ${status}`
  return new HttpApiError(message, status, { url, payload })
}

function buildInstance(options?: ApiClientOptions): AxiosInstance {
  return axios.create({
    baseURL: options?.baseURL,
    timeout: options?.timeout ?? 20_000,
    headers: {
      accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  })
}

function applyMiddlewares(
  instance: AxiosInstance,
  middlewares: AxiosMiddleware[]
): AxiosInstance {
  instance.interceptors.request.use(async (config) => {
    let next = config
    for (const middleware of middlewares) {
      if (middleware.onRequest) {
        next = await middleware.onRequest(next)
      }
    }
    return next
  })

  instance.interceptors.response.use(
    async (response) => {
      let next = response
      for (const middleware of middlewares) {
        if (middleware.onResponse) {
          next = await middleware.onResponse(next)
        }
      }
      return next
    },
    async (error: unknown) => {
      let nextError: unknown = error
      for (const middleware of middlewares) {
        if (middleware.onError) {
          nextError = await middleware.onError(nextError)
        }
      }
      throw nextError
    }
  )

  return instance
}

export function createAxiosClient(options?: ApiClientOptions): AxiosInstance {
  const normalizeErrorMiddleware: AxiosMiddleware = {
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        return parseAxiosError(error)
      }
      return error
    },
  }

  const middlewares = [
    normalizeErrorMiddleware,
    ...(options?.middlewares ?? []),
  ]
  return applyMiddlewares(buildInstance(options), middlewares)
}

export const browserApiClient = createAxiosClient({
  middlewares: [
    {
      onRequest: async (config) => {
        // SSR 환경에서는 서명을 첨부하지 않음 (브라우저 전용)
        if (typeof window === 'undefined') return config

        // 자사 API 호출 시에만 HMAC 서명 첨부
        const url = config.url || ''
        if (url.startsWith('/api')) {
          const { createRequestSignature, SIGNATURE_HEADER, TIMESTAMP_HEADER } =
            await import('@shared/lib/security')
          // URL에서 pathname만 추출 (쿼리스트링 제거)
          const pathname = url.split('?')[0]
          const { signature, timestamp } = await createRequestSignature(pathname)
          config.headers.set(SIGNATURE_HEADER, signature)
          config.headers.set(TIMESTAMP_HEADER, timestamp)
        }
        return config
      },
    },
  ],
})

export function createServerApiClient(baseURL?: string): AxiosInstance {
  return createAxiosClient({ baseURL })
}

