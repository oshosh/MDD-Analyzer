'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { IpoBrokerSnapshot } from '@entities/ipo'
import { cn } from '@shared/lib/utils'
import DataTable from '@shared/table/DataTable'
import { Badge } from '@shared/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/ui/card'
import { Input } from '@shared/ui/input'
import type {
  IpoCalculationBasis,
  IpoSubscriptionCalculation,
} from '../../lib/calculator'
import {
  brokerRatioDescription,
  formatDecimal,
  formatDepositCompact,
  formatWon,
} from '../../lib/formatters'

interface IpoSharesCalculationTableProps {
  selectedBroker: IpoBrokerSnapshot
  basis: IpoCalculationBasis
  shares: number
  sharesInput: string
  sharesError: string | null
  hasCalculatorInputs: boolean
  calculationRows: IpoSubscriptionCalculation[]
  maximumShares: number | null
  sliderValue: number
  onSharesInputChange: (val: string) => void
}

export function IpoSharesCalculationTable({
  selectedBroker,
  basis,
  shares,
  sharesInput,
  sharesError,
  hasCalculatorInputs,
  calculationRows,
  maximumShares,
  sliderValue,
  onSharesInputChange,
}: IpoSharesCalculationTableProps) {
  const calculationColumns = useMemo<ColumnDef<IpoSubscriptionCalculation>[]>(
    () => [
      {
        accessorKey: 'shares',
        header: '신청 주수',
        size: 130,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const rowSelected =
            row.original.shares === shares && sharesError === null
          return (
            <div className="flex items-center justify-end gap-1.5 font-bold whitespace-nowrap">
              <span>{row.original.shares.toLocaleString('ko-KR')}주</span>
              {rowSelected ? (
                <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                  선택
                </Badge>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'deposit',
        header: '필요 증거금',
        size: 160,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="font-medium whitespace-nowrap">
            <span>{formatDepositCompact(row.original.deposit)}</span>
            <span className="text-muted-foreground ml-1.5 hidden text-[11px] md:inline">
              ({formatWon(row.original.deposit)})
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'proportionalExpectedShares',
        header: '비례 기대 (계산)',
        size: 130,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono whitespace-nowrap">
            {formatDecimal(row.original.proportionalExpectedShares)}주
          </span>
        ),
      },
      {
        accessorKey: 'cut56ProportionalShares',
        header:
          selectedBroker.proportionalAllocationRoundingRule ===
          'five-round-six-up'
            ? '5사6입 배정'
            : '반올림 규칙',
        size: 130,
        meta: { align: 'center' },
        cell: ({ row }) => {
          const isCostEffective = row.original.isCostEffectiveTier
          if (row.original.cut56ProportionalShares === null) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <span
                className={cn(
                  'font-bold',
                  isCostEffective
                    ? 'font-black text-rose-700 dark:text-rose-300'
                    : 'text-foreground'
                )}
              >
                {row.original.cut56ProportionalShares}주
              </span>
              {isCostEffective ? (
                <Badge
                  variant="destructive"
                  className="animate-pulse rounded-xs bg-rose-500 px-1 py-0 text-[10px] font-extrabold text-white shadow-xs"
                >
                  가성비
                </Badge>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'equalExpectedShares',
        header: '균등 기대',
        size: 120,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.equalExpectedShares === null
              ? '—'
              : `${formatDecimal(row.original.equalExpectedShares)}주`}
          </span>
        ),
      },
      {
        accessorKey: 'totalExpectedShares',
        header: '총 배정 기대',
        size: 130,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-primary font-bold whitespace-nowrap">
            {row.original.cut56TotalShares !== null
              ? `${row.original.cut56TotalShares}주`
              : row.original.totalExpectedShares === null
                ? '—'
                : `${formatDecimal(row.original.totalExpectedShares)}주`}
          </span>
        ),
      },
    ],
    [selectedBroker.proportionalAllocationRoundingRule, shares, sharesError]
  )

  return (
    <Card className="border-primary/15 bg-card/90 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-5 sm:px-6">
        <CardTitle className="text-base">신청 주수별 계산표</CardTitle>
        <CardDescription className="mt-1">
          {brokerRatioDescription(selectedBroker, basis)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5 sm:px-6">
        <div className="bg-muted/20 rounded-xl border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="text-sm font-bold" htmlFor="ipo-shares">
                신청 주수
              </label>
              <p className="text-muted-foreground mt-1 text-xs">
                {selectedBroker.minSubscriptionShares === null ||
                selectedBroker.subscriptionUnitShares === null
                  ? '증권사별 최소 청약 단위가 아직 제공되지 않았습니다.'
                  : `최소 ${selectedBroker.minSubscriptionShares.toLocaleString('ko-KR')}주 · ${selectedBroker.subscriptionUnitShares.toLocaleString('ko-KR')}주 단위`}
              </p>
            </div>
            <div className="w-full sm:w-40">
              <Input
                aria-describedby="ipo-shares-help"
                disabled={
                  selectedBroker.minSubscriptionShares === null ||
                  selectedBroker.subscriptionUnitShares === null
                }
                id="ipo-shares"
                inputMode="numeric"
                max={maximumShares ?? undefined}
                min={selectedBroker.minSubscriptionShares ?? undefined}
                onChange={(event) => onSharesInputChange(event.target.value)}
                step={selectedBroker.subscriptionUnitShares ?? 1}
                type="number"
                value={sharesInput}
              />
            </div>
          </div>
          {maximumShares !== null &&
          selectedBroker.minSubscriptionShares !== null &&
          selectedBroker.subscriptionUnitShares !== null ? (
            <>
              <input
                aria-label="신청 주수 슬라이더"
                className="accent-primary mt-5 h-2 w-full cursor-pointer"
                max={maximumShares}
                min={selectedBroker.minSubscriptionShares}
                onChange={(event) => onSharesInputChange(event.target.value)}
                step={selectedBroker.subscriptionUnitShares}
                type="range"
                value={sliderValue}
              />
              <p className="text-muted-foreground mt-2 flex justify-between text-[11px]">
                <span>
                  {selectedBroker.minSubscriptionShares.toLocaleString('ko-KR')}
                  주
                </span>
                <span>{maximumShares.toLocaleString('ko-KR')}주</span>
              </p>
            </>
          ) : null}
          <p
            className={`mt-3 text-xs ${
              sharesError ? 'text-destructive' : 'text-muted-foreground'
            }`}
            id="ipo-shares-help"
          >
            {sharesError ??
              (hasCalculatorInputs
                ? '입력한 주수는 아래 계산표에서 강조됩니다.'
                : '공모가·증거금율·비례 경쟁률·청약 단위가 모두 있어야 계산합니다.')}
          </p>
        </div>
      </CardContent>

      <CardContent className="p-0">
        <DataTable
          data={calculationRows}
          columns={calculationColumns}
          maxHeight={480}
          stickyFirstColumn
          gridLines="both"
          getRowClassName={(row) =>
            row.shares === shares && sharesError === null
              ? 'bg-primary/10 font-bold'
              : ''
          }
          emptyMessage="계산에 필요한 실시간 경쟁률 또는 증권사별 청약 조건이 아직 제공되지 않았습니다."
        />
      </CardContent>
    </Card>
  )
}
