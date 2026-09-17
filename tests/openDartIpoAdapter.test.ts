import { describe, expect, it } from 'vitest'
import {
  OpenDartIpoAdapter,
  parseDartDateRange,
  parseDartWholeNumber,
  type IpoCache,
} from '@/server/services/ipo/openDartIpoAdapter'

const noCache: IpoCache = {
  read: async <T,>(): Promise<T | null> => null,
  write: async <T,>(): Promise<void> => undefined,
}

const disclosureResponse = {
  status: '000',
  total_page: 1,
  list: [
    {
      corp_code: '01722066',
      corp_name: '빅웨이브로보틱스',
      stock_code: '',
      report_nm: '[정정]증권신고서(지분증권)',
      rcept_no: '20260914000379',
      rcept_dt: '20260914',
    },
    {
      corp_code: '00123456',
      corp_name: '상장사 실권주',
      stock_code: '047920',
      report_nm: '증권신고서(지분증권)',
      rcept_no: '20260914000380',
      rcept_dt: '20260914',
    },
    {
      corp_code: '00999999',
      corp_name: 'ELS 발행사',
      stock_code: '',
      report_nm: '증권신고서(채무증권)',
      rcept_no: '20260914000381',
      rcept_dt: '20260914',
    },
  ],
}

const securitiesResponse = {
  status: '000',
  group: [
    {
      title: '인수인정보',
      list: [
        {
          actnmn: '유진증권',
          actsen: '대표',
          udtcnt: '816,000',
          udtamt: '12,240,000,000',
          udtmth: '잔액인수',
        },
        {
          actnmn: '미래에셋증권',
          actsen: '공동',
          udtcnt: '784,000',
          udtamt: '11,760,000,000',
          udtmth: '잔액인수',
        },
      ],
    },
    {
      title: '증권의종류',
      list: [
        {
          slmthn: '일반공모',
          slprc: '15,000',
          stkcnt: '1,600,000',
        },
      ],
    },
    {
      title: '일반사항',
      list: [
        {
          corp_cls: 'E',
          corp_name: '빅웨이브로보틱스',
          rcept_no: '20260903000077',
          sbd: '2026년 09월 15일 ~ 2026년 09월 16일',
          pymd: '2026년 09월 18일',
          asand: '2026년 09월 18일',
        },
      ],
    },
  ],
}

describe('OpenDART IPO adapter', () => {
  it('filters polluted disclosure results and maps general IPO metadata by group title', async () => {
    const requestedPaths: string[] = []
    const adapter = new OpenDartIpoAdapter({
      apiKey: 'test-key',
      cache: noCache,
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      fetcher: async (url) => {
        const path = new URL(url).pathname
        requestedPaths.push(path)
        return new Response(
          JSON.stringify(path.endsWith('/list.json') ? disclosureResponse : securitiesResponse),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      },
    })

    const offerings = await adapter.getOfferingsForDate('2026-09-15')

    expect(requestedPaths).toEqual([
      '/api/list.json',
      '/api/estkRs.json',
      '/api/document.xml',
    ])

    expect(offerings).toHaveLength(1)
    expect(offerings[0]).toMatchObject({
      id: 'dart-01722066-20260903000077',
      dartReceiptNo: '20260903000077',
      latestDisclosureReceiptNo: '20260914000379',
      subscriptionStartDate: '2026-09-15',
      subscriptionEndDate: '2026-09-16',
      offerPrice: 15_000,
      totalOfferingShares: 1_600_000,
      subscriptionOpenAt: null,
      subscriptionCloseAt: null,
    })
    expect(offerings[0].brokers).toHaveLength(2)
    expect(offerings[0].brokers[0]).toMatchObject({
      name: '유진증권',
      underwritingShares: 816_000,
      generalAllocationShares: 204_000,
      equalAllocationShares: 102_000,
      proportionalAllocationShares: 102_000,
      currentProportionalRatio: null,
    })
  })

  it('includes both dates of a date-only two-day subscription window', async () => {
    const adapter = new OpenDartIpoAdapter({
      apiKey: 'test-key',
      cache: noCache,
      now: () => new Date('2026-09-16T10:00:00.000Z'),
      fetcher: async (url) =>
        new Response(
          JSON.stringify(
            new URL(url).pathname.endsWith('/list.json')
              ? disclosureResponse
              : securitiesResponse
          ),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ),
    })

    expect(await adapter.getOfferingsForDate('2026-09-16')).toHaveLength(1)
  })

  it('does not turn ranges or dashes into a guessed numeric value', () => {
    expect(parseDartWholeNumber('15,000')).toBe(15_000)
    expect(parseDartWholeNumber('10,000 ~ 12,000')).toBeNull()
    expect(parseDartWholeNumber('-')).toBeNull()
    expect(parseDartDateRange('2026년 09월 15일 ~ 2026년 09월 16일')).toEqual({
      startDate: '2026-09-15',
      endDate: '2026-09-16',
    })
  })
})
