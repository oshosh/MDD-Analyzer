# MDD Analyzer 에이전트 지침

이 저장소는 Antigravity와 Codex가 하나의 개발 지침을 함께 사용합니다.
지침의 원본은 [`.agents/AGENTS.md`](.agents/AGENTS.md)이며, Antigravity는
`.agents/settings.json`을 통해 이 파일을 읽습니다.

코드를 계획·수정·검토·테스트하기 전에 원본 지침과 그 안에서 참조하는 모든
규칙을 읽으십시오. 해당 규칙을 이 작업의 저장소 지침으로 따르며, 특히 금융
계산 검증 규칙과 변경 후 테스트 요구 사항을 항상 준수하십시오.

## 원본 지침과 세부 규칙

- [프로젝트 개요 및 핵심 원칙](.agents/AGENTS.md)
- [기술 스택](.agents/rules/00-tech-stack.md)
- [프로젝트 범위](.agents/rules/01-project-scope.md)
- [프런트엔드 UI](.agents/rules/02-frontend-ui.md)
- [데이터 및 API](.agents/rules/03-data-api.md)
- [수학 검증](.agents/rules/04-math-validation.md)
- [폴더 아키텍처](.agents/rules/05-folder-architecture.md)
- [품질 기준](.agents/rules/06-quality-standards.md)
- [TypeScript 엄격성](.agents/rules/07-typescript-strictness.md)
- [코드 품질 기준](.agents/rules/08-code-quality-standards.md)
- [에이전트 하네스 및 QA](.agents/rules/10-agent-harness-and-qa.md)

한국 주식 검색 또는 투자자 수급 기능을 변경할 때는
`.agents/rules/09-kr-stock-and-search-pipeline.md`와 `.agents/skills/` 아래의
해당 스킬도 읽으십시오.

기획, 기능 구현, 리팩터링 또는 검증 설계 작업에는
`.agents/skills/harness-engineering/SKILL.md`를 사용하여 요구사항을 검증 가능한
완료 조건과 실행 증적으로 연결하십시오.

`.agents`의 지침을 복제하거나 이동하지 마십시오. 기존 위치를 유지해
Antigravity 호환성을 보존하고, 이 루트 파일을 통해 Codex도 동일한 지침을
발견할 수 있게 합니다.
