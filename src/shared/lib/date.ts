export const DEFAULT_FROM = '2010-01-01'

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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
