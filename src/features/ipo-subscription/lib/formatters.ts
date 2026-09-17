import type {
  IpoBrokerSnapshot,
  IpoOfferingKind,
  IpoOfferingSnapshot,
  IpoSnapshotStatus,
} from '@entities/ipo'
import type { IpoCalculationBasis } from './calculator'
import { getProportionalRatio } from './calculator'

export function formatWon(value: number | null): string {
  if (value === null) return '—'

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDepositCompact(amount: number | null): string {
  if (amount === null || amount <= 0) return '—'
  const eok = Math.floor(amount / 100_000_000)
  const man = Math.floor((amount % 100_000_000) / 10_000)
  const won = Math.floor(amount % 10_000)

  const parts: string[] = []
  if (eok > 0) parts.push(`${eok}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  if (won > 0 && eok === 0 && man === 0) parts.push(`${won.toLocaleString('ko-KR')}`)

  return parts.length > 0 ? `${parts.join(' ')}원` : '0원'
}

export function formatDecimal(
  value: number | null,
  maximumFractionDigits = 2
): string {
  if (value === null) return '—'

  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

export function formatShares(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('ko-KR')}주`
}

export function formatRatio(value: number | null): string {
  return value === null ? '—' : `${formatDecimal(value)} : 1`
}

export function formatKoreanDate(value: string | null): string {
  if (value === null) return '—'

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

export function formatKoreanDateTime(value: string | null): string {
  if (value === null) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

export function statusLabel(status: IpoSnapshotStatus): string {
  switch (status) {
    case 'provisional':
      return '잠정 집계'
    case 'final':
      return '최종/확인'
    case 'delayed':
      return '지연'
    case 'unavailable':
      return '미제공'
  }
}

export function statusClassName(status: IpoSnapshotStatus): string {
  switch (status) {
    case 'provisional':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    case 'final':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'delayed':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    case 'unavailable':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
  }
}

export function offeringKindLabel(kind: IpoOfferingKind): string {
  switch (kind) {
    case 'ipo':
      return 'IPO'
    case 'spac':
      return 'SPAC'
    case 'rights':
      return '실권주'
  }
}

export function addIsoDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function subscriptionStatus(
  offering: IpoOfferingSnapshot,
  selectedDate: string
): string {
  if (selectedDate < offering.subscriptionStartDate) return '청약 예정'
  if (selectedDate > offering.subscriptionEndDate) return '청약 마감'

  const start = new Date(`${offering.subscriptionStartDate}T00:00:00.000Z`)
  const current = new Date(`${selectedDate}T00:00:00.000Z`)
  const day = Math.floor((current.getTime() - start.getTime()) / 86_400_000) + 1
  return `청약 ${day}일차`
}

export function maximumSubscriptionShares(broker: IpoBrokerSnapshot): number | null {
  if (broker.limits.length === 0) return null

  return Math.max(...broker.limits.map((limit) => limit.maxShares))
}

export function brokerRatioDescription(
  broker: IpoBrokerSnapshot,
  basis: IpoCalculationBasis
): string {
  if (broker.competitionRatioKind !== 'broker-proportional') {
    return broker.competitionRatioKind === null
      ? '비례 경쟁률 원천이 아직 제공되지 않았습니다.'
      : '전체/통합 경쟁률은 비례 배정 계산에 사용할 수 없습니다.'
  }

  const ratio = getProportionalRatio(broker, basis)
  if (ratio === null) {
    return basis === 'current'
      ? '현재 비례 경쟁률이 아직 제공되지 않았습니다.'
      : '예상 마감 비례 경쟁률이 아직 제공되지 않았습니다.'
  }

  return `${basis === 'current' ? '현재' : '예상 마감'} 비례 경쟁률 ${formatRatio(ratio)} 기준`
}
