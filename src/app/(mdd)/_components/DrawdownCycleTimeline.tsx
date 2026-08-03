// src/app/(mdd)/_components/DrawdownCycleTimeline.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Newspaper,
  BarChart2,
  Info,
  Sparkles,
  Lock,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DrawdownCycle } from '@/lib/types'
import { getAiCycleAnalysisAction } from '../_lib/actions'
import type { AiCycleAnalysisResult } from '../_lib/aiCycleService'
import { GoogleAuthButton, getStoredUserToken } from './GoogleAuthButton'

interface DrawdownCycleTimelineProps {
  cycles: DrawdownCycle[]
  symbol: string
  symbolName?: string
  interval: string
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `₩${(price / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`
  }
  if (price >= 10_000) {
    return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }
  if (price >= 100) {
    return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }
  return `₩${price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getDrawdownColor(dd: number): string {
  if (dd <= -0.8) return 'text-red-500 font-black'
  if (dd <= -0.6) return 'text-orange-500 font-bold'
  if (dd <= -0.4) return 'text-amber-500 font-bold'
  return 'text-yellow-500 font-semibold'
}

function getDrawdownBg(dd: number): string {
  if (dd <= -0.8) return 'bg-red-500/10 border-red-500/30'
  if (dd <= -0.6) return 'bg-orange-500/10 border-orange-500/30'
  if (dd <= -0.4) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-yellow-500/10 border-yellow-500/30'
}

export default function DrawdownCycleTimeline({
  cycles,
  symbol,
  symbolName,
  interval,
}: DrawdownCycleTimelineProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'data' | 'news'>('news')
  const [isExpanded, setIsExpanded] = useState(false)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [ragAnalysisMap, setRagAnalysisMap] = useState<Record<string, AiCycleAnalysisResult>>({})
  const [isLoadingRag, setIsLoadingRag] = useState(false)
  const [showPromptMap, setShowPromptMap] = useState<Record<string, boolean>>({})

  function togglePrompt(key: string) {
    setShowPromptMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 🚨 React 규칙: 모든 훅은 early return 전에 최상단에 위치해야 합니다.
  useEffect(() => {
    let isMounted = true
    const token = getStoredUserToken()
    setUserToken(token)

    if (!cycles || cycles.length < 2) return

    async function loadRagAnalysis() {
      setIsLoadingRag(true)
      const newMap: Record<string, AiCycleAnalysisResult> = {}

      for (const cycle of cycles) {
        const key = `${cycle.peakDate}-${cycle.troughDate}`
        try {
          const res = await getAiCycleAnalysisAction(
            symbol,
            cycle.peakDate,
            cycle.troughDate,
            cycle.drawdown,
            token,
            symbolName
          )
          if (isMounted) {
            newMap[key] = res
          }
        } catch {
          // ignore
        }
      }
      if (isMounted) {
        setRagAnalysisMap(newMap)
        setIsLoadingRag(false)
      }
    }

    loadRagAnalysis()
    return () => {
      isMounted = false
    }
  }, [symbol, symbolName, cycles, userToken])

  // 주요 하락 사이클이 2개 미만이면 안전하게 return null
  if (!cycles || cycles.length < 2) return null

  const currentCycle = cycles.find((c) => c.isCurrent)
  const pastCycles = cycles.filter((c) => !c.isCurrent)

  const recommendedStartDate = currentCycle
    ? currentCycle.peakDate
    : pastCycles.length > 0
      ? pastCycles[pastCycles.length - 1].troughDate
      : null

  function handleReanalyze(startDate: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('symbol', symbol)
    params.set('from', startDate)
    params.set('interval', interval)
    router.push(`/?${params.toString()}`)
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-950/20 shadow-md">
      <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <span>
            이 종목은 <span className="text-amber-500">{cycles.length}번</span>의 대규모 하락(-40% 이상)을 경험했습니다
          </span>
        </CardTitle>

        {/* 탭 토글버튼 */}
        <div className="flex items-center rounded-lg bg-background/80 p-1 border shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
              activeTab === 'news'
                ? 'bg-amber-500 text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Newspaper className="h-3.5 w-3.5" />
            📰 뉴스 & AI 맥락 분석 (RAG)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
              activeTab === 'data'
                ? 'bg-amber-500 text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            📊 데이터 기준 분석
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* 모드 1: 📊 순수 데이터 기반 모드 */}
        {activeTab === 'data' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2 rounded-lg bg-background/60 p-3 text-xs text-muted-foreground border">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">데이터 산출 근거:</strong> 전체 역사 중 직전 고점(ATH) 대비 낙폭이 <code className="bg-muted px-1 py-0.5 rounded font-mono text-amber-600">-40%</code> 이하로 폭락했던 대세 하락 구간만 수치적으로 자동 추출한 결과입니다.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {(isExpanded ? cycles : cycles.slice(-Math.min(3, cycles.length))).map((cycle, idx) => (
                <div
                  key={`${cycle.peakDate}-${idx}`}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${getDrawdownBg(cycle.drawdown)} ${cycle.isCurrent ? 'ring-2 ring-amber-500/40' : ''}`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/10">
                    {isExpanded ? idx + 1 : cycles.length - Math.min(3, cycles.length) + idx + 1}
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold">{formatDateShort(cycle.peakDate)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold">{cycle.isCurrent ? '현재' : formatDateShort(cycle.troughDate)}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground text-xs">{formatPrice(cycle.peakPrice)} → {formatPrice(cycle.troughPrice)}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className={getDrawdownColor(cycle.drawdown)}>{(cycle.drawdown * 100).toFixed(1)}%</span>
                    {cycle.isCurrent && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500">← 현재 진행 중</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 모드 2: 📰 실시간 RAG (뉴스 파싱) + LLM 사전 주입 분석 모드 */}
        {activeTab === 'news' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-300">
            {/* 🔄 AI 분석 전체 진행 상태 스피너 바 */}
            {isLoadingRag && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-xs font-semibold text-purple-700 dark:text-purple-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    ✨ Google Gemini 1.5 Flash AI가 <strong>{symbolName || symbol}</strong>의 역대 하락 시기 뉴스 팩트 및 산업 악재를 정밀 분석하고 있습니다...
                  </span>
                </div>
                <span className="text-[11px] bg-purple-500/20 px-2 py-0.5 rounded font-mono">
                  실시간 RAG 파이프라인 작동 중
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {(isExpanded ? cycles : cycles.slice(-Math.min(3, cycles.length))).map((cycle, idx) => {
                const key = `${cycle.peakDate}-${cycle.troughDate}`
                const ragData = ragAnalysisMap[key]

                return (
                  <div
                    key={`news-${cycle.peakDate}-${idx}`}
                    className={`flex flex-col gap-2 rounded-xl border p-4 transition-all ${getDrawdownBg(cycle.drawdown)} relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                          {isExpanded ? idx + 1 : cycles.length - Math.min(3, cycles.length) + idx + 1}
                        </span>
                        <span className="font-bold text-sm">
                          {formatDateShort(cycle.peakDate)} ~ {cycle.isCurrent ? '현재 진행 중' : formatDateShort(cycle.troughDate)}
                        </span>
                        {ragData?.isAiGenerated && (
                          <span className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                            <Sparkles className="h-3 w-3 text-purple-500 animate-spin" />
                            Gemini AI 분석 완료
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${getDrawdownColor(cycle.drawdown)}`}>
                        {(cycle.drawdown * 100).toFixed(1)}% 폭락
                      </span>
                    </div>

                    {/* 1) 구글 로그인 상태 (userToken 존재): 진짜 Gemini AI 분석 결과 및 AI 토글 표시 */}
                    {userToken ? (
                      isLoadingRag && !ragData ? (
                        <div className="flex items-center gap-2 py-3 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-500 shrink-0" />
                          <span>✨ Google Gemini AI가 당시 기사 팩트 및 산업 악재를 심층 추론하고 있습니다...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 pt-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                            <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                            <span>✨ Gemini AI 구조적 폭락 원인: {ragData?.headline}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-5 font-medium">
                            {ragData?.snippet}
                          </p>

                          {/* 수집된 실제 뉴스 기사 클릭 원문 링크 */}
                          {ragData?.sources && ragData.sources.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1 pl-5 border-t pt-2 border-purple-500/20">
                              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                🔗 당시 수집된 검증 뉴스 원문 링크:
                              </span>
                              <div className="flex flex-col gap-1">
                                {ragData.sources.slice(0, 3).map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.link || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{src.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 🤖 로그인 상태에서 제공되는 Gemini AI 실제 질의응답 (프롬프트 & AI 원문 응답) 확인란 */}
                          <div className="mt-2 pl-5 pt-2 border-t border-purple-500/20">
                            <button
                              type="button"
                              onClick={() => togglePrompt(key)}
                              className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              {showPromptMap[key] ? '🤖 AI 질의응답 원문 (프롬프트 & 답변) 닫기' : '🤖 Gemini AI 질의응답 원문 (전달된 프롬프트 & AI 실제 답변) 확인'}
                              {showPromptMap[key] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>

                            {showPromptMap[key] && (
                              <div className="mt-2 flex flex-col gap-2 rounded-lg bg-black/90 p-3 text-[11px] font-mono text-purple-200 border border-purple-500/30 animate-in fade-in duration-200">
                                <div>
                                  <span className="font-bold text-purple-400">1. Gemini AI에게 전달된 프롬프트(질문):</span>
                                  <pre className="mt-1 whitespace-pre-wrap rounded bg-black/50 p-2 text-[10px] text-muted-foreground border border-white/10">
                                    {ragData?.promptUsed || '프롬프트 생성 완료'}
                                  </pre>
                                </div>
                                <div>
                                  <span className="font-bold text-emerald-400">2. Gemini AI가 생성한 원문 답변 (Raw Response):</span>
                                  <pre className="mt-1 whitespace-pre-wrap rounded bg-black/50 p-2 text-[10px] text-emerald-300 border border-white/10">
                                    {ragData?.rawAiResponse || JSON.stringify({ headline: ragData?.headline, snippet: ragData?.snippet }, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      /* 2) 비로그인 상태 (!userToken): AI 표시 0개! 순수 뉴스 팩트 및 원문 링크만 제공 */
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <Newspaper className="h-4 w-4 shrink-0" />
                          <span>📰 당시 언론 보도 팩트: {ragData?.headline}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                          {ragData?.snippet}
                        </p>

                        {/* 수집된 뉴스 원문 링크 */}
                        {ragData?.sources && ragData.sources.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 pl-5 border-t pt-2 border-amber-500/20">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                              🔗 당시 수집된 뉴스 원문 링크:
                            </span>
                            <div className="flex flex-col gap-1">
                              {ragData.sources.slice(0, 3).map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.link || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{src.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 pl-5 pt-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                          <Lock className="h-3 w-3 shrink-0" />
                          <span>Google 계정 로그인 시 Gemini AI의 구조적 폭락 원인 심층 추론이 제공됩니다.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Google OAuth & Gemini AI 서비스 비교 및 상태 안내 박스 */}
            <div className="mt-2 flex flex-col gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs dark:bg-purple-950/20">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 text-sm">
                    <Sparkles className="h-4 w-4 text-purple-500 animate-pulse shrink-0" />
                    <span>💡 AI 맥락 분석 & Google OAuth 연동 상태</span>
                  </div>
                  {userToken && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      🟢 Gemini AI 연동 가동 중
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  수학 알고리즘으로 감지한 역대 하락 구간(-40% 이상)의 <strong>고점~저점 시기</strong>를 기준으로 당시 뉴스 보도 팩트와 기업/산업군 구조적 악재를 분석합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1 border-t border-purple-500/10">
                <div className="flex flex-col gap-1 rounded-lg bg-background/60 p-2.5 border">
                  <span className="font-bold text-foreground flex items-center gap-1">
                    🔓 비로그인 기본 상태
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-normal">
                    수집된 언론사 실시간 헤드라인 기사 팩트 및 수치 데이터를 제공합니다.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-purple-500/10 p-2.5 border border-purple-500/30">
                  <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    ⚡ Google OAuth 연동 상태 (Gemini 1.5 Flash)
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-normal">
                    구글 Gemini LLM이 당시 팩트를 주입(RAG)받아 <strong>&quot;기업 및 산업군 폭락 원인&quot;</strong>을 심층 분석합니다.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {userToken
                    ? `✓ 본인 구글 쿼터로 Gemini AI 서비스가 연동되어 안전하게 작동하고 있습니다.`
                    : `* 개발자 공용 API 키 소진 없이 본인의 구글 쿼터로 안전하게 연동됩니다.`}
                </span>
                <GoogleAuthButton onTokenChange={(newToken) => setUserToken(newToken)} />
              </div>
            </div>
          </div>
        )}

        {/* 더보기 / 접기 버튼 */}
        {cycles.length > 3 && (
          <button
            type="button"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? (
              <>
                접기 <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                {cycles.length - 3}개 더 보기 <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}

        {/* 최근 사이클 기준 재분석 추천 */}
        {recommendedStartDate && currentCycle && (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                💡 최근 사이클 기준 재분석 추천
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              과거 20년 전의 극단적 하락 이벤트(워크아웃 등)가 현재 분석을 왜곡할 수 있습니다.
              최근 사이클({formatDateShort(recommendedStartDate)}~) 기준으로 재분석하면 현재 상황에 훨씬 더 적합한 실질 리스크 판단이 가능합니다.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 font-bold"
              onClick={() => handleReanalyze(recommendedStartDate)}
            >
              {formatDateShort(recommendedStartDate)}부터 재분석
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


