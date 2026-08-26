'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQldQuery } from '../hooks/useQldQuery'
import { calculateQldMetrics } from '../lib/calculator'
import { QldStrategyComparisonChart } from './QldStrategyComparisonChart'
import type { QldAccountInput } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import { Badge } from '@shared/ui/badge'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { Text } from '@shared/ui/text'
import {
  RefreshCw,
  Copy,
  TrendingUp,
  ShieldAlert,
  DollarSign,
  PieChart,
  Activity,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowDownCircle,
  ArrowUpCircle,
  PauseCircle,
} from 'lucide-react'

const STORAGE_KEYS = {
  SHARES: 'mdd_qld_shares',
  AVG_PRICE: 'mdd_qld_avg_price',
  CASH: 'mdd_qld_cash',
  LIVE_PRICE: 'mdd_qld_live_price',
}

export function QldCalculatorPanel() {
  const { data: candles, isLoading, isError, refetch } = useQldQuery()

  const defaultShares = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_QLD_SHARES || '0')
  const defaultAvgPrice = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_QLD_AVG_PRICE || '0')
  const defaultCash = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_QLD_CASH || '0')

  const [showGuide, setShowGuide] = useState(true)
  const [input, setInput] = useState<QldAccountInput>({
    shares: defaultShares,
    avgPrice: defaultAvgPrice,
    cash: defaultCash,
    livePrice: 0,
  })

  // Load from localStorage on client mount
  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEYS.SHARES)
    const a = localStorage.getItem(STORAGE_KEYS.AVG_PRICE)
    const c = localStorage.getItem(STORAGE_KEYS.CASH)
    const l = localStorage.getItem(STORAGE_KEYS.LIVE_PRICE)

    setInput({
      shares: s !== null ? parseFloat(s) : defaultShares,
      avgPrice: a !== null ? parseFloat(a) : defaultAvgPrice,
      cash: c !== null ? parseFloat(c) : defaultCash,
      livePrice: l !== null ? parseFloat(l) : 0,
    })
  }, [defaultShares, defaultAvgPrice, defaultCash])

  // Auto-fill livePrice when API candles finish loading if user hasn't modified or as fallback
  useEffect(() => {
    if (candles && candles.length > 0) {
      const latestClose = candles[candles.length - 1].close
      setInput((prev) => {
        if (!prev.livePrice) {
          return { ...prev, livePrice: latestClose }
        }
        return prev
      })
    }
  }, [candles])

  const handleInputChange = (field: keyof QldAccountInput, val: string) => {
    const num = parseFloat(val) || 0
    setInput((prev) => {
      const next = { ...prev, [field]: num }
      if (field === 'shares') localStorage.setItem(STORAGE_KEYS.SHARES, String(num))
      if (field === 'avgPrice') localStorage.setItem(STORAGE_KEYS.AVG_PRICE, String(num))
      if (field === 'cash') localStorage.setItem(STORAGE_KEYS.CASH, String(num))
      if (field === 'livePrice') localStorage.setItem(STORAGE_KEYS.LIVE_PRICE, String(num))
      return next
    })
  }

  const candlesArray = useMemo(() => candles || [], [candles])

  const result = useMemo(() => {
    return calculateQldMetrics(input, candlesArray)
  }, [input, candlesArray])

  const handleCopyOrders = () => {
    const { orders } = result

    if (orders.type === 'hold') {
      alert('현재는 [정상 항해 구간]이므로 오늘 밤 제출할 주문이 없습니다. (100% 홀딩)')
      return
    }

    if (orders.type === 'loss_blocked') {
      alert(
        `⚠️ 손실 구간 매도 금지!\n\n현재가($${input.livePrice.toFixed(2)}) < 평단가($${input.avgPrice.toFixed(2)})\n손절 매도는 금지되며, $${(result.depositCalc.neededForTarget).toFixed(2)} 입금을 권장합니다.`
      )
      return
    }

    let text = ''
    if (orders.type === 'sell' && orders.sellQty) {
      text = `[QLD 초과분 익절 LOC 매도 주문]\n• 종목: QLD\n• 수량: ${orders.sellQty}주 @ $${input.livePrice.toFixed(2)} LOC`
    } else if (orders.type === 'buy' && orders.buy1Qty && orders.buy2Qty) {
      text = `[QLD 2분할 LOC 매수 주문]\n1. 평단가 방어 LOC: ${orders.buy1Qty}주 @ ${orders.buy1Price?.toFixed(2)}\n2. 바닥 할인 LOC: ${orders.buy2Qty}주 @ ${orders.buy2Price?.toFixed(2)}`
    }

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('주문이 클립보드에 복사되었습니다!\n\n' + text)
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER (깔끔하고 직관적인 헤더) ── */}
      <Card className="border border-border bg-card/80 text-card-foreground shadow-xl backdrop-blur-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {candlesArray.length > 0 && result.sma120 > 0 && (
                <Badge
                  variant={result.isDowntrend ? 'destructive' : 'success'}
                  className="font-bold text-xs"
                >
                  {result.isDowntrend ? '🔴 장기 하락장 (현금 방어 모드)' : '🟢 일반/상승장 (정상 운용 모드)'}
                </Badge>
              )}
              <Text as="h2" variant="h3" className="font-extrabold tracking-tight text-foreground text-lg sm:text-xl">
                QLD 80:20 스마트 리밸런싱 계산기
              </Text>
            </div>
            <Text variant="muted" className="mt-1 block text-xs">
              주가 폭등 시 일부 익절하여 달러 현금을 챙기고, 폭락 시 비축한 달러로 저가 매수하여 안전하게 복리로 굴리는 전략입니다.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs font-bold"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '실시간 시세 조회 중...' : 'QLD 실시간 시세 갱신'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API FETCH NOTICE */}
      {isError && (
        <Card className="border-destructive/40 bg-destructive/10 p-4">
          <Text variant="small" className="font-bold text-destructive">
            ⚠️ QLD 주가 데이터 동기화 실패
          </Text>
          <Text variant="muted" className="mt-1 block">
            서버 API 연결 중 오류가 발생했습니다. 아래 수치 입력란에 현재가를 직접 입력하여 계산할 수 있습니다.
          </Text>
        </Card>
      )}

      {/* ── 💡 EASY USER GUIDE ACCORDION ── */}
      <Card className="border border-primary/30 bg-primary/5 p-4 shadow-md">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <Text variant="large" className="font-bold text-foreground">
              💡 초간단 운용 원리 가이드 (왜 88%에서 팔아도 바로 안 살까?)
            </Text>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {showGuide && (
          <div className="mt-4 space-y-4 border-t border-border pt-4 text-xs leading-relaxed">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* BAND 1 */}
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                <div className="flex items-center gap-1.5 font-bold text-rose-500">
                  <ArrowUpCircle className="h-4 w-4" /> 상단 과열 (88% 이상)
                </div>
                <Text variant="small" className="mt-1 block text-foreground">
                  • 주가 폭등으로 주식 비중 88% 돌파함.<br />
                  • 초과분(약 8%)만 <b>일부 익절</b>해서 현금 20%를 채움.<br />
                  • <b>핵심:</b> 익절하면 비중이 다시 <b>80%로 내려옴!</b> (75%보다 크니까 당연히 매수 안 함, 푹 쉼)
                </Text>
              </div>

              {/* BAND 2 */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-500">
                  <PauseCircle className="h-4 w-4" /> 정상 항해 (75% ~ 88%)
                </div>
                <Text variant="small" className="mt-1 block text-foreground">
                  • 가장 이상적인 복리 구간임.<br />
                  • 사고팔고 자주 하면 수수료/세금으로 계좌 녹음.<br />
                  • <b>핵심:</b> 75% ~ 88% 사이에서는 <b>매수도 매도도 0주! 100% 홀딩함.</b>
                </Text>
              </div>

              {/* BAND 3 */}
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-500">
                  <ArrowDownCircle className="h-4 w-4" /> 하단 매집 (75% 이하)
                </div>
                <Text variant="small" className="mt-1 block text-foreground">
                  • 주가 폭락이나 월급 입금으로 비중 75% 이하 떨어짐.<br />
                  • 아껴둔 20% 현금 실탄으로 <b>2분할 LOC 매수</b> 제출함.<br />
                  • 낙폭(MDD)이 깊을수록 현금 투입 비율을 더 늘려서 평단가 낮춤.
                </Text>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <Text variant="small" className="font-bold text-primary block">
                📌 매달 원금(월급) 입금하면 어떻게 됨?
              </Text>
              <Text variant="small" className="text-muted-foreground block">
                • 계좌에 달러 현금을 넣으면 총자산이 늘어나면서 QLD 비중(W)이 <b>자연스럽게 75% 이하로 낮아짐.</b><br />
                • 비중이 75% 밑으로 내려가는 순간 <b>자동으로 [하단 매집 모드]가 켜져서</b> 밤마다 2분할 매수를 시작함!
              </Text>
            </div>
          </div>
        )}
      </Card>

      {/* ── 📈 INTERACTIVE EQUITY CURVE & MAGNIFIER SIMULATOR ── */}
      <QldStrategyComparisonChart />

      {/* ── 2. INPUTS & 3. DIAGNOSTICS GRID ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* INPUT FORM */}
        <Card className="border border-border bg-card p-5 shadow-lg">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center justify-between text-base font-bold">
              <Text as="span" variant="large" className="flex items-center gap-2 text-foreground font-bold">
                <DollarSign className="h-4 w-4 text-primary" /> 2. 내 계좌 정보 입력
              </Text>
              <Text variant="small" textColor="brand" className="font-normal">
                자동 저장 됨 ⚡
              </Text>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                QLD 보유 수량 (주)
              </Label>
              <Input
                type="number"
                value={input.shares || ''}
                onChange={(e) => handleInputChange('shares', e.target.value)}
                className="font-bold text-foreground focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                QLD 1주 평균단가 ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={input.avgPrice || ''}
                onChange={(e) => handleInputChange('avgPrice', e.target.value)}
                className="font-bold text-foreground focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                보유 달러 예수금 ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={input.cash || ''}
                onChange={(e) => handleInputChange('cash', e.target.value)}
                className="font-bold text-foreground focus:border-primary"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                현재가 / 적용 가격 ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={input.livePrice || ''}
                onChange={(e) => handleInputChange('livePrice', e.target.value)}
                className="font-bold text-foreground focus:border-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* DIAGNOSTICS DASHBOARD */}
        <Card className="border border-border bg-card p-5 shadow-lg space-y-4">
          <CardHeader className="p-0 pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <PieChart className="h-4 w-4 text-emerald-500" /> 3. 계좌 상태 및 지표 진단
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">QLD 평가액</Text>
                <Text variant="large" className="font-extrabold text-foreground">
                  ${result.stockVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">총 운용 자산</Text>
                <Text variant="large" className="font-extrabold text-foreground">
                  ${result.totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">현재 QLD 비중 (W)</Text>
                <Text variant="large" textColor="down" className="font-extrabold">
                  {(result.weight * 100).toFixed(1)}%
                </Text>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">전고점 낙폭 (MDD)</Text>
                <Text variant="large" className="font-extrabold text-amber-500 dark:text-amber-400">
                  {result.ath > 0 ? `${(result.mdd * 100).toFixed(2)}%` : '데이터 수집 중'}
                </Text>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">120일 SMA (레짐 기준)</Text>
                <Text
                  variant="large"
                  textColor={
                    result.sma120 > 0
                      ? input.livePrice >= result.sma120
                        ? 'brand'
                        : 'up'
                      : 'subtle'
                  }
                  className="font-extrabold"
                >
                  {result.sma120 > 0 ? `$${result.sma120.toFixed(2)}` : '계산 중'}
                </Text>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <Text variant="muted" className="block">20일 변동성 (연환산)</Text>
                <Text
                  variant="large"
                  textColor={result.vol20 > 0.5 ? 'up' : 'brand'}
                  className="font-extrabold"
                >
                  {result.vol20 > 0 ? `${(result.vol20 * 100).toFixed(1)}%` : '계산 중'}
                </Text>
              </div>
            </div>

            {/* STATUS BANNER */}
            <div
              className={`rounded-xl border p-4 text-center text-xs font-bold leading-relaxed ${
                result.status.type === 'upper_loss'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  : result.status.type === 'upper_profit'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : result.status.type === 'lower'
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                      : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              }`}
            >
              <Text variant="large" className="block font-bold">
                {result.status.title}
              </Text>
              <Text variant="small" className="mt-1 block font-normal opacity-90">
                {result.status.description}
              </Text>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. ORDER DISPLAY PANEL ── */}
      <Card className="border border-border bg-card p-6 shadow-2xl">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> 4. 오늘 밤 제출할 주문표
            </CardTitle>
            <Text variant="muted" className="text-xs block mt-0.5">
              내 계좌 비중과 시장 상황을 분석하여 도출된 오늘 밤 실행할 최적 주문입니다.
            </Text>
          </div>
          <Button onClick={handleCopyOrders} className="font-bold">
            <Copy className="mr-1.5 h-4 w-4" /> 주문 복사하기
          </Button>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* LOSS BLOCKED DISPLAY */}
          {result.orders.type === 'loss_blocked' && (
            <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <Text variant="large" className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> ⚠️ 매도 불가 — 현금 추가 입금 필요
                </Text>
                <Badge variant="destructive">손실 구간 (매도 차단)</Badge>
              </div>
              <Text variant="small" className="block leading-relaxed">
                현재가(${input.livePrice.toFixed(2)})가 평단가(${input.avgPrice.toFixed(2)}) 이하이므로 매도 시{' '}
                <Text as="b" textColor="up">확정 손실</Text>이 발생합니다. 이 전략은 손절 매도를 허용하지 않으며, 아래 원금 입금 기능을 활용하세요.
              </Text>
            </div>
          )}

          {/* SELL ORDER DISPLAY */}
          {result.orders.type === 'sell' && (
            <div className="rounded-xl border-2 border-destructive/60 bg-destructive/10 p-5 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <Text variant="large" className="font-bold text-destructive">
                  🔴 초과분 익절 LOC 매도
                </Text>
                <Badge variant="success">
                  수익률 +{result.orders.profitRate?.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-baseline gap-4">
                <Text variant="h2" className="font-extrabold text-foreground">
                  ${input.livePrice.toFixed(2)}
                </Text>
                <Text variant="large" className="font-bold text-destructive">
                  수량: <Text as="span" variant="h3" className="font-extrabold text-foreground">{result.orders.sellQty}</Text> 주
                </Text>
              </div>
              <Text variant="small" className="block leading-relaxed">
                • 장마감 시 {result.orders.sellQty}주 체결 시 약 <b>${result.orders.sellRevenue?.toFixed(2)}</b> 달러 현금이 확보됩니다.<br />
                • 목표 비중({(result.bands.target * 100).toFixed(0)}%)으로 정밀 복원됩니다.
              </Text>
            </div>
          )}

          {/* BUY ORDER DISPLAY */}
          {result.orders.type === 'buy' && (
            <div className="space-y-3">
              {result.orders.modifiers && result.orders.modifiers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.orders.modifiers.map((mod, idx) => (
                    <Badge key={idx} variant="outline" className="border-primary/40 bg-primary/10 text-xs font-bold text-primary">
                      {mod}
                    </Badge>
                  ))}
                </div>
              )}
              {result.orders.floorActive ? (
                <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-5 text-center">
                  <Text variant="large" className="font-bold text-amber-600 dark:text-amber-300">
                    🛡️ 현금 플로어(5%) 보호 활성화
                  </Text>
                  <Text variant="muted" className="mt-1 block">
                    최소 현금 비중 보호를 위해 오늘 매수를 일시 보류합니다.
                  </Text>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border-2 border-blue-500/60 bg-blue-500/10 p-4 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between">
                      <Text variant="small" className="font-bold text-blue-500 dark:text-blue-400">
                        🔵 주문 1: 평단가 방어 LOC
                      </Text>
                      <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold">
                        0.5회분
                      </Badge>
                    </div>
                    <Text variant="h3" className="font-extrabold text-foreground">
                      ${result.orders.buy1Price?.toFixed(2)}
                    </Text>
                    <Text variant="small" className="font-semibold text-blue-500 dark:text-blue-300">
                      수량: <Text as="span" variant="large" className="font-bold text-foreground">{result.orders.buy1Qty}</Text> 주
                    </Text>
                    <Text variant="muted" className="block text-[11px]">
                      종가가 내 평단가 이하일 때만 체결되어 방어
                    </Text>
                  </div>
                  <div className="rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between">
                      <Text variant="small" className="font-bold text-emerald-500 dark:text-emerald-400">
                        🟢 주문 2: 바닥 할인 LOC
                      </Text>
                      <Badge variant="success" className="px-2 py-0.5 text-[10px] font-bold">
                        -1.5% 할인
                      </Badge>
                    </div>
                    <Text variant="h3" className="font-extrabold text-foreground">
                      ${result.orders.buy2Price?.toFixed(2)}
                    </Text>
                    <Text variant="small" className="font-semibold text-emerald-500 dark:text-emerald-300">
                      수량: <Text as="span" variant="large" className="font-bold text-foreground">{result.orders.buy2Qty}</Text> 주
                    </Text>
                    <Text variant="muted" className="block text-[11px]">
                      종가 -1.5% 추가 하락 시 바닥 최저가 체결
                    </Text>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOLD DISPLAY */}
          {result.orders.type === 'hold' && (
            <div className="rounded-xl border border-border bg-muted/20 p-6 text-center space-y-2">
              <div className="text-3xl">☕</div>
              <Text variant="large" className="font-bold text-foreground block">
                오늘 밤은 매매 없이 홀딩(관망)합니다.
              </Text>
              <Text variant="muted" className="max-w-md mx-auto leading-relaxed block">
                현재 비중({(result.weight * 100).toFixed(1)}%)이 동적 목표 밴드 안에 유지되고 있습니다.
              </Text>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. MONTHLY DEPOSIT SIMULATOR ── */}
      <Card className="border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> 5. 월간 원금 적립 시뮬레이터 (달러 입금 가이드)
          </CardTitle>
          <Text variant="muted" className="text-xs">
            달러 현금을 입금하면 계좌의 현금 비중이 늘어나고 주식 비중(W)이 낮아집니다.
          </Text>
        </CardHeader>

        <CardContent className="p-0 space-y-3">
          {/* CURRENT ACCOUNT STATUS SUMMARY */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 border border-border text-xs">
            <div className="flex items-center gap-3">
              <span className="font-medium text-muted-foreground">현재 계좌 비중:</span>
              <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                주식 {(result.weight * 100).toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 font-bold">
                달러 현금 {(100 - result.weight * 100).toFixed(1)}%
              </Badge>
            </div>
            <Text variant="muted" className="text-[11px]">
              목표 비율: 주식 {(result.bands.target * 100).toFixed(0)}% : 현금 {(100 - result.bands.target * 100).toFixed(0)}%
            </Text>
          </div>

          {/* 2 ACTION CARDS */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* CARD 1: TARGET 20% CASH RESTORATION */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <Text variant="small" className="font-bold text-foreground flex items-center gap-1.5">
                  💰 목표 안전 현금({(100 - result.bands.target * 100).toFixed(0)}%) 비축 상태
                </Text>
                {result.depositCalc.neededForTarget > 0 ? (
                  <Badge variant="destructive" className="text-[10px]">입금 권장</Badge>
                ) : (
                  <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">확보 완료</Badge>
                )}
              </div>
              <Text variant="h4" className="text-lg font-black text-foreground font-mono">
                {result.depositCalc.neededForTarget > 0
                  ? `$${result.depositCalc.neededForTarget.toFixed(2)} 필요`
                  : '안전 현금 확보 완료 ($0)'}
              </Text>
              <Text variant="muted" className="block text-[11px] leading-relaxed">
                {result.depositCalc.neededForTarget > 0
                  ? `주식 비중이 ${(result.bands.target * 100).toFixed(0)}%를 초과했습니다. $${result.depositCalc.neededForTarget.toFixed(2)}를 입금하면 목표 현금 비중(${(100 - result.bands.target * 100).toFixed(0)}%)이 복원됩니다.`
                  : `현재 현금 비중이 ${(100 - result.weight * 100).toFixed(1)}%로 목표치(${(100 - result.bands.target * 100).toFixed(0)}%)보다 충분하여 추가 현금 입금이 필요하지 않습니다.`}
              </Text>
            </div>

            {/* CARD 2: DIP BUYING 75% FORCE TRIGGER */}
            <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <Text variant="small" className="font-bold text-blue-500 dark:text-blue-300 flex items-center gap-1.5">
                  🔵 하단 저가 매수({(result.bands.lower * 100).toFixed(0)}%) 강제 유도 입금액
                </Text>
                {result.depositCalc.neededForLower > 0 ? (
                  <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px]">매수 유도용</Badge>
                ) : (
                  <Badge variant="default" className="bg-blue-600 text-white text-[10px]">매수 조건 충족</Badge>
                )}
              </div>
              <Text variant="h4" className="text-lg font-black text-blue-400 font-mono">
                {result.depositCalc.neededForLower > 0
                  ? `$${result.depositCalc.neededForLower.toFixed(2)}`
                  : '이미 매수 조건 충족'}
              </Text>
              <Text variant="muted" className="block text-[11px] leading-relaxed">
                {result.depositCalc.neededForLower > 0
                  ? `현금 $${result.depositCalc.neededForLower.toFixed(2)}를 추가 입금하면 주식 비중이 ${(result.bands.lower * 100).toFixed(0)}%로 낮아져 오늘 밤 즉시 저가 매수가 발동됩니다.`
                  : `현재 주식 비중이 이미 ${(result.bands.lower * 100).toFixed(0)}% 이하이므로 추가 입금 없이 오늘 밤 즉시 저가 매수가 실행됩니다.`}
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
