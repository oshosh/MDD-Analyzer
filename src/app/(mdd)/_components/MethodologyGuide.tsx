'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  HelpCircle,
  BookOpen,
  Calculator,
  TrendingUp,
  ShieldAlert,
  Globe,
} from 'lucide-react'
import { ClientOnly } from '@/components/shared/ClientOnly'

export default function MethodologyGuide() {
  return (
    <ClientOnly>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 hover:bg-primary/5 gap-2 rounded-full font-bold"
          >
            <HelpCircle className="text-primary h-4 w-4" />
            가이드 및 방법론
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
              <BookOpen className="text-primary h-6 w-6" />
              MDD INSIGHT 활용 가이드
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* 섹션 1: 기본 지표 */}
            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2 font-bold">
                <Calculator className="h-5 w-5" />
                <h3>기본 지표 정의</h3>
              </div>
              <div className="text-muted-foreground grid gap-3 text-[13px] leading-relaxed">
                <p>
                  <strong className="text-foreground">
                    ● 낙폭 (Drawdown):
                  </strong>{' '}
                  전고점 대비 현재 가격이 얼마나 하락했는지를 나타냅니다.
                  <code className="bg-muted text-primary ml-1 rounded px-1.5 py-0.5">
                    DD = (현재가 - 전고점) / 전고점
                  </code>
                </p>
                <p>
                  <strong className="text-foreground">
                    ● 최대 낙폭 (MDD):
                  </strong>{' '}
                  특정 기간 동안 발생한 낙폭 중 가장 깊은 골짜기를 의미하며,
                  투자자가 겪을 수 있는 최악의 시나리오를 보여줍니다.
                </p>
              </div>
            </section>

            {/* 섹션 2: 매수 신호 원리 */}
            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2 font-bold">
                <TrendingUp className="h-5 w-5" />
                <h3>매수 신호 및 통계 계산 원리</h3>
              </div>
              <div className="text-muted-foreground space-y-4 text-[13px] leading-relaxed">
                <div className="bg-primary/5 border-primary/10 space-y-3 rounded-2xl border p-4">
                  <p className="text-foreground text-sm font-bold italic">
                    `왜 모든 티커의 승률이 좋게 나오지 않나요?`
                  </p>
                  <p>
                    본 서비스는 단순히 승률을 보여주는 것이 아니라,{' '}
                    <strong>`통계적 우위(Alpha)`</strong>를 분석합니다. 대부분의
                    우상향 자산은 평소에도 승률이 높습니다. 따라서 우리는 다음
                    두 수치를 비교합니다.
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <strong className="text-foreground">
                        평상시 데이터 (Baseline):
                      </strong>{' '}
                      자산 역사상 아무 날짜에나 샀을 때의 평균값.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        현재 조건 (Signal):
                      </strong>{' '}
                      지금처럼 하락한 날에만 샀을 때의 평균값.
                    </li>
                  </ul>
                  <p className="border-primary/10 border-t pt-2">
                    <strong className="text-primary">추가 수익률/승률:</strong>{' '}
                    (현재 조건) - (평상시). 이 값이{' '}
                    <span className="font-bold text-emerald-500">양수(+)</span>
                    라면, 지금 사는 것이 평소보다 통계적으로 유리하다는
                    뜻입니다.
                  </p>
                </div>

                <div className="grid gap-2">
                  <p>
                    <strong className="text-foreground">
                      ● 독립 표본 분석:
                    </strong>{' '}
                    하락장에서 옆으로 기어갈 때 발생하는 수많은 중복 날짜를
                    제거하고, 최소 20거래일 간격을 둔{' '}
                    <strong>`독립적인 하락 사건`</strong>들만 추출하여 분석의
                    신뢰도를 높였습니다.
                  </p>
                  <p>
                    <strong className="text-foreground">
                      ● 수익률 분포 (Best/Worst):
                    </strong>{' '}
                    평균의 함정에 빠지지 않도록, 과거 유사 사례 중 가장 운이
                    나빴던 때와 좋았던 때의 범위를 모두 공개합니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 섹션 3: 데이터 해석의 팁 */}
            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2 font-bold">
                <HelpCircle className="h-5 w-5" />
                <h3>데이터 해석 가이드</h3>
              </div>
              <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-[13px]">
                <p className="text-foreground font-bold">
                  Q. 구간 체류 비중은 낮은데 왜 승률은 높은가요?
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  두 지표는 측정하는 대상이 완전히 다르기 때문입니다.
                </p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold text-amber-500">●</span>
                    <p className="text-muted-foreground">
                      <strong>구간 체류 비중:</strong> 자산이 역사적으로 안전한
                      구간(예: 낙폭 -5% 이내)에 머물렀던{' '}
                      <strong>시간의 총량</strong>을 측정합니다. 변동성이 큰
                      자산일수록 하락 구간에 오래 머물러 이 수치가 낮습니다.
                    </p>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-emerald-500">●</span>
                    <p className="text-muted-foreground">
                      <strong>1년 뒤 승률:</strong> 자산이 깊은 하락장에 빠진{' '}
                      <strong>`특정한 날`에 매수</strong>했을 때의 미래 성과를
                      측정합니다.
                    </p>
                  </li>
                </ul>
                <p className="text-foreground border-t border-amber-500/10 pt-2 font-medium">
                  <span className="text-primary font-bold">핵심:</span> 하락
                  구간에 오래 머무는 자산일수록(체류 비중 저하), 역설적으로 그
                  **골짜기(하락장)에서 매수하는 사람에게는 평소보다 훨씬 큰 수익
                  기회(승률 상승)**가 주어집니다.
                </p>
              </div>
            </section>

            {/* 섹션 4: 환율의 영향 */}
            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2 font-bold">
                <Globe className="h-5 w-5" />
                <h3>환노출(KRW) MDD의 중요성</h3>
              </div>
              <div className="text-muted-foreground text-[13px] leading-relaxed">
                <p>
                  미국 주식 투자 시, 달러 가격은 떨어져도 환율이 오르면 원화
                  기준 손실은 상쇄될 수 있습니다.
                  <code className="bg-muted text-primary my-2 block rounded px-1.5 py-0.5 text-center italic">
                    원화 가격 = 달러 가격 × 현재 환율
                  </code>
                  본 계산기는 환율 변동을 실시간 반영하여, 한국 투자자가 실제로
                  느끼는 **`실질 리스크`**와 **`원화 기준 매수 적기`**를 별도로
                  산출합니다.
                </p>
              </div>
            </section>

            {/* 섹션 4: 주의사항 */}
            <section className="space-y-3">
              <div className="text-destructive flex items-center gap-2 font-bold">
                <ShieldAlert className="h-5 w-5" />
                <h3>투자 주의사항</h3>
              </div>
              <p className="text-muted-foreground bg-destructive/5 border-destructive/10 rounded-xl border p-3 text-[12px] leading-tight">
                제공되는 모든 통계는 과거 데이터를 기반으로 한 백테스팅
                결과이며, 미래의 수익을 보장하지 않습니다. 데이터 오류를
                방지하기 위해 이상치(Outlier)를 제거하는 로직이 포함되어 있으나,
                데이터 제공처의 사정에 따라 실제 수치와 미세한 차이가 있을 수
                있습니다.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  )
}
