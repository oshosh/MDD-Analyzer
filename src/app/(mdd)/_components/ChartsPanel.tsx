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
    <Card className="min-h-[280px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!rows || rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {'데이터 없음'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rows}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(value: number) =>
                  `${(value * 100).toFixed(0)}%`
                }
              />
              <Tooltip
                formatter={(value: number) => formatPercent(value)}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="linear"
                dataKey="value"
                dot={false}
                stroke="#0059d6"
                strokeWidth={1.8}
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
    <Card className="bg-card text-card-foreground p-4">
      <h2 className="mb-3 text-sm font-bold">{'차트'}</h2>
      <div className="grid grid-cols-1 gap-4">
        <SeriesChart title="MDD USD" rows={charts.mdd_usd} />
        <SeriesChart title="MDD KRW" rows={charts.mdd_krw} />
        <SeriesChart title={'누적수익률 USD'} rows={charts.cumulative_usd} />
        <SeriesChart title={'누적수익률 KRW'} rows={charts.cumulative_krw} />
      </div>
    </Card>
  )
}
