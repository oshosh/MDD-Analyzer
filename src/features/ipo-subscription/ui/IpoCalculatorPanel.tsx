'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Landmark,
  RefreshCw,
} from 'lucide-react'
import type { IpoBrokerSnapshot, IpoOfferingSnapshot } from '@entities/ipo'
import { todayKstIso } from '@shared/lib/date'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { Input } from '@shared/ui/input'
import { Text } from '@shared/ui/text'
import {
  calculateIpoSubscription,
  createSuggestedShareAmounts,
  getEqualExpectedAllocation,
  getProportionalRatio,
  validateSubscriptionShares,
  type IpoCalculationBasis,
} from '../lib/calculator'
import { useIpoSubscriptionQuery } from '../queries/queryOptions'
import {
  BrokerComparisonTable,
  Ipo56CostEffectiveComparisonTable,
  IpoBrokerConditions,
  IpoOfferingSelector,
  IpoOfferingSummary,
  IpoSharesCalculationTable,
  MetricCard,
  SourceBadge,
} from './components'
import {
  addIsoDays,
  formatDecimal,
  formatKoreanDateTime,
  formatWon,
  maximumSubscriptionShares,
} from '../lib/formatters'

export function IpoCalculatorPanel() {
  const [selectedDate, setSelectedDate] = useState(() => todayKstIso())
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(
    null
  )
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null)
  const [basis, setBasis] = useState<IpoCalculationBasis>('expected-final')
  const [sharesInput, setSharesInput] = useState('')

  const { data, isError, isFetching, isLoading, error, refetch } =
    useIpoSubscriptionQuery(selectedDate)

  const offerings = useMemo(() => data?.offerings ?? [], [data?.offerings])
  const offering =
    offerings.find((candidate) => candidate.id === selectedOfferingId) ??
    offerings[0] ??
    null

  const selectedBroker =
    offering?.brokers.find((broker) => broker.id === selectedBrokerId) ??
    offering?.brokers[0] ??
    null

  const selectedBrokerKey = selectedBroker?.id ?? null
  const selectedBrokerMinimum = selectedBroker?.minSubscriptionShares ?? null

  useEffect(() => {
    setSelectedOfferingId((current) =>
      offerings.some((candidate) => candidate.id === current)
        ? current
        : (offerings[0]?.id ?? null)
    )
  }, [offerings])

  useEffect(() => {
    setSelectedBrokerId((current) => {
      if (offering === null) return null
      return offering.brokers.some((broker) => broker.id === current)
        ? current
        : (offering.brokers[0]?.id ?? null)
    })
  }, [offering])

  useEffect(() => {
    if (selectedBrokerKey === null) {
      setSharesInput('')
      return
    }

    setSharesInput(
      selectedBrokerMinimum === null ? '' : String(selectedBrokerMinimum)
    )
  }, [selectedBrokerKey, selectedBrokerMinimum])

  useEffect(() => {
    if (selectedBroker === null) return
    if (
      basis === 'expected-final' &&
      getProportionalRatio(selectedBroker, 'expected-final') === null &&
      getProportionalRatio(selectedBroker, 'current') !== null
    ) {
      setBasis('current')
    }
  }, [basis, selectedBroker])

  const shares = Number(sharesInput)
  const hasEnteredShares = sharesInput.trim().length > 0
  const proportionalRatio = selectedBroker
    ? getProportionalRatio(selectedBroker, basis)
    : null
  const equalExpectedAllocation = selectedBroker
    ? getEqualExpectedAllocation(selectedBroker, basis)
    : null
  const sharesError =
    selectedBroker !== null && hasEnteredShares
      ? validateSubscriptionShares(shares, selectedBroker)
      : null

  const hasCalculatorInputs =
    offering !== null &&
    selectedBroker !== null &&
    offering.offerPrice !== null &&
    offering.depositRate !== null &&
    proportionalRatio !== null &&
    selectedBroker.minSubscriptionShares !== null &&
    selectedBroker.subscriptionUnitShares !== null

  const selectedCalculation = useMemo(() => {
    if (
      !hasCalculatorInputs ||
      offering === null ||
      offering.offerPrice === null ||
      offering.depositRate === null ||
      proportionalRatio === null ||
      !hasEnteredShares ||
      sharesError !== null
    ) {
      return null
    }

    return calculateIpoSubscription({
      shares,
      offerPrice: offering.offerPrice,
      depositRate: offering.depositRate,
      proportionalRatio,
      expectedEqualAllocation: equalExpectedAllocation,
      proportionalAllocationRoundingRule:
        selectedBroker.proportionalAllocationRoundingRule,
    })
  }, [
    equalExpectedAllocation,
    hasCalculatorInputs,
    hasEnteredShares,
    offering,
    proportionalRatio,
    selectedBroker,
    shares,
    sharesError,
  ])

  const calculationRows = useMemo(() => {
    if (
      !hasCalculatorInputs ||
      offering === null ||
      offering.offerPrice === null ||
      offering.depositRate === null ||
      selectedBroker === null ||
      proportionalRatio === null
    ) {
      return []
    }

    const offerPrice = offering.offerPrice
    const depositRate = offering.depositRate
    const candidates = new Set(createSuggestedShareAmounts(selectedBroker))
    if (hasEnteredShares && sharesError === null) candidates.add(shares)

    return [...candidates]
      .sort((left, right) => left - right)
      .map((candidateShares) =>
        calculateIpoSubscription({
          shares: candidateShares,
          offerPrice,
          depositRate,
          proportionalRatio,
          expectedEqualAllocation: equalExpectedAllocation,
          proportionalAllocationRoundingRule:
            selectedBroker.proportionalAllocationRoundingRule,
        })
      )
  }, [
    equalExpectedAllocation,
    hasCalculatorInputs,
    hasEnteredShares,
    offering,
    proportionalRatio,
    selectedBroker,
    shares,
    sharesError,
  ])

  const maximumShares =
    selectedBroker === null ? null : maximumSubscriptionShares(selectedBroker)
  const sliderValue =
    selectedBroker === null ||
    selectedBroker.minSubscriptionShares === null ||
    maximumShares === null ||
    !Number.isFinite(shares)
      ? 0
      : Math.min(
          Math.max(shares, selectedBroker.minSubscriptionShares),
          maximumShares
        )

  function selectOffering(nextOffering: IpoOfferingSnapshot): void {
    setSelectedOfferingId(nextOffering.id)
    setSelectedBrokerId(nextOffering.brokers[0]?.id ?? null)
    setBasis('expected-final')
  }

  function selectBroker(nextBroker: IpoBrokerSnapshot): void {
    setSelectedBrokerId(nextBroker.id)
    setSharesInput(
      nextBroker.minSubscriptionShares === null
        ? ''
        : String(nextBroker.minSubscriptionShares)
    )
  }

  return (
    <section className="space-y-5">
      {/* Header Desk Card */}
      <Card className="border-primary/20 bg-card/90 shadow-primary/5 overflow-hidden py-0 shadow-xl backdrop-blur">
        <CardContent className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="bg-primary/10 pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase">
                <Landmark className="size-4" /> IPO Subscription Desk
              </div>
              <Text
                as="h2"
                variant="h2"
                className="mt-2 font-black tracking-tight sm:text-3xl"
              >
                날짜별 공모주 · 증권사별 청약 보드
              </Text>
              <Text
                as="p"
                variant="small"
                textColor="muted"
                className="mt-2 max-w-2xl leading-6"
              >
                일정·공모가·인수인 정보는 OpenDART에서 조회합니다. 경쟁률과
                청약조건은 공식 증권사 원천이 연결된 증권사에만 표시됩니다.
              </Text>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                aria-label="이전 청약일"
                onClick={() =>
                  setSelectedDate((current) => addIsoDays(current, -1))
                }
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <label className="sr-only" htmlFor="ipo-calendar-date">
                청약일 선택
              </label>
              <div className="bg-background flex h-9 items-center gap-2 rounded-md border px-3">
                <CalendarDays className="text-primary size-4" />
                <Input
                  className="h-7 w-35 border-0 bg-transparent p-0 text-sm font-bold shadow-none focus-visible:ring-0"
                  id="ipo-calendar-date"
                  onChange={(event) => setSelectedDate(event.target.value)}
                  type="date"
                  value={selectedDate}
                />
              </div>
              <Button
                aria-label="다음 청약일"
                onClick={() =>
                  setSelectedDate((current) => addIsoDays(current, 1))
                }
                size="icon"
                variant="outline"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                disabled={isFetching}
                onClick={() => void refetch()}
                size="sm"
                variant="outline"
              >
                <RefreshCw
                  className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
                새로고침
              </Button>
            </div>
          </div>
          {data ? (
            <div className="relative mt-4 flex flex-col gap-2 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={data.calendarSource} />
                <SourceBadge source={data.competitionSource} />
              </div>
              <Text as="span" variant="small" textColor="muted">
                갱신 {formatKoreanDateTime(data.generatedAt)}
              </Text>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <Card className="border-primary/15 bg-card/85 py-0 shadow-lg backdrop-blur">
          <CardContent className="flex min-h-80 animate-pulse flex-col justify-center gap-4 py-8">
            <div className="bg-muted h-7 w-48 rounded" />
            <div className="bg-muted h-4 w-full max-w-lg rounded" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-muted h-32 rounded-xl" />
              <div className="bg-muted h-32 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Error Card */}
      {isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <CircleAlert className="text-destructive mt-0.5 size-5 shrink-0" />
              <div>
                <Text as="p" variant="p" className="font-semibold">
                  공모주 데이터를 불러오지 못했습니다.
                </Text>
                <Text as="p" variant="small" textColor="muted" className="mt-1">
                  {error instanceof Error
                    ? error.message
                    : '잠시 후 다시 시도해 주세요.'}
                </Text>
              </div>
            </div>
            <Button onClick={() => void refetch()} variant="outline">
              다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Empty State */}
      {!isLoading && !isError && offerings.length === 0 ? (
        <Card className="border-primary/15 bg-card/90 py-0 shadow-sm">
          <CardContent className="flex min-h-56 flex-col justify-center py-8 text-center">
            <CalendarDays className="text-primary mx-auto size-8" />
            <Text as="p" variant="p" className="mt-3 font-bold">
              선택한 날짜에 확인된 일반공모가 없습니다.
            </Text>
            <Text
              as="p"
              variant="small"
              textColor="muted"
              className="mx-auto mt-2 max-w-xl leading-6"
            >
              OpenDART 공시 기준 결과입니다. 청약 일정이 없는 날은 정상적으로 빈
              목록을 표시하며, 예시 종목으로 대체하지 않습니다.
            </Text>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Offering Content */}
      {offering !== null ? (
        <>
          <IpoOfferingSelector
            offerings={offerings}
            selectedOfferingId={offering.id}
            selectedDate={selectedDate}
            onSelectOffering={selectOffering}
          />

          <IpoOfferingSummary offering={offering} selectedDate={selectedDate} />

          {offering.brokers.length > 0 ? (
            <>
              <BrokerComparisonTable
                brokers={offering.brokers}
                selectedBrokerId={selectedBroker?.id ?? null}
                onSelect={selectBroker}
              />

              <Ipo56CostEffectiveComparisonTable
                basis={basis}
                offering={offering}
                onSelectBroker={selectBroker}
              />
            </>
          ) : (
            <Card className="border-primary/15 bg-card/90 py-0 shadow-sm">
              <CardContent className="py-7 text-sm">
                <Text as="p" variant="p" className="font-bold">
                  참여 증권사 정보가 아직 확인되지 않았습니다.
                </Text>
                <Text as="p" variant="small" textColor="muted" className="mt-1">
                  OpenDART 인수인정보가 없는 공시이거나, 추가 정정 공시를
                  기다리는 상태일 수 있습니다.
                </Text>
              </CardContent>
            </Card>
          )}

          {selectedBroker !== null ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <IpoBrokerConditions
                selectedBroker={selectedBroker}
                basis={basis}
                onSetSharesInput={setSharesInput}
                onSetBasis={setBasis}
              />

              <div className="space-y-5">
                {/* Interim Expected Metric Cards */}
                <Card className="border-primary/20 bg-card/90 py-0 shadow-sm">
                  <CardContent className="px-5 py-5 sm:px-6">
                    <div className="mb-3">
                      <Text as="h3" variant="large" className="font-bold">
                        선택 주수의 잠정 예상
                      </Text>
                      <Text
                        as="p"
                        variant="small"
                        textColor="muted"
                        className="mt-0.5"
                      >
                        확정 배정이 아니며, 현재와 예상 마감의 균등값을 서로
                        섞지 않습니다.
                      </Text>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <MetricCard
                        label="필요 증거금"
                        value={
                          selectedCalculation
                            ? formatWon(selectedCalculation.deposit)
                            : '—'
                        }
                      />
                      <MetricCard
                        label="비례 기대"
                        value={
                          selectedCalculation
                            ? `${formatDecimal(selectedCalculation.proportionalExpectedShares)}주`
                            : '—'
                        }
                      />
                      <MetricCard
                        label="균등 기대"
                        value={
                          selectedCalculation
                            ? selectedCalculation.equalExpectedShares === null
                              ? '—'
                              : `${formatDecimal(selectedCalculation.equalExpectedShares)}주`
                            : '—'
                        }
                      />
                      <MetricCard
                        emphasized
                        label="총 기대"
                        value={
                          selectedCalculation
                            ? selectedCalculation.totalExpectedShares === null
                              ? '—'
                              : `${formatDecimal(selectedCalculation.totalExpectedShares)}주`
                            : '—'
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <IpoSharesCalculationTable
                  selectedBroker={selectedBroker}
                  basis={basis}
                  shares={shares}
                  sharesInput={sharesInput}
                  sharesError={sharesError}
                  hasCalculatorInputs={hasCalculatorInputs}
                  calculationRows={calculationRows}
                  maximumShares={maximumShares}
                  sliderValue={sliderValue}
                  onSharesInputChange={setSharesInput}
                />
              </div>
            </div>
          ) : null}

          {data?.dataMode !== 'broker-live' ? (
            <div className="text-muted-foreground bg-muted/20 flex gap-2 rounded-xl border border-dashed px-4 py-3 text-xs leading-5">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                현재 일정·공모가·인수인 정보는 OpenDART 실데이터입니다. 증권사별
                장중 경쟁률, 한도, 수수료, 균등/비례 풀은 공식 증권사 실시간
                원천이 연결되기 전까지 `—`로 표시됩니다. 임의 수치나 증권사 간
                평균으로 대체하지 않습니다.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
