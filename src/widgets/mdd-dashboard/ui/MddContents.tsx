'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ThemeToggle } from '@shared/ui/ThemeToggle'
import { Text } from '@shared/ui/text'
import { Button } from '@shared/ui/button'
import { cn } from '@shared/lib/utils'
import {
  ControlPanel,
  MethodologyGuide,
  useMddQuery,
  MddQueryInputSchema,
  MddLoadingState,
} from '@features/mdd-analysis'
import { QldCalculatorPanel } from '@features/qld-calculator'
import { IpoCalculatorPanel } from '@features/ipo-subscription'
import MddContentDisplay from './MddContentDisplay'

type TabType = 'mdd' | 'qld' | 'ipo'

function resolveQuery(params: URLSearchParams) {
  const parsed = MddQueryInputSchema.safeParse({
    symbol: params.get('symbol') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    interval: params.get('interval') ?? undefined,
  })
  return parsed.success ? parsed.data : MddQueryInputSchema.parse({})
}

function resolveInitialTab(
  params: URLSearchParams
): TabType {
  const tab = params.get('tab')
  return tab === 'qld' || tab === 'ipo' ? tab : 'mdd'
}

function MddDashboardTab({ query }: { query: ReturnType<typeof resolveQuery> }) {
  const { data, isFetching } = useMddQuery(query)

  return (
    <>
      <ControlPanel value={query} />
      {isFetching ? <MddLoadingState /> : <MddContentDisplay data={data} query={query} />}
    </>
  )
}

export default function MddContents() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = resolveQuery(searchParams)

  const tabParam = resolveInitialTab(searchParams)
  const [activeTab, setActiveTab] = useState<TabType>(tabParam)

  // URL query params 변경 시 탭 상태 자동 동기화
  useEffect(() => {
    setActiveTab(resolveInitialTab(searchParams))
  }, [searchParams])

  const handleTabChange = useCallback(
    (nextTab: TabType) => {
      setActiveTab(nextTab)
      const nextParams = new URLSearchParams(searchParams.toString())
      if (nextTab === 'mdd') {
        nextParams.delete('tab')
      } else {
        nextParams.set('tab', nextTab)
      }
      const qs = nextParams.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-zinc-950 dark:to-black">
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <Text as="h1" variant="h2" className="text-foreground text-2xl font-black tracking-tighter sm:text-3xl">
              MDD <span className="text-primary">INSIGHT</span>
            </Text>
            <Text as="p" variant="small" textColor="muted" className="mt-1 text-[12px] font-semibold tracking-widest uppercase">
              Advanced Risk & EVH Portfolio Suite
            </Text>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <div className="grid w-full grid-cols-1 gap-1 rounded-xl border border-border/80 bg-muted/60 p-1 sm:w-auto sm:grid-cols-3 shadow-xs backdrop-blur">
              <Button
                type="button"
                variant={activeTab === 'mdd' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('mdd')}
                className={cn(
                  'h-8 text-xs font-extrabold transition-all',
                  activeTab === 'mdd'
                    ? 'bg-background text-foreground shadow-xs hover:bg-background border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                📊 MDD 리스크 분석
              </Button>
              <Button
                type="button"
                variant={activeTab === 'qld' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('qld')}
                className={cn(
                  'h-8 text-xs font-extrabold transition-all',
                  activeTab === 'qld'
                    ? 'bg-background text-foreground shadow-xs hover:bg-background border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ⚡ QLD 80:20 EVH 계산기
              </Button>
              <Button
                type="button"
                variant={activeTab === 'ipo' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('ipo')}
                className={cn(
                  'h-8 text-xs font-extrabold transition-all',
                  activeTab === 'ipo'
                    ? 'bg-background text-foreground shadow-xs hover:bg-background border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                🏛️ 공모주 청약 계산기
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <MethodologyGuide />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {activeTab === 'mdd' ? (
          <MddDashboardTab query={query} />
        ) : activeTab === 'qld' ? (
          <QldCalculatorPanel />
        ) : (
          <IpoCalculatorPanel />
        )}
      </main>
    </div>
  )
}
