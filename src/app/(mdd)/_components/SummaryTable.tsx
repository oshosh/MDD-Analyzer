'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import type { RawApiResponse, SummaryRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  ArrowRightCircle,
  Database,
  LucideProps,
} from 'lucide-react'
import { ForwardRefExoticComponent, RefAttributes } from 'react'

interface SummaryTableProps {
  summary: RawApiResponse['summary']
  meta: RawApiResponse['meta']
}

function stringifySummary(
  summary: SummaryRow | null,
  key: keyof SummaryRow
): string {
  if (!summary) return '-'
  if (key === 'max_drawdown_date') return formatDate(summary[key])
  if (
    key === 'cumulative_return' ||
    key === 'current_drawdown' ||
    key === 'mdd'
  ) {
    return formatPercent(summary[key] as number)
  }
  return formatNumber(summary[key] as number)
}

function StatCard({
  label,
  usd,
  krw,
  icon: Icon,
  className,
}: {
  label: string
  usd: string
  krw: string
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >
  className?: string
}) {
  const isNegative = usd.startsWith('-') || krw.startsWith('-')

  return (
    <Card
      className={cn(
        'bg-card/50 hover:bg-card/80 overflow-hidden border-none shadow-md backdrop-blur-sm transition-all',
        className
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            'rounded-xl p-2.5',
            isNegative
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <Badge
            variant="outline"
            className="border-muted-foreground/20 text-muted-foreground mb-1.5 text-[10px] uppercase"
          >
            {label}
          </Badge>
          <TooltipProvider>
            <div className="flex flex-col gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'cursor-default truncate text-lg leading-tight font-bold',
                      isNegative ? 'text-destructive' : 'text-foreground'
                    )}
                  >
                    {usd}{' '}
                    <span className="ml-0.5 text-[10px] font-medium opacity-50">
                      USD
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{usd} USD</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-default truncate text-sm leading-tight font-semibold">
                    {krw}{' '}
                    <span className="ml-0.5 text-[9px] font-medium opacity-50">
                      KRW
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{krw} KRW</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

import { CardHeader, CardTitle } from '@/components/ui/card'

// ... (rest of the imports and StatCard component are unchanged)

export default function SummaryTable({ summary, meta }: SummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold tracking-tight">
              대시보드 요약
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 text-[10px] font-bold"
              >
                <Database className="h-3 w-3" />
                {meta.data_source}
              </Badge>
              <Badge
                variant="outline"
                className="text-muted-foreground text-[10px] font-bold"
              >
                상장일: {meta.listing_date}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="시작가"
            usd={stringifySummary(summary.usd, 'start_price')}
            krw={stringifySummary(summary.krw, 'start_price')}
            icon={ArrowRightCircle}
          />
          <StatCard
            label="현재가"
            usd={stringifySummary(summary.usd, 'current_price')}
            krw={stringifySummary(summary.krw, 'current_price')}
            icon={Target}
          />
          <StatCard
            label="누적 수익률"
            usd={stringifySummary(summary.usd, 'cumulative_return')}
            krw={stringifySummary(summary.krw, 'cumulative_return')}
            icon={TrendingUp}
            className="ring-primary/20 bg-primary/5 ring-1"
          />
          <StatCard
            label="전고점 (ATH)"
            usd={stringifySummary(summary.usd, 'ath')}
            krw={stringifySummary(summary.krw, 'ath')}
            icon={TrendingUp}
          />
          <StatCard
            label="현재 낙폭"
            usd={stringifySummary(summary.usd, 'current_drawdown')}
            krw={stringifySummary(summary.krw, 'current_drawdown')}
            icon={TrendingDown}
          />
          <StatCard
            label="최대 낙폭(MDD)"
            usd={stringifySummary(summary.usd, 'mdd')}
            krw={stringifySummary(summary.krw, 'mdd')}
            icon={TrendingDown}
            className="ring-destructive/20 bg-destructive/5 ring-1"
          />
          <StatCard
            label="최대 하락일"
            usd={stringifySummary(summary.usd, 'max_drawdown_date')}
            krw={stringifySummary(summary.krw, 'max_drawdown_date')}
            icon={Clock}
          />
        </div>
      </CardContent>
    </Card>
  )
}
