'use server'

export async function getAiCycleAnalysisAction(
  symbol: string,
  peakDate: string,
  troughDate: string,
  drawdown: number,
  userAccessToken?: string | null,
  symbolName?: string,
  selectedModel?: string
) {
  const { analyzeCycleWithRagAndLlm } = await import('../lib/aiCycleService')
  return analyzeCycleWithRagAndLlm(
    symbol,
    peakDate,
    troughDate,
    drawdown,
    userAccessToken,
    symbolName,
    selectedModel
  )
}
