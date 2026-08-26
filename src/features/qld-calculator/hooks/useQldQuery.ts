import { useQuery } from '@tanstack/react-query'
import { browserApiClient } from '@shared/lib/http/axios'
import type { QldPriceCandle } from '../types'

interface ApiPricesResponse {
  meta: {
    symbol: string
    data_source: string
  }
  rows: Array<{
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export function useQldQuery() {
  const todayIso = new Date().toISOString().slice(0, 10)

  return useQuery({
    queryKey: ['qld-prices', todayIso],
    queryFn: async (): Promise<QldPriceCandle[]> => {
      const fetchPrices = async (fromDate: string) => {
        const response = await browserApiClient.get<ApiPricesResponse>('/api/prices', {
          params: {
            asset: 'US_STOCK',
            symbol: 'QLD',
            from: fromDate,
            to: todayIso,
            interval: '1d',
          },
        })
        return response.data
      }

      let data: ApiPricesResponse
      try {
        data = await fetchPrices('2006-06-21')
      } catch {
        data = await fetchPrices('2010-01-01')
      }

      return (data.rows || []).map((row) => ({
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
      }))
    },
    staleTime: 1000 * 60 * 30, // 30 mins
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
