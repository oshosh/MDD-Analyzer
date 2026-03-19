import { z } from 'zod'
import { ASSET_TYPES, INTERVALS } from '@/lib/types'
import { DEFAULT_FROM, todayIso } from '@/lib/date'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const SearchQuerySchema = z.object({
  q: z.string().default(''),
})

export const ListingQuerySchema = z.object({
  symbol: z.string().min(1),
  asset: z.enum(ASSET_TYPES).optional(),
})

export const PricesQuerySchema = z.object({
  asset: z.enum(ASSET_TYPES).default('US_STOCK'),
  symbol: z.string().min(1),
  from: DateSchema.default(DEFAULT_FROM),
  to: DateSchema.default(todayIso()),
  interval: z.enum(INTERVALS).default('1d'),
})

export const FxQuerySchema = z.object({
  pair: z.literal('USDKRW').default('USDKRW'),
  from: DateSchema.default(DEFAULT_FROM),
  to: DateSchema.default(todayIso()),
  interval: z.enum(INTERVALS).default('1d'),
})

export const RawQuerySchema = z.object({
  asset: z.enum(ASSET_TYPES).default('US_STOCK'),
  symbol: z.string().min(1),
  from: DateSchema.default(DEFAULT_FROM),
  to: DateSchema.default(todayIso()),
  interval: z.enum(INTERVALS).default('1d'),
  fx: z.literal('USDKRW').default('USDKRW'),
})
