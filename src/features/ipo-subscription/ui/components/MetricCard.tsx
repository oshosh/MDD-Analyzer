'use client'

import { Text } from '@shared/ui/text'

export function MetricCard({
  label,
  value,
  emphasized = false,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3 ${
        emphasized ? 'border-primary/30 bg-primary/10' : 'bg-muted/20'
      }`}
    >
      <Text
        as="p"
        variant="small"
        textColor="muted"
        className="text-[11px] font-semibold"
      >
        {label}
      </Text>
      <Text
        as="p"
        variant="large"
        className={`mt-1 truncate text-sm font-extrabold sm:text-base ${
          emphasized ? 'text-primary' : ''
        }`}
      >
        {value}
      </Text>
    </div>
  )
}
