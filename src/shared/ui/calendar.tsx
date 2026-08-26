'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@shared/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4 relative',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center h-8',
        caption_label: 'text-sm font-bold text-foreground',
        nav: 'flex items-center gap-1 absolute inset-x-0 justify-between z-10 px-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-lg border-border hover:bg-muted text-foreground cursor-pointer'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-lg border-border hover:bg-muted text-foreground cursor-pointer'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex justify-between',
        weekday: 'text-muted-foreground rounded-md w-8 font-medium text-[0.8rem] text-center',
        weeks: 'w-full space-y-1 mt-2',
        week: 'flex w-full justify-between mt-1',
        day: 'h-8 w-8 text-center text-sm p-0 relative flex items-center justify-center',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer'
        ),
        range_start: 'day-range-start bg-primary text-primary-foreground font-bold rounded-l-lg',
        range_end: 'day-range-end bg-primary text-primary-foreground font-bold rounded-r-lg',
        range_middle: 'bg-primary/20 text-foreground rounded-none',
        selected: 'bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg',
        today: 'bg-accent/50 text-accent-foreground font-bold border border-primary/40',
        outside: 'text-muted-foreground/40 opacity-40',
        disabled: 'text-muted-foreground/30 opacity-30 pointer-events-none cursor-not-allowed line-through',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" />
          }
          return <ChevronRight className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
