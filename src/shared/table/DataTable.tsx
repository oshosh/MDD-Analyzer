'use client'

import { type ColumnDef, flexRender, Row, type RowData } from '@tanstack/react-table'
import { VirtualItem } from '@tanstack/react-virtual'
import { useDataTable } from './hooks/useDataTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/ui/table'
import { cn } from '@shared/lib/utils'

export type TableGridLines = 'none' | 'horizontal' | 'vertical' | 'both'
export type TableColumnAlign = 'left' | 'center' | 'right'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: TableColumnAlign
    className?: string
  }
}

interface DataTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  emptyMessage?: string
  maxHeight?: number
  rowHeight?: number
  virtualized?: boolean
  getRowClassName?: (row: TData) => string
  stickyFirstColumn?: boolean
  gridLines?: TableGridLines
  bordered?: boolean
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
  gridLines = 'horizontal',
  bordered = true,
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
    rowVirtualizer,
  } = useDataTable({ data, columns, rowHeight, virtualized })

  const firstColumnId = table.getVisibleLeafColumns()[0]?.id
  const hasHorizontalLines = gridLines === 'horizontal' || gridLines === 'both'
  const hasVerticalLines = gridLines === 'vertical' || gridLines === 'both'

  const renderRow = (row: Row<TData>, isVirtual: boolean = false, virtualItem?: VirtualItem) => {
    const rowClass = getRowClassName?.(row.original) ?? ''

    return (
      <TableRow
        key={row.id}
        data-index={isVirtual ? virtualItem?.index : undefined}
        ref={isVirtual && virtualItem ? (node: HTMLTableRowElement | null) => rowVirtualizer.measureElement(node) : undefined}
        className={cn('group hover:bg-muted/60 transition-colors', rowClass)}
        style={{ height: rowHeight }}
      >
        {row.getVisibleCells().map((cell) => {
          const isSticky = stickyFirstColumn && cell.column.id === firstColumnId
          const cellMeta = cell.column.columnDef.meta
          const align = cellMeta?.align ?? 'left'
          const cellAlignClass =
            align === 'center'
              ? 'text-center'
              : align === 'right'
                ? 'text-right'
                : 'text-left'

          return (
            <TableCell
              key={cell.id}
              className={cn(
                'h-full px-3 py-1.5 align-middle',
                cellAlignClass,
                hasHorizontalLines && 'border-b border-border/80',
                hasVerticalLines && 'border-r border-border/60 last:border-r-0',
                isSticky && [
                  'sticky left-0 z-20',
                  'bg-card group-hover:bg-muted/60',
                  'shadow-[1px_0_0_0_hsl(var(--border))]',
                ],
                cellMeta?.className
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          )
        })}
      </TableRow>
    )
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        'bg-card/40 relative box-border block w-full min-w-0 overflow-auto rounded-xl shadow-sm backdrop-blur-sm',
        bordered ? 'border border-border/60' : 'border-0'
      )}
      style={{ maxHeight }}
    >
      <Table
        containerClassName="overflow-visible"
        className="min-w-full border-separate border-spacing-0 text-[13px] leading-5"
        style={{ width: totalWidth > 0 ? totalWidth : '100%' }}
      >
        <colgroup>
          {table.getVisibleLeafColumns().map((column) => (
            <col key={column.id} style={{ width: column.getSize() }} />
          ))}
        </colgroup>

        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isStickyFirstHeader =
                  stickyFirstColumn &&
                  header.id === firstColumnId
                const colMeta = header.column.columnDef.meta
                const align = colMeta?.align ?? 'left'
                const alignFlexClass =
                  align === 'center'
                    ? 'justify-center text-center'
                    : align === 'right'
                      ? 'justify-end text-right'
                      : 'justify-start text-left'

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() }}
                    className={cn(
                      'sticky top-0 z-30 bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border))]',
                      hasVerticalLines && 'border-r border-border/60 last:border-r-0',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground',
                      isStickyFirstHeader && [
                        'left-0 z-40',
                        'shadow-[1px_1px_0_0_hsl(var(--border))]',
                      ]
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className={cn('flex items-center gap-1.5 w-full', alignFlexClass)}>
                      <span>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </span>
                      {header.column.getCanSort() && (
                        <span className="shrink-0 text-[10px] opacity-70">
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? ' ↕'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {paddingTop > 0 && (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                style={{ height: paddingTop }}
              />
            </TableRow>
          )}
          {virtualized
            ? virtualRows.map((virtualItem) => renderRow(rows[virtualItem.index], true, virtualItem))
            : rows.map((row) => renderRow(row))
          }
          {paddingBottom > 0 && (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                style={{ height: paddingBottom }}
              />
            </TableRow>
          )}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
