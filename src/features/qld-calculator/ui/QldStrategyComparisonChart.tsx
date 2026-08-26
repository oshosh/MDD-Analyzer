'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { IChartApi, MouseEventParams, Time } from 'lightweight-charts'
import {
  TrendingUp,
  Activity,
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@shared/ui/card'
import { Badge } from '@shared/ui/badge'
import { Text } from '@shared/ui/text'
import { Label } from '@shared/ui/label'
import { Button } from '@shared/ui/button'
import { DateRangePicker } from '@shared/ui/date-range-picker'
import { useQldQuery } from '../hooks/useQldQuery'
import type {
  DailySimPoint,
  QldBarInterval,
} from '../types'
import { runQldBacktestSimulation, aggregateCandles } from '../lib/simulation'

const BAR_INTERVAL_BUTTONS: Array<{ label: string; value: QldBarInterval }> = [
  { label: '1일봉', value: '1d' },
  { label: '5일봉', value: '5d' },
  { label: '1달봉', value: '1m' },
  { label: '3달봉', value: '3m' },
  { label: '6달봉', value: '6m' },
  { label: '1년봉', value: '1y' },
  { label: '전체', value: 'all' },
]

export function QldStrategyComparisonChart() {
  const { data: candles, isLoading, isError, refetch } = useQldQuery()

  // Selected Bar Interval (1일봉, 5일봉, 1달봉, 3달봉, 6달봉, 1년봉, 전체)
  const [barInterval, setBarInterval] = useState<QldBarInterval>('all')

  // Hovered crosshair point
  const [activeHoverPoint, setActiveHoverPoint] = useState<DailySimPoint | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartApiRef = useRef<IChartApi | null>(null)

  // 1. Determine Earliest (QLD Inception) & Latest (Yesterday Close) available dates
  const earliestDate = useMemo(() => {
    if (!candles || candles.length === 0) return '2006-06-21'
    return candles[0].date
  }, [candles])

  const latestDate = useMemo(() => {
    if (!candles || candles.length === 0) return '2026-08-25'
    return candles[candles.length - 1].date
  }, [candles])

  // 2. Calendar Date Range State (Default: QLD 상장일 ~ 전날 종가)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2006-06-21',
    end: '2026-08-25',
  })

  // Sync default range with candle boundaries on initial data load
  useEffect(() => {
    if (candles && candles.length > 0) {
      setDateRange((prev) => {
        // If still default, set to actual earliest/latest
        if (prev.start === '2006-06-21' && prev.end === '2026-08-25') {
          return { start: candles[0].date, end: candles[candles.length - 1].date }
        }
        return prev
      })
    }
  }, [candles])

  // Handle Calendar Range Change
  const handleDateRangeChange = useCallback(
    (start: string, end: string) => {
      const safeStart = start < earliestDate ? earliestDate : start
      const safeEnd = end > latestDate ? latestDate : end
      setDateRange({ start: safeStart, end: safeEnd })
    },
    [earliestDate, latestDate]
  )

  // 3. Filter Candles by Calendar Range & Aggregate into Selected Bar Interval
  const simPoints = useMemo(() => {
    if (!candles || candles.length === 0) return []

    // Filter by calendar period (시작일 ~ 종료일)
    const filtered = candles.filter(
      (c) => c.date >= dateRange.start && c.date <= dateRange.end
    )

    if (filtered.length === 0) return []

    // Aggregate into 1일봉 / 5일봉 / 1달봉 / 3달봉 / 6달봉 / 1년봉 / 전체
    const aggregated = aggregateCandles(filtered, barInterval)

    // Run Strategy Backtest Simulation across the aggregated period
    return runQldBacktestSimulation(
      aggregated,
      dateRange.start,
      dateRange.end,
      1000
    )
  }, [candles, dateRange, barInterval])

  // Latest snapshot point
  const latestPoint = simPoints.length > 0 ? simPoints[simPoints.length - 1] : null
  const displayPoint = activeHoverPoint || latestPoint

  // 4. Render TradingView Lightweight Chart
  useEffect(() => {
    let isCancelled = false

    async function renderTradingViewChart() {
      if (!chartContainerRef.current || simPoints.length === 0) return

      try {
        const {
          createChart,
          ColorType,
          BaselineSeries,
          LineSeries,
          CrosshairMode,
          LineStyle,
        } = await import('lightweight-charts')

        if (isCancelled || !chartContainerRef.current) return

        chartContainerRef.current.innerHTML = ''

        const baseVal = simPoints[0].totalDeposited || 1000

        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth || 750,
          height: 350,
          layout: {
            background: { type: ColorType.Solid, color: '#090d16' },
            textColor: '#94a3b8',
            fontSize: 11,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          },
          grid: {
            vertLines: { color: '#1e293b' },
            horzLines: { color: '#1e293b' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
          },
          timeScale: {
            borderColor: '#334155',
            timeVisible: true,
          },
          rightPriceScale: {
            borderColor: '#334155',
          },
        })

        // Series 1: Green Solid Baseline -> EVH Strategy
        const evhSeries = chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: baseVal },
          topLineColor: '#10b981',
          topFillColor1: 'rgba(16, 185, 129, 0.28)',
          topFillColor2: 'rgba(16, 185, 129, 0.02)',
          bottomLineColor: '#ef4444',
          bottomFillColor1: 'rgba(239, 68, 68, 0.05)',
          bottomFillColor2: 'rgba(239, 68, 68, 0.25)',
          lineWidth: 3,
          title: '🟢 EVH 80:20 동적 리밸런싱 ($)',
        })

        evhSeries.setData(
          simPoints.map((d) => ({
            time: d.time as Time,
            value: d.evhTotalVal,
          }))
        )

        // Series 2: Red Dashed Line -> Regular DCA Strategy
        const dcaSeries = chart.addSeries(LineSeries, {
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          title: '🔴 무지성 DCA 100% 적립 ($)',
        })

        dcaSeries.setData(
          simPoints.map((d) => ({
            time: d.time as Time,
            value: d.dcaTotalVal,
          }))
        )

        // Crosshair Event Listener (1:1 Date Matching)
        chart.subscribeCrosshairMove((param: MouseEventParams) => {
          if (!param || !param.time) {
            setActiveHoverPoint(null)
            return
          }
          const timeStr =
            typeof param.time === 'string'
              ? param.time
              : typeof param.time === 'object' && param.time !== null && 'year' in param.time
                ? `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`
                : String(param.time)

          const matched = simPoints.find((p) => p.time === timeStr)
          if (matched) {
            setActiveHoverPoint(matched)
          }
        })

        chart.timeScale().fitContent()
        chartApiRef.current = chart
      } catch (err) {
        console.error('TradingView Chart render failed:', err)
      }
    }

    renderTradingViewChart()

    const handleResize = () => {
      if (chartContainerRef.current && chartApiRef.current) {
        chartApiRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      isCancelled = true
      window.removeEventListener('resize', handleResize)
      if (chartApiRef.current) {
        chartApiRef.current.remove()
        chartApiRef.current = null
      }
    }
  }, [simPoints])

  if (isLoading) {
    return (
      <Card className="border border-border bg-card p-8 text-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto" />
        <Text variant="small" className="font-bold text-foreground">
          실제 QLD raw 주가 백데이터를 불러오는 중...
        </Text>
      </Card>
    )
  }

  if (isError || !displayPoint) {
    return (
      <Card className="border border-border bg-card p-6 text-center space-y-2">
        <Text variant="small" className="font-bold text-destructive">
          ⚠️ 백테스트 데이터를 가져오지 못했습니다.
        </Text>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </Card>
    )
  }

  const alphaVal = displayPoint.evhTotalVal - displayPoint.dcaTotalVal

  return (
    <Card className="border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5">
      {/* 1. CLEAN HEADER (단순하고 명확한 제목 영역) */}
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="bg-emerald-600 text-white font-bold flex items-center gap-1 text-xs">
            <Activity className="h-3 w-3" /> 실제 QLD RAW 백테스트
          </Badge>
          <Text variant="large" className="font-extrabold text-foreground flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" /> 월 $1,000 무지성 DCA vs EVH 80:20 스마트 시스템
          </Text>
        </div>
        <Text variant="muted" className="text-xs">
          매월 $1,000씩 적립 투자할 때 <b>실제 년/월/일(YYYY-MM-DD) 주가 기반 두 계좌의 실시간 자산 성장 비교</b>입니다.
        </Text>
      </div>

      {/* 2. REAL TIME CURSOR MATCHED CARD (년/월/일 1:1 실시간 매칭 해설 카드) */}
      <Card className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary shrink-0" />
            <div>
              <Text variant="muted" className="text-xs block">
                {activeHoverPoint ? '🔍 커서 선택 일자 (Year-Month-Day)' : '📌 선택 기간 최종 성과'}
              </Text>
              <Text variant="large" className="text-base sm:text-lg font-black text-foreground font-mono">
                {displayPoint.time} (QLD 종가: ${displayPoint.qldClose})
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 bg-card p-2 text-xs font-bold shadow-xs">
              누적 입금 원금: ${displayPoint.totalDeposited.toLocaleString()}
            </Badge>
          </div>
        </div>

        {/* 2 ACCOUNTS COMPARISON GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STRATEGY A: REGULAR DCA */}
          <Card className="rounded-xl border border-rose-500/40 bg-card p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <Text variant="small" className="font-extrabold text-rose-500 flex items-center gap-1">
                🔴 단순 월 $1,000 무지성 DCA 적립 계좌
              </Text>
              <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[10px]">
                익절/매집 0회
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground block">총 자산 평가액</Label>
              <Text variant="h3" className="text-xl font-black text-rose-400 font-mono">
                ${displayPoint.dcaTotalVal.toLocaleString()}
              </Text>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
              <div>
                <Label className="text-[10px] text-muted-foreground">보유 주식</Label>
                <Text variant="small" className="font-bold text-foreground block">{displayPoint.dcaShares}주</Text>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">보유 현금</Label>
                <Text variant="small" className="font-bold text-foreground block">${displayPoint.dcaCash}</Text>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">최대 낙폭(MDD)</Label>
                <Text variant="small" className="font-bold text-rose-500 block">{displayPoint.dcaMdd}%</Text>
              </div>
            </div>
          </Card>

          {/* STRATEGY B: EVH SMART SYSTEM */}
          <Card className="rounded-xl border border-emerald-500/40 bg-card p-4 space-y-2 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <Text variant="small" className="font-extrabold text-emerald-500 flex items-center gap-1">
                🟢 EVH 80:20 동적 리밸런싱 스마트 계좌
              </Text>
              <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                88% 익절 / 75% 매집
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground block">총 자산 평가액 (현금 포함)</Label>
              <Text variant="h3" className="text-xl font-black text-emerald-400 font-mono">
                ${displayPoint.evhTotalVal.toLocaleString()}
              </Text>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
              <div>
                <Label className="text-[10px] text-muted-foreground">보유 주식</Label>
                <Text variant="small" className="font-bold text-emerald-400 block">{displayPoint.evhShares}주</Text>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">달러 현금</Label>
                <Text variant="small" className="font-bold text-blue-400 block">${displayPoint.evhCash.toLocaleString()}</Text>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">주식 비중</Label>
                <Text variant="small" className="font-bold text-amber-400 block">{displayPoint.evhWeight}%</Text>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">최대 낙폭(MDD)</Label>
                <Text variant="small" className="font-bold text-emerald-400 block">{displayPoint.evhMdd}%</Text>
              </div>
            </div>
          </Card>
        </div>

        {/* ALPHA & HONEST FINANCIAL EXPLANATION */}
        <Card className="rounded-xl bg-slate-950 p-4 border border-border space-y-2 text-white shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <Text variant="muted" className="text-xs text-slate-400 block font-bold">
                💡 백테스팅 결과 분석 ({displayPoint.time} 기준)
              </Text>
              <Text variant="small" className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                {alphaVal >= 0
                  ? `EVH 스마트 계좌가 DCA 대비 +$${alphaVal.toLocaleString()} 달러 초과 달성!`
                  : `대세 폭등장에서 100% 무지성 DCA의 총 평가금이 더 높음 (차이: -$${Math.abs(alphaVal).toLocaleString()})`}
              </Text>
            </div>

            {displayPoint.actionNote && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs py-1 px-3">
                {displayPoint.actionNote}
              </Badge>
            )}
          </div>

          <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-300 leading-relaxed space-y-1">
            <Text variant="small" className="font-bold text-blue-400 block">
              📌 왜 수십 배 폭등하는 장세에서는 무지성 DCA의 총 금액이 더 높을까? (Cash Drag 현상)
            </Text>
            <Text variant="p" className="text-[11px] leading-relaxed text-slate-300 block">
              • <b>원인:</b> QLD처럼 수십 배 우상향하는 미친 불장에서는, 현금을 20% 쥐고 있는 모든 전략(EVH 포함)이 100% 풀로 주식을 모은 무지성 DCA보다 <b>총 평가금액($) 자체는 작아집니다 (금융학의 Cash Drag 효과)</b>.<br />
              • <b>EVH의 핵심 가치:</b> EVH 전략의 목적은 수익금 극대화가 아니라 <b>2008년(-84%), 2022년(-65%) 대폭락장에서 계좌 붕괴(MDD)를 대폭 방어</b>하고 <b>달러 현금을 비축하여 심리적 파산을 완벽히 예방</b>하는 안정성 중심 투자입니다.
            </Text>
          </div>
        </Card>
      </Card>

      {/* 3. TRADINGVIEW LIGHTWEIGHT CHARTS CANVAS AREA */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-2 px-1">
          <div className="flex items-center gap-4">
            <Text variant="small" className="flex items-center gap-1.5 font-bold text-emerald-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> 🟢 EVH 스마트 계좌 ($)
            </Text>
            <Text variant="small" className="flex items-center gap-1.5 font-bold text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" /> 🔴 무지성 DCA 적립 계좌 ($)
            </Text>
          </div>
          <Text variant="muted" className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
            📊 TradingView 차트를 탐색하면 위 카드의 년/월/일 데이터가 1:1로 실시간 이동합니다.
          </Text>
        </div>

        {/* TRADINGVIEW CANVAS CONTAINER */}
        <div className="rounded-2xl border border-border bg-[#090d16] p-2 shadow-2xl overflow-hidden">
          <div ref={chartContainerRef} className="w-full" />
        </div>

        {/* 4. UNIFIED BOTTOM TOOLBAR (봉 주기 버튼 & 달력 기간 선택기) */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card border border-border p-1.5 shadow-md">
          {/* BAR INTERVAL BUTTONS (1일봉, 5일봉, 1달봉, 3달봉, 6달봉, 1년봉, 전체) */}
          <div className="flex flex-wrap items-center gap-1">
            {BAR_INTERVAL_BUTTONS.map((btn) => (
              <Button
                key={btn.value}
                variant={barInterval === btn.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBarInterval(btn.value)}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                  barInterval === btn.value
                    ? 'shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {/* CALENDAR DATE RANGE PICKER (조회 기간: QLD 상장일 ~ 전날 종가) */}
          <div className="flex items-center gap-2">
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              minDate={earliestDate}
              maxDate={latestDate}
              onRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
