'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import type { RawApiResponse } from '@entities/mdd'
import { InvestorTrendTab } from '@features/kr-stock-trend'
import { DrawdownCycleTimeline } from '@features/ai-cycle-analysis'
import {
  RawTable,
  RecoveryTable,
  SummaryTable,
  BuySignalPanel,
  AnalyticsPanel,
  ChartsPanel,
  NormalDistributionChart,
  type MddQueryInput,
} from '@features/mdd-analysis'

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

export default function MddContentDisplay({
  data,
  query,
}: MddContentDisplayProps) {
  const krStockCode = extractKoreanStockCode(data.meta.symbol)

  return (
    <>
      <SummaryTable summary={data.summary} meta={data.meta} />

      <AnalyticsPanel analytics={data.analytics} />

      <BuySignalPanel signals={data.buy_signal} />

      <ChartsPanel charts={data.charts} />

      <NormalDistributionChart
        drawdowns={data.charts.mdd_krw.map((d) => d.value)}
        currentDrawdown={data.summary.krw.current_drawdown}
        title="원화(KRW) 기준 낙폭 정규분포"
      />

      <DrawdownCycleTimeline
        cycles={data.drawdown_cycles.krw}
        symbol={data.meta.symbol}
        symbolName={data.meta.name}
        interval={query.interval}
      />

      {/* 🇰🇷 한국 주식인 경우 실시간 장중 수급 및 5영업일 이력 탭 노출 */}
      {krStockCode && (
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>🇰🇷 한국 주식 실시간 외국계/기관/개인 수급 분석</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvestorTrendTab stockCode={krStockCode} />
          </CardContent>
        </Card>
      )}

      <RecoveryTable
        title="원화(KRW) 기준 회복 시뮬레이션"
        rows={data.recovery.krw}
        interval={query.interval}
        currentDrawdown={data.summary.krw.current_drawdown}
      />

      <RawTable rows={data.raw} meta={data.meta} />
    </>
  )
}
