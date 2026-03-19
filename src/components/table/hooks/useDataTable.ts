'use client'

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'

interface UseDataTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  rowHeight: number
  virtualized: boolean
}

export function useDataTable<TData extends object>({
  data,
  columns,
  rowHeight,
  virtualized,
}: UseDataTableProps<TData>) {
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const totalWidth = table.getTotalSize()

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
    table,
    rows,
    visibleColumnCount,
    totalWidth,
    scrollElementRef,
    virtualRows,
    paddingTop,
    paddingBottom,
  }
}
