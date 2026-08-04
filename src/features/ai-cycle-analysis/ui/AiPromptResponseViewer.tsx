// src/app/(mdd)/_components/AiPromptResponseViewer.tsx
'use client'

import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@shared/ui/button'
import { Text } from '@shared/ui/text'

interface AiPromptResponseViewerProps {
  isOpen: boolean
  onToggle: () => void
  promptUsed?: string
  rawAiResponse?: string
  headline?: string
  snippet?: string
}

export function AiPromptResponseViewer({
  isOpen,
  onToggle,
  promptUsed,
  rawAiResponse,
  headline,
  snippet,
}: AiPromptResponseViewerProps) {
  return (
    <div className="mt-2 pl-6 pt-2 border-t border-purple-500/20">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-7 px-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-500/10"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-500" />
        {isOpen ? '🤖 AI 질의응답 원문 (프롬프트 & 답변) 닫기' : '🤖 Gemini AI 질의응답 원문 (전달된 프롬프트 & AI 실제 답변) 확인'}
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
      </Button>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-black/90 p-3.5 text-xs font-mono text-purple-200 border border-purple-500/30 animate-in fade-in duration-200">
          <div>
            <Text variant="small" className="font-bold text-purple-400">
              1. Gemini AI에게 전달된 프롬프트(질문):
            </Text>
            <pre className="mt-1 whitespace-pre-wrap rounded bg-black/50 p-2.5 text-xs text-muted-foreground border border-white/10 font-mono">
              {promptUsed || '프롬프트 생성 완료'}
            </pre>
          </div>
          <div>
            <Text variant="small" className="font-bold text-emerald-400">
              2. Gemini AI가 생성한 원문 답변 (Raw Response):
            </Text>
            <pre className="mt-1 whitespace-pre-wrap rounded bg-black/50 p-2.5 text-xs text-emerald-300 border border-white/10 font-mono">
              {rawAiResponse || JSON.stringify({ headline, snippet }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
