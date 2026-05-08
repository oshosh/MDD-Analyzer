'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Info, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpacTableRow } from '../_lib/types'
import { useSpacData } from '../_hooks/useSpacData'
import { SpacScatterChart, SpacTop8Chart } from './SpacCharts'
import SpacDetail from './SpacDetail'
import SpacTable from './SpacTable'

const MERGER_STAGES = [
  '일반 운용',
  '합병 발표',
  '주총 준비',
  '주총 승인',
  '예심 승인',
  '합병 철회',
  '상장폐지 진행',
]

export default function SpacContents() {
  const [estimationBasis, setEstimationBasis] = useState<'conservative' | 'aggressive'>('conservative')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpac, setSelectedSpac] = useState<SpacTableRow | null>(null)
  const [showOnlyPositive, setShowOnlyPositive] = useState(false)
  const [activeMergerStages, setActiveMergerStages] = useState<string[]>([])
  const detailRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useSpacData(estimationBasis)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data
      .filter((item) => {
        const matchSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.symbol.includes(searchTerm)
        const matchPositive = showOnlyPositive ? item.annualYield > 0 : true
        const matchStage = activeMergerStages.length > 0 ? activeMergerStages.includes(item.mergerStage) : true
        return matchSearch && matchPositive && matchStage
      })
      .sort((a, b) => b.annualYield - a.annualYield)
  }, [data, searchTerm, showOnlyPositive, activeMergerStages])

  const topYieldSpac = filteredData[0] ?? null

  useEffect(() => {
    if (selectedSpac) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSpac])

  const toggleStage = (stage: string) => {
    setActiveMergerStages((prev) =>
      prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-semibold text-muted-foreground">OpenDART 공시와 시장 데이터를 불러오는 중입니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border border-slate-200 bg-white/75 shadow-sm lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="search" className="ml-1 text-xs font-semibold text-muted-foreground">
                종목명 검색
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="종목명 또는 6자리 코드"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-lg bg-white pl-10"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showOnlyPositive}
                onChange={(event) => setShowOnlyPositive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              연이율 플러스 종목만 보기
            </label>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/75 shadow-sm lg:col-span-2">
          <CardContent className="space-y-3 pt-6">
            <Label className="ml-1 text-xs font-semibold text-muted-foreground">합병 단계 필터</Label>
            <div className="flex flex-wrap gap-2">
              {MERGER_STAGES.map((stage) => (
                <Badge
                  key={stage}
                  variant={activeMergerStages.includes(stage) ? 'default' : 'outline'}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-[11px]"
                  onClick={() => toggleStage(stage)}
                >
                  {stage}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setEstimationBasis('conservative')}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              estimationBasis === 'conservative' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            보수적 4개월
          </button>
          <button
            type="button"
            onClick={() => setEstimationBasis('aggressive')}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              estimationBasis === 'aggressive' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            공격적 3개월
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
          <Info className="h-4 w-4 text-emerald-600" />
          기본 정렬: 연이율 높은 순
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-200 bg-white/80 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-xs font-semibold text-muted-foreground">종목 수</div>
            <div className="mt-2 text-4xl font-bold">{filteredData.length}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white/80 shadow-sm md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-xs font-semibold text-muted-foreground">청산 관점 연이율 1위</div>
            <div className="mt-2 text-2xl font-bold">
              {topYieldSpac ? (
                <>
                  {topYieldSpac.name} <span className="text-emerald-700">+{topYieldSpac.annualYield.toFixed(2)}%</span>
                </>
              ) : (
                '조건에 맞는 종목이 없습니다'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SpacTop8Chart data={filteredData} onItemClick={setSelectedSpac} />
        <SpacScatterChart data={filteredData} onItemClick={setSelectedSpac} />
      </div>

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold">국내 스팩 연이율·청산가 목록</h3>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            기본 정렬: 연이율 높은 순 · 예금 대안 후보를 먼저 보여줍니다
          </p>
        </div>
        <CardContent className="p-0">
          <SpacTable data={filteredData} onRowClick={setSelectedSpac} />
        </CardContent>
      </Card>

      <div ref={detailRef}>
        {selectedSpac ? (
          <SpacDetail spac={selectedSpac} onClose={() => setSelectedSpac(null)} />
        ) : (
          <Card className="border border-dashed border-slate-300 bg-white/60 shadow-sm">
            <CardContent className="py-8 text-sm text-muted-foreground">
              표나 차트에서 종목을 선택하면 아래에 상세 정보가 펼쳐집니다.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
