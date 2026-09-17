import type {
  IpoBrokerSnapshot,
  IpoProportionalAllocationRoundingRule,
  IpoSubscriptionTier,
} from '@entities/ipo'

export type IpoCalculationBasis = 'current' | 'expected-final'

export interface IpoSubscriptionCalculationInput {
  shares: number
  offerPrice: number
  depositRate: number
  proportionalRatio: number
  expectedEqualAllocation: number | null
  proportionalAllocationRoundingRule: IpoProportionalAllocationRoundingRule | null
}

export interface IpoSubscriptionCalculation {
  shares: number
  deposit: number
  proportionalExpectedShares: number
  equalExpectedShares: number | null
  totalExpectedShares: number | null
  cut56ProportionalShares: number | null
  cut56TotalShares: number | null
  isCostEffectiveTier: boolean
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`)
  }
}

export function getProportionalRatio(
  broker: IpoBrokerSnapshot,
  basis: IpoCalculationBasis
): number | null {
  if (broker.competitionRatioKind !== 'broker-proportional') {
    return null
  }

  const ratio =
    basis === 'current'
      ? broker.currentProportionalRatio
      : broker.expectedFinalProportionalRatio

  return ratio !== null && ratio > 0 ? ratio : null
}

export function getEqualExpectedAllocation(
  broker: IpoBrokerSnapshot,
  basis: IpoCalculationBasis
): number | null {
  if (basis === 'current') {
    return broker.currentEqualExpectedAllocation
  }

  return broker.expectedEqualAllocation
}

export function validateSubscriptionShares(
  shares: number,
  broker: IpoBrokerSnapshot
): string | null {
  if (!Number.isInteger(shares) || shares <= 0) {
    return '신청 주수는 1주 이상의 정수여야 합니다.'
  }

  const minShares = broker.minSubscriptionShares
  const unitShares =
    getSubscriptionUnitForShares(shares, broker.subscriptionUnitTiers) ??
    broker.subscriptionUnitShares

  if (minShares === null || unitShares === null) {
    return '증권사별 최소 청약 수량과 단위가 아직 제공되지 않았습니다.'
  }

  if (shares < minShares) {
    return `최소 신청 수량은 ${minShares.toLocaleString('ko-KR')}주입니다.`
  }

  if (shares % unitShares !== 0) {
    return `${unitShares.toLocaleString('ko-KR')}주 단위로 신청할 수 있습니다.`
  }

  if (broker.limits.length === 0) return null

  const maximumShares = Math.max(
    ...broker.limits.map((limit) => limit.maxShares)
  )

  if (shares > maximumShares) {
    return `표시된 최우대 한도 ${maximumShares.toLocaleString('ko-KR')}주를 초과했습니다.`
  }

  return null
}

export function calculateIpoSubscription(
  input: IpoSubscriptionCalculationInput
): IpoSubscriptionCalculation {
  assertPositiveFinite(input.shares, 'shares')
  assertPositiveFinite(input.offerPrice, 'offerPrice')
  assertPositiveFinite(input.depositRate, 'depositRate')
  assertPositiveFinite(input.proportionalRatio, 'proportionalRatio')

  if (input.depositRate > 1) {
    throw new RangeError('depositRate cannot exceed 1')
  }

  const equalExpectedShares = input.expectedEqualAllocation
  if (
    equalExpectedShares !== null &&
    (!Number.isFinite(equalExpectedShares) || equalExpectedShares < 0)
  ) {
    throw new RangeError(
      'expectedEqualAllocation must be a non-negative finite number'
    )
  }

  const proportionalExpectedShares = input.shares / input.proportionalRatio
  const integerPart = Math.floor(proportionalExpectedShares)
  const decimalPart = proportionalExpectedShares - integerPart

  // The 5사6입 presentation is only valid when the broker feed explicitly
  // identifies that allocation rounding rule for this offering.
  const hasFiveRoundSixUpRule =
    input.proportionalAllocationRoundingRule === 'five-round-six-up'
  const cut56ProportionalShares = hasFiveRoundSixUpRule
    ? decimalPart >= 0.6
      ? integerPart + 1
      : integerPart
    : null
  const isCostEffectiveTier =
    hasFiveRoundSixUpRule && decimalPart >= 0.6 && decimalPart <= 0.75

  const cut56TotalShares =
    equalExpectedShares === null || cut56ProportionalShares === null
      ? null
      : cut56ProportionalShares +
        (equalExpectedShares >= 1 ? Math.floor(equalExpectedShares) : 0)

  return {
    shares: input.shares,
    deposit: input.shares * input.offerPrice * input.depositRate,
    proportionalExpectedShares,
    equalExpectedShares,
    totalExpectedShares:
      equalExpectedShares === null
        ? null
        : proportionalExpectedShares + equalExpectedShares,
    cut56ProportionalShares,
    cut56TotalShares,
    isCostEffectiveTier,
  }
}

/**
 * 표준 금융투자협회 공모주 청약 단위 구간 (구간별 신청 단위)
 */
export function getSubscriptionUnitForShares(
  shares: number,
  tiers?: IpoSubscriptionTier[]
): number | null {
  if (tiers && tiers.length > 0) {
    for (const tier of tiers) {
      if (
        shares >= tier.fromShares &&
        (tier.toShares === null || shares < tier.toShares)
      ) {
        return tier.unitShares
      }
    }
  }

  return null
}

/**
 * 증권사 한도 및 표준 단위 규칙에 따라 유효한 전체 신청 주수 배열을 생성합니다.
 */
export function createSuggestedShareAmounts(
  broker: IpoBrokerSnapshot
): number[] {
  const minShares = broker.minSubscriptionShares
  const maxShares =
    broker.limits.length > 0
      ? Math.max(...broker.limits.map((l) => l.maxShares))
      : null

  if (minShares === null || maxShares === null || minShares > maxShares) {
    return []
  }

  const amounts: number[] = []
  let current = minShares

  while (current <= maxShares) {
    amounts.push(current)
    const step =
      getSubscriptionUnitForShares(current, broker.subscriptionUnitTiers) ??
      broker.subscriptionUnitShares
    if (step === null) return []
    current += step
  }

  // 증권사별 우대/일반 한도 주수가 목록에 정확히 포함되도록 보장
  for (const limit of broker.limits) {
    if (limit.maxShares >= minShares && !amounts.includes(limit.maxShares)) {
      amounts.push(limit.maxShares)
    }
  }

  return [...new Set(amounts)]
    .filter((shares) => validateSubscriptionShares(shares, broker) === null)
    .sort((left, right) => left - right)
}
