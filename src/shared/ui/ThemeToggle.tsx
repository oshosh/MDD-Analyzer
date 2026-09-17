'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '@shared/ui/switch'
import { Label } from '@shared/ui/label'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-5 w-20" />
  }

  const isDark = (resolvedTheme ?? theme) === 'dark'

  return (
    <div className="flex items-center space-x-2">
      <Sun className="text-muted-foreground h-4 w-4" />
      <Switch
        id="dark-mode"
        checked={isDark}
        onCheckedChange={(checked: boolean) => setTheme(checked ? 'dark' : 'light')}
      />
      <Moon className="text-muted-foreground h-4 w-4" />
      <Label htmlFor="dark-mode" className="sr-only">
        Dark Mode
      </Label>
    </div>
  )
}
