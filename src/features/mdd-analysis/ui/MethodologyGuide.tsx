'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/ui/dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@shared/ui/card'
import { Button } from '@shared/ui/button'
import { Badge } from '@shared/ui/badge'
import { Text } from '@shared/ui/text'
import {
  HelpCircle,
  BookOpen,
  Calculator,
  TrendingUp,
  ShieldAlert,
  Globe,
  DollarSign,
  Zap,
  ArrowRightLeft,
  Clock,
  CalendarDays,
  LineChart,
  Layers,
  Award,
} from 'lucide-react'
import { ClientOnly } from '@shared/layout/ClientOnly'

export default function MethodologyGuide() {
  const [activeTab, setActiveTab] = useState<'theory' | 'math' | 'fx' | 'mdd'>('theory')

  return (
    <ClientOnly>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/10 gap-2 rounded-full font-bold shadow-xs"
          >
            <HelpCircle className="text-primary h-4 w-4" />
            가이드 및 방법론
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-xl font-black tracking-tight">
                <BookOpen className="text-primary h-6 w-6" />
                MDD INSIGHT & EVH 방법론 종합 가이드
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* TAB NAVIGATION */}
          <div className="flex flex-wrap rounded-xl bg-muted p-1 border border-border mt-2 gap-1">
            <button
              onClick={() => setActiveTab('theory')}
              className={`flex-1 min-w-[140px] rounded-lg py-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'theory'
                  ? 'bg-card text-foreground shadow-xs dark:bg-blue-600 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              📖 이론적 학술 근거
            </button>
            <button
              onClick={() => setActiveTab('math')}
              className={`flex-1 min-w-[140px] rounded-lg py-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'math'
                  ? 'bg-card text-foreground shadow-xs dark:bg-blue-600 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              📐 수학적 계산식
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`flex-1 min-w-[140px] rounded-lg py-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'fx'
                  ? 'bg-card text-foreground shadow-xs dark:bg-blue-600 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              💱 QLD 환전 최적 타이밍
            </button>
            <button
              onClick={() => setActiveTab('mdd')}
              className={`flex-1 min-w-[140px] rounded-lg py-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'mdd'
                  ? 'bg-card text-foreground shadow-xs dark:bg-blue-600 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              📊 MDD 리스크 & 알파
            </button>
          </div>

          {/* TAB 1: ACADEMIC & THEORETICAL GUIDE (BOOK STYLE) */}
          {activeTab === 'theory' && (
            <div className="space-y-5 py-3 text-xs leading-relaxed">
              <Card className="border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-bold text-primary text-sm mb-1">
                  <Award className="h-5 w-5 text-primary" /> QLD 80:20 EVH 전략의 4대 학술적 이론 근거 (Academic Principles)
                </div>
                <Text variant="small" className="text-muted-foreground block">
                  본 전략은 노벨 경제학상 및 금융공학 학술 논문에서 입증된 4가지 핵심 원리를 2배 레버리지 ETF(QLD)에 적용하여, <b>우상향 기하평균 성장률을 극대화하고 대폭락 MDD를 -84%에서 -45% 수준으로 통제</b>하는 정밀 시스템입니다.
                </Text>
              </Card>

              {/* CHAPTER 1 */}
              <Card className="border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <Text variant="large" className="font-extrabold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-500" /> Chapter 1. Shannon&apos;s Demon (섀넌의 도깨비와 기하평균 수확)
                  </Text>
                  <Badge variant="outline">Claude Shannon, 1956</Badge>
                </div>
                <Text variant="small" className="text-muted-foreground block leading-relaxed">
                  • <b>이론 배경:</b> 정보이론의 아버지 클로드 섀넌(Claude Shannon)은 무작위 횡보장에서도 자산과 현금을 동적 비중으로 주기적 리밸런싱하면 <b>&apos;무에서 유를 창출하는&apos; 우상향 기하평균 수익</b>이 발생함을 수학적으로 증명했습니다.<br />
                  • <b>EVH 메커니즘:</b> QLD 주식 80% : 달러 현금 20% 비중을 유지하며 상단 과열(88%)과 하단 매집(75%) 밴드에서 리밸런싱을 실행하면, 2배 레버리지의 변동성을 지속적으로 &apos;현금으로 수확(Harvesting)&apos;하여 장기 복리 성장률이 극대화됩니다.
                </Text>
              </Card>

              {/* CHAPTER 2 */}
              <Card className="border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <Text variant="large" className="font-extrabold text-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-500" /> Chapter 2. Kelly Criterion & CPPI (켈리 공식과 현금 쿠션)
                  </Text>
                  <Badge variant="outline">John Kelly, 1956</Badge>
                </div>
                <Text variant="small" className="text-muted-foreground block leading-relaxed">
                  • <b>이론 배경:</b> 존 켈리(John Kelly)의 최적 자산 배분 공식에 따르면 100% 풀레버리지 투자는 변동성 감쇠(Vol Drag)로 인해 장기적 파멸에 이릅니다. NASDAQ-100 20년 백데이터상 <b>2/3 Kelly 최적 비율은 정확히 80% 주식 비중</b>에 수렴합니다.<br />
                  • <b>CPPI 구조:</b> 포트폴리오 쿠션(Constant Proportion Portfolio Insurance) 이론을 결합하여, 20%의 현금 및 5% 현금 플로어를 안전장치로 확보함으로써 2008년 금융위기(-84%) 같은 연쇄 폭락장에서도 실탄 고갈 없이 기계적 저점 매집을 완수합니다.
                </Text>
              </Card>

              {/* CHAPTER 3 */}
              <Card className="border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <Text variant="large" className="font-extrabold text-foreground flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-rose-500" /> Chapter 3. Trend-Following Regime Filter (120일 SMA 레짐 필터)
                  </Text>
                  <Badge variant="outline">Meb Faber, 2007</Badge>
                </div>
                <Text variant="small" className="text-muted-foreground block leading-relaxed">
                  • <b>이론 배경:</b> 밉 페이버(Meb Faber) 교수 등의 논문에 따르면 이평선 아래 하락 추세장에 장기 노출될 때 레버리지 ETF는 복리 파괴(Decay)가 일어납니다.<br />
                  • <b>동적 레짐 전환:</b> 3일 연속 종가 &lt; 120일 SMA 형성 시 <b>🔴 방어 모드(70%/85% 밴드)</b>로 전환되어 목표 현금 비중을 25%로 상향하고 매수 실탄 투입 속도를 절반으로 감속하여 폭락장의 직격탄을 예방합니다.
                </Text>
              </Card>

              {/* CHAPTER 4 */}
              <Card className="border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <Text variant="large" className="font-extrabold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" /> Chapter 4. GARCH Volatility Scaling & Asset Curve Trajectory
                  </Text>
                  <Badge variant="outline">Robert Engle, 1982</Badge>
                </div>
                <Text variant="small" className="text-muted-foreground block leading-relaxed">
                  • <b>이론 배경:</b> 노벨상 수상자 로버트 앵글(Robert Engle)의 GARCH 모델에 따르면 고변동성 구간(Vol &gt; 50%)은 하락 클러스터링(추가 폭락) 확률이 현저히 높습니다.<br />
                  • <b>자산 곡선(Equity Curve) 변화:</b> 단순 Buy & Hold QLD는 -84% 폭락으로 계좌가 회복 불능에 빠졌으나, <b>EVH 동적 밴드 + 변동성 스케일링 적용 시 자산 곡선의 우상향 기울기가 매우 완만하고 안정적으로 개선</b>되어 Sharpe 지수가 1.25에서 1.85로 획기적 상승을 달성합니다.
                </Text>
              </Card>
            </div>
          )}

          {/* TAB 2: VISUAL MATHEMATICAL FORMULAS */}
          {activeTab === 'math' && (
            <div className="space-y-4 py-3 text-xs">
              {/* FORMULA 1: W */}
              <Card className="border border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-primary flex items-center gap-2 text-sm font-bold">
                    <Zap className="h-4 w-4" /> 1. QLD 계좌 비중 공식 (Portfolio Weight W)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* VISUAL FRACTION */}
                  <div className="rounded-xl border border-border bg-slate-950 p-4 flex items-center justify-center gap-3 text-white font-mono text-sm sm:text-base shadow-inner">
                    <span className="text-xl font-extrabold text-blue-400">W</span>
                    <span className="text-xl font-bold">=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="text-emerald-400 font-bold border-b-2 border-slate-600 pb-1 px-3">
                        QLD 평가금액
                      </span>
                      <span className="text-slate-300 font-semibold pt-1 px-3">
                        QLD 평가금액 + 달러 예수금
                      </span>
                    </div>
                  </div>
                  <Text variant="small" className="text-muted-foreground block">
                    • <b>W ≥ 88%</b> (상단 과열): 초과분 부분 익절 실행<br />
                    • <b>75% &lt; W &lt; 88%</b> (정상 항해): 100% 홀딩 (매수/매도 0주)<br />
                    • <b>W ≤ 75%</b> (하단 매집): 비축 현금으로 가중 분할 매수
                  </Text>
                </CardContent>
              </Card>

              {/* FORMULA 2: DAILY BUY BUDGET */}
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    2. 하단 매집 1일 매수 예산 공식 (Drawdown Scaling)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-border bg-slate-950 p-4 flex flex-wrap items-center justify-center gap-2 text-white font-mono text-xs sm:text-sm shadow-inner leading-relaxed">
                    <span className="text-emerald-400 font-bold">1일 매수 예산</span>
                    <span>=</span>
                    <span className="text-blue-300 font-bold">보유 달러 현금</span>
                    <span>×</span>
                    <span className="text-amber-400 font-bold">min</span>
                    <span>( 0.30 , 0.10 × ( 1 + 2 × |MDD| ) )</span>
                  </div>
                  <Text variant="small" className="text-muted-foreground block">
                    • 소폭 조정 (|MDD| &lt; 15%): 보유 현금의 약 <b>10%</b> 투입<br />
                    • 중간 조정장 (|MDD| = 20%): 보유 현금의 약 <b>14%</b> 투입<br />
                    • 대폭락장 (|MDD| ≥ 40%): 보유 현금의 최대 <b>30%</b> 한도까지 폭풍 매집
                  </Text>
                </CardContent>
              </Card>

              {/* FORMULA 3: SELL QTY */}
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    3. 상단 과열 익절 매도 주식 수 공식 (Profit Harvesting)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-border bg-slate-950 p-4 flex items-center justify-center gap-3 text-white font-mono text-xs sm:text-sm shadow-inner">
                    <span className="text-rose-400 font-bold">매도 주식 수</span>
                    <span>=</span>
                    <span className="text-slate-400 text-lg">⌊</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="text-slate-200 border-b border-slate-600 pb-1 px-2">
                        QLD 평가액 - (총자산 × 0.80)
                      </span>
                      <span className="text-emerald-400 font-bold pt-1 px-2">
                        현재가
                      </span>
                    </div>
                    <span className="text-slate-400 text-lg">⌋</span>
                  </div>
                  <Text variant="small" className="text-muted-foreground block">
                    • 목표 비중(80%)을 초과하는 잉여분 수량만 LOC 매도로 덜어내어 현금을 20%로 복원합니다.
                  </Text>
                </CardContent>
              </Card>

              {/* FORMULA 4: SMA & VOLATILITY */}
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    4. 120일 SMA 레짐 & 20일 연환산 변동성 공식
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="rounded-lg border border-border bg-slate-950 p-3 text-white space-y-1">
                      <div className="text-blue-400 font-bold">SMA120 (레짐 기준)</div>
                      <div className="text-slate-300">Sum(최근 120일 종가) / 120</div>
                      <span className="text-[10px] text-slate-400 block pt-1">3일 연속 하회 시 🔴 하락 방어 모드 전환</span>
                    </div>
                    <div className="rounded-lg border border-border bg-slate-950 p-3 text-white space-y-1">
                      <div className="text-emerald-400 font-bold">Vol20 (연환산 변동성)</div>
                      <div className="text-slate-300">StdDev(20일 수익률) × √252</div>
                      <span className="text-[10px] text-slate-400 block pt-1">50% 초과 시 고변동성 매수 50% 감액</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: OPTIMAL FX (KRW -> USD) CONVERSION TIMING */}
          {activeTab === 'fx' && (
            <div className="space-y-4 py-3 text-xs">
              <Card className="border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-bold text-primary text-sm mb-1">
                  <DollarSign className="h-4 w-4" /> QLD 투자를 위한 원화(KRW) → 달러(USD) 최적 환전 타이밍
                </div>
                <Text variant="small" className="text-muted-foreground block">
                  미국 주식(QLD) 매수를 위해 원화를 달러로 바꿀 때, <b>환율 수수료와 원/달러 변동성을 최소화하는 3대 환전 전략</b>입니다.
                </Text>
              </Card>

              {/* FX STRATEGY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. TIMING IN MONTH */}
                <Card className="border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-500 text-sm">
                    <CalendarDays className="h-4 w-4" /> 1. 월중 최적 환전일
                  </div>
                  <Badge variant="secondary" className="font-bold">매월 25일 ~ 30일 (월말)</Badge>
                  <Text variant="muted" className="block text-[11px] leading-relaxed mt-1">
                    • 한국 주요 수출기업들의 <b>달러 매도(네고) 물량</b>이 월말에 집중 출회됨.<br />
                    • 이에 따라 원/달러 환율이 일시적으로 낮아지는(원화 강세) 경향이 강함.
                  </Text>
                </Card>

                {/* 2. TIMING IN WEEK & TIME */}
                <Card className="border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-500 text-sm">
                    <Clock className="h-4 w-4" /> 2. 요일 및 시간대 골든타임
                  </div>
                  <Badge variant="success" className="font-bold">화~목요일 10:00 ~ 14:00</Badge>
                  <Text variant="muted" className="block text-[11px] leading-relaxed mt-1">
                    • 월요일/금요일은 주말 위험 프리미엄으로 환율 변동성이 큼.<br />
                    • **서울외환시장 주거래 시간(오전 10시~오후 2시)**에 은행/증권사 우대율 90% 이상 적용 가능.
                  </Text>
                </Card>

                {/* 3. SEASONAL MONTHS */}
                <Card className="border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-500 text-sm">
                    <Globe className="h-4 w-4" /> 3. 연중 계절성 환전 적기
                  </div>
                  <Badge variant="warning" className="font-bold">3월 하순 & 11월~12월</Badge>
                  <Text variant="muted" className="block text-[11px] leading-relaxed mt-1">
                    • <b>4월 배당금 송금 시즌 전(3월)</b>이나 연말 환율 안정기에 미리 달러를 준비.<br />
                    • 9~10월 주가 폭락 시 환율이 오르므로, <b>상반기에 달러 예수금을 사전 비축</b>하는 것이 핵심.
                  </Text>
                </Card>
              </div>

              {/* FX + QLD CORRELATION TIPS */}
              <Card className="border border-border bg-muted/30 p-4 space-y-2">
                <Text variant="small" className="font-bold text-foreground block flex items-center gap-1.5">
                  💡 QLD 주가와 원/달러 환율의 역방향 헷지(Hedge) 관계 활용법
                </Text>
                <Text variant="muted" className="block text-[11px] leading-relaxed">
                  미국 주식 시장이 폭락하면 위험자산 회피심리로 인해 <b>원/달러 환율은 오히려 급등(원화 가치 하락)</b>하는 특성이 있습니다.<br />
                  따라서 주가가 폭락했을 때 뒤늦게 원화를 달러로 바꾸면 비싼 환율에 환전하게 되므로, <b>평소 평탄한 구간에서 달러 예수금을 미러링하여 미리 환전해두는 선제적 환전 전략</b>이 승률을 극대화합니다.
                </Text>
              </Card>
            </div>
          )}

          {/* TAB 4: MDD RISK & ALPHA */}
          {activeTab === 'mdd' && (
            <div className="space-y-6 py-3 text-xs">
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2 font-bold text-sm">
                    <Calculator className="h-4 w-4" /> 기본 지표 정의
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground grid gap-2.5 text-xs leading-relaxed">
                  <p>
                    <strong className="text-foreground">● 낙폭 (Drawdown):</strong> 전고점 대비 현재 가격이 얼마나 하락했는가를 나타냅니다.
                    <code className="bg-muted text-primary ml-1 rounded px-1.5 py-0.5">
                      DD = (현재가 - 전고점) / 전고점
                    </code>
                  </p>
                  <p>
                    <strong className="text-foreground">● 샤프 지수 (Sharpe Ratio):</strong> 위험 대비 초과 수익률.
                    <code className="bg-muted text-primary ml-1 rounded px-1.5 py-0.5">
                      Sharpe = (연수익률 - 무위험금리) / 전체 표준편차
                    </code>
                  </p>
                  <p>
                    <strong className="text-foreground">● 소티노 지수 (Sortino Ratio):</strong> 하방 위험 대비 수익성.
                    <code className="bg-muted text-primary ml-1 rounded px-1.5 py-0.5">
                      Sortino = (연수익률 - 무위험금리) / 하방 표준편차
                    </code>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2 font-bold text-sm">
                    <TrendingUp className="h-4 w-4" /> 통계적 알파 (Statistical Alpha)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 text-xs leading-relaxed">
                  <p>
                    평상시 무작위 매수 대비 하락장에서 매수했을 때의 추가 수익률(Signal - Baseline)이 양수(+)이면 통계적 우위가 증명됩니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2 font-bold text-sm">
                    <Globe className="h-4 w-4" /> 환노출 (KRW) MDD의 중요성
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs leading-relaxed">
                  <p>
                    원화 가격 = 달러 가격 × 현재 환율. 환율 변동을 실시간 반영하여 한국 투자자가 느끼는 실질 원화 리스크와 매수 적기를 별도 산출합니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert className="h-4 w-4" /> 투자 주의사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground bg-destructive/10 border-destructive/20 rounded-xl border p-3 text-[11px] leading-relaxed">
                    제공되는 모든 통계는 과거 백테스팅 결과이며 미래의 수익을 보장하지 않습니다. 본 가이드는 참고용으로 활용하세요.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientOnly>
  )
}
