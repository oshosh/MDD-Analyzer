'use client'

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPercent } from '@/lib/format'
import type { RawApiResponse } from '@/lib/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartsPanelProps {
  charts: RawApiResponse['charts']
}

function SeriesChart({
  title,
  rows,
}: {
  title: string
  rows: { date: string; value: number }[] | null
}) {
  return (
    <Card className="min-h-[260px] border-none bg-muted/20 shadow-none">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1 pr-4">
        {!rows || rows.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-xs">
            {'데이터 없음'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={rows}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }}
                minTickGap={40}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }}
                tickFormatter={(value: number) =>
                  `${(value * 100).toFixed(0)}%`
                }
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatPercent(value), 'Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                dot={false}
                stroke="var(--color-primary)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default function ChartsPanel({ charts }: ChartsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
      <SeriesChart title="MDD USD" rows={charts.mdd_usd} />
      <SeriesChart title="MDD KRW" rows={charts.mdd_krw} />
      <SeriesChart title={'Cumulative Return USD'} rows={charts.cumulative_usd} />
      <SeriesChart title={'Cumulative Return KRW'} rows={charts.cumulative_krw} />
    </div>
  )
}
