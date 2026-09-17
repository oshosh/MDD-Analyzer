import { describe, it } from 'vitest'
import { IbkScrapingAdapter } from '../src/server/services/ipo/ibkScrapingAdapter'
import { CompositeScrapingAdapter } from '../src/server/services/ipo/compositeScrapingAdapter'

describe('Live IBK test', () => {
  it('calls real IBK server', async () => {
    const adapter = new IbkScrapingAdapter()
    const res = await adapter.getCompetitionForDate('2026-09-17')
    console.log('LIVE IBK STATUS:', res.source.status)
    console.log('LIVE IBK OFFERINGS:', JSON.stringify(res.offerings, null, 2))
  }, 15000)

  it('calls real CompositeScrapingAdapter', async () => {
    const composite = new CompositeScrapingAdapter()
    const res = await composite.getCompetitionForDate('2026-09-17')
    console.log('COMPOSITE STATUS:', res.source.status)
    console.log('COMPOSITE OFFERINGS:', JSON.stringify(res.offerings, null, 2))
  }, 15000)
})
