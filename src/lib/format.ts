export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return ''
  }
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return ''
  }
  return `${(value * 100).toFixed(2)}%`
}

export function formatDate(value: string): string {
  return value
}
