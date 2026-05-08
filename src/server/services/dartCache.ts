import { MergerStage } from '@/app/spac/_lib/types'
import fs from 'fs'
import os from 'os'
import path from 'path'

const memoryCache: { current: SpacDartCache } = { current: {} }

const CACHE_DIR =
  process.env.DART_CACHE_DIR ??
  (process.env.VERCEL ? path.join(os.tmpdir(), 'mdd-cache') : path.join(process.cwd(), '.cache'))
const DART_CACHE_FILE = path.join(CACHE_DIR, 'dart_spac_cache.json')

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

export interface SpacDartCacheItem {
  cacheVersion?: number
  issuer: string
  securitiesCompany: string
  issueSize: number
  basePrice: number
  promoter: string
  promotersAll: string[]
  promotersRep: string[]
  capitalIncreaseDate?: string
  listingDate?: string
  interestRates: { year1: number; year2: number; year3: number }
  mergerStage: MergerStage
  mergerSuccess: '성공' | '실패' | '진행중'
  candidateCompany: string
  managementDate?: string
  delistingDate?: string
  actualDelistingDate?: string
  updatedAt: string
}

export interface SpacDartCache {
  [symbol: string]: SpacDartCacheItem
}

export function readDartCache(): SpacDartCache {
  if (!ensureCacheDir()) return memoryCache.current
  if (!fs.existsSync(DART_CACHE_FILE)) return memoryCache.current
  try {
    memoryCache.current = JSON.parse(fs.readFileSync(DART_CACHE_FILE, 'utf8'))
    return memoryCache.current
  } catch {
    return memoryCache.current
  }
}

export function writeDartCache(cache: SpacDartCache) {
  memoryCache.current = cache
  if (!ensureCacheDir()) return

  try {
    const tempFile = `${DART_CACHE_FILE}.${process.pid}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(cache, null, 2))
    fs.renameSync(tempFile, DART_CACHE_FILE)
  } catch {
    // Vercel/serverless storage can be read-only or ephemeral. Memory cache still serves warm invocations.
  }
}
