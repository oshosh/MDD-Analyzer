'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useSetAtom } from 'jotai'
import { useEffect, type PropsWithChildren } from 'react'
import { themeAtom, type Theme } from '@shared/lib/theme'

function ThemeAtomSync() {
  const { resolvedTheme, theme } = useTheme()
  const setThemeAtom = useSetAtom(themeAtom)

  useEffect(() => {
    const current = resolvedTheme ?? theme
    if (current === 'dark' || current === 'light') {
      setThemeAtom(current as Theme)
    }
  }, [resolvedTheme, theme, setThemeAtom])
1
  return null
}

export default function LayoutProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="mdd-theme"
    >
      <ThemeAtomSync />
      {children}
    </NextThemesProvider>
  )
}
