'use client'

import { useAtomValue } from 'jotai'
import { useEffect, type PropsWithChildren } from 'react'
import { themeAtom } from '@/lib/theme'

export default function LayoutProvider({ children }: PropsWithChildren) {
  const theme = useAtomValue(themeAtom)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}
