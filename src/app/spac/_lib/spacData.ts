export interface SpacMetadata {
  symbol: string // 6-digit code
  name: string // SPAC name
  issuer: string // 증권사명
  issueSize: number // 발행규모 (억원)
  listingDate: string // 상장일 (YYYY-MM-DD)
  basePrice: number // 공모가 (보통 2000원)
  interestRates: {
    // 예치이자율
    year1: number
    year2: number
    year3: number
  }
}
