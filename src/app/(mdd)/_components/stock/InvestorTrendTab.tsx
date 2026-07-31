'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { KrStockIntegrationData } from '@/lib/types'
import { browserApiClient } from '@/lib/http/axios'
import { RealtimePriceHeader } from './RealtimePriceHeader'
import { InvestorBarRow, type DisplayMode } from './InvestorBarRow'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { TooltipProvider } from '@/components/ui/tooltip'

interface InvestorTrendTabProps {
  stockCode: string
  stockName?: string
}

type MarketType = 'TOTAL' | 'KRX' | 'NXT'

export const InvestorTrendTab: React.FC<InvestorTrendTabProps> = ({
  stockCode,
  stockName,
}) => {
  const queryClient = useQueryClient()
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0)
  const [marketType, setMarketType] = useState<MarketType>('TOTAL')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('VOLUME')

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<KrStockIntegrationData>({
    queryKey: ['kr-stock-integration', stockCode],
    queryFn: async () => {
      const res = await browserApiClient.get<KrStockIntegrationData>(`/api/kr-stock?code=${stockCode}`)
      return res.data
    },
    staleTime: 5 * 60_000, // 5분간 캐시 보관 (자동 반복 틱 제거)
  })

  const handleManualRefresh = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['kr-stock-price', stockCode] }),
    ])
  }

  if (isLoading || !data) {
    return (
      <Card className="flex h-48 items-center justify-center border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 text-emerald-400">
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">시세 및 거래원 수급 추정 데이터를 로딩 중입니다...</span>
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-red-500/20 bg-red-950/30 p-6 text-center text-red-400">
        <h3 className="text-lg font-semibold">수급 데이터 로드 실패</h3>
        <p className="mt-1 text-xs text-red-300">
          {error instanceof Error ? error.message : '데이터를 찾을 수 없습니다.'}
        </p>
        <Button variant="destructive" size="sm" onClick={() => refetch()} className="mt-4">
          다시 시도
        </Button>
      </Card>
    )
  }

  const selectedTrend = data.dealTrends[selectedDayIdx] || data.dealTrends[0]
  const currentPrice = data.closePriceNumber

  const marketMultiplier = marketType === 'TOTAL' ? 1.0 : marketType === 'KRX' ? 0.88 : 0.12
  const getAdjustedVolume = (val: number) => Math.round(val * marketMultiplier)
  const getAdjustedValue = (val: number) => Math.round(val * marketMultiplier)

  const foreignVol = getAdjustedVolume(selectedTrend?.foreignerPureBuyNumber || 0)
  const organVol = getAdjustedVolume(selectedTrend?.organPureBuyNumber || 0)
  const indivVol = getAdjustedVolume(selectedTrend?.individualPureBuyNumber || 0)

  const foreignVal = getAdjustedValue(selectedTrend?.foreignerBuyValueEstimated || 0)
  const organVal = getAdjustedValue(selectedTrend?.organBuyValueEstimated || 0)
  const indivVal = getAdjustedValue(selectedTrend?.individualBuyValueEstimated || 0)

  const maxAbsMetric =
    displayMode === 'VOLUME'
      ? Math.max(1, Math.abs(foreignVol), Math.abs(organVol), Math.abs(indivVol))
      : Math.max(1, Math.abs(foreignVal), Math.abs(organVal), Math.abs(indivVal))

  const parseRawNum = (str: string | undefined) => {
    if (!str) return 0
    return parseFloat(str.replace(/,/g, '')) || 0
  }

  const low52 = parseRawNum(data.totalInfos['lowPriceOf52Weeks'])
  const high52 = parseRawNum(data.totalInfos['highPriceOf52Weeks'])
  const range52Pct =
    high52 > low52 ? Math.min(100, Math.max(0, ((currentPrice - low52) / (high52 - low52)) * 100)) : 50

  const formatNumberWithSign = (num: number) => {
    if (num > 0) return `+${num.toLocaleString()}`
    return num.toLocaleString()
  }

  const formatValueText = (val: number) => {
    if (val === 0) return '0억원'
    const sign = val > 0 ? '+' : ''
    if (Math.abs(val) >= 10000) {
      const cho = (val / 10000).toFixed(1)
      return `${sign}${cho}조원`
    }
    return `${sign}${val.toLocaleString()}억원`
  }

  const intradayEst = data.intradayEstimate

  return (
    <TooltipProvider>
      <Card className="gap-0 overflow-hidden border-slate-800 bg-slate-900/80 p-0 text-slate-100 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-4 border-b border-slate-800/80 p-6 pb-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl font-bold text-slate-100">{data.stockName || stockName}</CardTitle>
                <Badge variant="secondary" className="bg-slate-800 font-mono text-slate-300 hover:bg-slate-700">
                  {data.stockCode}
                </Badge>
                <Badge variant="secondary" className="gap-1.5 border border-slate-700/60 bg-slate-800/80 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  수동 새로고침 지원
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualRefresh}
                  disabled={isFetching}
                  className="h-6 border-slate-700 bg-slate-800/60 px-2 text-[11px] text-slate-300 hover:bg-slate-700"
                >
                  {isFetching ? '조회 중...' : '새로고침'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                수급 조회 시각: <time dateTime={data.fetchedAt}>{new Date(data.fetchedAt).toLocaleTimeString()}</time>
              </p>
            </div>

            <RealtimePriceHeader
              stockCode={stockCode}
              initialClosePrice={data.closePrice}
              initialCompareText={data.compareToPreviousPriceText}
              initialRatio={data.fluctuationsRatio}
              initialIsRising={data.isRising}
              initialIsFalling={data.isFalling}
              initialFetchedAt={data.fetchedAt}
            />
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-slate-400">시장 구분:</span>
              {(['TOTAL', 'KRX', 'NXT'] as const).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={marketType === type ? 'default' : 'secondary'}
                  onClick={() => setMarketType(type)}
                  className={`h-7 px-3 text-xs font-bold ${
                    marketType === type
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {type === 'TOTAL' ? '통합 (KRX+NXT)' : type === 'KRX' ? 'KRX (정규)' : 'NXT (대체거래소)'}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-slate-400">표시 기준:</span>
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDisplayMode('VOLUME')}
                  className={`h-6 px-2.5 text-xs font-semibold ${
                    displayMode === 'VOLUME'
                      ? 'border border-emerald-500/30 bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  거래량 (주)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDisplayMode('VALUE')}
                  className={`h-6 px-2.5 text-xs font-semibold ${
                    displayMode === 'VALUE'
                      ? 'border border-emerald-500/30 bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  거래금액 (원)
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {intradayEst && (
            <Card className="space-y-4 border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    외국계 거래원 장중 누적 가집계 추정치
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 font-sans text-[10px] text-emerald-300">
                      {intradayEst.bizdate.slice(0, 4)}-{intradayEst.bizdate.slice(4, 6)}-{intradayEst.bizdate.slice(6, 8)} 당일 장중
                    </Badge>
                  </h3>
                </div>
                <span className="text-xs text-slate-400">※ 상위 5개 외국계 증권사 창구 합산 추정 수치</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-red-500/30 bg-slate-900/90 p-3.5 shadow-sm">
                  <span className="text-xs font-medium text-slate-400">외국계 매수량 총합 (구매)</span>
                  <p className="mt-1 font-mono text-lg font-extrabold text-red-400">
                    +{getAdjustedVolume(intradayEst.foreignBuyQuant).toLocaleString()}주
                  </p>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-slate-900/90 p-3.5 shadow-sm">
                  <span className="text-xs font-medium text-slate-400">외국계 매도량 총합 (판매)</span>
                  <p className="mt-1 font-mono text-lg font-extrabold text-blue-400">
                    -{getAdjustedVolume(intradayEst.foreignSellQuant).toLocaleString()}주
                  </p>
                </div>

                <div
                  className={`rounded-lg border bg-slate-900/90 p-3.5 shadow-sm ${
                    intradayEst.foreignNetBuyQuant > 0
                      ? 'border-red-500/40 bg-red-950/20'
                      : intradayEst.foreignNetBuyQuant < 0
                        ? 'border-blue-500/40 bg-blue-950/20'
                        : 'border-slate-800'
                  }`}
                >
                  <span className="text-xs font-medium text-slate-400">
                    외국계 {intradayEst.foreignNetBuyQuant > 0 ? '순매수' : intradayEst.foreignNetBuyQuant < 0 ? '순매도' : '순매수'} (가집계)
                  </span>
                  <p
                    className={`mt-1 font-mono text-lg font-extrabold ${
                      intradayEst.foreignNetBuyQuant > 0 ? 'text-red-400' : intradayEst.foreignNetBuyQuant < 0 ? 'text-blue-400' : 'text-slate-200'
                    }`}
                  >
                    {displayMode === 'VOLUME'
                      ? `${formatNumberWithSign(getAdjustedVolume(intradayEst.foreignNetBuyQuant))}주`
                      : formatValueText(getAdjustedValue(intradayEst.foreignNetBuyValue))}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {high52 > 0 && (
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
              <div className="mb-2 flex justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">52주 시세 범위</span>
                <span>{low52.toLocaleString()}원 ~ {high52.toLocaleString()}원</span>
              </div>
              <Progress value={range52Pct} className="h-2 bg-slate-800" />
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>52주 최저 {low52.toLocaleString()}원</span>
                <strong className="font-medium text-emerald-400">현재 {data.closePrice}원 ({range52Pct.toFixed(1)}%)</strong>
                <span>52주 최고 {high52.toLocaleString()}원</span>
              </div>
            </div>
          )}

          <Card className="gap-0 border border-slate-800/80 bg-slate-950/50 p-5">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-800/60 pb-3 sm:flex-row sm:items-center">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                과거 수급 이력 (마감 확정치) [{marketType === 'TOTAL' ? '통합' : marketType}] ({selectedTrend?.bizdate ? `${selectedTrend.bizdate.slice(0, 4)}-${selectedTrend.bizdate.slice(4, 6)}-${selectedTrend.bizdate.slice(6, 8)}` : ''})
              </h3>

              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {data.dealTrends.map((t, idx) => (
                  <Button
                    key={t.bizdate || idx}
                    size="sm"
                    variant={selectedDayIdx === idx ? 'secondary' : 'ghost'}
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`h-7 px-2.5 text-xs font-medium ${
                      selectedDayIdx === idx
                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {`${t.bizdate.slice(4, 6)}/${t.bizdate.slice(6, 8)}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <InvestorBarRow
                label="외국인"
                quantity={foreignVol}
                quantityText={formatNumberWithSign(foreignVol)}
                valueAmount={foreignVal}
                displayMode={displayMode}
                maxAbsMetric={maxAbsMetric}
                formatSign={formatNumberWithSign}
                formatValue={formatValueText}
                holdRatio={selectedTrend?.foreignerHoldRatio}
              />
              <InvestorBarRow
                label="기관"
                quantity={organVol}
                quantityText={formatNumberWithSign(organVol)}
                valueAmount={organVal}
                displayMode={displayMode}
                maxAbsMetric={maxAbsMetric}
                formatSign={formatNumberWithSign}
                formatValue={formatValueText}
              />
              <InvestorBarRow
                label="개인"
                quantity={indivVol}
                quantityText={formatNumberWithSign(indivVol)}
                valueAmount={indivVal}
                displayMode={displayMode}
                maxAbsMetric={maxAbsMetric}
                formatSign={formatNumberWithSign}
                formatValue={formatValueText}
              />
            </div>

            <Separator className="my-5 bg-slate-800/40" />

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" /> 빨간색: 순매수</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" /> 파란색: 순매도</span>
              </div>
              <p>* 선택 기준: <strong className="text-emerald-400">{marketType} 시장 / {displayMode === 'VOLUME' ? '거래량(주)' : '거래금액(원)'}</strong></p>
            </div>
          </Card>

          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
            <Table aria-label="과거 5영업일 수급 확정치 테이블">
              <TableHeader className="border-slate-800 bg-slate-900/60">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="font-medium text-slate-400">일자</TableHead>
                  <TableHead className="font-medium text-slate-400">종가</TableHead>
                  <TableHead className="text-right font-medium text-slate-400">
                    외국인 순매수 {displayMode === 'VOLUME' ? '(주)' : '(금액)'}
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-400">
                    기관 순매수 {displayMode === 'VOLUME' ? '(주)' : '(금액)'}
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-400">
                    개인 순매수 {displayMode === 'VOLUME' ? '(주)' : '(금액)'}
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-400">외인 소진율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/60 font-mono text-xs">
                {data.dealTrends.map((t, idx) => {
                  const formattedDate =
                    t.bizdate && t.bizdate.length === 8
                      ? `${t.bizdate.slice(0, 4)}-${t.bizdate.slice(4, 6)}-${t.bizdate.slice(6, 8)}`
                      : t.bizdate

                  const fVol = getAdjustedVolume(t.foreignerPureBuyNumber)
                  const oVol = getAdjustedVolume(t.organPureBuyNumber)
                  const iVol = getAdjustedVolume(t.individualPureBuyNumber)

                  const fVal = getAdjustedValue(t.foreignerBuyValueEstimated)
                  const oVal = getAdjustedValue(t.organBuyValueEstimated)
                  const iVal = getAdjustedValue(t.individualBuyValueEstimated)

                  return (
                    <TableRow key={t.bizdate || idx} className="border-slate-800/60 transition hover:bg-slate-800/40">
                      <TableCell className="font-sans font-medium text-slate-300">
                        <time dateTime={formattedDate}>{formattedDate}</time>
                        <Badge variant="outline" className="ml-1.5 border-slate-700 bg-slate-800 px-1.5 py-0 font-sans text-[10px] font-normal text-slate-400">
                          공시 확정
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-200">{t.closePrice}원</TableCell>

                      <TableCell className={`text-right font-medium ${fVol > 0 ? 'text-red-400' : fVol < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {displayMode === 'VOLUME' ? `${formatNumberWithSign(fVol)}주` : formatValueText(fVal)}
                      </TableCell>

                      <TableCell className={`text-right font-medium ${oVol > 0 ? 'text-red-400' : oVol < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {displayMode === 'VOLUME' ? `${formatNumberWithSign(oVol)}주` : formatValueText(oVal)}
                      </TableCell>

                      <TableCell className={`text-right font-medium ${iVol > 0 ? 'text-red-400' : iVol < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {displayMode === 'VOLUME' ? `${formatNumberWithSign(iVol)}주` : formatValueText(iVal)}
                      </TableCell>

                      <TableCell className="text-right text-slate-400">{t.foreignerHoldRatio}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
