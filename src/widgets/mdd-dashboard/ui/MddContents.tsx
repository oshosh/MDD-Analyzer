'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ThemeToggle } from '@shared/ui/ThemeToggle'
import {
  ControlPanel,
  MethodologyGuide,
  useMddQuery,
  MddQueryInputSchema,
  MddLoadingState,
} from '@features/mdd-analysis'
import { QldCalculatorPanel } from '@features/qld-calculator'
import MddContentDisplay from './MddContentDisplay'

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
  const [activeTab, setActiveTab] = useState<'mdd' | 'qld'>('mdd')

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-zinc-950 dark:to-black">
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <h1 className="text-foreground text-2xl font-black tracking-tighter sm:text-3xl">
              MDD <span className="text-primary">INSIGHT</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-[12px] font-semibold tracking-widest uppercase">
              Advanced Risk & EVH Portfolio Suite
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* TAB SELECTION MENU */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('mdd')}
                className={`rounded-lg px-4 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'mdd'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                📊 MDD 리스크 분석
              </button>
              <button
                onClick={() => setActiveTab('qld')}
                className={`rounded-lg px-4 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'qld'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                ⚡ QLD 80:20 EVH 계산기
              </button>
            </div>

            <MethodologyGuide />
            <ThemeToggle />
          </div>
        </header>

        {activeTab === 'mdd' ? (
          <>
            <ControlPanel value={query} />
            {isFetching ? (
              <MddLoadingState />
            ) : (
              <MddContentDisplay data={data} query={query} />
            )}
          </>
        ) : (
          <QldCalculatorPanel />
        )}
      </main>
    </div>
  )
}

