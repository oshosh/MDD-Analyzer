'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/table/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatNumber } from '@/lib/format'
import type { RawApiResponse } from '@/lib/types'
import { CheckCircle2, XCircle, ShieldCheck, Calculator } from 'lucide-react'

interface ValidationPanelProps {
  validation: RawApiResponse['validation']
}

interface ValidationRow {
  basis: 'USD' | 'KRW'
  passed: boolean | null
  maxError: string
}

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  const data: ValidationRow[] = [
    {
      basis: 'USD',
      passed: validation.usd ? validation.usd.passed : null,
      maxError: validation.usd
        ? formatNumber(validation.usd.max_abs_error)
        : '-',
    },
    {
      basis: 'KRW',
      passed: validation.krw.passed,
      maxError: formatNumber(validation.krw.max_abs_error),
    },
  ]

  const columns = useMemo<ColumnDef<ValidationRow>[]>(
    () => [
      {
        accessorKey: 'basis',
        header: '기준 자산',
        size: 140,
        meta: { className: 'center' },
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-bold">
            {row.original.basis}
          </Badge>
        ),
      },
      {
        accessorKey: 'passed',
        header: '공식 일치 여부',
        size: 200,
        meta: { className: 'center' },
        cell: ({ row }) => {
          const passed = row.original.passed
          if (passed === null)
            return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex items-center justify-center gap-1.5">
              {passed ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> PASS
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> FAIL
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'maxError',
        header: '최대 절대 오차',
        size: 200,
        meta: { className: 'number' },
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium tabular-nums">
            {row.original.maxError}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <Card className="bg-card/40 min-w-0 overflow-hidden border-none shadow-lg backdrop-blur-md">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-5 w-5" />
          <CardTitle className="text-base font-bold">
            수학적 데이터 검증
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="max-w-full space-y-6 overflow-hidden">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
            <Calculator className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold tracking-wider uppercase">
              적용 계산 공식
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-1 text-[11px] font-medium">
              <p>
                <span className="text-primary">Peak:</span>{' '}
                {validation.formula.peak}
              </p>
              <p>
                <span className="text-primary">Drawdown:</span>{' '}
                {validation.formula.drawdown}
              </p>
              <p>
                <span className="text-primary">MDD:</span>{' '}
                {validation.formula.mdd}
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-muted-foreground px-1 text-[10px] font-bold uppercase">
                검증 로그
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2">
                {validation.note.map((note, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground flex gap-2 px-1 text-[11px] leading-tight"
                  >
                    <div className="bg-primary/40 mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                    {note}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border-border/40 min-w-0 overflow-hidden rounded-xl border">
          <DataTable
            data={data}
            columns={columns}
            maxHeight={260}
            emptyMessage={'데이터 없음'}
            stickyFirstColumn
          />
        </div>
      </CardContent>
    </Card>
  )
}
