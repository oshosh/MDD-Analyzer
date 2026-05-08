'use client'

import { type ColumnDef, flexRender, Row } from '@tanstack/react-table'
import { VirtualItem } from '@tanstack/react-virtual'
import { useDataTable } from './hooks/useDataTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DataTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  emptyMessage?: string
  maxHeight?: number
  rowHeight?: number
  virtualized?: boolean
  getRowClassName?: (row: TData) => string
  stickyFirstColumn?: boolean
  onRowClick?: (row: TData) => void
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
  onRowClick,
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

  const renderRow = (row: Row<TData>, isVirtual: boolean = false, virtualItem?: VirtualItem) => {
    const rowClass = getRowClassName?.(row.original) ?? '';
    const visibleColumns = table.getVisibleLeafColumns()

    return (
      <TableRow
        key={row.id}
        data-index={isVirtual ? virtualItem?.index : row.index}
        ref={isVirtual && virtualItem ? (node) => rowVirtualizer.measureElement(node) : undefined}
        className={cn('group hover:bg-muted/50 transition-colors', rowClass)}
        style={{ height: rowHeight }}
        onClick={() => onRowClick?.(row.original)}
      >
        {row.getVisibleCells().map((cell) => {
          const stickyIndex = visibleColumns.findIndex((column) => column.id === cell.column.id)
          const isSticky = stickyFirstColumn && stickyIndex >= 0 && stickyIndex <= 1
          const stickyLeft = isSticky
            ? visibleColumns
                .slice(0, stickyIndex)
                .reduce((sum, column) => sum + column.getSize(), 0)
            : undefined
          const cellMeta = cell.column.columnDef.meta as { className?: string } | undefined;
          return (
            <TableCell
              key={cell.id}
              style={isSticky ? { left: stickyLeft } : undefined}
              className={cn(
                'h-full px-2 py-1.5 bg-card',
                cellMeta?.className,
                isSticky && 'sticky z-30 shadow-[1px_0_0_hsl(var(--border))]'
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <div // This outer div remains because shadcn/ui Table does not take max-height
      ref={scrollElementRef}
      className="border-border/60 bg-card/40 relative box-border block w-full min-w-0 overflow-auto rounded-xl border shadow-sm backdrop-blur-sm"
      style={{ maxHeight }}
    >
      <Table // shadcn/ui Table
        className="min-w-full border-collapse text-[13px] leading-5"
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
                const visibleColumns = table.getVisibleLeafColumns()
                const stickyIndex = visibleColumns.findIndex((column) => column.id === header.column.id)
                const isSticky = stickyFirstColumn && stickyIndex >= 0 && stickyIndex <= 1
                const stickyLeft = isSticky
                  ? visibleColumns
                      .slice(0, stickyIndex)
                      .reduce((sum, column) => sum + column.getSize(), 0)
                  : undefined
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize(), ...(isSticky ? { left: stickyLeft } : {}) }}
                    className={cn(
                      'group relative z-20 bg-card px-2 py-2 text-left font-bold uppercase text-muted-foreground',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                      isSticky &&
                        'sticky z-40 shadow-[1px_0_0_hsl(var(--border))]'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanSort() && (
                      <span className="ml-1">
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </span>
                    )}
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
                className="h-24 text-center"
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
