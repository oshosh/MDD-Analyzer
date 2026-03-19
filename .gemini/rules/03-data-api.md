---
description: '데이터 수집 규칙: Route Handler 기반 외부 API 정규화 수행'
globs: 'src/app/api/**/*, src/lib/**/*, src/server/**/*'
alwaysApply: false
---

# 데이터 수집 원칙

- **CORS 및 보안**: 브라우저 클라이언트 공간에서 외부 데이터 소스 직접 호출 금지. 모든 요청은 `app/api`를 통과해야 한다.
- **스크래핑 금지**: 외부 사이트(예: Investing.com)의 자동 스크래핑 로직은 금지한다. 정해진 API 엔드포인트와 정규화된 데이터 소스만 활용한다.
- **에러 처리 표준**: `@.gemini/skills/frontend-route-handler`에 정의된 400, 404, 502, 500 표준을 준수한다.

# API 엔드포인트 설계

- `GET /api/search`: 입력 문자열을 자산군 + 정규화 심볼로 변환
- `GET /api/prices`: OHLCV 또는 최소 Close 시계열 제공
- `GET /api/fx`: 환율 시계열 제공
- `GET /api/raw`: `prices` + `fx`를 병합하여 `docs/RAW_SCHEMA.md` 구조로 가공 반환

# Route Handler 개발

- `NextResponse.json(...)` 으로 응답하며, 유효성 검사는 `Zod`를 필수 사용한다.
