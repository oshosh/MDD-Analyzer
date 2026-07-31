'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKrStockPriceAction, type KrPriceResponse } from '@/app/(mdd)/_lib/actions'
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

interface PriceApiResponse {
  stockCode: string
  stockName: string
  closePrice: string
  compareToPreviousPriceText: string
  fluctuationsRatio: string
  isRising: boolean
  isFalling: boolean
  fetchedAt: string
}

export const RealtimePriceHeader: React.FC<RealtimePriceHeaderProps> = ({
  stockCode,
  initialClosePrice,
  initialCompareText,
  initialRatio,
  initialIsRising,
  initialIsFalling,
  initialFetchedAt,
}) => {
  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null)
  const prevPriceRef = useRef<string>(initialClosePrice)

  const { data } = useQuery<KrPriceResponse>({
    queryKey: ['kr-stock-price', stockCode],
    queryFn: () => getKrStockPriceAction(stockCode),
    staleTime: 5 * 60_000,
    initialData: {
      stockCode,
      stockName: stockCode,
      closePrice: initialClosePrice,
      compareToPreviousPriceText: initialCompareText,
      fluctuationsRatio: initialRatio,
      isRising: initialIsRising,
      isFalling: initialIsFalling,
      fetchedAt: initialFetchedAt || new Date().toISOString(),
    },
  })

  const priceInfo = {
    closePrice: data.closePrice,
    compareToPreviousPriceText: data.compareToPreviousPriceText,
    fluctuationsRatio: data.fluctuationsRatio,
    isRising: data.isRising,
    isFalling: data.isFalling,
    updatedAt: new Date(data.fetchedAt).toLocaleTimeString(),
  }

  useEffect(() => {
    if (prevPriceRef.current !== data.closePrice) {
      const prevNum = parseFloat(prevPriceRef.current.replace(/,/g, '')) || 0
      const currNum = parseFloat(data.closePrice.replace(/,/g, '')) || 0

      if (currNum > prevNum) {
        setFlash('UP')
      } else if (currNum < prevNum) {
        setFlash('DOWN')
      }

      const timer = setTimeout(() => {
        setFlash(null)
      }, 1000)

      prevPriceRef.current = data.closePrice
      return () => clearTimeout(timer)
    }
  }, [data.closePrice])

  const priceColor = flash === 'UP' ? 'up' : flash === 'DOWN' ? 'down' : 'default'
  const changeColor = priceInfo.isRising ? 'up' : priceInfo.isFalling ? 'down' : 'muted'

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
          {priceInfo.closePrice}원
        </Text>

        <p className="flex items-center">
          <Text as="span" variant="small" textColor={changeColor} className="font-semibold">
            {priceInfo.isRising ? '▲ ' : priceInfo.isFalling ? '▼ ' : ''}
            {priceInfo.compareToPreviousPriceText}
          </Text>
          <Text as="span" variant="mono" textColor={changeColor} className="ml-1 font-semibold">
            ({priceInfo.isRising ? '+' : ''}{priceInfo.fluctuationsRatio}%)
          </Text>
        </p>
      </div>

      <Text as="span" variant="mono" textColor="subtle" className="mt-0.5 text-[11px]" suppressHydrationWarning>
        실시간 시세 갱신: {priceInfo.updatedAt}
      </Text>
    </div>
  )
}
