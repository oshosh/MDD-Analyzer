'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/table/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPercent } from '@/lib/format'
import type { IntervalType, RecoveryRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Zap, Target, AlertTriangle, Flame, Info } from 'lucide-react'

interface RecoveryTableProps {
  title: string
  rows: RecoveryRow[] | null
  interval: IntervalType
  currentDrawdown: number
}

function intervalLabel(interval: IntervalType): string {
  if (interval === '1w') return '(주봉x5일 환산)'
  if (interval === '1m') return '(월봉x21일 환산)'
  return ''
}

export default function RecoveryTable({
  title,
  rows,
  interval,
  currentDrawdown,
}: RecoveryTableProps) {
  const label = intervalLabel(interval)
  const data = rows ?? []

  const columns = useMemo<ColumnDef<RecoveryRow>[]>(
    () => [
      {
        accessorKey: 'range_label',
        header: '낙폭 기준',
        size: 140,
        meta: { className: 'center' },
        cell: ({ row }) => {
          const levelPercent = parseInt(
            row.original.range_label.replace('%', '')
          )
          const level = levelPercent / 100
          const isCurrent = Math.abs(currentDrawdown - level) < 0.025

          return (
            <div className="relative flex items-center justify-center gap-2">
              {isCurrent && (
                <div className="absolute -left-2 flex items-center">
                  <div className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
                </div>
              )}
              <Badge
                variant={
                  levelPercent <= -70
                    ? 'destructive'
                    : levelPercent <= -50
                      ? 'default'
                      : 'outline'
                }
                className={cn(
                  'gap-1 px-2 font-bold',
                  levelPercent <= -70
                    ? 'border-none bg-orange-500 hover:bg-orange-600'
                    : levelPercent <= -50
                      ? 'border-none bg-purple-600 hover:bg-purple-700'
                      : levelPercent <= -20
                        ? 'border-blue-200 bg-blue-50 text-blue-600'
                        : ''
                )}
              >
                {levelPercent <= -70 ? (
                  <Flame className="h-3 w-3" />
                ) : levelPercent <= -50 ? (
                  <Zap className="h-3 w-3" />
                ) : levelPercent <= -20 ? (
                  <Target className="h-3 w-3" />
                ) : null}
                {row.original.range_label} 이내
              </Badge>
            </div>
          )
        },
      },
      {
        accessorKey: 'recovery_rate',
        header: '구간 체류 비중',
        size: 140,
        meta: { className: 'number' },
        cell: ({ row }) => {
          const value = row.original.recovery_rate
          const level = parseInt(row.original.range_label.replace('%', ''))

          return (
            <div className="ml-auto flex w-full max-w-[100px] flex-col items-end gap-1.5">
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums',
                  level <= -70 ? 'text-orange-600' : 'text-muted-foreground'
                )}
              >
                {formatPercent(value)}
              </span>
              <Progress
                value={value * 100}
                className={cn(
                  'h-1',
                  level <= -70
                    ? '[&>div]:bg-orange-500'
                    : level <= -50
                      ? '[&>div]:bg-purple-500'
                      : level <= -20
                        ? '[&>div]:bg-blue-500'
                        : ''
                )}
              />
            </div>
          )
        },
      },
      {
        id: 'strategy',
        header: '투자 전략 가이드',
        size: 220,
        cell: ({ row }) => {
          const levelPercent = parseInt(
            row.original.range_label.replace('%', '')
          )
          const level = levelPercent / 100
          const isCurrent = Math.abs(currentDrawdown - level) < 0.025

          if (isCurrent)
            return (
              <Badge
                variant="success"
                className="animate-in fade-in zoom-in-95 gap-1 duration-500"
              >
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                현재 위치: 지지선 테스트
              </Badge>
            )

          if (levelPercent <= -70)
            return (
              <span className="text-[11px] font-black text-orange-600 uppercase dark:text-orange-400">
                인생을 건 매수
              </span>
            )
          if (levelPercent <= -50)
            return (
              <span className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                역사적 기회 (풀매수)
              </span>
            )
          if (levelPercent <= -30)
            return (
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                공격적 비중 확대
              </span>
            )
          if (levelPercent <= -15)
            return (
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                분할 매수 유효
              </span>
            )
          return (
            <span className="text-muted-foreground text-[11px] font-medium opacity-60">
              보유 및 관망
            </span>
          )
        },
      },
      {
        id: 'condition_days',
        header: `누적 체류일 ${label}`,
        size: 180,
        meta: { className: 'number' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
            {row.original.condition_days.toLocaleString('ko-KR')}일
          </span>
        ),
      },
    ],
    [label, currentDrawdown]
  )

  return (
    <Card className="bg-card/40 relative overflow-hidden border-none shadow-xl backdrop-blur-md">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-50" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-black tracking-tight">
            {title}
          </CardTitle>
          <Badge
            variant="secondary"
            className="h-5 gap-1 py-0 text-[10px] font-bold"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            초정밀 리스크 분석
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataTable
          data={data}
          columns={columns}
          maxHeight={600}
          emptyMessage={'데이터 없음'}
          stickyFirstColumn
          getRowClassName={(row) => {
            const level = parseInt(row.range_label.replace('%', '')) / 100
            return Math.abs(currentDrawdown - level) < 0.025
              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20'
              : ''
          }}
        />

        <Alert variant="info" className="bg-muted/30 border-none">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[10px] leading-relaxed">
            <span className="text-foreground font-bold">구간 체류 비중</span>이
            낮을수록 해당 가격대는 역사적으로 매우 짧은 기간만 허용된{' '}
            <strong>`초저평가 골짜기`</strong>입니다. 하이라이트된 행은{' '}
            <strong>현재 자산의 낙폭 위치</strong>를 나타냅니다.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
