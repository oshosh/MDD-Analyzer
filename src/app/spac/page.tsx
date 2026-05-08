import { Suspense } from 'react'
import SpacContents from './_components/SpacContents'
import SpacSkeleton from './_components/SpacSkeleton'

export default function SpacPage() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-foreground text-2xl font-black tracking-tighter sm:text-3xl">
            SPAC <span className="text-primary">COMPARISON</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-[12px] font-semibold tracking-widest uppercase">
            Domestic SPAC Yield & Liquidation Analysis
          </p>
        </div>
      </header>
      <Suspense fallback={<SpacSkeleton />}>
        <SpacContents />
      </Suspense>
    </main>
  )
}
