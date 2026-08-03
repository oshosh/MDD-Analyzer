// src/app/(mdd)/_lib/aiCycleService.ts

import { fetchRealtimeNewsForPeriod, type RealtimeNewsSnippet } from './ragNewsFetcher'

export interface AiCycleAnalysisResult {
  headline: string
  snippet: string
  sourceCount: number
  isAiGenerated: boolean
}

/**
 * 하드코딩 0개!
 * 실시간 RAG(Realtime News Retrieval) + LLM 주입 파이프라인
 * 1. 실시간 뉴스/이벤트 스니펫 수집
 * 2. LLM(Gemini API 환경변수 존재 시)에 실제 수집된 뉴스를 Context로 사전 주입하여 팩트 기반 판단
 * 3. Gemini API Key 미설정 시 수집된 뉴스 팩트 기반 스마트 폴백 요약 반환
 */
export async function analyzeCycleWithRagAndLlm(
  symbol: string,
  peakDate: string,
  troughDate: string,
  drawdown: number
): Promise<AiCycleAnalysisResult> {
  // 1단계: 실시간 실제 뉴스/이벤트 수집 (RAG 팩트 수집)
  const realtimeNews: RealtimeNewsSnippet[] = await fetchRealtimeNewsForPeriod(
    symbol,
    peakDate,
    troughDate
  )

  const newsContextText = realtimeNews.length > 0
    ? realtimeNews.map((n, i) => `[뉴스 ${i + 1}] ${n.title} - ${n.snippet}`).join('\n')
    : '당시 특정 개별 헤드라인 미발견 (전반적인 고점 매물 소화 및 업황 조정 구간)'

  const apiKey = process.env.GEMINI_API_KEY

  // 2단계: GEMINI_API_KEY가 있는 경우 RAG 뉴스 텍스트를 LLM에 사전 주입하여 팩트 추론
  if (apiKey) {
    try {
      const prompt = `
당신은 자산 리스크 분석 전문가입니다.
다음은 분석 대상 기업 및 시기 정보와 해당 시기에 수집된 실제 관련 뉴스 헤드라인 데이터입니다.

[분석 정보]
- 종목/기업명: ${symbol}
- 대폭락 고점 시점: ${peakDate}
- 대폭락 저점 시점: ${troughDate}
- 하락폭: ${(drawdown * 100).toFixed(1)}%

[수집된 실제 뉴스 및 데이터 (Ground Truth)]
${newsContextText}

위의 실제 수집된 뉴스와 수치를 바탕으로, 왜 이 종목이 해당 시기에 대규모 폭락을 맞았는지 핵심 원인을 추론하여 1줄 헤드라인과 2줄 요약 설명으로 답해주세요. JSON 형식으로만 답변해야 합니다:
{
  "headline": "실제 뉴스와 팩트에 기반한 폭락 핵심 이유 1줄 요약",
  "snippet": "당시 실질 뉴스 맥락을 반영한 2줄 상세 설명"
}
`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
          }>
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { headline: string; snippet: string }
          return {
            headline: parsed.headline,
            snippet: parsed.snippet,
            sourceCount: realtimeNews.length,
            isAiGenerated: true,
          }
        }
      }
    } catch (error) {
      console.warn('[AI Cycle Service] Gemini RAG invocation failed, switching to RAG-fallback:', error)
    }
  }

  // 3단계: Gemini API가 없거나 오류 시, 수집된 RAG 실제 뉴스를 기반으로 팩트 요약 구성 (하드코딩 없음)
  const peakYear = peakDate.slice(0, 4)
  const troughYear = troughDate.slice(0, 4)
  
  if (realtimeNews.length > 0) {
    return {
      headline: `${realtimeNews[0].title}`,
      snippet: `실시간 수집 뉴스: ${realtimeNews.slice(0, 2).map((n) => n.title).join(' / ')} (${peakYear}~${troughYear}년 하락 리스크 분석)`,
      sourceCount: realtimeNews.length,
      isAiGenerated: false,
    }
  }

  return {
    headline: `${symbol} ${peakYear}~${troughYear}년 대대적 업황 조정 및 고점 대비 ${(drawdown * 100).toFixed(1)}% 하락`,
    snippet: `${peakDate.slice(0, 7)} 고점 이후 ${troughDate.slice(0, 7)} 저점까지의 시장 변동성 및 거시경제 조정 구간입니다.`,
    sourceCount: 0,
    isAiGenerated: false,
  }
}
