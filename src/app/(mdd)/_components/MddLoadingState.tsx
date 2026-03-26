// src/app/(mdd)/_components/MddLoadingState.tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function MddLoadingState() {
  return (
    <div className="bg-card/20 border-border/60 flex items-center justify-center rounded-[24px] border border-dashed p-12">
      <div className="flex flex-col items-center gap-4">
        <div className="border-primary/20 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
        <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">
          분석 데이터 로딩 중...
        </p>
      </div>
    </div>
  )
}
