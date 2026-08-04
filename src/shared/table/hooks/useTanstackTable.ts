// src/components/table/hooks/useTanstackTable.ts
'use client'

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'

interface UseTanstackTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
}

export function useTanstackTable<TData extends object>({
  data,
  columns,
}: UseTanstackTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const totalWidth = table.getTotalSize()

  return {
    table,
    rows,
    visibleColumnCount,
    totalWidth,
  }
}
