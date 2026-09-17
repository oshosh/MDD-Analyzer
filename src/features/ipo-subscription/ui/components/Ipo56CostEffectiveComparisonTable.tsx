'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2 } from 'lucide-react'
import type { IpoBrokerSnapshot, IpoOfferingSnapshot } from '@entities/ipo'
import { cn } from '@shared/lib/utils'
import DataTable from '@shared/table/DataTable'
import { Badge } from '@shared/ui/badge'
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
  createSuggestedShareAmounts,
  getEqualExpectedAllocation,
  getProportionalRatio,
  type IpoCalculationBasis,
} from '../../lib/calculator'
import {
  formatDecimal,
  formatDepositCompact,
  formatRatio,
} from '../../lib/formatters'

interface Ipo56TableRow {
  shares: number
  deposit: number
  brokerCalcs: Record<
    string,
    {
      ratio: number | null
      expected: number
      cut56: number
      isCostEffective: boolean
      overLimit: boolean
    }
  >
}

interface Ipo56CostEffectiveComparisonTableProps {
  offering: IpoOfferingSnapshot
  basis: IpoCalculationBasis
  onSelectBroker: (broker: IpoBrokerSnapshot) => void
}

export function Ipo56CostEffectiveComparisonTable({
  offering,
  basis,
  onSelectBroker,
}: Ipo56CostEffectiveComparisonTableProps) {
  const offerPrice = offering.offerPrice
  const depositRate = offering.depositRate

  const activeBrokers = useMemo(() => {
    return offering.brokers.filter(
      (b) =>
        getProportionalRatio(b, basis) !== null &&
        b.proportionalAllocationRoundingRule === 'five-round-six-up'
    )
  }, [offering.brokers, basis])

  const candidateSharesList = useMemo(() => {
    if (activeBrokers.length === 0) return []
    const allAmounts = new Set<number>()
    for (const broker of activeBrokers) {
      const amounts = createSuggestedShareAmounts(broker)
      for (const amount of amounts) {
        allAmounts.add(amount)
      }
    }
    return [...allAmounts].sort((a, b) => a - b)
  }, [activeBrokers])

  const tableData = useMemo<Ipo56TableRow[]>(() => {
    if (offerPrice === null || depositRate === null) return []

    return candidateSharesList.map((shares) => {
      const deposit = shares * offerPrice * depositRate
      const brokerCalcs: Ipo56TableRow['brokerCalcs'] = {}

      for (const broker of activeBrokers) {
        const ratio = getProportionalRatio(broker, basis)
        if (ratio === null) {
          brokerCalcs[broker.id] = {
            ratio: null,
            expected: 0,
            cut56: 0,
            isCostEffective: false,
            overLimit: false,
          }
          continue
        }

        const maxLimit =
          broker.limits.length > 0
            ? Math.max(...broker.limits.map((l) => l.maxShares))
            : null
        const overLimit = maxLimit !== null && shares > maxLimit

        const expected = shares / ratio
        const integerPart = Math.floor(expected)
        const decimalPart = expected - integerPart
        const cut56 = decimalPart >= 0.6 ? integerPart + 1 : integerPart
        const isCostEffective = decimalPart >= 0.6 && decimalPart <= 0.75

        brokerCalcs[broker.id] = {
          ratio,
          expected,
          cut56,
          isCostEffective,
          overLimit,
        }
      }

      return { shares, deposit, brokerCalcs }
    })
  }, [candidateSharesList, offerPrice, depositRate, activeBrokers, basis])

  const columns = useMemo<ColumnDef<Ipo56TableRow>[]>(() => {
    const cols: ColumnDef<Ipo56TableRow>[] = [
      {
        accessorKey: 'shares',
        header: '신청주수',
        size: 110,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-bold whitespace-nowrap">
            {row.original.shares.toLocaleString('ko-KR')}주
          </span>
        ),
      },
      {
        accessorKey: 'deposit',
        header: '필요 증거금',
        size: 130,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium whitespace-nowrap">
            {formatDepositCompact(row.original.deposit)}
          </span>
        ),
      },
    ]

    for (const broker of activeBrokers) {
      const ratio = getProportionalRatio(broker, basis)
      cols.push({
        id: `broker_${broker.id}`,
        header: () => (
          <div className="text-center">
            <div className="text-xs font-black">{broker.name}</div>
            <div className="text-muted-foreground font-mono text-[10px] font-normal">
              비례 {formatRatio(ratio)}
            </div>
          </div>
        ),
        columns: [
          {
            id: `broker_${broker.id}_expected`,
            header: '비례계산',
            size: 100,
            meta: { align: 'right' },
            cell: ({ row }) => {
              const calc = row.original.brokerCalcs[broker.id]
              if (!calc || calc.ratio === null) {
                return <span className="text-muted-foreground">—</span>
              }
              if (calc.overLimit) {
                return (
                  <span className="text-muted-foreground text-[11px]">
                    한도초과
                  </span>
                )
              }
              return (
                <span className="text-muted-foreground font-mono">
                  {formatDecimal(calc.expected, 2)}
                </span>
              )
            },
          },
          {
            id: `broker_${broker.id}_cut56`,
            header: '5사6입 배정',
            size: 120,
            meta: { align: 'center' },
            cell: ({ row }) => {
              const calc = row.original.brokerCalcs[broker.id]
              if (!calc || calc.ratio === null) {
                return <span className="text-muted-foreground">—</span>
              }
              if (calc.overLimit) {
                return (
                  <span className="text-muted-foreground text-[11px]">
                    한도초과
                  </span>
                )
              }
              return (
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={cn(
                      'font-bold',
                      calc.isCostEffective
                        ? 'font-black text-rose-700 dark:text-rose-300'
                        : calc.cut56 > 0
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    )}
                  >
                    {calc.cut56}주
                  </span>
                  {calc.isCostEffective ? (
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
        ],
      })
    }

    return cols
  }, [activeBrokers, basis])

  if (
    activeBrokers.length === 0 ||
    candidateSharesList.length === 0 ||
    offerPrice === null ||
    depositRate === null
  ) {
    return null
  }

  return (
    <Card className="border-primary/20 bg-card/95 overflow-hidden py-0 shadow-lg backdrop-blur">
      <CardHeader className="bg-muted/20 border-b px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="destructive"
                className="border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                5사6입 가성비 분석
              </Badge>
              <CardTitle className="text-base font-extrabold sm:text-lg">
                실시간 5사6입 예상 비례배정표 (전 증권사 비교)
              </CardTitle>
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              소수점 0.6 이상 1주 올림 배정 원칙 · 0.60 ~ 0.75 구간은 최소
              증거금으로 1주를 턱걸이 배정받는{' '}
              <span className="font-bold text-rose-600 dark:text-rose-400">
                가성비 황금 구간
              </span>
              입니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Text
              as="span"
              variant="small"
              textColor="muted"
              className="font-semibold"
            >
              기준:{' '}
              {basis === 'current' ? '현재 관측 경쟁률' : '예상 마감 경쟁률'}
            </Text>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeBrokers.map((broker) => {
            const ratio = getProportionalRatio(broker, basis)
            const equalAlloc = getEqualExpectedAllocation(broker, basis)
            const maxShares =
              broker.limits.length > 0
                ? Math.max(...broker.limits.map((l) => l.maxShares))
                : null
            return (
              <Button
                key={broker.id}
                variant="outline"
                className="hover:border-primary/40 h-auto w-full flex-col items-stretch justify-start border p-3 text-left whitespace-normal transition"
                onClick={() => onSelectBroker(broker)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground flex items-center gap-1.5 text-sm font-bold">
                    <Building2 className="text-primary size-4" />
                    {broker.name}
                  </span>
                  <span className="text-primary font-mono text-xs font-bold">
                    비례 {formatRatio(ratio)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-2 w-full space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>균등 예상:</span>
                    <span className="text-foreground font-semibold">
                      {equalAlloc === null
                        ? '—'
                        : `${formatDecimal(equalAlloc)}주`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>청약 한도:</span>
                    <span className="text-foreground font-semibold">
                      {maxShares === null
                        ? '한도 미제공'
                        : `${maxShares.toLocaleString('ko-KR')}주 (${formatDepositCompact(
                            maxShares * offerPrice * depositRate
                          )})`}
                    </span>
                  </div>
                  {broker.onlineSubscriptionNote ? (
                    <Text
                      as="p"
                      variant="small"
                      className="truncate pt-0.5 text-[11px] font-normal text-sky-600 dark:text-sky-400"
                    >
                      {broker.onlineSubscriptionNote}
                    </Text>
                  ) : null}
                </div>
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <DataTable
          data={tableData}
          columns={columns}
          maxHeight={550}
          stickyFirstColumn
          emptyMessage="비교 데이터가 없습니다."
        />
      </CardContent>
    </Card>
  )
}
