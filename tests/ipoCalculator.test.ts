import { describe, expect, it } from 'vitest'
import {
  calculateIpoSubscription,
  getEqualExpectedAllocation,
  getProportionalRatio,
  validateSubscriptionShares,
} from '@features/ipo-subscription'
import { calculatorBroker } from './fixtures/ipoFixtures'

describe('IPO subscription calculator', () => {
  it('uses the expected-final inputs for the documented formula', () => {
    const result = calculateIpoSubscription({
      shares: 13_000,
      offerPrice: 12_000,
      depositRate: 0.5,
      proportionalRatio:
        getProportionalRatio(calculatorBroker, 'expected-final') ?? 0,
      expectedEqualAllocation: getEqualExpectedAllocation(
        calculatorBroker,
        'expected-final'
      ),
      proportionalAllocationRoundingRule:
        calculatorBroker.proportionalAllocationRoundingRule,
    })

    expect(result.deposit).toBe(78_000_000)
    expect(result.proportionalExpectedShares).toBeCloseTo(4.3032, 4)
    expect(result.equalExpectedShares).toBe(1.26)
    expect(result.totalExpectedShares).toBeCloseTo(5.5632, 4)
  })

  it('keeps current observed and expected-final equal allocations separate', () => {
    expect(getProportionalRatio(calculatorBroker, 'current')).toBe(1_264)
    expect(getProportionalRatio(calculatorBroker, 'expected-final')).toBe(3_021)
    expect(getEqualExpectedAllocation(calculatorBroker, 'current')).toBe(2.18)
    expect(getEqualExpectedAllocation(calculatorBroker, 'expected-final')).toBe(
      1.26
    )

    const currentResult = calculateIpoSubscription({
      shares: 10,
      offerPrice: 12_000,
      depositRate: 0.5,
      proportionalRatio: getProportionalRatio(calculatorBroker, 'current') ?? 0,
      expectedEqualAllocation: getEqualExpectedAllocation(
        calculatorBroker,
        'current'
      ),
      proportionalAllocationRoundingRule:
        calculatorBroker.proportionalAllocationRoundingRule,
    })
    expect(currentResult.totalExpectedShares).toBeCloseTo(2.1879, 4)
  })

  it('retains unknown equal allocation and total as unknown instead of zero', () => {
    const result = calculateIpoSubscription({
      shares: 10,
      offerPrice: 12_000,
      depositRate: 0.5,
      proportionalRatio: 1_264,
      expectedEqualAllocation: null,
      proportionalAllocationRoundingRule: null,
    })

    expect(result.equalExpectedShares).toBeNull()
    expect(result.totalExpectedShares).toBeNull()
  })

  it('does not invent subscription conditions or a 5사6입 allocation rule', () => {
    const unknownBroker = {
      ...calculatorBroker,
      minSubscriptionShares: null,
      subscriptionUnitShares: null,
      limits: [],
      proportionalAllocationRoundingRule: null,
    }

    expect(validateSubscriptionShares(10, unknownBroker)).toContain(
      '최소 청약 수량과 단위'
    )

    const result = calculateIpoSubscription({
      shares: 10,
      offerPrice: 12_000,
      depositRate: 0.5,
      proportionalRatio: 1_264,
      expectedEqualAllocation: 2.18,
      proportionalAllocationRoundingRule: null,
    })

    expect(result.cut56ProportionalShares).toBeNull()
    expect(result.cut56TotalShares).toBeNull()
    expect(result.isCostEffectiveTier).toBe(false)
  })

  it('allows only a broker-proportional ratio in the proportional formula', () => {
    expect(
      getProportionalRatio(
        { ...calculatorBroker, competitionRatioKind: 'broker-total' },
        'current'
      )
    ).toBeNull()
    expect(
      getProportionalRatio(
        { ...calculatorBroker, competitionRatioKind: 'combined' },
        'expected-final'
      )
    ).toBeNull()
  })

  it('rejects invalid quantity and financial inputs instead of silently calculating them', () => {
    expect(validateSubscriptionShares(13_005, calculatorBroker)).toContain(
      '10주 단위'
    )
    expect(validateSubscriptionShares(26_010, calculatorBroker)).toContain(
      '초과'
    )
    expect(() =>
      calculateIpoSubscription({
        shares: 0,
        offerPrice: 12_000,
        depositRate: 0.5,
        proportionalRatio: 3_021,
        expectedEqualAllocation: 1.26,
        proportionalAllocationRoundingRule: 'five-round-six-up',
      })
    ).toThrow(RangeError)
  })

  it('matches the independently derived screenshot values without averaging ratios', () => {
    expect(
      calculatorBroker.equalAllocationShares! / calculatorBroker.applicantCount!
    ).toBeCloseTo(2.18, 2)
    expect(calculatorBroker.currentProportionalRatio! * 12_000 * 0.5).toBe(
      7_584_000
    )
  })
})
