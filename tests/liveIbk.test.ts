import { describe, it } from 'vitest'
import { IbkScrapingAdapter } from '../src/server/services/ipo/ibkScrapingAdapter'
import { CompositeScrapingAdapter } from '../src/server/services/ipo/compositeScrapingAdapter'

const isLiveTest =
  process.env.RUN_LIVE_IBK_TESTS === 'true' &&
  !process.env.CI &&
  Boolean(process.env.IBK_IPO_GATEWAY_URL) &&
  !process.env.IBK_IPO_GATEWAY_URL?.includes('mock.test')

describe('Live IBK test', () => {
  it.runIf(isLiveTest)(
    'calls real IBK server',
    async () => {
      const adapter = new IbkScrapingAdapter()
      const res = await adapter.getCompetitionForDate('2026-09-17')
      console.log('LIVE IBK STATUS:', res.source.status)
      console.log('LIVE IBK OFFERINGS:', JSON.stringify(res.offerings, null, 2))
    },
    15000
  )

  it.runIf(isLiveTest)(
    'calls real CompositeScrapingAdapter',
    async () => {
      const composite = new CompositeScrapingAdapter()
      const res = await composite.getCompetitionForDate('2026-09-17')
      console.log('COMPOSITE STATUS:', res.source.status)
      console.log(
        'COMPOSITE OFFERINGS:',
        JSON.stringify(res.offerings, null, 2)
      )
    },
    15000
  )
})
