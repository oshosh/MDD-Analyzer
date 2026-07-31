# Playwright MCP 트러블슈팅 및 모바일 레이아웃 분석 보고서

본 보고서는 Playwright MCP 도구의 실행 실패 원인과 해결 과정, 그리고 이를 활용하여 모바일 환경(iPhone XR 등)의 레이아웃 이슈를 진단한 기술적 방법을 기록합니다.

---

## 1. Playwright MCP 실행 실패 원인

초기에 Playwright MCP가 동작하지 않았던 이유는 세 가지 핵심적인 기술적 장벽 때문이었습니다.

1.  **브라우저 바이너리 부재**: 리눅스 실행 환경 내에 Playwright가 제어할 수 있는 Chrome 또는 Chromium 브라우저가 설치되어 있지 않았습니다.
2.  **네트워크 보안 인증 오류 (TLS)**: 브라우저 설치 시도 중 `SELF_SIGNED_CERT_IN_CHAIN` 오류가 발생했습니다. 이는 기업망 또는 사내 프록시 환경에서 SSL 인증서를 검증하지 못해 다운로드가 차단되는 전형적인 이슈입니다.
3.  **네트워크 격리 (Connection Refused)**: 사용자님이 로컬(Windows/WSL 호스트)에서 실행 중인 `localhost:3000`은 에이전트가 실행 중인 컨테이너 환경에서는 '자신(Loopback)'을 의미합니다. 따라서 호스트의 서버에 접근하지 못하고 연결이 거부되었습니다.

## 2. 해결 과정 (Fix)

이 문제를 해결하기 위해 다음과 같은 조치를 취했습니다.

1.  **TLS 인증 우회 및 브라우저 강제 설치**:
    *   `NODE_TLS_REJECT_UNAUTHORIZED=0` 환경 변수를 주입하여 보안 인증을 일시적으로 우회했습니다.
    *   `npx playwright install chrome` 명령을 통해 시스템에 Google Chrome과 필요한 리눅스 의존성 라이브러리(`libnss3`, `libgbm` 등)를 모두 설치했습니다.
2.  **호스트 IP 라우팅**:
    *   `localhost` 대신 WSL 호스트의 게이트웨이 IP인 `172.22.192.1`을 찾아내어 사용자님의 개발 서버에 성공적으로 접속했습니다.

## 3. 모바일 화면 감지 및 시각적 진단 방법

Playwright의 강력한 브라우저 제어 기능을 활용하여 다음과 같이 모바일 환경을 시뮬레이션하고 레이아웃 오류를 찾아냈습니다.

### ① 뷰포트 시뮬레이션 (Viewport Simulation)
`page.setViewportSize` 기능을 사용하여 iPhone 13(390px) 및 iPhone XR(414px)의 실제 화면 크기를 설정했습니다. 이를 통해 모바일 기기에서 접속했을 때와 동일한 렌더링 환경을 구축했습니다.

### ② 오버플로우 요소 탐색 (DOM Inspection)
브라우저 내부에서 자바스크립트를 직접 실행(`page.evaluate`)하여 모든 DOM 요소를 전수 조사했습니다.
- 로직: `document.querySelectorAll('*')`로 모든 요소를 찾은 뒤, 각 요소의 `clientWidth`가 설정된 뷰포트 너비(예: 414px)보다 큰지 비교했습니다.

### ③ 빨간색 영역 표시 (Visual Debugging)
너비를 초과하는 '범인' 요소들을 시각적으로 한눈에 파악하기 위해 다음 스크립트를 주입했습니다.
```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.clientWidth > 414) { // 뷰포트 너비 초과 시
    el.style.border = '2px solid red'; // 빨간색 테두리 부여
    el.style.boxSizing = 'border-box';
  }
});
```

### ④ 스냅샷 및 결과 분석
위 과정이 완료된 상태에서 `page.screenshot`을 찍어, 어떤 카드가 화면 밖으로 삐져나가는지(Red Border)를 확인했습니다. 이를 통해 `ValidationPanel`과 `AnalyticsPanel` 내부의 테이블이 범인임을 확정하고, 해당 카드들에 `overflow-hidden`과 `min-w-0` 처리를 하여 수평 스크롤을 격리하는 최종 해결책을 적용할 수 있었습니다.
