// src/app/(mdd)/_components/DrawdownCycleTimeline.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowRight, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DrawdownCycle } from '@/lib/types'
import { useState } from 'react'

interface DrawdownCycleTimelineProps {
  cycles: DrawdownCycle[]
  symbol: string
  interval: string
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `₩${(price / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`
  }
  if (price >= 10_000) {
    return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }
  if (price >= 100) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getDrawdownColor(dd: number): string {
  if (dd <= -0.8) return 'text-red-500'
  if (dd <= -0.6) return 'text-orange-500'
  if (dd <= -0.4) return 'text-amber-500'
  return 'text-yellow-500'
}

function getDrawdownBg(dd: number): string {
  if (dd <= -0.8) return 'bg-red-500/10 border-red-500/30'
  if (dd <= -0.6) return 'bg-orange-500/10 border-orange-500/30'
  if (dd <= -0.4) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-yellow-500/10 border-yellow-500/30'
}

export default function DrawdownCycleTimeline({
  cycles,
  symbol,
  interval,
}: DrawdownCycleTimelineProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExpanded, setIsExpanded] = useState(false)

  // 주요 하락 사이클이 2개 미만이면 표시하지 않음 (경고할 필요 없음)
  if (cycles.length < 2) return null

  const currentCycle = cycles.find((c) => c.isCurrent)
  const pastCycles = cycles.filter((c) => !c.isCurrent)

  // "최근 사이클 기준 재분석" 시작일 계산
  // 마지막 완료된 사이클이 끝난 후(= 다음 ATH 시작), 또는 현재 사이클의 고점
  const recommendedStartDate = currentCycle
    ? currentCycle.peakDate
    : pastCycles.length > 0
      ? pastCycles[pastCycles.length - 1].troughDate
      : null

  function handleReanalyze(startDate: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('symbol', symbol)
    params.set('from', startDate)
    params.set('interval', interval)
    router.push(`/?${params.toString()}`)
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span>
            이 종목은{' '}
            <span className="text-amber-500">{cycles.length}번</span>의 대규모
            하락(-40% 이상)을 경험했습니다
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* 타임라인 */}
        <div className="flex flex-col gap-2">
          {/* 항상 현재 사이클 + 최근 1개는 표시 */}
          {(isExpanded ? cycles : cycles.slice(-Math.min(3, cycles.length))).map(
            (cycle, idx) => (
              <div
                key={`${cycle.peakDate}-${idx}`}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${getDrawdownBg(cycle.drawdown)} ${cycle.isCurrent ? 'ring-2 ring-amber-500/40' : ''}`}
              >
                {/* 번호 */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/10">
                  {isExpanded
                    ? idx + 1
                    : cycles.length - Math.min(3, cycles.length) + idx + 1}
                </div>

                {/* 기간 */}
                <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">
                    {formatDateShort(cycle.peakDate)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">
                    {cycle.isCurrent ? '현재' : formatDateShort(cycle.troughDate)}
                  </span>

                  <span className="text-muted-foreground">|</span>

                  <span className="text-muted-foreground text-xs">
                    {formatPrice(cycle.peakPrice)} → {formatPrice(cycle.troughPrice)}
                  </span>

                  <span className="text-muted-foreground">|</span>

                  <span className={`font-black ${getDrawdownColor(cycle.drawdown)}`}>
                    {(cycle.drawdown * 100).toFixed(1)}%
                  </span>

                  {cycle.isCurrent && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500">
                      ← 현재 진행 중
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {/* 더보기/접기 버튼 */}
          {cycles.length > 3 && (
            <button
              type="button"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? (
                <>
                  접기 <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  {cycles.length - 3}개 더 보기{' '}
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* 추천 재분석 안내 */}
        {recommendedStartDate && currentCycle && (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                💡 최근 사이클 기준 재분석 추천
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              과거의 극단적 하락 이벤트가 현재 분석을 왜곡할 수 있습니다.
              최근 사이클({formatDateShort(recommendedStartDate)}~) 기준으로
              재분석하면 현재 상황에 더 적합한 리스크 판단이 가능합니다.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => handleReanalyze(recommendedStartDate)}
            >
              {formatDateShort(recommendedStartDate)}부터 재분석
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
