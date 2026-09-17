'use client'

import { Landmark } from 'lucide-react'
import type { IpoOfferingSnapshot } from '@entities/ipo'
import { Card, CardContent } from '@shared/ui/card'
import { Text } from '@shared/ui/text'
import { MetricCard } from './MetricCard'
import { SourceBadge } from './SourceBadge'
import {
  formatDecimal,
  formatKoreanDate,
  formatShares,
  formatWon,
  offeringKindLabel,
  subscriptionStatus,
} from '../../lib/formatters'

interface IpoOfferingSummaryProps {
  offering: IpoOfferingSnapshot
  selectedDate: string
}

export function IpoOfferingSummary({
  offering,
  selectedDate,
}: IpoOfferingSummaryProps) {
  return (
    <Card className="border-primary/20 bg-card/90 overflow-hidden py-0 shadow-primary/5 shadow-xl backdrop-blur">
      <CardContent className="relative px-5 py-6 sm:px-7 sm:py-7">
        <div className="bg-primary/10 pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase">
              <Landmark className="size-4" /> {offeringKindLabel(offering.offeringKind)}
            </div>
            <div>
              <Text as="h3" variant="h2" className="tracking-tight font-black">
                {offering.name}
              </Text>
              <Text as="p" variant="small" textColor="muted" className="mt-2 leading-6">
                청약 {formatKoreanDate(offering.subscriptionStartDate)} ~{' '}
                {formatKoreanDate(offering.subscriptionEndDate)} ·{' '}
                {subscriptionStatus(offering, selectedDate)}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SourceBadge source={offering.metadataSource} />
            <SourceBadge source={offering.competitionSource} />
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="공모가" value={formatWon(offering.offerPrice)} />
          <MetricCard
            label="공모 주식수"
            value={formatShares(offering.totalOfferingShares)}
          />
          <MetricCard
            label="증거금율"
            value={
              offering.depositRate === null
                ? '—'
                : `${formatDecimal(offering.depositRate * 100, 0)}%`
            }
          />
          <MetricCard
            label="환불 / 납입일"
            value={formatKoreanDate(offering.paymentDate)}
          />
          <MetricCard
            label="배정 발표일"
            value={formatKoreanDate(offering.allocationNoticeDate)}
          />
          <MetricCard
            label="상장 예정일"
            value={formatKoreanDate(offering.listingDate)}
          />
        </div>

        {offering.offeringKind === 'rights' ||
        offering.marketPrice !== null ||
        offering.disparityRate !== null ? (
          <div className="relative mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard label="현재가" value={formatWon(offering.marketPrice)} />
            <MetricCard
              label="괴리율"
              value={
                offering.disparityRate === null
                  ? '—'
                  : `${formatDecimal(offering.disparityRate)}%`
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
