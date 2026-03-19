# RAW DATA SCHEMA (고정)

## 공통 컬럼 순서 (엑셀과 동일)

1. date (YYYY-MM-DD)
2. open
3. high
4. low
5. close
6. volume
7. change_percent
8. peak (rolling ATH)
9. drawdown (dd)
10. fx_usdkrw (US/GOLD만)
11. close_krw (US/GOLD만)
12. peak_krw (US/GOLD만)
13. drawdown_krw (US/GOLD만)

## 타입

- date: string (ISO)
- price: number (float)
- volume: number
- percent: number (0.00% 형태, 내부 계산은 decimal)

## 반올림 규칙

- 퍼센트: 소수점 둘째 자리 반올림
- 가격: 소수점 둘째 자리
- 누적수익률: 소수점 둘째 자리 %
