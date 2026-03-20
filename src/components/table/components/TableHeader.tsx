'use client'

import { flexRender, type Table } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { ALIGN_CLASSES, type ColumnMeta } from '../types'

interface TableHeaderProps<TData extends object> {
  table: Table<TData>
  stickyFirstColumn?: boolean
}

export function TableHeader<TData extends object>({
  table,
  stickyFirstColumn,
}: TableHeaderProps<TData>) {
  return (
    <thead className="bg-muted/95 sticky top-0 z-10 shadow-sm backdrop-blur-md">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header, index) => {
            const meta = header.column.columnDef.meta as ColumnMeta | undefined
            const isFirst = index === 0 && stickyFirstColumn
            return (
              <th
                key={header.id}
                className={cn(
                  'text-muted-foreground border-border/80 border-b p-3 px-4 text-left text-[11px] font-bold tracking-wider whitespace-nowrap uppercase',
                  isFirst && 'sticky left-0 z-20 bg-muted/95 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                  meta?.headerClassName,
                  meta?.className && ALIGN_CLASSES[meta.className]
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}
