'use client'

import type { IpoOfferingSnapshot } from '@entities/ipo'
import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/ui/badge'
import { Button } from '@shared/ui/button'
import { Text } from '@shared/ui/text'
import {
  formatWon,
  offeringKindLabel,
  subscriptionStatus,
} from '../../lib/formatters'

interface IpoOfferingSelectorProps {
  offerings: IpoOfferingSnapshot[]
  selectedOfferingId: string | null
  selectedDate: string
  onSelectOffering: (offering: IpoOfferingSnapshot) => void
}

export function IpoOfferingSelector({
  offerings,
  selectedOfferingId,
  selectedDate,
  onSelectOffering,
}: IpoOfferingSelectorProps) {
  if (offerings.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Text as="p" variant="p" className="font-bold">
            {selectedDate} 청약 종목
          </Text>
          <Text as="p" variant="small" textColor="muted" className="mt-0.5">
            종목을 고르면 참여 증권사와 계산 조건이 함께 전환됩니다.
          </Text>
        </div>
        <span className="text-muted-foreground text-xs">
          {offerings.length}개 확인
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {offerings.map((candidate) => {
          const selected = candidate.id === selectedOfferingId
          return (
            <Button
              key={candidate.id}
              aria-pressed={selected}
              variant={selected ? 'outline' : 'ghost'}
              className={cn(
                'h-auto w-full flex-col items-stretch justify-start p-4 text-left whitespace-normal border transition-all',
                selected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm hover:bg-primary/15'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30'
              )}
              onClick={() => onSelectOffering(candidate)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Text
                    as="p"
                    variant="p"
                    className="truncate font-bold text-foreground"
                  >
                    {candidate.name}
                  </Text>
                  <Text as="p" variant="small" textColor="muted" className="mt-1">
                    {candidate.subscriptionStartDate} ~{' '}
                    {candidate.subscriptionEndDate}
                  </Text>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary shrink-0 text-[10px] font-bold"
                >
                  {offeringKindLabel(candidate.offeringKind)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-primary text-xs font-bold">
                  {subscriptionStatus(candidate, selectedDate)}
                </span>
                <Text as="span" variant="small" textColor="muted">
                  공모가 {formatWon(candidate.offerPrice)}
                </Text>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
