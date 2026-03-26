'use client'

import { useEffect, useRef, useMemo } from 'react'
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  SeriesType,
  AreaSeries,
} from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RawApiResponse } from '@/lib/types'
import { useAtomValue } from 'jotai'
import { themeAtom } from '@/lib/theme'

interface ChartsPanelProps {
  charts: RawApiResponse['charts']
}

// 전역 차트 인스턴스 관리 (동기화용)
const chartInstances = new Set<IChartApi>()

function SeriesChart({
  title,
  rows,
  color = '#2563eb',
}: {
  title: string
  rows: { date: string; value: number }[] | null
  color?: string
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const theme = useAtomValue(themeAtom)

  // MDD 지점 찾기 (가장 낮은 값)
  const mddPoint = useMemo(() => {
    if (!rows || rows.length === 0) return null
    return rows.reduce((min, p) => (p.value < min.value ? p : min), rows[0])
  }, [rows])

  useEffect(() => {
    if (!chartContainerRef.current || !rows || rows.length === 0) return

    const isDark = theme === 'dark'
    const textColor = isDark ? '#94a3b8' : '#64748b'
    const borderColor = isDark ? '#334155' : '#e2e8f0'

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: borderColor, style: 2 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 220,
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          labelBackgroundColor: color,
          width: 1,
          style: 3,
        },
        horzLine: {
          labelBackgroundColor: color,
          width: 1,
          style: 3,
        },
      },
      handleScroll: { horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { pinch: true, mouseWheel: true },
    })

    // 시리즈 추가
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}44`,
      bottomColor: `${color}00`,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `${price.toFixed(2)}%`,
      },
    })
    // const series = chart.addAreaSeries({
    //   lineColor: color,
    //   topColor: `${color}44`,
    //   bottomColor: `${color}00`,
    //   lineWidth: 2,
    //   priceFormat: {
    //     type: 'custom',
    //     formatter: (price: number) => `${price.toFixed(2)}%`,
    //   },
    // })

    // const data = rows.map((r) => ({
    //   time: r.date,
    //   value: r.value * 100,
    // }))

    const data = rows
      .map((r) => ({
        time: r.date, // string('YYYY-MM-DD') 또는 number(타임스탬프) 모두 대응
        value: r.value * 100,
      }))
      // 1. 오름차순(과거 -> 최신)으로 강제 정렬
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      // 2. 바로 직전 데이터와 시간이 똑같으면(중복이면) 버림
      .filter(
        (item, index, arr) => index === 0 || item.time !== arr[index - 1].time
      )

    series.setData(data)

    // MDD 마커 추가
    // if (mddPoint) {
    //   // series.setMarkers([
    //   //   {
    //   //     time: mddPoint.date,
    //   //     position: 'belowBar',
    //   //     color: '#ef4444',
    //   //     shape: 'arrowUp',
    //   //     text: `MDD ${(mddPoint.value * 100).toFixed(1)}%`,
    //   //     size: 1,
    //   //   },
    //   // ])
    // }
    if (data.length > 0) {
      const realMddPoint = data.reduce(
        (min, p) => (p.value < min.value ? p : min),
        data[0]
      )

      series.createPriceLine({
        price: realMddPoint.value,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 2, // 2는 점선(Dashed)을 의미합니다.
        axisLabelVisible: true,
        title: `MDD ${realMddPoint.value.toFixed(1)}%`,
      })
    }

    chart.timeScale().fitContent()
    chartInstances.add(chart)

    // 동기화 핸들러
    const handleCrosshair = (param: MouseEventParams) => {
      chartInstances.forEach((c) => {
        if (c !== chart) {
          if (!param.time) {
            c.clearCrosshairPosition()
          } else {
            // 다른 차트의 동일한 시간대로 크로스헤어 이동
            c.setCrosshairPosition(
              0,
              param.time,
              series as ISeriesApi<SeriesType>
            )
          }
        }
      })
    }
    chart.subscribeCrosshairMove(handleCrosshair)

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstances.delete(chart)
      chart.unsubscribeCrosshairMove(handleCrosshair)
      chart.remove()
    }
  }, [rows, theme, color, mddPoint])

  return (
    <Card className="bg-card/40 border-none shadow-none backdrop-blur-sm">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-muted-foreground text-[11px] font-black tracking-widest uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {!rows || rows.length === 0 ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-xs">
            데이터 없음
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full" />
        )}
      </CardContent>
    </Card>
  )
}

export default function ChartsPanel({ charts }: ChartsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SeriesChart
        title="MDD USD (Risk)"
        rows={charts.mdd_usd}
        color="#ef4444"
      />
      <SeriesChart
        title="MDD KRW (Risk)"
        rows={charts.mdd_krw}
        color="#f97316"
      />
      <SeriesChart
        title="Cumulative Return USD"
        rows={charts.cumulative_usd}
        color="#10b981"
      />
      <SeriesChart
        title="Cumulative Return KRW"
        rows={charts.cumulative_krw}
        color="#3b82f6"
      />
    </div>
  )
}
