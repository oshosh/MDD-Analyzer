'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textVariants = cva('transition-colors', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      p: 'leading-7',
      large: 'text-lg font-semibold',
      small: 'text-xs font-medium leading-none',
      muted: 'text-xs text-slate-400',
      mono: 'font-mono text-xs',
      badge: 'text-[10px] font-medium tracking-wide',
    },
    textColor: {
      default: 'text-foreground',
      muted: 'text-slate-400',
      up: 'text-red-400',
      down: 'text-blue-400',
      brand: 'text-emerald-400',
      subtle: 'text-slate-500',
    },
  },
  defaultVariants: {
    variant: 'p',
    textColor: 'default',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: React.ElementType
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, variant, textColor, as: Component = 'span', ...props }, ref) => {
    return (
      <Component
        className={cn(textVariants({ variant, textColor, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Text.displayName = 'Text'
