'use client'

export interface ColumnMeta {
  className?: string
  headerClassName?: string
}

export const ALIGN_CLASSES: Record<string, string> = {
  number: 'text-right tabular-nums',
  center: 'text-center',
  left: 'text-left',
}
