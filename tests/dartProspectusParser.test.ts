import { describe, expect, it } from 'vitest'
import {
  parseProspectusLimits,
  parseProspectusUnitTiers,
  parseProspectusBrokerInfo,
} from '@/server/services/ipo/dartProspectusParser'

describe('dartProspectusParser', () => {
  const sampleProspectus = `
    [유진투자증권의 청약주식별 청약단위]
    청약주식수 청약단위
    10주 이상 ~ 100주 이하 10주
    100주 초과 ~ 500주 이하 50주
    500주 초과 ~ 1,000주 이하 100주
    1,000주 초과 ~ 2,000주 이하 200주
    2,000주 초과 ~ 5,000주 이하 500주
    5,000주 초과 1,000주

    [유진투자증권㈜ 일반청약자 청약 자격]
    개인별 청약한도 최고청약한도의 100%: 20,000주 ~ 24,000주

    [미래에셋증권㈜의 일반청약자 배정물량, 최고청약한도 및 청약증거금률]
    미래에셋증권㈜ 196,000주 주1) 50%
    주1) 미래에셋증권㈜의 일반청약자 청약한도는 청약자격별로 상이합니다.
    □ 우대그룹의 청약한도 : 19,000주 ~ 23,000주 (200%)
    □ 일반그룹의 청약한도 : 9,000주 ~ 11,000주 (100%)

    [미래에셋증권의 청약주식별 청약단위]
    청약주식수 청약단위
    10주 이상 ~ 100주 이하 10주
    100주 초과 ~ 500주 이하 50주
    500주 초과 ~ 1,000주 이하 100주
    1,000주 초과 ~ 2,000주 이하 200주
    2,000주 초과 ~ 5,000주 이하 500주
    5,000주 초과 1,000주
  `

  it('correctly parses Eugene subscription unit tiers', () => {
    const tiers = parseProspectusUnitTiers(sampleProspectus, '유진투자증권')
    expect(tiers).toHaveLength(6)
    expect(tiers[0]).toEqual({ fromShares: 10, toShares: 100, unitShares: 10 })
    expect(tiers[1]).toEqual({ fromShares: 100, toShares: 500, unitShares: 50 })
    expect(tiers[2]).toEqual({ fromShares: 500, toShares: 1000, unitShares: 100 })
    expect(tiers[3]).toEqual({ fromShares: 1000, toShares: 2000, unitShares: 200 })
    expect(tiers[4]).toEqual({ fromShares: 2000, toShares: 5000, unitShares: 500 })
    expect(tiers[5]).toEqual({ fromShares: 5000, toShares: null, unitShares: 1000 })
  })

  it('correctly parses Eugene limits', () => {
    const limits = parseProspectusLimits(sampleProspectus, '유진증권')
    expect(limits).toHaveLength(1)
    expect(limits[0].maxShares).toBe(20000)
  })

  it('correctly parses Mirae Asset limits', () => {
    const limits = parseProspectusLimits(sampleProspectus, '미래에셋증권')
    expect(limits).toHaveLength(2)
    expect(limits[0].label).toContain('우대그룹')
    expect(limits[0].maxShares).toBe(23000)
    expect(limits[1].label).toContain('일반그룹')
    expect(limits[1].maxShares).toBe(11000)
  })

  it('parses full broker prospectus info', () => {
    const info = parseProspectusBrokerInfo(sampleProspectus, '미래에셋증권')
    expect(info.minSubscriptionShares).toBe(10)
    expect(info.subscriptionUnitShares).toBe(10)
    expect(info.subscriptionUnitTiers).toHaveLength(6)
    expect(info.limits).toHaveLength(2)
  })
})
