'use client'

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { todayIso } from '@/lib/date'
import { browserApiClient } from '@/lib/http/axios'

interface ListingResponse {
  listing_date: string
}

async function fetchListingDate(symbol: string): Promise<string> {
  const response = await browserApiClient.get<ListingResponse>('/api/listing', {
    params: { symbol },
  })
  return response.data.listing_date
}

export function useSymbolDates() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: fetchListingDate,
  })

  const getDatesForSymbol = useCallback(
    async (
      symbol: string,
      currentSymbolInForm: string,
      currentFromInForm: string,
      currentToInForm: string
    ): Promise<{ from: string; to: string }> => {
      if (symbol.toUpperCase() === currentSymbolInForm.toUpperCase()) {
        return { from: currentFromInForm, to: currentToInForm }
      }

      try {
        const cached = queryClient.getQueryData<string>(['listing-date', symbol.toUpperCase()])
        if (cached) {
          return { from: cached, to: todayIso() }
        }

        const listingDate = await mutation.mutateAsync(symbol)
        queryClient.setQueryData(['listing-date', symbol.toUpperCase()], listingDate)
        return { from: listingDate, to: todayIso() }
      } catch (error) {
        console.error('Failed to fetch listing date:', error)
        return { from: currentFromInForm, to: currentToInForm }
      }
    },
    [mutation, queryClient]
  )

  return { getDatesForSymbol, loading: mutation.isPending }
}
