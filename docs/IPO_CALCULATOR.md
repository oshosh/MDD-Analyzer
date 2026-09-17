# 공모주 청약 계산기 계약

## 사용자 동작과 완료 조건

- 사용자는 한국시간 날짜를 고르면 그 날짜에 청약 중인 공모주와 참여 증권사를
  조회한다. 종목명·일정·공모가·인수인 정보는 런타임 fixture가 아니라 OpenDART
  신고서에서 정규화한다.
- 사용자는 종목과 증권사를 골라 현재 관측값 또는 예상 마감값으로 신청 주수별
  증거금·비례/균등 예상치를 확인한다.
- 수치마다 원천, 원천 기준시각, 수집시각, 잠정/최종/지연 상태를 보며, 원천이
  없는 값은 `—`로 남는다. `0`, 가짜 마감시각, 예시 종목으로 채우지 않는다.
- 넓은 비교/계산 표는 카드 안에서만 가로 스크롤하며, 390px 및 414px 화면에서
  본문 자체가 가로로 밀리지 않는다.

## 데이터 원천과 경계

`GET /api/ipo?date=YYYY-MM-DD`는 선택한 KST 청약일의 정규화된 목록을 반환한다.
브라우저는 이 자사 API만 호출한다.

| 구분            | 원천                                          | 제공 가능한 값                                                            | 제공하지 않는 값                                      |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 기준 메타데이터 | OpenDART 증권신고서                           | 청약 날짜, 납입/배정일, 공모가, 공모주식수, 인수인/인수수량               | 장중 경쟁률, 일반청약 물량, 한도, 수수료, 정확한 시간 |
| 경쟁률·청약조건 | 증권사 공식 SDK 또는 증권사가 승인한 제휴 API | 증권사별 전체/비례 경쟁률, 청약건수, 균등/비례 풀, 한도, 수수료, 기준시각 | 증권사 사용 권한·명세 또는 원천 범위 밖의 증권사/필드 |
| 예상 마감       | 피드의 명시된 모델 또는 운영 입력             | 예상 마감 경쟁률·균등수량·증거금                                          | 현재 관측값으로 위장한 값                             |

OpenDART 목록 검색은 `C001` 필터가 오염된 결과를 돌려줄 수 있으므로 서버에서
`증권신고서(지분증권)`, 비상장사, `일반공모` 및 청약일 범위를 다시 검증한다.
이는 공시 기반 일정 탐색이며, 상업용 "완전한 IPO 달력"을 보장한다는 뜻은 아니다.

증권사 공식 API 어댑터는 서버에만 연결한다. 직접 원천 브리지는 해당 증권사의
SDK 또는 승인된 제휴 API를 호출하고, 받은 응답을 아래 계약으로 정규화한다. 이
앱에는 브리지 URL만 넣으며, 증권사 인증정보·세션·원시 응답은 브라우저에 보내지
않는다.

```dotenv
# 증권사 공식 SDK/제휴 API를 호출하는 사설 브리지 URL — 브라우저에 노출하지 않는다.
IPO_BROKER_DIRECT_BRIDGE_URL=http://127.0.0.1:4310/v1/ipo/competition
# 브리지 자체를 보호할 때만 설정한다. 증권사 앱키·계좌 자격증명이 아니다.
IPO_BROKER_DIRECT_BRIDGE_TOKEN=replace-with-bridge-secret
```

브리지가 아직 연결되지 않았거나 지연됐을 때도 화면은 직접 원천 상태를 명시한다.
원시 증권사 화면을 브라우저에서 직접 호출하거나 무단 크롤링하지 않는다. 응답의
최상위 원천과 각 증권사 원천은 모두 `dataKind: 'broker-direct'`여야 하며, 다른
원천으로 표시된 응답은 사용하지 않는다.

```ts
IpoCompetitionFeedResponse = {
  source: { name, dataKind, sourceAsOf, fetchedAt, status, coverage },
  offerings: [
    {
      dartCorpCode,
      depositRate,
      listingDate,
      subscriptionOpenAt,
      subscriptionCloseAt,
      expectedFinalDeposit,
      expectedFinalOneShareCost,
      marketPrice,
      disparityRate,
      brokers: [
        {
          id,
          name,
          currentTotalCompetitionRatio,
          currentProportionalRatio,
          expectedFinalProportionalRatio,
          currentEqualExpectedAllocation,
          expectedEqualAllocation,
          applicantCount,
          generalAllocationShares,
          equalAllocationShares,
          proportionalAllocationShares,
          limits,
          minSubscriptionShares,
          subscriptionUnitShares,
          applicationFee,
          competitionRatioKind,
          proportionalAllocationRoundingRule,
          source,
        },
      ],
    },
  ],
}
```

피드의 `competitionRatioKind`가 `broker-proportional`일 때만 비례 계산기에 사용한다.
전체/통합 경쟁률은 비교용으로 표시할 수 있지만, 비례 경쟁률로 추정하거나 단순
평균해서는 안 된다.

