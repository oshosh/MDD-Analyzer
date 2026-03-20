'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatPercent } from '@/lib/format'
import type { BuySignal, RawApiResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Info,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Zap,
  HelpCircle,
  BarChart2,
  MousePointerClick,
} from 'lucide-react'

interface BuySignalPanelProps {
  signals: RawApiResponse['buy_signal']
}

const SIGNAL_GUIDE = [
  {
    level: 5,
    label: '역사적 기회',
    desc: '낙폭 백분위 95% 초과. 역사적 최저점 수준으로 공격적 매수 시점.',
    color: 'bg-purple-600',
  },
  {
    level: 4,
    label: '공격적 매수',
    desc: '낙폭 백분위 85~95%. 강한 하락장으로 높은 기대 수익률 구간.',
    color: 'bg-blue-600',
  },
  {
    level: 3,
    label: '분할매수 추천',
    desc: '낙폭 백분위 60~85%. 유의미한 조정으로 매집 시작에 적합.',
    color: 'bg-sky-500',
  },
  {
    level: 2,
    label: '평이',
    desc: '낙폭 백분위 20~60%. 일상적인 시장 변동성 범위 내 위치.',
    color: 'bg-slate-400',
  },
  {
    level: 1,
    label: '과열 주의',
    desc: '낙폭 백분위 20% 미만. 전고점 근처로 신규 진입 시 리스크 높음.',
    color: 'bg-red-500',
  },
]

