'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/table/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/format'
import type {
  BottomProbability,
  FxImpact,
  RawApiResponse,
  RecoveryForecast,
} from '@/lib/types'

interface AnalyticsPanelProps {
  analytics: RawApiResponse['analytics']
}

interface LabelValueRow {
  label: string
  value: string
}

function useBasicColumns() {
  return useMemo<ColumnDef<LabelValueRow>[]>(
    () => [
      {
        accessorKey: 'label',
        header: '항목',
        meta: { className: 'left whitespace-normal break-words min-w-[120px]' },
        cell: ({ row }) => row.original.label,
      },
      {
        accessorKey: 'value',
        header: '값',
        meta: { className: 'number whitespace-nowrap' },
        cell: ({ row }) => row.original.value,
      },
    ],
    []
  )
}

function ForecastView({ forecast }: { forecast: RecoveryForecast }) {
  const rows: LabelValueRow[] = [
    { label: '현재 MDD', value: formatPercent(forecast.current_drawdown) },
    {
      label: '과거 유사 구간 횟수',
      value: `${forecast.sample_count.toLocaleString('ko-KR')}회`,
    },
    {
      label: '30일 내 회복 확률',
      value: formatPercent(forecast.recover_30d_prob),
    },
    {
      label: '60일 내 회복 확률',
      value: formatPercent(forecast.recover_60d_prob),
    },
    {
      label: '평균 회복 기간',
      value:
        forecast.avg_recovery_days === null
          ? '-'
          : `${forecast.avg_recovery_days.toLocaleString('ko-KR')}일`,
    },
  ]
  const columns = useBasicColumns()
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/40">
      <DataTable
        data={rows}
        columns={columns}
        maxHeight={280}
        emptyMessage={'데이터 없음'}
        stickyFirstColumn
      />
    </div>
  )
}

function BottomView({ bottom }: { bottom: BottomProbability }) {
  const rows: LabelValueRow[] = [
    { label: '현재 낙폭', value: formatPercent(bottom.current_drawdown) },
    {
      label: '역사 백분위(낮음=약한 하락, 높음=깊은 하락)',
      value: formatPercent(bottom.percentile),
    },
    {
      label: '현재보다 더 깊었던 확률',
      value: formatPercent(bottom.deeper_probability),
    },
  ]
  const columns = useBasicColumns()
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/40">
      <DataTable
        data={rows}
        columns={columns}
        maxHeight={220}
        emptyMessage={'데이터 없음'}
        stickyFirstColumn
      />
    </div>
  )
}

function FxImpactView({ impact }: { impact: FxImpact | null }) {
  const columns = useBasicColumns()

  if (!impact) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {'해당 없음'}
      </p>
    )
  }

  const rows: LabelValueRow[] = [
    {
      label: '총 손실(원화 기준)',
      value: formatPercent(impact.total_drawdown),
    },
    { label: '주가 영향', value: formatPercent(impact.stock_contribution) },
    { label: '환율 영향', value: formatPercent(impact.fx_contribution) },
  ]

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        {'현재 원화 손실을 주가 요인과 환율 요인으로 단순 분해한 값입니다.'}
      </p>
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/40">
        <DataTable
          data={rows}
          columns={columns}
          maxHeight={220}
          emptyMessage={'데이터 없음'}
          stickyFirstColumn
        />
      </div>
    </div>
  )
}

function CurrencyAnalytics({
  title,
  forecast,
  bottom,
  fxImpact,
}: {
  title: string
  forecast: RecoveryForecast
  bottom: BottomProbability
  fxImpact: FxImpact | null
}) {
  return (
    <Card className="bg-card/40 min-w-0 overflow-hidden border-none shadow-lg backdrop-blur-md">
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-full gap-6 overflow-hidden">
        <article className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
            <div className="bg-primary h-3.5 w-1 rounded-full" />
            {'Drawdown 회복 예측'}
          </h3>
          <ForecastView forecast={forecast} />
        </article>
        <article className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
            <div className="bg-primary h-3.5 w-1 rounded-full" />
            {'바닥 확률(역사 백분위)'}
          </h3>
          <BottomView bottom={bottom} />
        </article>
        <article className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
            <div className="bg-primary h-3.5 w-1 rounded-full" />
            {'손실 원인 분해'}
          </h3>
          <FxImpactView impact={fxImpact} />
        </article>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  if (!analytics.usd) {
    return (
      <CurrencyAnalytics
        title={'KRW 분석'}
        forecast={analytics.krw.recovery_forecast}
        bottom={analytics.krw.bottom_probability}
        fxImpact={analytics.krw.fx_impact}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <CurrencyAnalytics
        title={'USD 분석'}
        forecast={analytics.usd.recovery_forecast}
        bottom={analytics.usd.bottom_probability}
        fxImpact={analytics.usd.fx_impact}
      />
      <CurrencyAnalytics
        title={'KRW 분석'}
        forecast={analytics.krw.recovery_forecast}
        bottom={analytics.krw.bottom_probability}
        fxImpact={analytics.krw.fx_impact}
      />
    </div>
  )
}
