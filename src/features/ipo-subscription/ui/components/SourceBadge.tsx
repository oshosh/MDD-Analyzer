'use client'

import { Database } from 'lucide-react'
import type { IpoDataSource } from '@entities/ipo'
import { Badge } from '@shared/ui/badge'
import { Text } from '@shared/ui/text'
import {
  formatKoreanDateTime,
  statusClassName,
  statusLabel,
} from '../../lib/formatters'

export function SourceBadge({ source }: { source: IpoDataSource }) {
  return (
    <Badge
      variant="outline"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClassName(source.status)}`}
      title={source.coverage}
    >
      <Database className="size-3 shrink-0" />
      <span className="truncate">{source.name}</span>
      <span className="shrink-0">· {statusLabel(source.status)}</span>
    </Badge>
  )
}

export function SourceDetails({ source }: { source: IpoDataSource }) {
  return (
    <div className="bg-background/40 rounded-xl border border-dashed p-3 text-xs leading-5">
      <div className="flex flex-wrap items-center gap-2">
        <Text as="p" variant="small" className="font-bold">
          원천 상태
        </Text>
        <SourceBadge source={source} />
      </div>
      <Text as="p" variant="small" textColor="muted" className="mt-2 block">
        {source.coverage}
      </Text>
      <Text as="p" variant="small" textColor="muted" className="block">
        원천 기준: {formatKoreanDateTime(source.sourceAsOf)} · 수집:{' '}
        {formatKoreanDateTime(source.fetchedAt)}
      </Text>
    </div>
  )
}
