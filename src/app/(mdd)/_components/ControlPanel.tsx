'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AsyncCreatableSelect from 'react-select/async-creatable'
import type { InputActionMeta, SingleValue, StylesConfig } from 'react-select'
import { todayIso } from '@/lib/date'
import { browserApiClient } from '@/lib/http/axios'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Instrument, IntervalType } from '@/lib/types'
import type { MddQueryInput } from '@/app/(mdd)/_lib/schemas'
import { Search, Calendar, BarChart3, ArrowRight } from 'lucide-react'

interface ListingResponse {
  listing_date: string
}

interface SearchResponse {
  rows: Instrument[]
}

interface SymbolOption {
  value: string
  label: string
  name: string
}

interface ControlPanelProps {
  value: MddQueryInput
}

function toOption(row: Instrument): SymbolOption {
  const symbol = row.symbol.toUpperCase()
  return {
    value: symbol,
    label: `${symbol} | ${row.name}`,
    name: row.name,
  }
}

const DEFAULT_OPTIONS: SymbolOption[] = [
  {
    value: 'SPY',
    label: 'SPY | SPDR S&P 500 ETF Trust',
    name: 'SPDR S&P 500 ETF Trust',
  },
  { value: 'QQQ', label: 'QQQ | Invesco QQQ Trust', name: 'Invesco QQQ Trust' },
  { value: 'AAPL', label: 'AAPL | Apple Inc.', name: 'Apple Inc.' },
  { value: 'BTC-USD', label: 'BTC-USD | Bitcoin', name: 'Bitcoin' },
  { value: 'ETH-USD', label: 'ETH-USD | Ethereum', name: 'Ethereum' },
]

const selectStyles: StylesConfig<SymbolOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    height: 44,
    borderRadius: 12,
    border: 'none',
    boxShadow: state.isFocused ? '0 0 0 2px var(--primary)' : 'none',
    backgroundColor: 'var(--muted)',
    paddingLeft: 12,
    fontSize: '14px',
    fontWeight: '600',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--foreground)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--muted-foreground)',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    border: '1px solid var(--border)',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    backgroundColor: 'var(--card)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? 'var(--primary)' : 'transparent',
    color: state.isFocused ? 'var(--primary-foreground)' : 'var(--foreground)',
    cursor: 'pointer',
    padding: '10px 16px',
    fontSize: '13px',
  }),
}

export default function ControlPanel({ value }: ControlPanelProps) {
  const router = useRouter()
  const [symbolInput, setSymbolInput] = useState(value.symbol.toUpperCase())
  const [selectedOption, setSelectedOption] = useState<SymbolOption>({
    value: value.symbol.toUpperCase(),
    label: value.symbol.toUpperCase(),
    name: value.symbol.toUpperCase(),
  })
  const [from, setFrom] = useState(value.from)
  const [to, setTo] = useState(value.to)
  const [interval, setInterval] = useState<IntervalType>(value.interval)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchCache = useMemo(() => new Map<string, SymbolOption[]>(), [])

  // Ensure document.body is available for menu portal
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  useEffect(() => {
    const symbol = value.symbol.toUpperCase()
    setSymbolInput(symbol)
    setSelectedOption((prev) =>
      prev.value === symbol
        ? prev
        : {
            value: symbol,
            label: symbol,
            name: symbol,
          }
    )
  }, [value.symbol])

  useEffect(() => {
    setFrom(value.from)
    setTo(value.to)
    setInterval(value.interval)
  }, [value.from, value.to, value.interval])

  async function loadSymbolOptions(
    inputValue: string
  ): Promise<SymbolOption[]> {
    const keyword = inputValue.trim()
    if (!keyword) return []
    const cacheKey = keyword.toUpperCase()

    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey) ?? []
    }

    setIsSearching(true)
    try {
      const response = await browserApiClient.get<SearchResponse>(
        '/api/search',
        {
          params: { q: keyword },
        }
      )
      const dedupe = new Map<string, SymbolOption>()
      for (const row of response.data.rows) {
        const option = toOption(row)
        dedupe.set(option.value, option)
      }
      const options = [...dedupe.values()]
      searchCache.set(cacheKey, options)
      return options
    } catch {
      return []
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card className="bg-card/60 rounded-[20px] border-none p-1.5 shadow-xl backdrop-blur-xl">
      <form
        className="flex flex-col gap-2 lg:flex-row lg:items-center"
        onSubmit={async (event) => {
          event.preventDefault()
          if (isSubmitting) return

          setIsSubmitting(true)
          try {
            const nextSymbol = symbolInput.trim().toUpperCase()
            if (!nextSymbol) return
            let nextFrom = from
            let nextTo = to

            // 티커가 변경된 경우에만 해당 주식의 상장일을 가져와서 날짜 범위를 리셋
            if (nextSymbol !== value.symbol.toUpperCase()) {
              try {
                const response = await browserApiClient.get<ListingResponse>(
                  '/api/listing',
                  {
                    params: { symbol: nextSymbol },
                  }
                )
                const listing = response.data
                nextFrom = listing.listing_date
                nextTo = todayIso()
              } catch {
                // listing lookup fails: keep current input dates
              }
            }

            const params = new URLSearchParams({
              symbol: nextSymbol,
              from: nextFrom,
              to: nextTo,
              interval,
            })
            router.push(`/?${params.toString()}`)
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <AsyncCreatableSelect
            instanceId="symbol-autocomplete"
            styles={selectStyles}
            placeholder="티커 입력 (예: SPY, AAPL, BTC...)"
            defaultOptions={DEFAULT_OPTIONS}
            menuPortalTarget={portalTarget}
            menuPlacement="auto"
            cacheOptions
            isClearable={false}
            isLoading={isSearching}
            value={selectedOption}
            loadOptions={loadSymbolOptions}
            onCreateOption={(valueText) => {
              const normalized = valueText.trim().toUpperCase()
              if (!normalized) return
              setSymbolInput(normalized)
              setSelectedOption({
                value: normalized,
                label: normalized,
                name: normalized,
              })
            }}
            onChange={(option) => {
              if (!option) return
              setSymbolInput(option.value)
              setSelectedOption(option)
            }}
            noOptionsMessage={() => '검색 결과 없음'}
          />
        </div>

        <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-[14px] p-1.5 lg:flex-nowrap">
          <div className="bg-card flex items-center gap-1.5 rounded-lg px-3 py-2 shadow-sm">
            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
            <input
              type="date"
              value={from}
              className="w-[115px] bg-transparent text-sm font-semibold outline-none"
              onChange={(e) => setFrom(e.target.value)}
            />
            <ArrowRight className="text-muted-foreground mx-1 h-3 w-3" />
            <input
              type="date"
              value={to}
              className="w-[115px] bg-transparent text-sm font-semibold outline-none"
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="bg-card flex min-w-[100px] items-center gap-2 rounded-lg px-3 py-2 shadow-sm">
            <BarChart3 className="text-muted-foreground h-3.5 w-3.5" />
            <select
              className="cursor-pointer bg-transparent text-sm font-bold outline-none"
              value={interval}
              onChange={(e) => setInterval(e.target.value as IntervalType)}
            >
              <option value="1d">1D</option>
              <option value="1w">1W</option>
              <option value="1m">1M</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary shadow-primary/20 h-11 rounded-xl px-8 font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95"
          >
            {isSubmitting ? '조회 중' : '분석 실행'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
