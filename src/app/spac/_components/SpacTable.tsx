'use client'

import { MouseEvent, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Info } from 'lucide-react'
import DataTable from '@/components/table/DataTable'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatNumber } from '@/lib/format'
import { SpacTableRow } from '../_lib/types'

interface SpacTableProps {
  data: SpacTableRow[]
  onRowClick?: (row: SpacTableRow) => void
}

interface EvidenceState {
  title: string
  lines: string[]
}

function formatWon(value: number): string {
  return `${formatNumber(value).split('.')[0]}원`
}

function formatEok(value: number): string {
  if (!value) return '-'
  return `${formatNumber(value).replace(/\.00$/, '')}억원`
}

function EvidenceButton({
  title,
  lines,
  onOpen,
}: EvidenceState & { onOpen: (state: EvidenceState) => void }) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onOpen({ title, lines })
  }

  return (
    <button
      type="button"
      aria-label={`${title} 보기`}
      onClick={handleClick}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:border-slate-500 hover:text-slate-900"
    >
      <Info className="h-3 w-3" />
    </button>
  )
}

function getEvidence(row: SpacTableRow, key: string): EvidenceState {
  switch (key) {
    case 'capitalIncreaseDate':
      return {
        title: '증자등기일 근거',
        lines: [
          '정기보고서 증자(감자) 현황 API를 우선 확인했습니다.',
          '없으면 증권발행실적보고서 원문 값을 사용합니다.',
          `증자등기일: ${row.capitalIncreaseDate}`,
        ],
      }
    case 'listingDate':
      return {
        title: '상장일 근거',
        lines: [
          '증권발행실적보고서 원문에 적힌 상장일(매매개시일)을 우선 사용했습니다.',
          '시장 가격 데이터의 최초 거래일은 보조값으로만 사용합니다.',
          `상장일: ${row.listingDate}`,
        ],
      }
    case 'managementDate':
      return {
        title: row.isManagementEstimated ? '관리종목지정일(추정) 근거' : '관리종목지정일 근거',
        lines: [
          row.isManagementEstimated
            ? '관리종목 지정 공시가 없어서 상장일 + 910일 기준으로 추정했습니다.'
            : '한국거래소 관리종목 지정 관련 공시 원문을 우선 반영했습니다.',
          `관리종목지정일: ${row.managementDate}`,
          'SPAC 상장예비심사청구서 미제출 등 합병 기한 관련 사유를 기준으로 봅니다.',
        ],
      }
    case 'delistingDate':
      return {
        title: row.isDelistingEstimated ? '상장폐지일(추정) 근거' : '상장폐지일 근거',
        lines: [
          '상장폐지 관련 공시에 실제 상장폐지일이 있으면 그 날짜를 우선 사용합니다.',
          '그 외에는 관리종목지정일에 한국 휴장일을 제외한 30영업일을 더해 추정합니다.',
          `상장폐지일(추정): ${row.delistingDate}`,
        ],
      }
    case 'liquidationDate':
      return {
        title: '청산일(추정) 계산 기준',
        lines: [
          '청산일은 상장폐지일(추정)을 기준으로 계산합니다.',
          `상장폐지일(추정): ${row.delistingDate}`,
          '보수적 기준은 4개월, 공격적 기준은 3개월을 더합니다.',
          `청산일(추정): ${row.liquidationDate}`,
        ],
      }
    case 'annualYield':
      return {
        title: '연이율 계산 근거',
        lines: [
          '연이율은 확정 수익률이 아니라 추정 분배금과 현재가를 비교한 연환산 참고값입니다.',
          `현재가: ${formatWon(row.currentPrice)}`,
          `예상 분배금: ${formatWon(row.liquidationValue3Yr)}`,
          `잔여투자기간: ${row.remainingDays}일`,
          '계산식: ((예상 분배금 - 현재가) / 현재가) × (365 / 잔여투자기간 일수)',
          `연환산 결과: ${row.annualYield > 0 ? '+' : ''}${row.annualYield.toFixed(2)}%`,
        ],
      }
    case 'safetyMargin':
      return {
        title: '안전마진 계산 근거',
        lines: [
          '안전마진은 현재 청산가와 현재가의 차이를 비율로 표시합니다.',
          `현재가: ${formatWon(row.currentPrice)}`,
          `현 청산가: ${formatWon(row.liquidationValueCurrent)}`,
          '계산식: (현 청산가 / 현재가 - 1) × 100',
          `안전마진: ${row.safetyMargin > 0 ? '+' : ''}${row.safetyMargin.toFixed(2)}%`,
        ],
      }
    case 'interest':
      return {
        title: '예치이자율 근거',
        lines: [
          '최초 증권신고서 원문과 예치ㆍ신탁계약내용변경 공시 원문을 순서대로 병합했습니다.',
          `1차 예치이자율: ${row.interestRate1Yr.toFixed(2)}%`,
          `2차 예치이자율: ${row.interestRate2Yr.toFixed(2)}%`,
          `3차 예치이자율: ${row.interestRate3Yr.toFixed(2)}%`,
          `4차 예치이자율: ${row.interestRate4Yr ? `${row.interestRate4Yr.toFixed(2)}%` : '-'}`,
        ],
      }
    default:
      return { title: '근거', lines: ['근거 정보가 없습니다.'] }
  }
}

