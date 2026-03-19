'use client'

import { useAtom } from 'jotai'
import { Moon, Sun } from 'lucide-react'
import { themeAtom } from '@/lib/theme'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom)
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-5 w-20" />
  }

  return (
    <div className="flex items-center space-x-2">
      <Sun className="text-muted-foreground h-4 w-4" />
      <Switch
        id="dark-mode"
        checked={theme === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <Moon className="text-muted-foreground h-4 w-4" />
      <Label htmlFor="dark-mode" className="sr-only">
        Dark Mode
      </Label>
    </div>
  )
}
