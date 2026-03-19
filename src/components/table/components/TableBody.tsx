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
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as
                  | ColumnMeta
                  | undefined
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-border/20 text-foreground border-r p-2 px-3 whitespace-nowrap last:border-r-0',
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
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as ColumnMeta | undefined
              return (
                <td
                  key={cell.id}
                  className={cn(
                    'border-border/20 text-foreground border-r p-2 px-3 whitespace-nowrap last:border-r-0',
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
