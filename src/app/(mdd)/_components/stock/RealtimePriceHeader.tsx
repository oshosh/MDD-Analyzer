'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Text } from '@/components/ui/text'

export interface StockPriceInfo {
  closePrice: string
  compareToPreviousPriceText: string
  fluctuationsRatio: string
  isRising: boolean
  isFalling: boolean
  fetchedAt?: string
}

interface RealtimePriceHeaderProps {
  priceInfo: StockPriceInfo
}

export const RealtimePriceHeader: React.FC<RealtimePriceHeaderProps> = ({ priceInfo }) => {
  const {
    closePrice,
    compareToPreviousPriceText,
    fluctuationsRatio,
    isRising,
    isFalling,
    fetchedAt,
  } = priceInfo

  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null)
  const prevPriceRef = useRef<string>(closePrice)

  useEffect(() => {
    if (prevPriceRef.current !== closePrice) {
      const prevNum = parseFloat(prevPriceRef.current.replace(/,/g, '')) || 0
      const currNum = parseFloat(closePrice.replace(/,/g, '')) || 0

      if (currNum > prevNum && prevNum > 0) {
        setFlash('UP')
      } else if (currNum < prevNum && prevNum > 0) {
        setFlash('DOWN')
      }

      const timer = setTimeout(() => {
        setFlash(null)
      }, 1000)

      prevPriceRef.current = closePrice
      return () => clearTimeout(timer)
    }
  }, [closePrice])

  const priceColor = flash === 'UP' ? 'up' : flash === 'DOWN' ? 'down' : 'default'
  const changeColor = isRising ? 'up' : isFalling ? 'down' : 'muted'
  const updatedAt = fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : ''

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
          {closePrice}원
        </Text>

        <p className="flex items-center">
          <Text as="span" variant="small" textColor={changeColor} className="font-semibold">
            {isRising ? '▲ ' : isFalling ? '▼ ' : ''}
            {compareToPreviousPriceText}
          </Text>
          <Text as="span" variant="mono" textColor={changeColor} className="ml-1 font-semibold">
            ({isRising ? '+' : ''}{fluctuationsRatio}%)
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
