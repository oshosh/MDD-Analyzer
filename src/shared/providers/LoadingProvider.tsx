'use client'

import type { PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'

interface LoadingContextValue {
  loading: boolean
  setLoading: (value: boolean) => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider')
  }
  return context
}

export default function LoadingProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(false)
  const value = useMemo(() => ({ loading, setLoading }), [loading])
  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  )
}
