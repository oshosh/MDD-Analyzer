'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home } from 'lucide-react'

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-100">404 - 페이지를 찾을 수 없습니다</CardTitle>
            <p className="text-xs text-slate-400">요청하신 자산이나 경로가 존재하지 않습니다.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4 text-xs text-slate-300">
          올바른 종목 티커(예: SPY, AAPL, 005930)를 검색창에 입력하시거나 메인 대시보드로 이동해 주세요.
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <Button asChild className="flex items-center gap-2 font-bold">
            <Link href="/">
              <Home className="h-4 w-4" />
              대시보드로 돌아가기
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
