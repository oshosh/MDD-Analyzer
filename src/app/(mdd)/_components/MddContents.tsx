'use client'

import { useSearchParams } from 'next/navigation'
import ControlPanel from '@/app/(mdd)/_components/ControlPanel'
import MethodologyGuide from '@/app/(mdd)/_components/MethodologyGuide'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useMddQuery } from '@/app/(mdd)/_hooks/useMddQuery'
import { MddQueryInputSchema } from '@/app/(mdd)/_lib/schemas'

// New imports for split components
import MddLoadingState from './MddLoadingState'
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
          <MddLoadingState />
        ) : (
          <MddContentDisplay data={data} query={query} />
        )}
      </main>
    </div>
  )
}
