'use client'

import { useSearchParams } from 'next/navigation'
import AnalyticsPanel from '@/app/(mdd)/_components/AnalyticsPanel'
import BuySignalPanel from '@/app/(mdd)/_components/BuySignalPanel'
import ChartsPanel from '@/app/(mdd)/_components/ChartsPanel'
import ControlPanel from '@/app/(mdd)/_components/ControlPanel'
import MethodologyGuide from '@/app/(mdd)/_components/MethodologyGuide'
import RawTable from '@/app/(mdd)/_components/RawTable'
import RecoveryTable from '@/app/(mdd)/_components/RecoveryTable'
import SummaryTable from '@/app/(mdd)/_components/SummaryTable'
import ValidationPanel from '@/app/(mdd)/_components/ValidationPanel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useMddQuery } from '@/app/(mdd)/_hooks/useMddQuery'
import { MddQueryInputSchema } from '@/app/(mdd)/_lib/schemas'

function resolveQuery(params: URLSearchParams) {
  const parsed = MddQueryInputSchema.safeParse({
    symbol: params.get('symbol') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    interval: params.get('interval') ?? undefined,
  })
  return parsed.success ? parsed.data : MddQueryInputSchema.parse({})
}

export default function MddContents() {
  const searchParams = useSearchParams()
  const query = resolveQuery(searchParams)
  const { data, isFetching } = useMddQuery(query)

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-zinc-950 dark:to-black">
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="mb-2 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-foreground text-2xl font-black tracking-tighter sm:text-3xl">
              MDD <span className="text-primary">INSIGHT</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-[12px] font-semibold tracking-widest uppercase">
              Advanced Risk Calculator
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MethodologyGuide />
            <ThemeToggle />
          </div>
        </header>
        <ControlPanel value={query} />
        {isFetching ? (
          <div className="bg-card/20 border-border/60 flex items-center justify-center rounded-[24px] border border-dashed p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="border-primary/20 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
              <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">
                분석 데이터 로딩 중...
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8 duration-700">
            <SummaryTable summary={data.summary} meta={data.meta} />

            <div className="grid gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-6 w-1.5 rounded-full" />
                <h3 className="text-lg font-bold">Buy Strategy</h3>
              </div>
              <BuySignalPanel signals={data.buy_signal} />
            </div>

            <div className="grid gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-6 w-1.5 rounded-full" />
                <h3 className="text-lg font-bold">Risk Analysis</h3>
              </div>
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
            </div>

            <div className="grid gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-6 w-1.5 rounded-full" />
                <h3 className="text-lg font-bold">Performance Analytics</h3>
              </div>
              <AnalyticsPanel analytics={data.analytics} />
              <ChartsPanel charts={data.charts} />
              <RawTable rows={data.raw} meta={data.meta} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
