'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Table2 } from 'lucide-react'
import type { IpoBrokerSnapshot } from '@entities/ipo'
import { cn } from '@shared/lib/utils'
import DataTable from '@shared/table/DataTable'
import { Button } from '@shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/ui/card'
import { Text } from '@shared/ui/text'
import { SourceBadge } from './SourceBadge'
import {
  formatDecimal,
  formatKoreanDateTime,
  formatRatio,
  formatShares,
  formatWon,
} from '../../lib/formatters'

interface BrokerComparisonTableProps {
  brokers: IpoBrokerSnapshot[]
  selectedBrokerId: string | null
  onSelect: (broker: IpoBrokerSnapshot) => void
}

export function BrokerComparisonTable({
  brokers,
  selectedBrokerId,
  onSelect,
}: BrokerComparisonTableProps) {
  const columns = useMemo<ColumnDef<IpoBrokerSnapshot>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '증권사 / 역할',
        size: 170,
        meta: { align: 'left' },
        cell: ({ row }) => {
          const broker = row.original
          const selected = broker.id === selectedBrokerId
          return (
            <Button
              aria-pressed={selected}
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-auto py-1 px-2 justify-start max-w-44 text-left gap-2 w-full',
                selected && 'shadow-xs'
              )}
              onClick={() => onSelect(broker)}
            >
              <Building2 className="size-4 shrink-0" />
              <span className="truncate">
                <span className="block truncate font-bold">{broker.name}</span>
                <span className="block text-[11px] font-normal truncate opacity-80">
                  {broker.role ?? '역할 미제공'}
                </span>
              </span>
            </Button>
          )
        },
      },
      {
        accessorKey: 'underwritingShares',
        header: '인수 수량',
        size: 110,
        meta: { align: 'right', className: 'whitespace-nowrap font-medium' },
        cell: ({ row }) => formatShares(row.original.underwritingShares),
      },
      {
        id: 'pools',
        header: '일반 / 균등 / 비례 풀',
        size: 140,
        meta: { align: 'left', className: 'whitespace-nowrap text-xs leading-5' },
        cell: ({ row }) => {
          const b = row.original
          return (
            <div>
              <div>일반 {formatShares(b.generalAllocationShares)}</div>
              <div>균등 {formatShares(b.equalAllocationShares)}</div>
              <div>비례 {formatShares(b.proportionalAllocationShares)}</div>
            </div>
          )
        },
      },
      {
        accessorKey: 'currentTotalCompetitionRatio',
        header: '현재 전체 경쟁률',
        size: 120,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono">
            {formatRatio(row.original.currentTotalCompetitionRatio)}
          </span>
        ),
      },
      {
        accessorKey: 'currentProportionalRatio',
        header: '현재 비례 경쟁률',
        size: 120,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary">
            {formatRatio(row.original.currentProportionalRatio)}
          </span>
        ),
      },
      {
        accessorKey: 'applicantCount',
        header: '청약 건수',
        size: 100,
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.applicantCount === null
            ? '—'
            : `${formatDecimal(row.original.applicantCount, 0)}건`,
      },
      {
        accessorKey: 'currentEqualExpectedAllocation',
        header: '현재 균등 예상',
        size: 110,
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.currentEqualExpectedAllocation === null
            ? '—'
            : `${formatDecimal(row.original.currentEqualExpectedAllocation)}주`,
      },
      {
        accessorKey: 'expectedFinalProportionalRatio',
        header: '예상 마감 비례',
        size: 120,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono">
            {formatRatio(row.original.expectedFinalProportionalRatio)}
          </span>
        ),
      },
      {
        accessorKey: 'expectedEqualAllocation',
        header: '예상 균등',
        size: 110,
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.expectedEqualAllocation === null
            ? '—'
            : `${formatDecimal(row.original.expectedEqualAllocation)}주`,
      },
      {
        accessorKey: 'expectedFinalOneShareDeposit',
        header: '1주 예상 증거금',
        size: 120,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-medium">
            {formatWon(row.original.expectedFinalOneShareDeposit)}
          </span>
        ),
      },
      {
        id: 'feesAndUnits',
        header: '수수료 / 최소·단위',
        size: 140,
        meta: { align: 'left', className: 'whitespace-nowrap text-xs leading-5' },
        cell: ({ row }) => {
          const b = row.original
          return (
            <div>
              <div>수수료 {formatWon(b.applicationFee)}</div>
              <div>
                최소 {formatShares(b.minSubscriptionShares)} / 단위{' '}
                {formatShares(b.subscriptionUnitShares)}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'competitionSource',
        header: '원천 기준시각',
        size: 140,
        meta: { align: 'left' },
        cell: ({ row }) => (
          <div className="text-xs">
            <SourceBadge source={row.original.competitionSource} />
            <Text
              as="p"
              variant="small"
              textColor="muted"
              className="mt-1 whitespace-nowrap"
            >
              {formatKoreanDateTime(row.original.competitionSource.sourceAsOf)}
            </Text>
          </div>
        ),
      },
    ],
    [selectedBrokerId, onSelect]
  )

  return (
    <Card className="border-primary/15 bg-card/90 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="text-primary size-4" /> 참여 증권사 실시간 비교
            </CardTitle>
            <CardDescription className="mt-1">
              전체 경쟁률과 비례 경쟁률을 나란히 비교합니다 (50% 균등·비례 배분 규칙으로 비례경쟁률은 전체경쟁률의 2배). 행을 선택하면 아래 계산기 조건에 반영됩니다.
            </CardDescription>
          </div>
          <span className="text-muted-foreground text-xs">
            표 안에서만 가로 스크롤
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={brokers}
          columns={columns}
          maxHeight={500}
          stickyFirstColumn
          gridLines="both"
          getRowClassName={(row) =>
            row.id === selectedBrokerId ? 'bg-primary/10 font-semibold' : ''
          }
          emptyMessage="참여 증권사 정보가 없습니다."
        />
      </CardContent>
    </Card>
  )
}
