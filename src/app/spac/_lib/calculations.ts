import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInDays,
  format,
} from 'date-fns';
import { getNextKoreanBusinessDayYmd } from 'korean-business-day';

export interface SpacCalculations {
  managementDate: string; // 관리종목지정일
  delistingDate: string; // 상장폐지일
  liquidationDate: string; // 청산일
  remainingDays: number; // 잔여투자기간
  liquidationValueCurrent: number; // 현 청산가
  liquidationValue3Yr: number; // 3년차 청산가
  safetyMargin: number; // 안전마진 (%)
  totalReturn: number; // 총수익률 (%)
  annualYield: number; // 연이율 (%)
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dateToYmdNumber(date: Date): number {
  return Number(format(date, 'yyyyMMdd'))
}

function ymdNumberToDate(value: number): Date {
  const text = String(value)
  return parseDate(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`)
}

function currentKstDate(): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return new Date(year, month - 1, day)
}

function addKoreanBusinessDays(date: Date, amount: number): Date {
  if (amount <= 0) return date
  const ymd = getNextKoreanBusinessDayYmd(dateToYmdNumber(date), amount - 1)
  return ymdNumberToDate(ymd)
}

/**
 * 국내 스팩 연이율·청산가 산식 (spec.md 준수)
 */
export function calculateSpacMetrics(
  listingDateStr: string,
  currentPrice: number,
  basePrice: number,
  interestRates: { year1: number; year2: number; year3: number },
  estimationBasis: 'conservative' | 'aggressive' = 'conservative',
  actualDates: {
    management?: string;
    delisting?: string;
    interestStart?: string;
    valueEndBasis?: 'management' | 'liquidation';
  } = {},
  today: Date = currentKstDate()
): SpacCalculations {
  const listingDate = parseDate(listingDateStr);
  
  // 1. 관리종목지정일: 공시가 있으면 우선 사용, 없으면 상장일 + 910일
  let managementDate: Date;
  if (actualDates.management) {
    managementDate = parseDate(actualDates.management);
  } else {
    managementDate = addDays(listingDate, 910);
  }
  
  // 2. 상장폐지일: 공시가 있으면 우선 사용, 없으면 관리지정일 + 30영업일(약 42일)
  let delistingDate: Date;
  if (actualDates.delisting) {
    delistingDate = parseDate(actualDates.delisting);
  } else {
    delistingDate = addKoreanBusinessDays(managementDate, 30);
  }
  
  // 3. 청산일: 상장폐지일 + 4개월(보수) / 3개월(공격)
  const monthsToAdd = estimationBasis === 'conservative' ? 4 : 3;
  const liquidationDate = addMonths(delistingDate, monthsToAdd);
  
  // 4. 잔여투자기간: 청산일 - 오늘
  const remainingDays = Math.max(1, differenceInCalendarDays(liquidationDate, today));
  
  const interestStartDate = parseDate(actualDates.interestStart ?? listingDateStr);
  const interestTaxRate = 0.154;
  const trustFeeRate = 0.001;

  const appliedMonths = (endDate: Date) => {
    let totalMonths = differenceInCalendarMonths(endDate, interestStartDate);
    if (endDate.getDate() < interestStartDate.getDate()) {
      totalMonths -= 1;
    }
    if (
      endDate.getFullYear() > interestStartDate.getFullYear() &&
      endDate.getMonth() === interestStartDate.getMonth() &&
      endDate.getDate() < interestStartDate.getDate()
    ) {
      totalMonths -= 1;
    }
    totalMonths = Math.max(0, totalMonths);
    return [
      Math.min(12, totalMonths),
      Math.min(12, Math.max(0, totalMonths - 12)),
      Math.min(12, Math.max(0, totalMonths - 24)),
    ];
  };

  const liquidationValue = (endDate: Date) => {
    const [m1, m2, m3] = appliedMonths(endDate);
    return liquidationValueByMonths(m1, m2, m3);
  };

  const liquidationValueByMonths = (m1: number, m2: number, m3: number) => {
    const grossInterest =
      basePrice *
      ((interestRates.year1 / 100) * (m1 / 12) +
        (interestRates.year2 / 100) * (m2 / 12) +
        (interestRates.year3 / 100) * (m3 / 12));
    return basePrice + grossInterest * (1 - interestTaxRate) - basePrice * trustFeeRate;
  };

  const liquidationValueByDays = (endDate: Date) => {
    const periodStarts = [
      interestStartDate,
      addMonths(interestStartDate, 12),
      addMonths(interestStartDate, 24),
    ];
    const periodEnds = [
      addMonths(interestStartDate, 12),
      addMonths(interestStartDate, 24),
      endDate,
    ];
    const rates = [interestRates.year1, interestRates.year2, interestRates.year3];
    const grossInterest = rates.reduce((sum, rate, index) => {
      const from = periodStarts[index];
      const to = periodEnds[index] < endDate ? periodEnds[index] : endDate;
      if (to <= from) return sum;
      return sum + basePrice * (rate / 100) * (differenceInDays(to, from) / 365);
    }, 0);
    return basePrice + grossInterest * (1 - interestTaxRate) - basePrice * trustFeeRate;
  };

  const useLiquidationEnd = actualDates.valueEndBasis === 'liquidation';
  const liquidationValue3Yr = useLiquidationEnd
    ? liquidationValue(liquidationDate)
    : liquidationValueByMonths(12, 12, 6);
  const currentAccruedValue =
    !useLiquidationEnd && today >= managementDate ? liquidationValue3Yr : liquidationValueByDays(today);
  const liquidationValueCurrent = Math.min(currentAccruedValue, liquidationValue3Yr);

  // 6. 안전마진: (현 청산가 / 현재가 - 1) * 100
  const safetyMargin = (liquidationValueCurrent / currentPrice - 1) * 100;
  
  // 7. 총수익률: (3년차 청산가 - 현재가) / 현재가 * 100
  const totalReturn = ((liquidationValue3Yr - currentPrice) / currentPrice) * 100;
  
  // 8. 연이율: 총수익률 * (365 / 잔여투자기간)
  const annualYield = totalReturn * (365 / remainingDays);

  return {
    managementDate: format(managementDate, 'yyyy-MM-dd'),
    delistingDate: format(delistingDate, 'yyyy-MM-dd'),
    liquidationDate: format(liquidationDate, 'yyyy-MM-dd'),
    remainingDays,
    liquidationValueCurrent,
    liquidationValue3Yr,
    safetyMargin,
    totalReturn,
    annualYield,
  };
}
