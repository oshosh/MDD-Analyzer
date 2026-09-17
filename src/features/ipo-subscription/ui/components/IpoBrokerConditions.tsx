'use client'

import { Building2 } from 'lucide-react'
import type { IpoBrokerSnapshot } from '@entities/ipo'
import { Button } from '@shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/ui/card'
import { Text } from '@shared/ui/text'
import {
  getProportionalRatio,
  type IpoCalculationBasis,
} from '../../lib/calculator'
import { MetricCard } from './MetricCard'
import { SourceDetails } from './SourceBadge'
import {
  brokerRatioDescription,
  formatRatio,
  formatShares,
  formatWon,
} from '../../lib/formatters'

interface IpoBrokerConditionsProps {
  selectedBroker: IpoBrokerSnapshot
  basis: IpoCalculationBasis
  onSetSharesInput: (val: string) => void
  onSetBasis: (b: IpoCalculationBasis) => void
}

export function IpoBrokerConditions({
  selectedBroker,
  basis,
  onSetSharesInput,
  onSetBasis,
}: IpoBrokerConditionsProps) {
  return (
    <Card className="border-primary/15 bg-card/90 py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="text-primary size-4" /> {selectedBroker.name} 청약
          조건
        </CardTitle>
        <CardDescription>
          증권사별 한도와 배정 풀은 다른 증권사와 섞지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="일반청약 배정"
            value={formatShares(selectedBroker.generalAllocationShares)}
          />
          <MetricCard
            label="균등 / 비례 풀"
            value={`${formatShares(selectedBroker.equalAllocationShares)} / ${formatShares(selectedBroker.proportionalAllocationShares)}`}
          />
          <MetricCard
            label="청약 수수료"
            value={formatWon(selectedBroker.applicationFee)}
          />
          <MetricCard
            label="최소 / 단위"
            value={`${formatShares(selectedBroker.minSubscriptionShares)} / ${formatShares(selectedBroker.subscriptionUnitShares)}`}
          />
        </div>

        <div>
          <Text as="p" variant="small" className="font-bold">
            한도
          </Text>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedBroker.limits.length > 0 ? (
              selectedBroker.limits.map((limit) => (
                <Button
                  key={limit.id}
                  onClick={() => onSetSharesInput(String(limit.maxShares))}
                  size="sm"
                  variant="outline"
                >
                  {limit.label} {limit.maxShares.toLocaleString('ko-KR')}주
                </Button>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">
                증권사별 한도 정보 미제공
              </span>
            )}
          </div>
        </div>

        {selectedBroker.onlineSubscriptionNote !== null ? (
          <div className="bg-muted/20 rounded-xl border p-3 text-xs leading-5">
            <p className="font-bold">온라인 청약 조건</p>
            <p className="text-muted-foreground mt-1">
              {selectedBroker.onlineSubscriptionNote}
            </p>
          </div>
        ) : null}

        <div>
          <Text as="p" variant="small" className="font-bold">
            계산 기준
          </Text>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              aria-pressed={basis === 'current'}
              className="h-auto min-h-16 justify-start px-3 py-3 text-left whitespace-normal"
              disabled={
                getProportionalRatio(selectedBroker, 'current') === null
              }
              onClick={() => onSetBasis('current')}
              variant={basis === 'current' ? 'default' : 'outline'}
            >
              <span>
                <span className="block text-xs font-extrabold">
                  현재 관측 기준
                </span>
                <span className="mt-1 block text-[11px] font-normal opacity-80">
                  비례 {formatRatio(selectedBroker.currentProportionalRatio)}
                  {selectedBroker.currentTotalCompetitionRatio !== null &&
                    ` (전체 ${formatRatio(selectedBroker.currentTotalCompetitionRatio)})`}
                </span>
              </span>
            </Button>
            <Button
              aria-pressed={basis === 'expected-final'}
              className="h-auto min-h-16 justify-start px-3 py-3 text-left whitespace-normal"
              disabled={
                getProportionalRatio(selectedBroker, 'expected-final') === null
              }
              onClick={() => onSetBasis('expected-final')}
              variant={basis === 'expected-final' ? 'default' : 'outline'}
            >
              <span>
                <span className="block text-xs font-extrabold">
                  예상 마감 기준
                </span>
                <span className="mt-1 block text-[11px] font-normal opacity-80">
                  비례 {formatRatio(selectedBroker.expectedFinalProportionalRatio)}
                </span>
              </span>
            </Button>
          </div>
          <Text as="p" variant="small" textColor="muted" className="mt-2 text-xs">
            {brokerRatioDescription(selectedBroker, basis)}
          </Text>
        </div>

        <SourceDetails source={selectedBroker.competitionSource} />
      </CardContent>
    </Card>
  )
}
