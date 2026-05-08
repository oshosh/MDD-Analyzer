'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'MDD Analyzer', href: '/' },
  { name: '스팩 연이율·청산가 비교', href: '/spac' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-black tracking-tighter text-xl">
              MDD <span className="text-primary">INSIGHT</span>
            </span>
          </Link>
          <div className="flex gap-4">
            {navItems.map((item) => {
              const isActive = 
                item.href === '/' 
                  ? pathname === '/' || pathname.startsWith('/(mdd)') 
                  : pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-bold transition-colors hover:text-primary",
                    isActive ? "text-primary underline underline-offset-8 decoration-2" : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
