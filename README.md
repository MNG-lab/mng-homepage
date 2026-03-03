# MNG Homepage

MNG Lab 홈페이지 저장소입니다.  
이 문서는 **비개발자가 이슈 기반으로 유지보수**할 때 바로 사용할 수 있게 구성되어 있습니다.

## 비개발자용 빠른 사용법

### 1) 수정 요청하기 (가장 많이 쓰는 방식)
아래 버튼으로 템플릿 이슈를 생성하세요.  
해당 템플릿으로 만든 이슈(`codex-auto` 라벨)는 생성 즉시 Codex 자동 실행 대상입니다.

[![Open Issue Template](https://img.shields.io/badge/Issue%20Template-Open-0A66C2?style=for-the-badge)](https://github.com/MNG-lab/mng-homepage/issues/new?template=change-request.yml)

### 2) 댓글로 Codex 실행하기
수동 실행이 필요하면 Issue/PR 댓글에 `@codex` 또는 `/codex`를 포함해 지시하세요.

예시:

```text
@codex
- publications에 2026 논문 2건 추가
- home 통계 숫자 자동 반영 확인
- build/콘텐츠 검증 통과 후 커밋
```

동작 방식:
- Issue 생성(라벨: `codex-auto`): `codex/issue-...` 브랜치를 만들고 PR 생성
- Issue 댓글: `codex-auto` 라벨이 있는 이슈에서만 수동 실행 가능
- PR 댓글: 해당 PR 브랜치에 직접 커밋/푸시
- 워크플로가 실행되면 변경 후 검증(`build`, 필요 시 `validate:content`)을 수행하도록 지시됨

### 3) 결과 확인하기
- GitHub `Actions` 탭에서 실행 로그 확인
- 생성된 PR에서 변경 파일/미리보기 확인
- 이상 없으면 `main`으로 머지

### 4) 배포 확인하기
`main`에 머지되면 GitHub Pages가 자동 배포됩니다.
- 워크플로: `.github/workflows/deploy-pages.yml`

---
## For Developers

요구사항:
- Node.js 20+
- npm 10+

```bash
npm install
npm run dev
```

빌드/미리보기:

```bash
npm run build
npm run preview
```

## 주요 스크립트

- `npm run build`: 프로덕션 빌드 (`prebuild` 포함)
- `npm run validate:content`: 콘텐츠 스키마/참조 검증
- `npm run validate:content:urls`: 콘텐츠 + 외부 URL 검증
- `npm run qa:smoke`: 핵심 라우트 스모크 테스트
- `npm run qa:matrix:responsive`: 반응형 캡처 + 리포트
- `npm run qa:cross-browser`: Chromium/Firefox/WebKit 점검
- `npm run qa:accessibility`: 접근성 점검 리포트
- `npm run preflight:p5`: 릴리즈 전 통합 점검

## Codex 워크플로 파일

- `.github/workflows/codex-comment.yml`
- `.github/workflows/deploy-pages.yml`
- 두 워크플로 모두 lockfile(`package-lock.json`/`npm-shrinkwrap.json`)이 있으면 `npm ci`, 없으면 `npm install`로 자동 분기
- `codex-comment.yml`은 GitHub App 토큰을 사용해 이슈 할당/커밋/PR 생성 주체를 앱 봇으로 통일함

## GitHub App 설정 (Codex 자동화)

`codex-comment.yml` 실행 전 아래 Repository Secrets가 필요합니다.

- `MNG_AI_CODE_BOT_APP_ID`
- `MNG_AI_CODE_BOT_PRIVATE_KEY`

## 운영 문서

- `content/migration-checklist.md`
- `content/p5-pages-checklist.md`
- `content/p5-custom-domain-guide.md`
- `content/release-handoff-summary-2026-03-03.md`
