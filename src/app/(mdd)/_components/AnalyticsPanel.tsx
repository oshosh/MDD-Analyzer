'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/format'
import type {
  BottomProbability,
  FxImpact,
  RawApiResponse,
  RecoveryForecast,
} from '@/lib/types'
import { useAtomValue } from 'jotai'
import { themeAtom } from '@/lib/theme'

interface AnalyticsPanelProps {
  analytics: RawApiResponse['analytics']
}

function GaugeChart({
  value,
  title,
  subtext,
  color = '#3b82f6',
}: {
  value: number
  title: string
  subtext?: string
  color?: string
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const theme = useAtomValue(themeAtom)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(
      chartRef.current,
      theme === 'dark' ? 'dark' : undefined,
      {
        renderer: 'canvas',
      }
    )

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '75%'],
          radius: '100%',
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 6,
              color: [
                [0.2, '#10b981'],
                [0.8, '#3b82f6'],
                [1, '#ef4444'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 6,
            offsetCenter: [0, '-60%'],
            itemStyle: {
              color: 'auto',
            },
          },
          axisTick: {
            length: 12,
            lineStyle: {
              color: 'auto',
              width: 2,
            },
          },
          splitLine: {
            length: 20,
            lineStyle: {
              color: 'auto',
              width: 5,
            },
          },
          axisLabel: {
            color: '#464646',
            fontSize: 10,
            distance: -40,
            rotate: 'tangential',
            formatter: function (value: number) {
              if (value === 0) return 'LOW'
              if (value === 50) return 'MID'
              if (value === 100) return 'HIGH'
              return ''
            },
          },
          title: {
            offsetCenter: [0, '-20%'],
            fontSize: 12,
            color: 'inherit',
          },
          detail: {
            fontSize: 16,
            offsetCenter: [0, '0%'],
            valueAnimation: true,
            formatter: (value: number) => `${value.toFixed(1)}%`,
            color: 'inherit',
          },
          data: [
            {
              value: value * 100,
              name: title,
            },
          ],
        },
      ],
    }

    chart.setOption(option)
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [value, title, theme, color])

  return (
    <div className="flex flex-col items-center">
      <div ref={chartRef} className="h-[140px] w-full" />
      {subtext && (
        <p className="text-muted-foreground mt-1 text-[10px]">{subtext}</p>
      )}
    </div>
  )
}

function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[]
  title: string
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const theme = useAtomValue(themeAtom)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(
      chartRef.current,
      theme === 'dark' ? 'dark' : undefined,
      {
        renderer: 'canvas',
      }
    )

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = (Array.isArray(params) ? params[0] : params) as {
            name: string
            value: number
          }
          return `${p.name}: <b>${(p.value * 100).toFixed(2)}%</b>`
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        max: 1,
        axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: title,
          type: 'bar',
          data: data.map((d) => ({
            value: d.value,
            itemStyle: { color: d.color },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params: unknown) => {
              const raw = (params as { value?: unknown }).value
              const v = typeof raw === 'number' ? raw : Number(raw)
              if (!Number.isFinite(v)) return ''
              return `${(v * 100).toFixed(1)}%`
            },
            fontSize: 10,
          },
          // label: {
          //   show: true,
          //   position: 'right',
          //   formatter: (params: { value: number }) =>
          //     `${(params.value * 100).toFixed(1)}%`,
          //   fontSize: 10,
          // },
          barWidth: '60%',
        },
      ],
    }

    chart.setOption(option)
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [data, title, theme])

  return <div ref={chartRef} className="h-[140px] w-full" />
}

function FxImpactPieChart({ impact }: { impact: FxImpact | null }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const theme = useAtomValue(themeAtom)

  useEffect(() => {
    if (!chartRef.current || !impact) return
    const chart = echarts.init(
      chartRef.current,
      theme === 'dark' ? 'dark' : undefined,
      {
        renderer: 'canvas',
      }
    )

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }
          return `${p.name}: <b>${formatPercent(p.value)}</b>`
        },
      },
      series: [
        {
          name: '손실 원인 분해',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'transparent',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{d}%',
            fontSize: 10,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
            },
          },
          data: [
            {
              value: Math.abs(impact.stock_contribution),
              name: '주가 영향',
              itemStyle: { color: '#3b82f6' },
            },
            {
              value: Math.abs(impact.fx_contribution),
              name: '환율 영향',
              itemStyle: { color: '#f59e0b' },
            },
          ],
        },
      ],
    }

    chart.setOption(option)
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [impact, theme])

  if (!impact)
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {'해당 없음'}
      </p>
    )

  return <div ref={chartRef} className="h-[140px] w-full" />
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
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <div className="bg-primary h-3.5 w-1 rounded-full" />
              {'Drawdown 회복 확률'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <BarChart
              title="회복 확률"
              data={[
                {
                  label: '30일 내',
                  value: forecast.recover_30d_prob,
                  color: '#10b981',
                },
                {
                  label: '60일 내',
                  value: forecast.recover_60d_prob,
                  color: '#3b82f6',
                },
              ]}
            />
            <p className="text-muted-foreground text-center text-[11px]">
              과거 {forecast.sample_count}회 중 평균 회복{' '}
              {forecast.avg_recovery_days ?? '-'}일
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <div className="bg-primary h-3.5 w-1 rounded-full" />
              {'바닥 역사적 백분위'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <GaugeChart
              value={bottom.percentile}
              title=""
              subtext={`현재 낙폭 ${formatPercent(bottom.current_drawdown)}`}
            />
          </CardContent>
        </Card>

        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <div className="bg-primary h-3.5 w-1 rounded-full" />
              {'손실 요인 분해'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FxImpactPieChart impact={fxImpact} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {analytics.usd && (
        <CurrencyAnalytics
          title={'USD 분석'}
          forecast={analytics.usd.recovery_forecast}
          bottom={analytics.usd.bottom_probability}
          fxImpact={analytics.usd.fx_impact}
        />
      )}
      <CurrencyAnalytics
        title={'KRW 분석'}
        forecast={analytics.krw.recovery_forecast}
        bottom={analytics.krw.bottom_probability}
        fxImpact={analytics.krw.fx_impact}
      />
    </div>
  )
}
