'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { useDartQuery } from '../_hooks/useDartQuery'
import { SpacTableRow } from '../_lib/types'

interface SpacDetailProps {
  spac: SpacTableRow
  onClose?: () => void
}

function won(value: number): string {
  return `${formatNumber(value).split('.')[0]}원`
}

function eok(value: number): string {
  if (!value) return '-'
  return `${formatNumber(value).replace(/\.00$/, '')}억원`
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function SpacDetail({ spac, onClose }: SpacDetailProps) {
  const { data: timeline = [], isLoading } = useDartQuery(spac.symbol)
  const expectedProfit = spac.liquidationValue3Yr - spac.currentPrice
  const depositRate = 3.3

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white/90 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">SPAC Detail</div>
            <CardTitle className="mt-1 text-2xl font-bold">
              {spac.name} <span className="font-mono text-sm text-muted-foreground">#{spac.symbol}</span>
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              현재가, 예상 분배금, 잔여투자기간을 기준으로 청산 관점 수익률을 확인합니다.
            </p>
          </div>
          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              <X className="mr-1 h-4 w-4" />
              닫기
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <Metric label="증자등기일" value={spac.capitalIncreaseDate} />
          <Metric label="상장일" value={spac.listingDate} />
          <Metric label="관리종목지정일(추정)" value={spac.managementDate} />
          <Metric label="상장폐지일(추정)" value={spac.delistingDate} />
          <Metric label="청산일(추정)" value={spac.liquidationDate} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground">현재가</div>
              <div className="mt-1 text-2xl font-bold">{won(spac.currentPrice)}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground">예상 분배금</div>
              <div className="mt-1 text-2xl font-bold">{won(spac.liquidationValue3Yr)}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground">안전마진</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {spac.safetyMargin > 0 ? '+' : ''}
                {spac.safetyMargin.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground">연환산 수익률</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {spac.annualYield > 0 ? '+' : ''}
                {spac.annualYield.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">연이율 계산 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="주당 기대차익" value={won(expectedProfit)} />
                <Metric label="총수익률" value={`${spac.totalReturn > 0 ? '+' : ''}${spac.totalReturn.toFixed(2)}%`} />
                <Metric label="예금 대비 차이" value={`${(spac.annualYield - depositRate).toFixed(2)}%p`} />
                <Metric label="잔여투자기간" value={`${spac.remainingDays}일`} />
              </div>
              <Separator />
              <p className="text-muted-foreground">
                계산식: ((예상 분배금 - 현재가) / 현재가) × (365 / 잔여투자기간 일수)
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Metric label="증권사명" value={spac.securitiesCompany} />
              <Metric label="발행규모" value={eok(spac.issueSize)} />
              <Metric label="합병성공여부" value={spac.mergerSuccess} />
              <Metric label="합병 단계" value={spac.mergerStage} />
              <Metric label="후보회사" value={spac.candidateCompany || '-'} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">예치이자율·청산가</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Metric label="1차 예치이자율" value={`${spac.interestRate1Yr.toFixed(2)}%`} />
            <Metric label="2차 예치이자율" value={`${spac.interestRate2Yr.toFixed(2)}%`} />
            <Metric label="3차 예치이자율" value={`${spac.interestRate3Yr.toFixed(2)}%`} />
            <Metric label="4차 예치이자율" value={spac.interestRate4Yr ? `${spac.interestRate4Yr.toFixed(2)}%` : '-'} />
            <Metric label="현 청산가" value={won(spac.liquidationValueCurrent)} />
            <Metric label="최종 추정 청산가" value={won(spac.liquidationValue3Yr)} />
            <Metric label="거래대금" value={`${spac.volumeAmount.toFixed(0)}억원`} />
            <Metric label="매매거래가능 여부" value={spac.mergerStage === '상장폐지 진행' ? '거래정지 가능성 확인 필요' : '거래 가능'} />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">발기인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">대표 발기인</div>
              <div className="flex flex-wrap gap-2">
                {(spac.promotersRep.length ? spac.promotersRep : [spac.promoter]).filter(Boolean).map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">전체 발기인</div>
              <div className="flex flex-wrap gap-2">
                {spac.promotersAll.length ? (
                  spac.promotersAll.map((item) => (
                    <Badge key={item} variant="secondary">{item}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">주요 공시 타임라인</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-5">
                {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
              </div>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 p-5">
                  {timeline.length ? (
                    timeline.map((item) => (
                      <a
                        key={item.rcept_no}
                        href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/40"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.rcept_dt.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3')}
                          </span>
                          <Badge variant="outline">{item.procedureTag}</Badge>
                          <span className="text-sm font-semibold">{item.report_nm}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.procedureDesc}</p>
                      </a>
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">공시 데이터가 없습니다.</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
