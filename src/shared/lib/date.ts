export const DEFAULT_FROM = '2010-01-01'

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 공모주 청약일은 한국 거래일을 기준으로 판단한다. UTC 자정 부근에 전날/다음날을
 * 잘못 조회하지 않도록 서버와 브라우저 모두에서 같은 KST 날짜를 만든다.
 */
export function todayKstIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Unable to resolve the current KST date')
  }

  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function assertDateRange(from: string, to: string): void {
  const fromDate = parseIsoDate(from)
  const toDate = parseIsoDate(to)
  if (!fromDate || !toDate || fromDate > toDate) {
    throw new Error('Invalid date range')
  }
}
