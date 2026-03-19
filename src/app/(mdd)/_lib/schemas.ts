import { z } from 'zod'
import { INTERVALS } from '@/lib/types'
import { DEFAULT_FROM, todayIso } from '@/lib/date'

export const MddQueryInputSchema = z.object({
  symbol: z.string().default('SPY'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default(DEFAULT_FROM),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default(todayIso()),
  interval: z.enum(INTERVALS).default('1d'),
})

export type MddQueryInput = z.infer<typeof MddQueryInputSchema>
