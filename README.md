# MNG Homepage

MNG Lab 홈페이지 저장소입니다.  
이 문서는 **비개발자가 이슈 기반으로 유지보수**할 때 바로 사용할 수 있게 구성되어 있습니다.

## 비개발자용 빠른 사용법

### 1) 수정/롤백 요청하기 (가장 많이 쓰는 방식)

아래 버튼으로 템플릿 이슈를 생성하세요.

[![수정 요청하기](https://img.shields.io/badge/%EC%88%98%EC%A0%95%20%EC%9A%94%EC%B2%AD%ED%95%98%EA%B8%B0-0A66C2?style=for-the-badge)](https://github.com/MNG-lab/mng-homepage/issues/new?template=change-request.yml)
[![즉시 롤백 요청하기](https://img.shields.io/badge/%EC%A6%89%EC%8B%9C%20%EB%A1%A4%EB%B0%B1%20%EC%9A%94%EC%B2%AD-FF8A00?style=for-the-badge)](https://github.com/MNG-lab/mng-homepage/issues/new?template=rollback-simple-request.yml)

즉시 롤백은 아래 상황에서 쓰는 **긴급 복구 버튼**입니다.

- 방금 수정/배포 후 홈페이지가 갑자기 깨졌을 때
- 원인 분석보다 먼저, 일단 직전 정상 상태로 빠르게 되돌려야 할 때

버튼을 누르고 양식만 제출하면, 시스템이 자동으로:

- 직전 상태로 되돌리는 PR을 생성하고
- 확인 후 머지하면 사이트를 복구할 수 있게 준비합니다.

> 팁: 웹페이지를 수정할때 한번에 많은 양에 대한 수정 요청을 하기보단, 다음 과정을 반복하는 것을 추천합니다.
>
> 1. 작은 수정 요청
> 2. 해당 수정이 잘 반영되었는지 확인
>    - 생각하지 못한 문제 발생했을 경우 롤백 수행
>    - 추가로 수정해야할 사항이 생긴 경우, 롤백 대신 수정 요청 추가 생성
> 3. 1~2번을 반복

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
- Issue 생성(라벨: `rollback-simple-request`): 최신 반영 1건을 자동으로 되돌리는 복구 PR 생성
- Issue 댓글: `codex-auto` 라벨이 있는 이슈에서만 수동 실행 가능
- PR 댓글: 해당 PR 브랜치에 직접 커밋/푸시
- 워크플로가 실행되면 변경 후 검증(`build`, 필요 시 `validate:content`)을 수행하도록 지시됨

### 3) PR 확인 및 머지하기 (비개발자용)

PR(Pull Request)은 개발자 작업 결과를 올려두는 **검토용 제안서**입니다.  
머지(승인)하기 전에는 실제 운영 페이지에 반영되지 않습니다.

1. 저장소 상단에서 `Pull requests` 탭을 눌러 생성된 PR을 엽니다.

![GitHub Pull requests 탭 예시](https://docs.github.com/assets/cb-51156/images/help/repository/repo-tabs-pull-requests-global-nav-update.png)

2. PR 본문의 `Description`만 읽고, 무엇이 바뀌었는지 확인합니다.

- 체크(검증)가 실패면 머지하지 말고 이슈에 코멘트 남기기
- 체크가 통과했고 문제 없어 보이면 `Merge pull request` 진행

![GitHub Merge 옵션 예시](https://docs.github.com/assets/cb-165497/images/help/pull_requests/merge-pull-request-options.png)

3. `Confirm merge`까지 누르면 반영이 시작됩니다.

### 4) 결과 확인하기

수정/롤백 요청 후에는 아래 2가지만 확인하면 됩니다.

1. 상단 `Actions` 탭에서 가장 최근 실행이 `초록색(성공)`인지 확인합니다.

![GitHub Actions 탭 예시](https://docs.github.com/assets/cb-40119/images/help/repository/actions-tab-global-nav-update.png)

2. 실패(빨간색)인 경우 AI가 버그가 포함된 코드를 잘못 생성한 경우로, 롤백을 수행하여 원래 코드로 되돌린 뒤, 다시 수정 요청부터 진행합니다.

### 5) 배포 확인하기

[홈페이지](https://mng-lab.github.io/mng-homepage/)에 접속하여 변경사항이 잘 반영되었는지 확인합니다.

---

<details>
<summary><strong>For Developers</strong></summary>

## 개발 환경

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
- `.github/workflows/rollback-from-issue.yml`
- `.github/workflows/deploy-pages.yml`
- 롤백 템플릿:
  - 비개발자용: `.github/ISSUE_TEMPLATE/rollback-simple-request.yml`
  - 개발자용: `.github/ISSUE_TEMPLATE/rollback-request.yml`
- 두 워크플로 모두 lockfile(`package-lock.json`/`npm-shrinkwrap.json`)이 있으면 `npm ci`, 없으면 `npm install`로 자동 분기
- `codex-comment.yml`은 GitHub App 토큰을 사용해 이슈 할당/커밋/PR 생성 주체를 앱 봇으로 통일함
- `rollback-from-issue.yml`은 두 롤백 템플릿(간단/개발자용)을 파싱해 자동으로 revert PR을 생성함

## GitHub App 설정 (Codex 자동화)

`codex-comment.yml`, `rollback-from-issue.yml` 실행 전 아래 Repository Secrets가 필요합니다.

- `MNG_AI_CODE_BOT_APP_ID`
- `MNG_AI_CODE_BOT_PRIVATE_KEY`

## 운영 문서

- `content/migration-checklist.md`
- `content/p5-pages-checklist.md`
- `content/p5-custom-domain-guide.md`
- `content/release-handoff-summary-2026-03-03.md`

</details>
