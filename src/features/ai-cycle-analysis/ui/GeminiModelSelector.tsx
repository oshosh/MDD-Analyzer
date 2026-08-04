// src/app/(mdd)/_components/GeminiModelSelector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select'
import { Text } from '@shared/ui/text'

interface GeminiModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function GeminiModelSelector({
  selectedModel,
  onModelChange,
}: GeminiModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Text variant="small" textColor="muted" className="font-bold shrink-0">
        AI 모델 선택:
      </Text>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger size="sm" className="w-[260px] border-purple-500/40 text-xs font-bold text-purple-700 dark:text-purple-300">
          <SelectValue placeholder="AI 모델을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gemini-1.5-pro" className="text-xs font-bold">
            ✨ Gemini 1.5 Pro (최고 성능 분석 추천)
          </SelectItem>
          <SelectItem value="gemini-1.5-flash" className="text-xs font-bold">
            ⚡ Gemini 1.5 Flash (초고속 응답)
          </SelectItem>
          <SelectItem value="gemini-2.0-flash-exp" className="text-xs font-bold">
            🧪 Gemini 2.0 Flash (최신 실시간 모델)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
