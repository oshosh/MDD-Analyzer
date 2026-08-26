'use client'

import * as React from 'react'
import { format, parseISO, isValid, isBefore, isAfter } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Calendar as CalendarIcon, ArrowRight, RotateCcw, Edit3 } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Button } from '@shared/ui/button'
import { Calendar } from '@shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover'
import { Text } from '@shared/ui/text'
import { Label } from '@shared/ui/label'
import { Badge } from '@shared/ui/badge'

export interface DateRangePickerProps {
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  minDate?: string // 'YYYY-MM-DD'
  maxDate?: string // 'YYYY-MM-DD'
  onRangeChange: (start: string, end: string) => void
  className?: string
  align?: 'start' | 'center' | 'end'
}

interface HistoricalPreset {
  label: string
  from: string
  to: string
}

export function DateRangePicker({
  startDate,
  endDate,
  minDate = '2006-06-21',
  maxDate = '2026-08-25',
  onRangeChange,
  className,
  align = 'end',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Local manual input states
  const [manualFrom, setManualFrom] = React.useState(startDate)
  const [manualTo, setManualTo] = React.useState(endDate)

  // Sync manual inputs when external dates change
  React.useEffect(() => {
    setManualFrom(startDate)
    setManualTo(endDate)
  }, [startDate, endDate])

  const parsedStart = React.useMemo(() => {
    try {
      const d = parseISO(manualFrom)
      return isValid(d) ? d : undefined
    } catch {
      return undefined
    }
  }, [manualFrom])

  const parsedEnd = React.useMemo(() => {
    try {
      const d = parseISO(manualTo)
      return isValid(d) ? d : undefined
    } catch {
      return undefined
    }
  }, [manualTo])

  const minD = React.useMemo(() => (minDate ? parseISO(minDate) : undefined), [minDate])
  const maxD = React.useMemo(() => (maxDate ? parseISO(maxDate) : undefined), [maxDate])

  const selectedRange: DateRange | undefined = React.useMemo(() => {
    return {
      from: parsedStart,
      to: parsedEnd,
    }
  }, [parsedStart, parsedEnd])

  // Quick Crisis/Cycle Presets
  const presets: HistoricalPreset[] = React.useMemo(() => [
    { label: '전체 (2006~)', from: minDate, to: maxDate },
    { label: '2008 금융위기', from: '2007-10-01', to: '2013-05-01' },
    { label: '2018 미중무역', from: '2018-01-01', to: '2020-01-01' },
    { label: '2020 코로나', from: '2020-01-01', to: '2021-12-31' },
    { label: '2022 금리인상', from: '2022-01-01', to: '2024-06-30' },
    { label: '최근 3년', from: '2023-01-01', to: maxDate },
    { label: '최근 5년', from: '2021-01-01', to: maxDate },
  ], [minDate, maxDate])

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      const f = format(range.from, 'yyyy-MM-dd')
      const clampedFrom = minDate && f < minDate ? minDate : f
      setManualFrom(clampedFrom)

      if (range.to) {
        const t = format(range.to, 'yyyy-MM-dd')
        const clampedTo = maxDate && t > maxDate ? maxDate : t
        setManualTo(clampedTo)
        onRangeChange(clampedFrom, clampedTo)
      }
    }
  }

  const handleManualApply = () => {
    let f = manualFrom.trim()
    let t = manualTo.trim()

    // Clamp boundaries
    if (minDate && f < minDate) f = minDate
    if (maxDate && t > maxDate) t = maxDate
    if (f > t) f = t

    setManualFrom(f)
    setManualTo(t)
    onRangeChange(f, t)
    setOpen(false)
  }

  const handlePresetSelect = (preset: HistoricalPreset) => {
    const f = minDate && preset.from < minDate ? minDate : preset.from
    const t = maxDate && preset.to > maxDate ? maxDate : preset.to
    setManualFrom(f)
    setManualTo(t)
    onRangeChange(f, t)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-trigger"
            variant="outline"
            size="sm"
            className={cn(
              'h-7 justify-start text-left font-semibold text-xs border-border bg-card hover:bg-muted/80 px-2.5 rounded-lg gap-1.5 shadow-xs',
              !startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-mono text-xs text-foreground font-bold">
              {startDate}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            <span className="font-mono text-xs text-foreground font-bold">
              {endDate}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border border-border bg-card shadow-2xl rounded-2xl max-w-sm sm:max-w-none"
          align={align}
        >
          {/* HEADER */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div>
              <Text variant="small" className="font-bold text-foreground flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-primary" /> 커스텀 분석 기간 (직접 입력 & 캘린더)
              </Text>
              <Text variant="muted" className="text-[11px] block mt-0.5">
                데이터 가능 범위: <b>{minDate}</b> (상장일) ~ <b>{maxDate}</b> (전일 종가)
              </Text>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetSelect({ label: '전체', from: minDate, to: maxDate })}
              className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
            >
              <RotateCcw className="h-3 w-3" /> 전체 초기화
            </Button>
          </div>

          {/* 1. DIRECT MANUAL DATE INPUT (수동 날짜 직접 입력/선택 필드) */}
          <div className="p-3 bg-muted/10 border-b border-border space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground block">
              ✍️ 시작일 및 종료일 직접 기입 (YYYY-MM-DD)
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="date"
                  value={manualFrom}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setManualFrom(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <input
                  type="date"
                  value={manualTo}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setManualTo(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>
              <Button
                size="sm"
                onClick={handleManualApply}
                className="h-8 px-3 text-xs font-bold shrink-0"
              >
                적용
              </Button>
            </div>

            {/* QUICK PRESET PILLS */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(p)}
                  className={cn(
                    'h-6 px-2 text-[10px] font-semibold rounded-md border-border bg-card hover:bg-muted',
                    manualFrom === p.from && manualTo === p.to && 'border-primary text-primary font-bold bg-primary/10'
                  )}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 2. INTERACTIVE CALENDAR */}
          <div className="p-1">
            <Calendar
              mode="range"
              defaultMonth={parsedEnd || new Date()}
              selected={selectedRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={(date) => {
                if (minD && isBefore(date, minD)) return true
                if (maxD && isAfter(date, maxD)) return true
                return false
              }}
            />
          </div>

          {/* FOOTER */}
          <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Badge variant="outline" className="font-mono">
                {manualFrom || '시작일'}
              </Badge>
              <span className="text-muted-foreground">~</span>
              <Badge variant="outline" className="font-mono">
                {manualTo || '종료일'}
              </Badge>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs font-bold px-4"
              onClick={handleManualApply}
            >
              확인 및 분석
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