function SignalCard({
  title,
  signal,
}: {
  title: string
  signal: BuySignal | null
}) {
  if (!signal) return null

  const winRateEdge =
    (signal.win_rate_1y ?? 0) - (signal.baseline_win_rate_1y ?? 0)
  const returnEdge =
    (signal.historical_return_1y ?? 0) - (signal.baseline_return_1y ?? 0)

  const getIcon = () => {
    switch (signal.level) {
      case 1:
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 2:
        return <Info className="h-5 w-5 text-slate-400" />
      case 3:
        return <ShieldCheck className="h-5 w-5 text-sky-500" />
      case 4:
        return <Zap className="h-5 w-5 text-blue-600" />
      case 5:
        return <TrendingUp className="h-5 w-5 text-purple-600" />
    }
  }

  return (
    <Card className="bg-card/40 group hover:bg-card/50 relative overflow-hidden border-none shadow-xl backdrop-blur-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            {title} 분석 가이드
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground hover:text-primary h-4 w-4 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="w-72 rounded-2xl p-4" side="right">
                <p className="text-foreground mb-3 text-xs font-bold tracking-wider uppercase">
                  신호 등급 기준 (낙폭 백분위)
                </p>
                <div className="space-y-3">
                  {SIGNAL_GUIDE.map((g) => (
                    <div key={g.level} className="flex gap-3">
                      <div
                        className={cn('h-auto w-1.5 rounded-full', g.color)}
                      />
                      <div>
                        <p className="text-[11px] font-bold">{g.label}</p>
                        <p className="text-muted-foreground text-[10px] leading-tight">
                          {g.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {getIcon()}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase">
                매수 권고 등급
              </p>
              <span
                className="text-3xl font-black tracking-tighter"
                style={{ color: signal.color }}
              >
                {signal.label}
              </span>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-muted-foreground text-[10px] font-bold uppercase">
                바닥 근접도
              </p>
              <Badge
                variant="secondary"
                className="py-0 text-sm font-black tabular-nums"
              >
                {signal.score}
                <span className="ml-0.5 text-[10px] opacity-50">/100</span>
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 flex h-4 w-full overflow-hidden rounded-full p-1">
            {[1, 2, 3, 4, 5].map((l) => (
              <div
                key={l}
                className={cn(
                  'mx-0.5 h-full flex-1 rounded-sm transition-all duration-700',
                  l <= signal.level ? '' : 'opacity-5'
                )}
                style={{
                  backgroundColor: l <= signal.level ? signal.color : undefined,
                }}
              />
            ))}
          </div>
          <p className="text-muted-foreground border-primary/30 border-l-2 pl-3 text-sm leading-snug font-medium italic">
            {signal.description}
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <BarChart2 className="text-primary h-3.5 w-3.5" />
              통계적 매수 우위 (Alpha)
            </div>
            <Badge
              variant="outline"
              className="border-muted-foreground/20 text-[9px] font-bold"
            >
              분석 표본: {signal.sample_size}개 사건
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TooltipProvider>
              {/* Win Rate Card */}
              <div className="bg-muted/20 border-border/50 group/card space-y-2 rounded-2xl border p-4">
                <p className="text-muted-foreground text-[10px] font-bold uppercase">
                  1년 뒤 승률
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-black text-emerald-500 tabular-nums">
                    {signal.win_rate_1y !== null
                      ? formatPercent(signal.win_rate_1y)
                      : '-'}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={winRateEdge >= 0 ? 'success' : 'destructive'}
                        className="px-1.5 py-0 text-[9px] font-bold"
                      >
                        {winRateEdge >= 0 ? '+' : ''}
                        {formatPercent(winRateEdge)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      평상시 승률(
                      {formatPercent(signal.baseline_win_rate_1y ?? null)}) 대비
                      추가 승률
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground text-[9px] leading-tight font-medium">
                  아무 때나 샀을 때보다{' '}
                  <span className="text-foreground font-bold">
                    {formatPercent(Math.abs(winRateEdge))}
                  </span>{' '}
                  {winRateEdge >= 0 ? '유리함' : '불리함'}
                </p>
              </div>

              {/* Return Card */}
              <div className="bg-primary/5 border-primary/10 space-y-2 rounded-2xl border p-4">
                <p className="text-primary text-[10px] font-bold uppercase">
                  1년 뒤 기대 수익
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-primary text-2xl font-black tabular-nums">
                    {signal.historical_return_1y !== null
                      ? `+${formatPercent(signal.historical_return_1y)}`
                      : '-'}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={returnEdge >= 0 ? 'success' : 'destructive'}
                        className="bg-primary/10 text-primary border-none px-1.5 py-0 text-[9px] font-bold"
                      >
                        {returnEdge >= 0 ? '+' : ''}
                        {formatPercent(returnEdge)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      평상시 수익률(+
                      {formatPercent(signal.baseline_return_1y ?? null)}) 대비
                      추가 수익
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground text-[9px] leading-tight font-medium">
                  평소보다{' '}
                  <span className="text-foreground font-bold">
                    {formatPercent(Math.abs(returnEdge))}
                  </span>{' '}
                  {returnEdge >= 0 ? '더 벌었음' : '덜 벌림'}
                </p>
              </div>
            </TooltipProvider>
          </div>

          {/* Range Display with Tooltips */}
          <div className="space-y-3 px-1 pt-2">
            <div className="flex justify-between text-[10px] font-bold tracking-tighter uppercase">
              <span className="text-destructive">Worst Case</span>
              <span className="text-muted-foreground">
                과거 1년 뒤 수익률 분포
              </span>
              <span className="text-emerald-500">Best Case</span>
            </div>

            <TooltipProvider>
              <div className="relative flex h-6 items-center">
                <div className="bg-muted absolute h-1.5 w-full overflow-hidden rounded-full">
                  <div className="from-destructive via-primary absolute h-full w-full bg-gradient-to-r to-emerald-500 opacity-40" />
                </div>

                <div
                  className="bg-foreground/20 absolute z-0 h-3 w-px"
                  style={{
                    left: `${((0 - (signal.worst_return_1y ?? -0.5)) / ((signal.best_return_1y ?? 1) - (signal.worst_return_1y ?? -0.5))) * 100}%`,
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="bg-destructive border-background absolute z-10 h-3 w-3 cursor-help rounded-full border-2 shadow-sm"
                      style={{ left: `0%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    역사적 최악의 사례: {formatPercent(signal.worst_return_1y)}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="bg-primary border-background absolute z-20 h-4 w-4 cursor-help rounded-full border-2 shadow-md"
                      style={{
                        left: `${(((signal.historical_return_1y ?? 0) - (signal.worst_return_1y ?? 0)) / ((signal.best_return_1y ?? 1) - (signal.worst_return_1y ?? 0))) * 100}%`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    평균 수익률: +{formatPercent(signal.historical_return_1y)}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="border-background absolute z-10 h-3 w-3 cursor-help rounded-full border-2 bg-emerald-500 shadow-sm"
                      style={{ left: `100%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    역사적 최고의 사례: +{formatPercent(signal.best_return_1y)}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="flex justify-between text-[11px] font-black tabular-nums">
              <span className="text-destructive">
                {formatPercent(signal.worst_return_1y)}
              </span>
              <span className="text-emerald-500">
                +{formatPercent(signal.best_return_1y)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 text-muted-foreground border-border/20 flex items-start gap-2 rounded-xl border p-3 text-[10px] leading-relaxed font-medium">
          <MousePointerClick className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            데이터 오염을 방지하기 위해 중복된 날짜 샘플을 제거한 **
            {signal.sample_size}개의 독립적인 하락 사례**를 전수 분석했습니다.
            시장 평균(Baseline) 성과와 비교하여 현재 시점의 통계적 우위를
            확인하세요.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BuySignalPanel({ signals }: BuySignalPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SignalCard title="USD ASSET" signal={signals.usd} />
      <SignalCard title="KRW (환노출)" signal={signals.krw} />
    </div>
  )
}
