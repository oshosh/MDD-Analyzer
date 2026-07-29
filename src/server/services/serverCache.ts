import fs from 'fs'
import os from 'os'
import path from 'path'

interface CacheEnvelope<T> {
  expiresAt: number
  value: T
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>()

const CACHE_DIR =
  process.env.SERVER_CACHE_DIR ??
  (process.env.VERCEL ? path.join(os.tmpdir(), 'mdd-cache') : path.join(process.cwd(), '.cache'))

function ensureCacheDir(): boolean {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
    return true
  } catch {
    return false
  }
}

function filePathForKey(key: string): string {
  const safeKey = Buffer.from(key).toString('base64url')
  return path.join(CACHE_DIR, `${safeKey}.json`)
}

/**
 * .cache 폴더 내 만료되었거나 찌꺼기(.tmp) 파일들을 자동으로 청소(Garbage Collection)합니다.
 */
function cleanExpiredFiles(): void {
  if (!ensureCacheDir()) return

  try {
    const files = fs.readdirSync(CACHE_DIR)
    const now = Date.now()

    for (const file of files) {
      const fullPath = path.join(CACHE_DIR, file)
      
      // 찌꺼기 .tmp 파일은 10초 이상 지나면 삭제
      if (file.endsWith('.tmp')) {
        try {
          const stat = fs.statSync(fullPath)
          if (now - stat.mtimeMs > 10000) {
            fs.unlinkSync(fullPath)
          }
        } catch { /* ignore */ }
        continue
      }

      // .json 캐시 파일 만료 검사
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const envelope = JSON.parse(content) as CacheEnvelope<unknown>
          if (envelope && typeof envelope.expiresAt === 'number' && envelope.expiresAt <= now) {
            fs.unlinkSync(fullPath)
          }
        } catch {
          // 파싱 에러 난 손상 파일 삭제
          try { fs.unlinkSync(fullPath) } catch { /* ignore */ }
        }
      }
    }
  } catch {
    // ignore
  }
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

async function readUpstash<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const config = upstashConfig()
  if (!config) return null

  try {
    const response = await fetch(`${config.url}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${config.token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = (await response.json()) as { result?: string | null }
    if (!payload.result) return null
    return JSON.parse(payload.result) as CacheEnvelope<T>
  } catch {
    return null
  }
}

async function writeUpstash<T>(key: string, envelope: CacheEnvelope<T>, ttlSeconds: number): Promise<void> {
  const config = upstashConfig()
  if (!config) return

  try {
    await fetch(`${config.url}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.token}` },
      body: JSON.stringify(envelope),
      cache: 'no-store',
    })
  } catch {
    // Local file and memory cache remain available if remote cache is unavailable.
  }
}

function readFileCache<T>(key: string): CacheEnvelope<T> | null {
  if (!ensureCacheDir()) return null

  try {
    return JSON.parse(fs.readFileSync(filePathForKey(key), 'utf8')) as CacheEnvelope<T>
  } catch {
    return null
  }
}

function writeFileCache<T>(key: string, envelope: CacheEnvelope<T>): void {
  if (!ensureCacheDir()) return

  try {
    // 파일 쓰기 직전 만료 파일 자동 청소
    cleanExpiredFiles()

    const target = filePathForKey(key)
    const temp = `${target}.${process.pid}.tmp`
    fs.writeFileSync(temp, JSON.stringify(envelope))
    fs.renameSync(temp, target)
  } catch {
    // Vercel /tmp can be ephemeral or unavailable during edge cases.
  }
}

function isFresh<T>(envelope: CacheEnvelope<T> | null): envelope is CacheEnvelope<T> {
  return Boolean(envelope && envelope.expiresAt > Date.now())
}

export async function readJsonCache<T>(key: string): Promise<T | null> {
  const memory = memoryCache.get(key) as CacheEnvelope<T> | undefined
  if (memory && isFresh(memory)) return memory.value

  const remote = await readUpstash<T>(key)
  if (isFresh(remote)) {
    memoryCache.set(key, remote)
    return remote.value
  }

  const local = readFileCache<T>(key)
  if (isFresh(local)) {
    memoryCache.set(key, local)
    return local.value
  }

  return null
}

export async function writeJsonCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const envelope: CacheEnvelope<T> = {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  }

  memoryCache.set(key, envelope)
  writeFileCache(key, envelope)
  await writeUpstash(key, envelope, ttlSeconds)
}
