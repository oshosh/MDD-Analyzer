'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function MddError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500/20 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-100">데이터를 불러올 수 없습니다</CardTitle>
            <p className="text-xs text-slate-400">MDD 데이터 처리 중 오류가 발생했습니다.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 font-mono text-xs text-red-300">
            {error.message || '요청 처리에 실패했습니다.'}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <Button
            onClick={reset}
            className="flex items-center gap-2 bg-primary font-bold shadow-md hover:scale-[1.02] active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
