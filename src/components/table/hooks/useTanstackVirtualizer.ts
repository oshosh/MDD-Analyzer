// src/components/table/hooks/useTanstackVirtualizer.ts
'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Row } from '@tanstack/react-table'

interface UseTanstackVirtualizerProps<TData extends object> {
  rows: Row<TData>[]
  rowHeight: number
  virtualized: boolean
}

export function useTanstackVirtualizer<TData extends object>({
  rows,
  rowHeight,
  virtualized,
}: UseTanstackVirtualizerProps<TData>) {
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    enabled: virtualized,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0
      ? Math.max(
          0,
          rowVirtualizer.getTotalSize() -
            virtualRows[virtualRows.length - 1].end
        )
      : 0

  return {
    scrollElementRef,
    virtualRows,
    paddingTop,
    paddingBottom,
    rowVirtualizer,
  }
}
