/**
 * Produces a comparison key for company names received from separately
 * authorized sources. It is intentionally a pure string normalizer so the
 * production composition layer does not need to import a broker adapter.
 */
export function normalizeCompanyName(name?: string): string {
  if (!name) return ''

  return name
    .replace(/\(주\)|\(유\)|주식회사|㈜/g, '')
    .replace(/\s+/g, '')
    .trim()
}
