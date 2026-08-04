'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import { Badge } from '@shared/ui/badge'
import { formatPercent } from '@shared/lib/format'
import { useAtomValue } from 'jotai'
import { themeAtom } from '@shared/lib/theme'
import { Activity } from 'lucide-react'
import { cn } from '@shared/lib/utils'

interface NormalDistributionChartProps {
  drawdowns: number[]
  currentDrawdown: number
  title?: string
}

function calculateMeanAndStdDev(data: number[]) {
  if (data.length === 0) return { mean: 0, stdDev: 0.05 }
  const mean = data.reduce((sum, v) => sum + v, 0) / data.length
  const variance =
    data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (data.length - 1 || 1)
  const stdDev = Math.sqrt(variance) || 0.05
  return { mean, stdDev }
}

function normalPdf(x: number, mean: number, stdDev: number) {
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI))
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2))
  return coefficient * Math.exp(exponent)
}

export default function NormalDistributionChart({
  drawdowns,
  currentDrawdown,
  title = '과거 낙폭 정규분포(Bell Curve) 상 현재 위치',
}: NormalDistributionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const theme = useAtomValue(themeAtom)

  const { mean, stdDev } = useMemo(() => calculateMeanAndStdDev(drawdowns), [drawdowns])

  const zScore = useMemo(() => {
    if (stdDev === 0) return 0
    return (currentDrawdown - mean) / stdDev
  }, [currentDrawdown, mean, stdDev])

  const percentile = useMemo(() => {
    if (drawdowns.length === 0) return 0
    const deeperCount = drawdowns.filter((v) => v <= currentDrawdown).length
    return (deeperCount / drawdowns.length) * 100
  }, [drawdowns, currentDrawdown])

  const statusBadge = useMemo(() => {
    if (percentile <= 20) {
      return {
        label: '🟢 매수 우위 (저평가/깊은 하락)',
        classNames: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        desc: '역사적으로 많이 하락하여 손익비가 매우 뛰어난 매수 적기입니다.',
      }
    }
    if (percentile <= 65) {
      return {
        label: '🔵 일상 변동성 (평이한 위치)',
        classNames: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
        desc: '평상시 주가 변동 범위 내에 위치해 있습니다.',
      }
    }
    return {
      label: '🔴 고점/과열 (신규 진입 주의)',
      classNames: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      desc: '전고점 인근 위치로 신규 매수 시 리스크가 큽니다.',
    }
  }, [percentile])

  useEffect(() => {
    if (!chartRef.current || drawdowns.length === 0) return

    const chart = echarts.init(
      chartRef.current,
      theme === 'dark' ? 'dark' : undefined
    )

    const minX = Math.min(mean - 3.5 * stdDev, currentDrawdown - 0.05)
    const maxX = Math.max(mean + 3.5 * stdDev, 0.05)

    const pointsCount = 80
    const step = (maxX - minX) / pointsCount
    const pdfData: [number, number][] = []

    for (let i = 0; i <= pointsCount; i++) {
      const x = minX + i * step
      const y = normalPdf(x, mean, stdDev)
      pdfData.push([x * 100, y])
    }

    const currentY = normalPdf(currentDrawdown, mean, stdDev)

    // markArea 영역 기준선 계산 (하위 25% 하락선, 상위 25% 전고점선)
    const buyZoneEnd = (mean - 0.67 * stdDev) * 100
    const overheatZoneStart = (mean + 0.67 * stdDev) * 100

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = (Array.isArray(params) ? params[0] : params) as {
            data: [number, number]
          }
          if (!p || !p.data) return ''
          return `낙폭 구간: <b>${p.data[0].toFixed(1)}%</b><br/>확률밀도: <b>${p.data[1].toFixed(2)}</b>`
        },
      },
      grid: { top: 35, bottom: 35, left: 45, right: 30 },
      xAxis: {
        type: 'value',
        name: '낙폭 (%)',
        nameLocation: 'middle',
        nameGap: 22,
        axisLabel: {
          formatter: '{value}%',
          fontSize: 10,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          name: '정규분포 확률밀도 (Bell Curve)',
          type: 'line',
          smooth: true,
          data: pdfData,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.35)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
          },
          markArea: {
            silent: true,
            data: [
              [
                {
                  name: '🟢 매수 기회 (깊은 하락)',
                  xAxis: minX * 100,
                  itemStyle: { color: 'rgba(16, 185, 129, 0.08)' },
                  label: {
                    show: true,
                    position: 'insideTopLeft',
                    color: '#10b981',
                    fontSize: 10,
                    fontWeight: 'bold',
                  },
                },
                { xAxis: buyZoneEnd },
              ],
              [
                {
                  name: '🔵 평상시 범위',
                  xAxis: buyZoneEnd,
                  itemStyle: { color: 'rgba(59, 130, 246, 0.03)' },
                  label: {
                    show: true,
                    position: 'insideTop',
                    color: '#3b82f6',
                    fontSize: 10,
                    fontWeight: 'bold',
                  },
                },
                { xAxis: overheatZoneStart },
              ],
              [
                {
                  name: '🔴 고점/과열',
                  xAxis: overheatZoneStart,
                  itemStyle: { color: 'rgba(239, 68, 68, 0.08)' },
                  label: {
                    show: true,
                    position: 'insideTopRight',
                    color: '#ef4444',
                    fontSize: 10,
                    fontWeight: 'bold',
                  },
                },
                { xAxis: maxX * 100 },
              ],
            ],
          },
          markLine: {
            symbol: ['none', 'none'],
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: `현재 위치: ${(currentDrawdown * 100).toFixed(1)}%`,
              fontSize: 11,
              fontWeight: 'bold',
              color: '#ef4444',
            },
            lineStyle: {
              color: '#ef4444',
              width: 2,
              type: 'dashed',
            },
            data: [{ xAxis: currentDrawdown * 100 }],
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 34,
            data: [
              {
                name: '현재 위치',
                coord: [currentDrawdown * 100, currentY],
                itemStyle: { color: '#ef4444' },
                label: {
                  show: true,
                  formatter: '현재',
                  fontSize: 9,
                  fontWeight: 'bold',
                  color: '#fff',
                },
              },
            ],
          },
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
  }, [drawdowns, currentDrawdown, mean, stdDev, theme])

  return (
    <Card className="bg-card/40 border-none shadow-md backdrop-blur-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-bold uppercase">
            <Activity className="text-primary h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('px-2.5 py-0.5 text-xs font-black', statusBadge.classNames)}>
              {statusBadge.label}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              하락 백분위: 하위 {percentile.toFixed(1)}% (Z: {zScore.toFixed(2)}σ)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div ref={chartRef} className="h-[190px] w-full" />
        
        <p className="text-muted-foreground text-center text-[11px] font-medium leading-relaxed">
          현재 낙폭<strong className="text-destructive font-bold ml-1">{formatPercent(currentDrawdown)}</strong>은 과거 역사적 변동성의 정규분포 상에서{' '}
          <strong className="text-foreground font-bold">하위 {percentile.toFixed(1)}% 지점</strong>에 위치해 있습니다. ({statusBadge.desc})
        </p>

        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-bold text-primary shrink-0">💡 쉽게 보는 법:</span>
          <div>
            핀(📍) 위치가 <strong className="text-emerald-400">왼쪽 🟢 영역(깊은 하락)</strong>으로 갈수록 역사적으로 많이 떨어진 <strong>&quot;싸게 살 기회&quot;</strong>이며, 
            <strong className="text-rose-400"> 오른쪽 🔴 영역(전고점 부근)</strong>으로 갈수록 고점에 가까운 <strong>&quot;신규진입 위험 위치&quot;</strong>입니다.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
