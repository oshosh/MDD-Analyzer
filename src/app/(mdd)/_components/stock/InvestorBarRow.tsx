'use client'

import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Text } from '@/components/ui/text'

export type DisplayMode = 'VOLUME' | 'VALUE'

interface InvestorBarRowProps {
  label: string
  quantity: number
  quantityText: string
  valueAmount: number
  displayMode: DisplayMode
  maxAbsMetric: number
  formatSign: (n: number) => string
  formatValue: (n: number) => string
  holdRatio?: string
}

export const InvestorBarRow: React.FC<InvestorBarRowProps> = ({
  label,
  quantity,
  quantityText,
  valueAmount,
  displayMode,
  maxAbsMetric,
  formatSign,
  formatValue,
  holdRatio,
}) => {
  const currentMetricVal = displayMode === 'VOLUME' ? quantity : valueAmount
  const isPositive = currentMetricVal > 0
  const isNegative = currentMetricVal < 0
  const widthPct = Math.min(100, Math.max(4, (Math.abs(currentMetricVal) / maxAbsMetric) * 100))

  const metricColor = isPositive ? 'up' : isNegative ? 'down' : 'muted'

  return (
    <div className="group relative flex flex-col gap-1.5 rounded-lg p-2 transition hover:bg-slate-800/30">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Text as="strong" variant="small" className="font-semibold text-slate-200">
            {label}
          </Text>
          {holdRatio && (
            <Text as="small" variant="mono" textColor="muted" className="text-[11px]">
              (소진율 {holdRatio})
            </Text>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono">
          {displayMode === 'VOLUME' ? (
            <>
              <Text as="strong" variant="mono" textColor={metricColor} className="font-bold">
                {quantityText}주
              </Text>
              <Text as="small" variant="small" textColor="muted" className="font-sans text-[11px]">
                (약 {formatValue(valueAmount)})
              </Text>
            </>
          ) : (
            <>
              <Text as="strong" variant="mono" textColor={metricColor} className="font-bold">
                {formatValue(valueAmount)}
              </Text>
              <Text as="small" variant="small" textColor="muted" className="font-sans text-[11px]">
                ({quantityText}주)
              </Text>
            </>
          )}
        </div>
      </div>

      <div
        className="relative flex h-4 w-full items-center overflow-hidden rounded bg-slate-900/80"
        role="img"
        aria-label={`${label} 순매수 비중 바`}
      >
        <div className="absolute bottom-0 left-1/2 top-0 z-10 w-0.5 bg-slate-700" />

        {isPositive && (
          <div
            className="absolute bottom-0.5 left-1/2 top-0.5 rounded-r bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 group-hover:from-red-500 group-hover:to-red-400"
            style={{ width: `${widthPct / 2}%` }}
          />
        )}

        {isNegative && (
          <div
            className="absolute bottom-0.5 right-1/2 top-0.5 rounded-l bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-500 group-hover:from-blue-500 group-hover:to-blue-400"
            style={{ width: `${widthPct / 2}%` }}
          />
        )}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="sr-only">{label} 상세 정보</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="border-slate-700 bg-slate-800 text-xs text-slate-100">
          {label} 순매수: <Text as="strong" variant="mono" textColor="brand" className="font-bold">{formatSign(quantity)}주</Text> (약 <Text as="strong" variant="mono" textColor="brand" className="font-bold">{formatValue(valueAmount)}</Text>)
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
