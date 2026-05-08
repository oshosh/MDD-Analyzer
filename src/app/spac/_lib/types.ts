import { SpacMetadata } from './spacData'
import { SpacCalculations } from './calculations'

export type MergerStage = 
  | '일반 운용'
  | '합병 발표'
  | '주총 준비'
  | '주총 승인'
  | '예심 승인'
  | '합병 철회'
  | '상장폐지 진행';

export interface SpacTableRow extends SpacMetadata, SpacCalculations {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  changeRate: number;
  changeAmount: number;
  mergerStage: MergerStage;
  candidateCompany?: string;
  volumeAmount: number; // 거래대금 (억원)
  mergerSuccess: '성공' | '실패' | '진행중';
  promoter: string; // 대표 발기인 (요약용)
  promotersAll: string[]; // 전체 발기인 명단
  promotersRep: string[]; // 대표 발기인 명단
  capitalIncreaseDate: string; // 증자등기일
  securitiesCompany: string; // 증권사명
  issueSize: number; // 발행규모 (억원)
  interestRate1Yr: number; // 1년차 예치이자율
  interestRate2Yr: number; // 2년차 예치이자율
  interestRate3Yr: number; // 3년차 예치이자율
  interestRate4Yr?: number; // 4차 예치이자율
  isManagementEstimated: boolean; // 관리종목지정일 추정 여부
  isDelistingEstimated: boolean; // 상장폐지일 추정 여부
}
