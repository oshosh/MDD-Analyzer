'use client'

import { flexRender, type Row } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { ALIGN_CLASSES, type ColumnMeta } from '../types'
import type { VirtualItem } from '@tanstack/react-virtual'

interface TableBodyProps<TData extends object> {
  rows: Row<TData>[]
  virtualRows: VirtualItem[]
  paddingTop: number
  paddingBottom: number
  visibleColumnCount: number
  virtualized: boolean
  emptyMessage: string
  getRowClassName?: (row: Row<TData>) => string
  stickyFirstColumn?: boolean
}

export function TableBody<TData extends object>({
  rows,
  virtualRows,
  paddingTop,
  paddingBottom,
  visibleColumnCount,
  virtualized,
  emptyMessage,
  getRowClassName,
  stickyFirstColumn,
}: TableBodyProps<TData>) {
  const hasRows = rows.length > 0

  if (!hasRows) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={visibleColumnCount}
            className="text-muted-foreground bg-card p-20 text-center"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    )
  }

  if (virtualized) {
    return (
      <tbody className="bg-card divide-border/40 divide-y">
        {paddingTop > 0 ? (
          <tr className="virtual-spacer" aria-hidden>
            <td
              colSpan={visibleColumnCount}
              style={{ height: `${paddingTop}px` }}
            />
          </tr>
        ) : null}
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index]
          const customClass = getRowClassName?.(row) ?? ''
          return (
            <tr
              key={row.id}
              style={{ height: `${virtualRow.size}px` }}
              className={cn(
                'hover:bg-accent/40 group even:bg-muted/20 transition-colors',
                customClass
              )}
            >
              {row.getVisibleCells().map((cell, index) => {
                const meta = cell.column.columnDef.meta as
                  | ColumnMeta
                  | undefined
                const isFirst = index === 0 && stickyFirstColumn
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-border/20 text-foreground border-r p-2 px-3 last:border-r-0',
                      isFirst &&
                        'sticky left-0 z-10 bg-card group-even:bg-[#f8f9fa] dark:group-even:bg-zinc-950 group-hover:bg-accent shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                      meta?.className && ALIGN_CLASSES[meta.className]
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          )
        })}
        {paddingBottom > 0 ? (
          <tr className="virtual-spacer" aria-hidden>
            <td
              colSpan={visibleColumnCount}
              style={{ height: `${paddingBottom}px` }}
            />
          </tr>
        ) : null}
      </tbody>
    )
  }

  return (
    <tbody className="bg-card divide-border/40 divide-y">
      {rows.map((row) => {
        const customClass = getRowClassName?.(row) ?? ''
        return (
          <tr
            key={row.id}
            className={cn(
              'hover:bg-accent/40 group even:bg-muted/20 transition-colors',
              customClass
            )}
          >
            {row.getVisibleCells().map((cell, index) => {
              const meta = cell.column.columnDef.meta as ColumnMeta | undefined
              const isFirst = index === 0 && stickyFirstColumn
              return (
                <td
                  key={cell.id}
                  className={cn(
                    'border-border/20 text-foreground border-r p-2 px-3 last:border-r-0',
                    isFirst &&
                      'sticky left-0 z-10 bg-card group-even:bg-[#f8f9fa] dark:group-even:bg-zinc-950 group-hover:bg-accent shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                    meta?.className && ALIGN_CLASSES[meta.className]
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              )
            })}
          </tr>
        )
      })}
    </tbody>
  )
}
