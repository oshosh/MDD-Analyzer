// src/app/(mdd)/_components/MddContentDisplay.tsx
'use client'

import dynamic from 'next/dynamic'
import ControlPanel from '@/app/(mdd)/_components/ControlPanel'
import MethodologyGuide from '@/app/(mdd)/_components/MethodologyGuide'
import RawTable from '@/app/(mdd)/_components/RawTable'
import RecoveryTable from '@/app/(mdd)/_components/RecoveryTable'
import SummaryTable from '@/app/(mdd)/_components/SummaryTable'
import ValidationPanel from '@/app/(mdd)/_components/ValidationPanel'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MddQueryInput } from '@/app/(mdd)/_lib/schemas'
import { RawApiResponse } from '@/lib/types'

const BuySignalPanel = dynamic(
  () => import('@/app/(mdd)/_components/BuySignalPanel'),
  { ssr: false }
)
const AnalyticsPanel = dynamic(
  () => import('@/app/(mdd)/_components/AnalyticsPanel'),
  { ssr: false }
)
const ChartsPanel = dynamic(
  () => import('@/app/(mdd)/_components/ChartsPanel'),
  { ssr: false }
)

interface MddContentDisplayProps {
    data: RawApiResponse;
    query: MddQueryInput;
}

export default function MddContentDisplay({ data, query }: MddContentDisplayProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 duration-700">
      <SummaryTable summary={data.summary} meta={data.meta} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="bg-primary h-6 w-1.5 rounded-full" />
            Buy Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BuySignalPanel signals={data.buy_signal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="bg-primary h-6 w-1.5 rounded-full" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <ValidationPanel validation={data.validation} />
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