`proportionalAllocationRoundingRule`도 직접 원천이 명시한 경우에만 사용한다.
현재 화면의 5사6입 표는 값이 `five-round-six-up`일 때만 표시하며, 규칙이 없거나
다른 규칙이면 비례 기대값만 표시한다. 일반청약 물량의 비율, 전체 경쟁률의 배수,
통상 수수료·최소청약 단위로 이 필드를 추정하지 않는다.

## 계산 규칙

- 필요 증거금 = `신청주수 × 공모가 × 증거금율`
- 비례 예상 = `신청주수 ÷ 선택 증권사의 계산 기준 비례 경쟁률`
- 총 예상 = `비례 예상 + 선택 증권사의 같은 기준(현재/예상)의 균등 예상 수량`

현재 비례 경쟁률과 예상 마감 비례 경쟁률은 별도 필드다. 현재 기준 계산은
`currentEqualExpectedAllocation`만, 예상 마감 기준 계산은
`expectedEqualAllocation`만 사용한다. 둘 중 하나가 없으면 총 예상은 `—`로
표시한다. 예상 마감 경쟁률은 실측값이 아니라 관리자 입력 또는 버전이 남는
예측 모델의 출력이어야 한다. 균등 예상 역시 유효 청약 건수와 증권사 규칙에
따라 바뀌므로 잠정값으로만 표시한다.

통합 경쟁률은 비율의 단순 평균으로 만들 수 없다. 같은 기준시각의 완전한 입력이
있을 때만 `Σ 유효 청약주수 ÷ Σ 일반청약 배정주수`로 계산한다. 그렇지 않으면
집계값 대신 커버리지(예: `2/3개 증권사 반영`)를 표시한다.

## 화면 표와 API 데이터 계약

정규화된 응답은 공모가·증거금율·청약 기간과 다음 증권사별 필드를 포함한다.

| 필드                                                                               | 용도                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| `currentProportionalRatio`                                                         | 현재 관측 비례 경쟁률                      |
| `expectedFinalProportionalRatio`                                                   | 관리자/모델의 예상 마감 경쟁률             |
| `currentEqualExpectedAllocation`, `expectedEqualAllocation`                        | 현재/예상 마감의 증권사별 균등 예상 수량   |
| `currentTotalCompetitionRatio`, `currentProportionalRatio`                         | 전체/비례 경쟁률을 구분한 현재 관측값      |
| `applicantCount`, `currentTotalDeposit`                                            | 청약건수·총 증거금                         |
| `generalAllocationShares`, `equalAllocationShares`, `proportionalAllocationShares` | 일반/균등/비례 배정 풀                     |
| `limits`, `minSubscriptionShares`, `subscriptionUnitShares`, `applicationFee`      | 증권사별 한도·단위·수수료                  |
| `proportionalAllocationRoundingRule`                                               | 증권사 원천이 확인한 비례 배정 반올림 규칙 |
| `competitionSource.sourceAsOf`, `competitionSource.fetchedAt`                      | 원천 기준·수집 시각                        |
| `competitionSource.status`, `competitionSource.coverage`                           | 잠정/최종/지연/미제공 상태와 데이터 범위   |

외부 원천은 서버의 OpenDART/증권사 직접 원천 어댑터에서만 호출한 뒤 Zod로
정규화한다. 브라우저가 증권사 사이트를 직접 호출해서는 안 된다.

## 실시간 운영 전환

직접 원천은 증권사별로 별도 승인·SDK 또는 제휴 API 명세가 필요하다. 브리지에
연결하기 전에는 다음을 해당 증권사로부터 서면으로 확인한다.

- 공모주별·증권사별 경쟁률, 청약건수, 균등/비례 풀, 한도·수수료를 읽는 정확한
  API/SDK 객체 또는 TR과 요청·응답 스키마
- 갱신 주기, 지연·정정 정책, 기준시각과 비례 경쟁률 정의
- 비례 배정 반올림 규칙(5사6입 여부 포함)과 적용 범위
- 인증 방식, read-only 범위, 서버 캐시와 외부 웹 표시·재배포 권한

유진·미래에셋·대신의 현재 공개 문서 조사 결과와 직접 문의 초안은
[BROKER_DIRECT_IPO_ACCESS.md](BROKER_DIRECT_IPO_ACCESS.md)에 기록한다. 이 설정을
통해 승인된 직접 데이터가 도착하면 프런트엔드 변경 없이 30초 폴링 화면에 반영된다.

OpenDART의 [증권신고서 API](https://opendart.fss.or.kr/api/estkRs.json)는 청약
일정·공모가·주관사 등의 기준 정보를 보강하는 용도로만 쓰고, 장중 경쟁률의
대체 원천으로 사용하지 않는다. OpenDART 장애는 API의 `502`, 키 누락은 `500`,
형식이 잘못된 날짜는 `400`으로 명확히 구분한다. 청약 종목이 없는 날짜는
정상적인 `200`과 빈 `offerings` 배열이다.
