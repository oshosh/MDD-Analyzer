'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Text } from '@/components/ui/text'

interface RealtimePriceHeaderProps {
  stockCode: string
  initialClosePrice: string
  initialCompareText: string
  initialRatio: string
  initialIsRising: boolean
  initialIsFalling: boolean
  initialFetchedAt?: string
}

export const RealtimePriceHeader: React.FC<RealtimePriceHeaderProps> = ({
  initialClosePrice,
  initialCompareText,
  initialRatio,
  initialIsRising,
  initialIsFalling,
  initialFetchedAt,
}) => {
  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null)
  const prevPriceRef = useRef<string>(initialClosePrice)

  useEffect(() => {
    if (prevPriceRef.current !== initialClosePrice) {
      const prevNum = parseFloat(prevPriceRef.current.replace(/,/g, '')) || 0
      const currNum = parseFloat(initialClosePrice.replace(/,/g, '')) || 0

      if (currNum > prevNum && prevNum > 0) {
        setFlash('UP')
      } else if (currNum < prevNum && prevNum > 0) {
        setFlash('DOWN')
      }

      const timer = setTimeout(() => {
        setFlash(null)
      }, 1000)

      prevPriceRef.current = initialClosePrice
      return () => clearTimeout(timer)
    }
  }, [initialClosePrice])

  const priceColor = flash === 'UP' ? 'up' : flash === 'DOWN' ? 'down' : 'default'
  const changeColor = initialIsRising ? 'up' : initialIsFalling ? 'down' : 'muted'
  const updatedAt = initialFetchedAt ? new Date(initialFetchedAt).toLocaleTimeString() : ''

  return (
    <div className="flex flex-col items-end">
      <div
        className={`flex items-baseline gap-3 rounded-xl px-3 py-1.5 transition-colors duration-500 ${
          flash === 'UP'
            ? 'bg-red-500/25 ring-1 ring-red-500/60'
            : flash === 'DOWN'
              ? 'bg-blue-500/25 ring-1 ring-blue-500/60'
              : ''
        }`}
      >
        <Text as="span" variant="h3" textColor={priceColor} className="font-extrabold tracking-tight">
          {initialClosePrice}원
        </Text>

        <p className="flex items-center">
          <Text as="span" variant="small" textColor={changeColor} className="font-semibold">
            {initialIsRising ? '▲ ' : initialIsFalling ? '▼ ' : ''}
            {initialCompareText}
          </Text>
          <Text as="span" variant="mono" textColor={changeColor} className="ml-1 font-semibold">
            ({initialIsRising ? '+' : ''}{initialRatio}%)
          </Text>
        </p>
      </div>

      {updatedAt && (
        <Text as="span" variant="mono" textColor="subtle" className="mt-0.5 text-[11px]" suppressHydrationWarning>
          실시간 시세 갱신: {updatedAt}
        </Text>
      )}
    </div>
  )
}
