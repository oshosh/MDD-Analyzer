// src/app/(mdd)/_components/MddContentDisplay.tsx
'use client'
import RawTable from '@/app/(mdd)/_components/RawTable'
import RecoveryTable from '@/app/(mdd)/_components/RecoveryTable'
import SummaryTable from '@/app/(mdd)/_components/SummaryTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'
import type { RawApiResponse } from '@/lib/types'
import { InvestorTrendTab } from '@/app/(mdd)/_components/stock/InvestorTrendTab'

import BuySignalPanel from '@/app/(mdd)/_components/BuySignalPanel'
import AnalyticsPanel from '@/app/(mdd)/_components/AnalyticsPanel'
import ChartsPanel from '@/app/(mdd)/_components/ChartsPanel'
import NormalDistributionChart from '@/app/(mdd)/_components/NormalDistributionChart'
import DrawdownCycleTimeline from '@/app/(mdd)/_components/DrawdownCycleTimeline'

interface MddContentDisplayProps {
  data: RawApiResponse
  query: MddQueryInput
}

function extractKoreanStockCode(symbol: string): string | null {
  if (!symbol) return null
  const cleaned = symbol.trim().toUpperCase()
  if (/^\d{6}$/.test(cleaned)) return cleaned
  if (cleaned.endsWith('.KS') || cleaned.endsWith('.KQ')) {
    const code = cleaned.split('.')[0]
    if (/^\d{6}$/.test(code)) return code
  }
  return null
}

export default function MddContentDisplay({ data, query }: MddContentDisplayProps) {
  const krStockCode = extractKoreanStockCode(query.symbol || data.meta.symbol || '')

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 duration-700">
      {/* 한국 종목일 때 실시간 시세 및 투자자 수급 동향 카드 표시 */}
      {krStockCode && (
        <InvestorTrendTab stockCode={krStockCode} />
      )}

      <SummaryTable summary={data.summary} meta={data.meta} />

      {/* 역대 주요 하락 사이클 타임라인 */}
      <DrawdownCycleTimeline
        cycles={data.drawdown_cycles.krw}
        symbol={data.meta.symbol}
        interval={data.meta.interval}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="bg-primary h-6 w-1.5 rounded-full" />
            Buy Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BuySignalPanel signals={data.buy_signal} summary={data.summary} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="bg-primary h-6 w-1.5 rounded-full" />
            Risk Analysis & Normal Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <NormalDistributionChart
            drawdowns={data.raw.map((r) => r.drawdown_krw)}
            currentDrawdown={data.summary.krw.current_drawdown}
            title="원화(KRW) 기준 과거 낙폭 정규분포(Bell Curve) 상 현재 위치"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecoveryTable
              title={'USD Recovery Rates'}
              rows={data.recovery.usd}
              interval={data.meta.interval}
              currentDrawdown={data.summary.usd?.current_drawdown ?? 0}
            />
            <RecoveryTable
              title={'KRW Recovery Rates'}
              rows={data.recovery.krw}
              interval={data.meta.interval}
              currentDrawdown={data.summary.krw.current_drawdown}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="bg-primary h-6 w-1.5 rounded-full" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <AnalyticsPanel analytics={data.analytics} />
          <ChartsPanel charts={data.charts} />
          <RawTable rows={data.raw} meta={data.meta} />
        </CardContent>
      </Card>
    </div>
  )
}
