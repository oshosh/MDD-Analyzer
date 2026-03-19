'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { getQueryClient } from '@/components/provider/react-query-provider/getQueryClient'

export default function ReactQueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  )
}
