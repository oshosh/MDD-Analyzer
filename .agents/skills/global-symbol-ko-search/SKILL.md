---
name: global-symbol-ko-search
description: '한글 회사명 검색 시 Wikipedia 다국어 파이프라인 기반 글로벌 티커 자동 검색 스킬'
---

# 🌐 한글 입력 기반 글로벌 자산 검색 스킬

1. **목적**:
   - 사용자가 "삼성전자", "애플", "마이크로소프트", "키옥시아" 등 한글로 입력해도 미국 주식, 글로벌 자산, 해외 ETF의 정규 티커를 정확히 찾아 반환한다.

2. **3단계 다국어 처리 파이프라인**:
   - **Step 1 (한글 입력 감지)**: 정규식 `/[\uAC00-\uD7A3\u3131-\u318E]/` 로 한글 검색어 여부를 판별한다.
   - **Step 2 (Wikipedia ko→en 매핑)**: 
     - 한국어 위키피디아 `opensearch` 및 `search` API를 통해 한글 문서 제목 후보를 검색한다.
     - `langlinks` (lllang=en) API로 해당 위키 문서의 공식 영어명(English Title)을 자동 조회한다.
     - `langlinks`가 없는 경우 wikitext 본문의 `|원어 = `, `{{lang|en|...}}` 마크업에서 영어 표기를 추출(Fallback)한다.
   - **Step 3 (Yahoo Finance & Proxy 연동)**:
     - 추출된 영어명을 기반으로 Yahoo Finance Search API를 병렬 호출하여 정규 심볼(Ticker), 자산군(AssetType), 공식명칭을 조합해 deduplication 후 반환한다.

3. **캐싱 및 Performance**:
   - 위키피디아 한글→영어 명칭 변환 결과는 잘 변경되지 않으므로 1시간 이상 인메모리/파일 캐시(`serverCache.ts`)에 보관한다.
