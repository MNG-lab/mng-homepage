# MNG Homepage

MNG Lab 홈페이지 저장소입니다.  
이 문서는 **비개발자가 이슈 기반으로 유지보수**할 때 바로 사용할 수 있게 구성되어 있습니다.

## 비개발자용 빠른 사용법

### 1) 수정 요청하기

[어드민](https://admin.mng-lab.workers.dev)의 **새 수정 요청**에서 페이지와 바꿀 내용을 입력하세요. 제목은 자동으로 제안되며 직접 고칠 수 있습니다. 사진 선택·끌어넣기·붙여넣기를 지원하고, 정확한 문구나 변경 제외 범위가 있으면 추가 정보에 적습니다.

GitHub에서도 [홈페이지 수정 요청 양식](https://github.com/MNG-lab/mng-homepage/issues/new?template=change-request.yml)을 사용할 수 있습니다. 제목을 입력하고 페이지와 수정 내용을 작성하세요. 사진은 **사진·참고 자료** 칸에 끌어 넣거나 붙여넣으면 됩니다. 사진을 넣을 위치도 함께 알려 주세요. 별도 요청이 없으면 국문·영문에 함께 반영합니다.

한 번에 작은 변경을 요청하고, 미리보기에서 확인한 뒤 승인하는 것을 권장합니다.

- 요청 하나의 변경을 취소하려면: **요청 관리 → 지난 요청 → 해당 요청 → 이 변경 취소**. 관리자 권한으로 이유를 적으면 취소할 변경을 담은 PR이 만들어집니다. 이후 변경은 유지하며 충돌하면 검토를 위해 멈춥니다.
- 홈페이지 전체를 예전 상태로 돌리려면: **홈페이지 버전 → 원하는 버전 → 이 버전으로 되돌리기**. 선택한 버전 이후의 홈페이지 변경도 함께 제외됩니다.
- 추가 수정이 필요하면: 취소하지 않고 새 수정 요청을 작성해도 됩니다.

두 되돌리기 모두 검토 후 승인해야 홈페이지에 반영됩니다. 개발자용 [특정 PR·커밋 변경 취소](https://github.com/MNG-lab/mng-homepage/issues/new?template=rollback-request.yml)와 [직전 변경 취소](https://github.com/MNG-lab/mng-homepage/issues/new?template=rollback-simple-request.yml) 양식도 유지합니다.

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

2. 실패(빨간색)라면 요청 상세나 Actions 로그에서 원인을 확인합니다. 인증 문제는 Codex를 연결한 뒤 같은 요청을 다시 실행합니다. 아직 승인하지 않은 변경은 운영 홈페이지에 반영되지 않으므로 되돌릴 필요가 없습니다.

### 5) 배포 확인하기

[홈페이지](https://dglab.yonsei.ac.kr/)에 접속하여 변경사항이 잘 반영되었는지 확인합니다.

---

<details>
<summary><strong>For Developers</strong></summary>

## 개발 환경

요구사항:

- Node.js 24.22.2 (`.nvmrc`, nvm으로 프로젝트별 선택)
- npm 10+

```bash
nvm install
nvm use
npm ci
npm run dev
```

빌드/미리보기:

```bash
npm run build
npm run preview
```

### Node.js 보안 패치 기준

- 개발·CI·Cloudflare Pages 빌드는 `.nvmrc`의 Node.js 24.22.2를 사용합니다.
- Cloudflare Pages에 `NODE_VERSION` 환경변수가 별도로 설정되어 있으면 24.22.2로 맞추거나 제거해 `.nvmrc`를 적용하세요.
- 의존성 보안 점검: `npm audit` (개발 의존성 포함).

## 주요 스크립트

- `npm run build`: 프로덕션 빌드 (`prebuild` 포함)
- `npm run validate:content`: 콘텐츠 스키마/참조 검증
- `npm run validate:content:urls`: 콘텐츠 + 외부 URL 검증
- `npm run qa:smoke`: 핵심 라우트 스모크 테스트
- `npm run qa:matrix:responsive`: 반응형 캡처 + 리포트
- `npm run qa:cross-browser`: Chromium/Firefox/WebKit 점검
- `npm run qa:accessibility`: 접근성 점검 리포트
- `npm run preflight:p5`: 릴리즈 전 통합 점검
- `npm run localize:wix-images`: `wixstatic` 이미지 URL을 `public/media/legacy-wix` 로컬 자산으로 다운로드/치환

## Codex 워크플로 파일

- `.github/workflows/codex-comment.yml`
- `.github/workflows/close-codex-issue.yml`: 자동 생성된 PR이 닫히면 원본 이슈도 종료합니다. 병합 시 `completed`, 병합 없이 닫으면 `not planned`로 처리하며 이미 닫힌 이슈는 유지합니다.
- `.github/workflows/rollback-from-issue.yml`
- `.github/workflows/deploy-pages.yml` (GitHub Pages fallback only; automatic production deploy is disabled)
- 롤백 템플릿:
  - 직전 변경 취소 (개발자용): `.github/ISSUE_TEMPLATE/rollback-simple-request.yml`
  - 특정 변경 취소 (개발자용): `.github/ISSUE_TEMPLATE/rollback-request.yml`
- 두 워크플로 모두 lockfile(`package-lock.json`/`npm-shrinkwrap.json`)이 있으면 `npm ci`, 없으면 `npm install`로 자동 분기
- `codex-comment.yml`은 GitHub App 토큰을 사용해 이슈 할당/커밋/PR 생성 주체를 앱 봇으로 통일함
- `rollback-from-issue.yml`은 두 롤백 템플릿(간단/개발자용)을 파싱해 자동으로 revert PR을 생성함
- 운영 호스팅은 Cloudflare Pages이며, GitHub Pages는 수동 fallback 용도로만 보관합니다.

## GitHub App 설정 (Codex 자동화)

`codex-comment.yml`, `rollback-from-issue.yml` 실행 전 아래 Repository Secrets가 필요합니다.

- `MNG_AI_CODE_BOT_APP_ID`
- `MNG_AI_CODE_BOT_PRIVATE_KEY`

## 운영 문서

- `content/migration-checklist.md`
- `content/p5-pages-checklist.md`
- `content/p5-custom-domain-guide.md`
- `content/github-pages-disabled.md`
- `content/release-handoff-summary-2026-03-03.md`

</details>
