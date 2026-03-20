---

## name: frontend-route-handler

description: 'Next.js App Router (app/api) 기반의 API Route 작성 규칙'

# Route Handler 개발 스킬

1. **외부 API 직접 호출 금지**: 클라이언트 브라우저에서 외부(Investing.com 등)로 직접 API를 요청하지 마세요. CORS 및 보안 문제를 방지하기 위한 절대 규칙입니다.
2. **엔드포인트 구조**: 모든 외부 데이터 요청은 `src/app/api/.../route.ts`로 라우팅되어야 합니다.

- `GET /api/search`
- `GET /api/prices`
- `GET /api/fx`
- `GET /api/raw`

3. **HTTP 메소드 및 반환 포맷**:

- `export async function GET(request: Request)` 형태로 구현합니다.
- 반환 데이터는 `NextResponse.json(...)`을 사용합니다.

4. **에러 처리 및 상태 코드 표준**:

- **400 (Bad Request)**: 요청 파라미터 유효성 검사 실패 (Zod 스키마 불일치 등).
- **404 (Not Found)**: 요청한 자산(Ticker)이나 데이터가 존재하지 않음.
- **502 (Bad Gateway)**: 외부 데이터 소스(Investing.com 등) 호출 실패 또는 타임아웃.
- **500 (Internal Server Error)**: 위 상황에 해당하지 않는 예측 불가능한 서버 내부 로직 오류.

5. **데이터 유효성 검증**:

- 모든 `request.nextUrl.searchParams`는 `Zod` 스키마를 통해 검증해야 합니다.
- 에러 응답 시 `{ error: string, code?: string, details?: any }` 포맷을 유지하여 클라이언트가 원인을 파악할 수 있게 합니다.

6. **서버 서비스 활용**:

- 비즈니스 로직은 `src/server/services`에 작성하고, Route Handler에서는 이를 호출하여 결과를 반환하는 역할만 수행합니다.
