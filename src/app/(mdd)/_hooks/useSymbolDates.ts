// src/app/(mdd)/_hooks/useSymbolDates.ts
'use client'

import { useState, useCallback } from 'react'
import { todayIso } from '@/lib/date'
import { browserApiClient } from '@/lib/http/axios'

interface ListingResponse {
  listing_date: string
}

export function useSymbolDates() {
  const [loading, setLoading] = useState(false)

  const getDatesForSymbol = useCallback(
    async (
      symbol: string,
      currentSymbolInForm: string,
      currentFromInForm: string,
      currentToInForm: string
    ): Promise<{ from: string; to: string }> => {
      setLoading(true)
      try {
        // Only fetch if symbol has changed from what's currently displayed in the form
        if (symbol.toUpperCase() !== currentSymbolInForm.toUpperCase()) {
          const response = await browserApiClient.get<ListingResponse>(
            '/api/listing',
            {
              params: { symbol: symbol },
            }
          )
          const listing = response.data
          return { from: listing.listing_date, to: todayIso() }
        } else {
          // If symbol hasn't changed, retain current dates from the form
          return { from: currentFromInForm, to: currentToInForm }
        }
      } catch (error) {
        // If listing lookup fails, fall back to current dates from the form
        console.error('Failed to fetch listing date:', error)
        return { from: currentFromInForm, to: currentToInForm }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { getDatesForSymbol, loading }
}
