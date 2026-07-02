'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/table/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPercent } from '@/lib/format'
import type { RawApiResponse, RawRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Database, Table, Download } from 'lucide-react'

interface RawTableProps {
  rows: RawRow[]
  meta: RawApiResponse['meta']
}

// const RAW_COLUMNS = [
//   { key: 'date', title: '일자', description: '거래 날짜(YYYY-MM-DD)' },
//   { key: 'open', title: '시가', description: '해당 일자의 시가' },
//   { key: 'high', title: '고가', description: '해당 일자의 고가' },
//   { key: 'low', title: '저가', description: '해당 일자의 저가' },
//   { key: 'close', title: '종가', description: 'MDD 계산 기준 가격' },
//   { key: 'volume', title: '거래량', description: '해당 일자의 거래량' },
//   {
//     key: 'change_percent',
//     title: '등락률',
//     description: '전일 종가 대비 당일 종가 변화율',
//   },
//   { key: 'peak', title: '고점', description: 'start~t 구간 rolling 최고 종가' },
//   { key: 'drawdown', title: '낙폭', description: '(close - peak) / peak' },
//   {
//     key: 'fx_usdkrw',
//     title: '환율',
//     description: 'USDKRW 환율(US/GOLD에서 사용)',
//   },
//   {
//     key: 'close_krw',
//     title: '원화 종가',
//     description: 'USD 종가 * 환율 또는 KR 종가',
//   },
//   {
//     key: 'peak_krw',
//     title: '원화 고점',
//     description: '원화 기준 rolling 최고값',
//   },
//   {
//     key: 'drawdown_krw',
//     title: '원화 낙폭',
//     description: '원화 기준 drawdown',
//   },
// ] as const

export default function RawTable({ rows, meta }: RawTableProps) {
  const columns = useMemo<ColumnDef<RawRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: '일자',
        size: 110,
        meta: { className: 'center whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.date}</span>
        ),
      },
      {
        accessorKey: 'open',
        header: '시가',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.open),
      },
      {
        accessorKey: 'high',
        header: '고가',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.high),
      },
      {
        accessorKey: 'low',
        header: '저가',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.low),
      },
      {
        accessorKey: 'close',
        header: '종가',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => (
          <span className="font-bold">{formatNumber(row.original.close)}</span>
        ),
      },
      {
        accessorKey: 'volume',
        header: '거래량',
        size: 120,
        meta: { className: 'number' },
        cell: ({ row }) => row.original.volume.toLocaleString('ko-KR'),
      },
      {
        accessorKey: 'change_percent',
        header: '등락률',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => {
          const value = row.original.change_percent
          const isNegative = value !== null && value < 0
          return (
            <span
              className={cn(
                'font-medium',
                isNegative
                  ? 'text-destructive'
                  : value !== null && value > 0
                    ? 'text-emerald-500'
                    : ''
              )}
            >
              {formatPercent(value)}
            </span>
          )
        },
      },
      {
        accessorKey: 'peak',
        header: '고점',
        size: 110,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.peak),
      },
      {
        accessorKey: 'drawdown',
        header: '낙폭',
        size: 100,
        meta: { className: 'number' },
        cell: ({ row }) => {
          const value = row.original.drawdown
          return (
            <span
              className={cn('font-medium', value < 0 && 'text-destructive')}
            >
              {formatPercent(value)}
            </span>
          )
        },
      },
      {
        accessorKey: 'fx_usdkrw',
        header: '환율',
        size: 100,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.fx_usdkrw),
      },
      {
        accessorKey: 'close_krw',
        header: '원화 종가',
        size: 120,
        meta: { className: 'number' },
        cell: ({ row }) => (
          <span className="font-bold">
            {formatNumber(row.original.close_krw)}
          </span>
        ),
      },
      {
        accessorKey: 'peak_krw',
        header: '원화 고점',
        size: 120,
        meta: { className: 'number' },
        cell: ({ row }) => formatNumber(row.original.peak_krw),
      },
      {
        accessorKey: 'drawdown_krw',
        header: '원화 낙폭',
        size: 120,
        meta: { className: 'number' },
        cell: ({ row }) => (
          <span
            className={cn(
              'font-bold',
              row.original.drawdown_krw < 0 && 'text-destructive'
            )}
          >
            {formatPercent(row.original.drawdown_krw)}
          </span>
        ),
      },
    ],
    []
  )

  const handleExportExcel = () => {
    const BOM = '\uFEFF'
    const headers = [
      '일자',
      '시가',
      '고가',
      '저가',
      '종가',
      '거래량',
      '등락률',
      '고점',
      '낙폭',
      '환율',
      '원화 종가',
      '원화 고점',
      '원화 낙폭'
    ]

    const csvRows = rows.map((row) =>
      [
        row.date,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume,
        row.change_percent,
        row.peak,
        row.drawdown,
        row.fx_usdkrw,
        row.close_krw,
        row.peak_krw,
        row.drawdown_krw
      ]
        .map((val) =>
          typeof val === 'number'
            ? val.toString()
            : `"${(val || '').toString().replace(/"/g, '""')}"`
        )
        .join(',')
    )

    const csvContent = BOM + [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `raw_mdd_data_${meta.symbol}_${meta.interval}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="bg-card/40 min-w-0 overflow-hidden border-none shadow-lg backdrop-blur-md">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Table className="text-primary h-5 w-5" />
          <CardTitle className="text-base font-bold">
            RAW 시계열 데이터
          </CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="bg-primary hover:bg-primary/80 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            엑셀 다운로드
          </button>
          <Badge
            variant="secondary"
            className="w-fit gap-1.5 text-[10px] font-bold"
          >
            <Database className="h-3 w-3" />
            {meta.data_source}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="max-w-full space-y-4 overflow-hidden">
        <DataTable
          data={rows}
          columns={columns}
          maxHeight={520}
          rowHeight={34}
          emptyMessage={'데이터 없음'}
          virtualized
          stickyFirstColumn
        />
      </CardContent>
    </Card>
  )
}
