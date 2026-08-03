'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercent } from '@/lib/format'
import { useAtomValue } from 'jotai'
import { themeAtom } from '@/lib/theme'
import { Activity } from 'lucide-react'

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

  const percentileText = useMemo(() => {
    if (drawdowns.length === 0) return '0%'
    const deeperCount = drawdowns.filter((v) => v <= currentDrawdown).length
    const pct = (deeperCount / drawdowns.length) * 100
    return `${pct.toFixed(1)}%`
  }, [drawdowns, currentDrawdown])

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
      grid: { top: 30, bottom: 35, left: 45, right: 30 },
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
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
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
            symbolSize: 32,
            data: [
              {
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
              정규분포 하락 백분위: 하위 {percentileText}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              Z-Score: {zScore.toFixed(2)}σ
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div ref={chartRef} className="h-[180px] w-full" />
        <p className="text-muted-foreground text-center text-[11px] font-medium leading-relaxed mt-1">
          현재 낙폭<strong className="text-destructive font-bold ml-1">{formatPercent(currentDrawdown)}</strong>은 과거 역사적 변동성의 정규분포 상에서{' '}
          <strong className="text-foreground font-bold">하위 {percentileText}</strong> 수준의 {zScore < -1.5 ? '이례적으로 깊은 하락 구간' : '일상적인 변동성 범위'}입니다.
        </p>
      </CardContent>
    </Card>
  )
}
