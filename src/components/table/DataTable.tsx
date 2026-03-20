'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { useDataTable } from './hooks/useDataTable'
import { TableHeader } from './components/TableHeader'
import { TableBody } from './components/TableBody'

interface DataTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  emptyMessage?: string
  maxHeight?: number
  rowHeight?: number
  virtualized?: boolean
  getRowClassName?: (row: TData) => string
  stickyFirstColumn?: boolean
}

export default function DataTable<TData extends object>({
  data,
  columns,
  emptyMessage = '데이터가 존재 하지 않습니다.',
  maxHeight = 480,
  rowHeight = 34,
  virtualized = false,
  getRowClassName,
  stickyFirstColumn = false,
}: DataTableProps<TData>) {
  const {
    table,
    rows,
    visibleColumnCount,
    totalWidth,
    scrollElementRef,
    virtualRows,
    paddingTop,
    paddingBottom,
  } = useDataTable({ data, columns, rowHeight, virtualized })

  return (
    <div
      ref={scrollElementRef}
      className="border-border/60 bg-card/40 relative block w-full min-w-0 overflow-auto rounded-xl border shadow-sm backdrop-blur-sm box-border"
      style={{ maxHeight }}
    >
      <table
        className="min-w-full border-collapse text-[13px] leading-5"
        style={{ width: totalWidth > 0 ? totalWidth : '100%' }}
      >
        <colgroup>
          {table.getVisibleLeafColumns().map((column) => (
            <col key={column.id} style={{ width: column.getSize() }} />
          ))}
        </colgroup>

        <TableHeader table={table} stickyFirstColumn={stickyFirstColumn} />

        <TableBody
          rows={rows}
          virtualRows={virtualRows}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
          visibleColumnCount={visibleColumnCount}
          virtualized={virtualized}
          emptyMessage={emptyMessage}
          getRowClassName={(row) => getRowClassName?.(row.original) ?? ''}
          stickyFirstColumn={stickyFirstColumn}
        />
      </table>
    </div>
  )
}
