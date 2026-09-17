import { atom } from 'jotai'
import { useTheme } from 'next-themes'

export type Theme = 'light' | 'dark'

// In-memory atom synced with next-themes, avoiding localStorage conflict
export const themeAtom = atom<Theme>('light')

export function useAppTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const currentTheme = ((resolvedTheme ?? theme ?? 'light') === 'dark' ? 'dark' : 'light') as Theme
  return {
    theme: currentTheme,
    resolvedTheme: currentTheme,
    setTheme: (t: Theme) => setTheme(t),
    toggleTheme: () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'),
    isDark: currentTheme === 'dark',
  }
}
