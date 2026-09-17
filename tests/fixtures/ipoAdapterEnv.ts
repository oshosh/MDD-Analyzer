/**
 * Deterministic, non-production configuration for IPO adapter unit tests.
 *
 * Values deliberately contain no provider-specific routes or production
 * identifiers. Tests compare requests against these constants directly.
 */
export const IPO_ADAPTER_TEST_ENV = {
  IBK_IPO_GATEWAY_URL: 'https://mock.test/case-01',
  IBK_IPO_TR_CODE: 'mock-token-01',
  IBK_IPO_FORM_NAME: 'mock-token-02',
  IBK_IPO_REFERER: 'https://mock.test/context-01',
  IBK_IPO_ORIGIN: 'https://mock.test',
  MIRAE_IPO_JSON_URL: 'https://mock.test/case-11',
  MIRAE_IPO_DETAIL_JSON_URL: 'https://mock.test/case-12',
  MIRAE_IPO_REFERER: 'https://mock.test/context-11',
  MIRAE_IPO_ACTIVE_URL: 'https://mock.test/case-13',
  MIRAE_IPO_RATE_URL: 'https://mock.test/case-14',
  KIS_IPO_MAIN_URL: 'https://mock.test/case-21',
  KIS_IPO_MOBILE_URL: 'https://mock.test/case-22',
  KIS_IPO_DESKTOP_URL: 'https://mock.test/case-23',
  EUGENE_IPO_LIST_URL: 'https://mock.test/case-31',
  EUGENE_IPO_SEARCH_URL: 'https://mock.test/case-32',
  DAISHIN_IPO_LIST_URL: 'https://mock.test/case-41',
  DART_API_KEY: 'test-dart-api-key',
} as const

export const MOCK_IBK_IPO_TRANSACTION_CODE =
  IPO_ADAPTER_TEST_ENV.IBK_IPO_TR_CODE