export default function SpacTable({ data, onRowClick }: SpacTableProps) {
  const [evidence, setEvidence] = useState<EvidenceState | null>(null)

  const info = (row: SpacTableRow, key: string) => (
    <EvidenceButton {...getEvidence(row, key)} onOpen={setEvidence} />
  )

  const columns = useMemo<ColumnDef<SpacTableRow>[]>(
    () => [
      {
        id: 'index',
        header: '연번',
        size: 56,
        cell: (info) => info.row.index + 1,
      },
      {
        accessorKey: 'name',
        header: '주식명',
        size: 170,
        cell: (info) => <span className="font-semibold text-slate-900">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'currentPrice',
        header: '현재가',
        size: 88,
        cell: (info) => formatWon(info.getValue() as number),
      },
      {
        accessorKey: 'changeRate',
        header: '변동률',
        size: 78,
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span className={value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-slate-500'}>
              {value > 0 ? '+' : ''}
              {value.toFixed(2)}%
            </span>
          )
        },
      },
      {
        accessorKey: 'changeAmount',
        header: '변동액',
        size: 74,
        cell: (info) => {
          const value = info.getValue() as number
          return (
            <span className={value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-slate-500'}>
              {value > 0 ? '+' : ''}
              {value.toLocaleString()}
            </span>
          )
        },
      },
      {
        accessorKey: 'safetyMargin',
        header: '안전마진(%)',
        size: 112,
        cell: ({ row, getValue }) => {
          const value = getValue() as number
          return (
            <span className="inline-flex items-center gap-1">
              <span className={value > 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
                {value > 0 ? '+' : ''}
                {value.toFixed(2)}%
              </span>
              {info(row.original, 'safetyMargin')}
            </span>
          )
        },
      },
      {
        accessorKey: 'annualYield',
        header: '연이율',
        size: 104,
        cell: ({ row, getValue }) => {
          const value = getValue() as number
          return (
            <span className="inline-flex items-center gap-1">
              <span className={value > 0 ? 'font-bold text-emerald-700' : 'font-bold text-red-600'}>
                {value > 0 ? '+' : ''}
                {value.toFixed(2)}%
              </span>
              {info(row.original, 'annualYield')}
            </span>
          )
        },
      },
      { accessorKey: 'securitiesCompany', header: '증권사명', size: 90 },
      {
        accessorKey: 'issueSize',
        header: '발행규모',
        size: 88,
        cell: (info) => formatEok(info.getValue() as number),
      },
      {
        accessorKey: 'mergerSuccess',
        header: '합병성공여부',
        size: 112,
        cell: (info) => (
          <Badge variant={info.getValue() === '성공' ? 'default' : 'outline'} className="text-[11px]">
            {info.getValue() as string}
          </Badge>
        ),
      },
      { accessorKey: 'promoter', header: '대표 발기인', size: 170 },
      {
        accessorKey: 'capitalIncreaseDate',
        header: '증자등기일',
        size: 116,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {getValue() as string}
            {info(row.original, 'capitalIncreaseDate')}
          </span>
        ),
      },
      {
        accessorKey: 'listingDate',
        header: '상장일',
        size: 108,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {getValue() as string}
            {info(row.original, 'listingDate')}
          </span>
        ),
      },
      {
        accessorKey: 'managementDate',
        header: '관리종목지정일(추정)',
        size: 158,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {getValue() as string}
            {info(row.original, 'managementDate')}
          </span>
        ),
      },
      {
        accessorKey: 'delistingDate',
        header: '상장폐지일(추정)',
        size: 152,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {getValue() as string}
            {info(row.original, 'delistingDate')}
          </span>
        ),
      },
      {
        accessorKey: 'liquidationDate',
        header: '청산일(추정)',
        size: 134,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {getValue() as string}
            {info(row.original, 'liquidationDate')}
          </span>
        ),
      },
      {
        accessorKey: 'remainingDays',
        header: '잔여투자기간',
        size: 108,
        cell: (info) => `${info.getValue()}일`,
      },
      {
        accessorKey: 'mergerStage',
        header: '합병 단계',
        size: 126,
        cell: (info) => (
          <Badge variant="secondary" className="whitespace-nowrap text-[11px]">
            {info.getValue() as string}
          </Badge>
        ),
      },
      {
        accessorKey: 'candidateCompany',
        header: '후보회사',
        size: 150,
        cell: (info) => (info.getValue() as string) || '-',
      },
      {
        accessorKey: 'interestRate1Yr',
        header: '1차 예치이자율',
        size: 124,
        cell: ({ row, getValue }) => (
          <span className="inline-flex items-center gap-1">
            {(getValue() as number).toFixed(2)}%
            {info(row.original, 'interest')}
          </span>
        ),
      },
      {
        accessorKey: 'interestRate2Yr',
        header: '2차 예치이자율',
        size: 124,
        cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
      },
      {
        accessorKey: 'interestRate3Yr',
        header: '3차 예치이자율',
        size: 124,
        cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
      },
      {
        accessorKey: 'interestRate4Yr',
        header: '4차 예치이자율',
        size: 124,
        cell: (info) => {
          const value = info.getValue() as number | undefined
          return value ? `${value.toFixed(2)}%` : '-'
        },
      },
      {
        accessorKey: 'liquidationValueCurrent',
        header: '현 청산가',
        size: 96,
        cell: (info) => formatWon(info.getValue() as number),
      },
      {
        accessorKey: 'liquidationValue3Yr',
        header: '최종 추정 청산가',
        size: 132,
        cell: (info) => formatWon(info.getValue() as number),
      },
      {
        accessorKey: 'volumeAmount',
        header: '거래대금(억원)',
        size: 122,
        cell: (info) => (info.getValue() as number).toFixed(0),
      },
    ],
    []
  )

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        maxHeight={620}
        stickyFirstColumn
        getRowClassName={() => 'cursor-pointer hover:bg-emerald-50/70'}
        onRowClick={onRowClick}
      />

      <Dialog open={!!evidence} onOpenChange={(open) => !open && setEvidence(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{evidence?.title}</DialogTitle>
          </DialogHeader>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
            {evidence?.lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
