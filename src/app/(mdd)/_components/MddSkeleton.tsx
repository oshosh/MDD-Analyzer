'use client'

import { Skeleton } from '@/components/ui/skeleton'

export default function MddSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-zinc-950 dark:to-black">
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="mb-2 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </header>

        <Skeleton className="h-[60px] w-full rounded-[20px]" />

        <div className="mt-4 space-y-8">
          <Skeleton className="h-[120px] w-full rounded-3xl" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px] w-full rounded-3xl" />
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-[500px] w-full rounded-3xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
