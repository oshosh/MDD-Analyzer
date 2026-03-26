'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { useRef } from 'react'

import { useTanstackTable } from './useTanstackTable'
import { useTanstackVirtualizer } from './useTanstackVirtualizer'

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
  const { table, rows, visibleColumnCount, totalWidth } = useTanstackTable({
    data,
    columns,
  })

  const {
    scrollElementRef,
    virtualRows,
    paddingTop,
    paddingBottom,
    rowVirtualizer,
  } = useTanstackVirtualizer({ rows, rowHeight, virtualized })

  return {
    table,
    rows,
    visibleColumnCount,
    totalWidth,
    scrollElementRef,
    virtualRows,
    paddingTop,
    paddingBottom,
    rowVirtualizer,
  }
}
