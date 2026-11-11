# MNG 홈페이지 어드민 — 1차 MVP

운영과 분리된 테스트 어드민입니다. Google 로그인 후 실제 GitHub 이슈·PR·Actions 및 Cloudflare D1을 사용합니다.
`main`과 운영 홈페이지는 변경하지 않습니다. 모든 요청과 승인은 `codex/admin-sandbox`를 대상으로 합니다.

## 화면과 작업 흐름

- `/dashboard`: 확인할 변경, 진행 작업, 실패 작업과 최근 요청
- `/requests`: 검색·상태 필터가 있는 전체 요청 목록
- `/requests/new`: 영어 페이지 목차를 선택하여 요청 작성
- `/requests/:id`: 요청 내용, 실행 기록, 파일 diff, CI 결과, 승인·종료·실패 재시도
- `/history`: 반영된 PR의 시간순 타임라인과 현재 반영 지점
- `/history/:pr`: 선택한 시점의 홈페이지 전체 복원 범위 확인 및 복원 요청
- `/settings`: 계정, 구성원 권한, 최고 관리자 이전, 테스트 Codex 인증 갱신, 관리 기록

복원은 해당 PR이 반영된 직후의 `src/`, `public/`, `index.html` 전체 상태를 재현합니다.
1 → 2 → 3 반영 후 1로 복원하면 2·3의 홈페이지 변경이 제외됩니다. 요청과 Git 이력은 삭제하지 않습니다.
자동화·의존성·관리자 설정은 복원하지 않습니다. 복원도 새 이슈와 PR을 만들고 CI를 통과한 뒤 관리자가 승인합니다.
복원을 준비한 이후 다른 변경이 반영되면 승인을 거부합니다. 최종 ref 갱신은 force 없이 수행하여 동시 반영도 차단합니다.

## 권한과 인수인계

- 편집자: 요청 작성, 상태·변경·이력 조회
- 관리자: 편집자 기능 + 반영 승인, 복원 요청, 실패 재시도, 요청 종료
- 최고 관리자: 관리자 기능 + 구성원·인증 관리, 소유권 이전

D1의 최신 역할을 매 요청마다 조회합니다. 유효한 로그인 세션에서는 권한에 따라 회원 변경, 소유권 이전, 인증 갱신을 처리하며 별도의 10분 재로그인 조건은 두지 않습니다.
초기 최고 관리자는 승인된 `chominho96@gmail.com` 한 계정입니다. 새 구성원은 Gmail 계정으로 제한합니다.
Google OAuth 테스트 사용자 목록에도 등록해야 로그인할 수 있습니다. 첫 로그인에서 Google의 고정 subject를 연결합니다.

최고 관리자 이전: 구성원 등록 → 후임자 첫 로그인 → 기존 최고 관리자의 이전 요청 → 후임자 재로그인·수락.
이전 요청은 24시간 후 만료되며 취소할 수 있습니다. 역할 두 개를 하나의 SQLite UPDATE로 변경합니다.
기존 최고 관리자는 관리자가 됩니다. 일반 구성원 수정으로 최고 관리자를 삭제하거나 강등할 수 없습니다.
Cloudflare·Google 프로젝트·GitHub 조직/App 관리 권한의 인수인계는 별도로 해야 합니다.

## 인증과 격리

Worker는 HTML·정적 자산·API 모두 로그인으로 보호합니다. OAuth state/nonce/PKCE 및 서명·발급자·대상·만료를 검증합니다.
세션은 Secure/HttpOnly 쿠키로 1시간 유지하며, 모든 변경 API는 같은 출처를 요구합니다.

GitHub App 키는 Worker Secret에만 저장합니다. 일반 작업 토큰에는 Secrets 권한을 요청하지 않습니다.
최고 관리자의 인증 갱신에만 Secrets 권한으로 발급한 별도 설치 토큰을 사용합니다.
선택한 Codex auth.json은 서버 메모리에서 sealed box 방식으로 암호화해 **CODEX_AUTH_JSON_PREVIEW**에만 저장합니다.
인증 원문은 D1, 로그, localStorage, 빌드 결과에 저장하지 않습니다. 기존 값을 조회하는 기능도 없습니다.
테스트 인증이 없으면 재연결 안내를 표시합니다. 운영 인증으로 대체하거나 운영 Secret을 수정하지 않습니다.

암호화 형식: [libsodium sealed boxes](https://github.com/jedisct1/libsodium-doc/blob/master/public-key_cryptography/sealed_boxes.md).
GitHub 연동: [Actions Secrets API](https://docs.github.com/en/rest/actions/secrets).

이슈는 `admin-preview` 라벨과 고정 marker만 사용합니다. 운영 codex-auto/rollback 라벨을 붙이지 않습니다.
PR의 저장소·base·head 접두사·검토한 SHA·CI 결과와 파일 범위를 서버에서 검증합니다.
정상 반영 시 원본 이슈를 닫고, 요청 종료 시 열린 PR도 닫습니다.
이슈 UUID와 복원·재시도 작업을 D1에 예약하여 중복 요청을 차단합니다. 응답이 불명확한 작업을 자동 재실행하지 않습니다.
재시도는 실패·취소·시간 초과가 확인된 작업만 허용합니다.

## 개발과 검증

프로젝트 `.nvmrc` 버전의 Node를 사용합니다. 전역 Git/Node 설정 변경은 필요하지 않습니다.

```sh
npm ci
npm run admin:dev
npm run admin:test
npm run admin:test:connected
npm run admin:build:auth
npx wrangler deploy --config admin/wrangler.jsonc --dry-run
```

- 로컬 데모: http://127.0.0.1:4190 (localStorage 기반 UI 체험, 실제 GitHub 작업 없음)
- 로그인 빌드: `admin:build:auth` → `dist-admin/`
- UI 테스트는 Playwright Chromium이 필요합니다.
- 관리·인증·복원 테스트는 Node 내장 SQLite와 모의 GitHub API로 경쟁 상태·권한·암호화를 검증합니다.
- 연결 UI 테스트는 요청→검토→승인→이력→복원, URL 이동, 새로고침, 권한별 UI와 모바일을 검증합니다.
- 홈페이지 빌드와 어드민 빌드는 별도 출력 디렉터리를 사용합니다.

## 테스트 배포

개발 브랜치 `codex/admin-portal`, 작업 대상 `codex/admin-sandbox`.
Cloudflare Worker 및 D1 이름은 모두 `mng-admin-preview`이며 Workers Free만 사용합니다.
새 결제수단 등록이나 유료 전환은 하지 않습니다. 실제 서비스별 무료 한도 내에서 운영해야 합니다.

```sh
npx wrangler d1 migrations apply mng-admin-preview --remote --config admin/wrangler.jsonc
npm run admin:build:auth
npx wrangler deploy --config admin/wrangler.jsonc
```

Worker Secret: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET,
GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY.
기존 MEMBERS_JSON은 DB 활성화 전 호환용이며 MEMBERS_DB=true에서는 D1만 사용합니다.
현재 배포의 구성원·작업 DB를 초기화하거나 sandbox 브랜치를 강제로 재설정하지 마세요.

## 1차 MVP 이후

- 운영 전환은 별도 검토·승인 후 진행 (main 자동 반영 없음)
- 후임자 실제 계정으로 로그인·수락 및 외부 서비스 인수인계 리허설
- 이미지 업로드, 이메일 알림, 시각적 페이지 diff는 후속 범위
- PR 파일 diff가 100개 이상인 대규모 변경은 어드민 승인을 차단
- 불명확한 GitHub 응답은 관리자 수동 확인 필요; 자동 재시도로 중복 작업하지 않음

## API 호환성

복원 지점의 병합 커밋을 조회하기 위해 GitHub REST API 버전을 `2022-11-28`로 고정합니다.
`2026-03-10`에서는 PR 응답의 `merge_commit_sha` 필드가 제거되었습니다.
버전 변경 시 [GitHub breaking changes](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes)를 확인하고 복원 테스트를 먼저 실행하세요.

## 검증 기록 (2026-11-10)

- 실제 요청 #54 → Codex 실행 42784338635 성공 → PR #55 → CI 42784469620 성공 → 어드민 승인
- 변경 이력에서 PR #53 시점 선택 → 복원 요청 #56 / PR #57 → CI 42784723701 성공 → 어드민 승인
- 복원 후 테스트 파일은 처음의 한 줄로 돌아왔으며, PR #55와 #57 이력은 모두 유지됨
- #54, #56 원본 이슈 자동 종료 확인
- 실제 최고 관리자 이전은 수행하지 않음. SQLite 권한/원자성/취소/만료 테스트로 검증
- 실제 Codex 인증 원문을 임의로 바꾸지 않음. GitHub Secrets 권한 확인, 암호화·권한 테스트 통과
- main은 89f55b5a38cef792d37a84856263c9a8a7fda2be 유지

## 상태 표시와 조회 복구

- 진행바는 GitHub 요청/실행/PR/병합 상태를 반영하는 단계 표시입니다. 퍼센트 진행률이나 push 실시간 스트림은 아닙니다. 요청은 30초, 열린 PR의 검사는 15초마다 조회하며 숨겨진 탭에서는 정기 조회를 멈춥니다.
- 복원 작업은 ‘복원 준비’로 구분합니다. 대기·진행·실패·승인 대기·반영 완료를 별도로 표시합니다.
- 병합 후 GitHub Actions가 PR 연결 배열을 비우는 경우에는 조회 화면에 한해 정확한 저장소·head 브랜치·head SHA·이벤트를 대조합니다. 승인 API의 PR 연결 검증은 완화하지 않습니다.
- 기존 복원 이력도 원래 요청 이름으로 표시하며, 같은 스냅샷은 이유를 표시하고 복원 버튼을 비활성화합니다.
- 읽기 요청은 같은 경로의 중복 조회를 합치고 네트워크 오류/일시적 서버 오류에 한해 한 번 재시도합니다. 조회 실패 시 이전 데이터를 유지하며 다시 불러오기를 제공합니다.
- 저장·승인·복원 등의 변경 요청은 자동 재시도하지 않습니다. 연결 장애 자체를 없애는 것은 아니며, 결과가 불명확하면 목록 확인을 안내합니다.

## PR 홈페이지 미리보기

요청 상세의 ‘홈페이지 미리보기’에서 Cloudflare Pages 배포 대기/진행/성공/실패/조회 실패 상태를 확인합니다.
검토 중인 PR head SHA에 연결된 Cloudflare 공식 GitHub App 체크만 사용하며, 성공한 배포의 고정 URL을 새 탭으로 엽니다.
다른 커밋, 다른 앱, 외부 도메인, 갱신되는 브랜치 별칭은 사용하지 않습니다. 체크의 배포 ID와 URL도 대조합니다.
진행 중인 배포는 15초마다 조회하고 수동 새로고침을 지원합니다. 배포 조회가 실패해도 코드 diff와 CI 조회 결과는 유지합니다.
미리보기는 내용·디자인을 직접 검토하기 위한 것이며, 기존 서버 승인 조건(현재 SHA의 CI 통과)은 유지합니다.

### 비개발자용 버전 기록·설정 안내

- `현재 버전`은 현재 테스트 브랜치의 반영 기록이며 되돌리기 링크를 표시하지 않습니다. 같은 내용의 과거 버전도 서버 비교 결과 차이가 없으면 요청을 만들 수 없습니다.
- `수정 반영`과 `이전 버전으로 되돌림`은 작업 종류입니다. 과거 기록 자체가 취소되었다는 의미가 아닙니다. 되돌린 기록은 대상 버전 이름·날짜·링크를 표시하고, 과거의 되돌린 결과도 다시 선택할 수 있습니다.
- 대시보드/목록/상세는 수정과 되돌리기의 종류·완료 문구를 구분합니다. 저장된 GitHub 제목이나 이력은 변경하지 않습니다.
- 최고 관리자 변경은 후임자의 로그인·수락이 필요하며 기존 최고 관리자는 관리자가 됩니다. 외부 서비스 계정 소유권은 별도입니다. 실제 권한 변경은 이번 화면 개선에 포함하지 않습니다.
- Codex 안내는 Mac/Windows 파일 경로와 공식 CLI 로그인 명령을 복사합니다. 인증 내용은 화면·클립보드에 출력하지 않습니다. 경로는 기본 CODEX_HOME 기준이며, 별도 경로/조직 보안 정책은 개발 담당자가 확인해야 합니다. 파일 저장 옵션은 로그인 명령에만 적용합니다. Node.js가 필요하며 실제 Windows 로그인은 별도로 확인해야 합니다.
- 용어 참고: [Google 문서 버전 기록](https://support.google.com/docs/answer/190843?hl=ko), [Microsoft 이전 버전 복원](https://support.microsoft.com/ko-kr/onedrive/restore-a-previous-version-of-a-file-stored-in-onedrive), [Notion 버전 기록](https://www.notion.com/ko/help/duplicate-delete-and-restore-content). 로그인 안내: [OpenAI 인증 문서](https://developers.openai.com/codex/auth/).

### 브라우저 로그인과 중단 요청 복구

설정의 `Codex 연결`은 최고 관리자 전용이며 실제 수정 요청에서 사용하는 `CODEX_AUTH_JSON_PREVIEW`를 갱신합니다. 체험/짧은 확인 실행 버튼은 제공하지 않습니다.

1. 수정 요청의 Codex 실행이 인증 오류로 실패하면 요청과 대시보드에 `Codex 연결 필요`가 표시됩니다. 일반 실패·모델 오류·할당량 초과는 인증 문제로 분류하지 않습니다.
2. 최고 관리자가 설정에서 동의 후 `Codex 다시 연결`을 누르고 OpenAI 기기 코드 로그인을 승인합니다. 첫 사용 시 ChatGPT 설정 → 보안 → 기기 코드 로그인을 켜야 합니다.
3. 새 인증 저장 후 해당 요청에 `이 요청 다시 실행`이 활성화됩니다. 새 이슈를 만들지 않고 같은 이슈로 새로운 Actions 실행을 시작합니다. 편집자는 재실행할 수 없습니다.
4. 홈페이지 변경은 기존대로 PR 생성 → 미리보기·검사 확인 → 관리자 승인 순서로 반영합니다. 되돌리기는 Codex를 사용하지 않으므로 재연결이 필요하지 않습니다.

- 테스트 브랜치와 테스트 Secret만 사용하며 main/운영 인증을 변경하지 않습니다. 테스트 인증이 없으면 운영 인증으로 대체하지 않고 연결을 요청합니다.
- 기기 로그인은 공식 Codex CLI를 임시 Actions 러너에서 실행합니다. 인증 파일은 서버 메모리에서 GitHub public key로 암호화하여 Secret에 저장하고, 로그·아티팩트·D1에는 남기지 않습니다.
- 로그인 코드는 본인 최고 관리자 세션에서만 조회합니다. 연결은 하나씩, 15분 만료이며 모호한 저장 응답은 자동 재시도하지 않습니다.
- 요청 실행 결과는 별도 audience의 GitHub OIDC로 검증합니다. 저장소 ID, 조직 ID, 브랜치, 호출·재사용 워크플로, 커밋 SHA, run ID/attempt, 실제 이슈를 대조합니다. D1에는 실행 식별자와 안전한 결과 분류만 남깁니다.
- 실패한 실행 이후 인증이 갱신되어야 재실행할 수 있습니다. 최신 run/attempt만 판단하고 동일 실행에 대한 중복 제출은 D1 예약으로 차단합니다. 새 실행이 목록에 나타나기 전에는 `재실행 접수됨`으로 표시합니다.
- 추가 migration: `0004_request_recovery.sql`. 원격 테스트 DB에 적용 후 Worker를 배포합니다.
- 버튼 클릭 즉시 로딩을 표시하며 연결 상태는 5초, 요청은 30초마다 갱신합니다. 로그인 탭에서 돌아오면 연결을 즉시 확인합니다. 결과는 관련 버튼 아래 표시합니다.
- UI 참고: [Carbon inline loading](https://www.carbondesignsystem.com/building-blocks/core/components/inline-loading/guidelines), [Atlassian section message](https://atlassian.design/components/section-message/usage).

### 요청 목록 서버 페이징

- `GET /api/requests?q=...&status=...&page=...`는 서버에서 검색·상태 필터와 최신순 정렬을 적용하고 최대 20개 및 전체 일치 건수를 반환합니다. 실패 필터에는 Codex 연결 필요도 포함합니다. 범위를 넘는 페이지는 마지막 페이지로 보정합니다.
- 검색어·상태·페이지는 URL에 유지합니다. 검색/필터 변경 시 1페이지로 이동하며, 상세를 열고 새로고침하거나 목록으로 돌아와도 이전 조건을 유지합니다.
- 상세는 `GET /api/requests/:id`로 직접 조회합니다. 목록의 현재 페이지와 무관합니다. 대시보드는 `view=summary`로 전체 집계/최근 5개/확인할 작업 5개를 별도로 조회합니다. 설정의 인증 중단 목록은 전체 요청 중 해당 상태만 `page_size=3`으로 3개씩 조회합니다. 3개 이하이면 페이지 번호와 이전·다음 버튼을 숨깁니다. 일반 요청 목록은 20개씩 유지하며 페이지 크기는 3 또는 20만 허용합니다.
- `0005_github_catalog.sql`은 기존 테스트 D1에 GitHub 읽기 캐시와 동기화 위치를 추가합니다. 이슈/PR은 변경된 기록, 실행은 새로 생성된 기록을 이어서 가져옵니다. 캐시는 15초 재사용하며 요청 화면의 30초 조회 주기는 유지합니다. 같은 내용은 다시 쓰지 않습니다.
- 처음 가져올 기록이 많으면 한 호출에 소스별 최대 3페이지를 저장하고 다음 조회에서 이어갑니다. 완료 전에 부분 집계나 빈 목록을 반환하지 않습니다. 조회 중 안내와 재시도를 제공하며, 진행 중인 다른 저장 작업도 완료한 후 응답합니다.
- 워크플로 실행을 분기·이벤트 검색 조건 없이 페이지 순회한 뒤 테스트 브랜치/이벤트/이름을 검증해 저장합니다. [GitHub의 조건부 검색 1,000개 제한](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow)에 걸려 오래된 요청이 빠지지 않도록 합니다. 진행 중 실행과 상세/재실행 대상은 run ID로 현재 상태 및 attempt를 다시 조회합니다.
- 재실행 전에는 최신 실행·열린 이슈·기존 PR·인증 갱신 여부를 다시 확인하고 기존 중복 실행 예약을 사용합니다. GitHub에서 삭제한 실행은 마지막 확인 상태라는 안내를 표시하며 검증할 수 없는 실행을 재실행하지 않습니다.
- 읽기 캐시는 인증 파일/토큰을 저장하지 않습니다. 기존 테스트 DB/Worker를 사용하며 새 유료 서비스는 추가하지 않습니다. D1 저장은 [무료 호출 한도](https://developers.cloudflare.com/d1/platform/limits/)를 고려해 배치 처리합니다.
- 검증: 47개 요청의 20/20/7 분할, 필터 후 마지막 페이지/빈 결과, 1,205개 실행 이후의 오래된 요청 조회·재실행, 최신 attempt와 중복 방지, 검색/필터/뒤로가기/새로고침, 설정의 2페이지 및 모바일 레이아웃.

### 요청 관리와 홈페이지 버전 화면 분리

- 요청 관리의 기본 화면은 `처리 중`입니다. 진행·검토·실패·인증 문제 요청을 표시하며, 반영 완료/종료 요청은 `지난 요청`에 보관합니다. 두 탭 모두 서버에서 검색·상태 필터 후 20개씩 조회합니다. `tab`, 검색어, 필터, 페이지는 URL로 유지합니다.
- 홈페이지 버전은 현재 버전을 별도 카드로 보여주고 이전 버전은 반영 날짜 중심으로 표시합니다. 요청 진행 상태와 재실행 버튼을 반복하지 않습니다. 버전 상세는 해당 변경의 실제 파일에서 확인한 페이지 범위를 표시합니다. 공통 파일은 공통 화면·설정으로, public 파일은 이미지·첨부 파일로 구분합니다.
- 완료된 요청 → 반영된 버전, 버전 → 관련 요청으로 연결합니다. 현재 버전을 찾지 못하면 최신 기록을 임의로 현재 버전으로 표시하지 않습니다.
- 복원은 계속 홈페이지 전체(src/public/index.html)를 대상으로 하며 요청 생성 → 검토 → 승인 절차와 권한·동시 변경 검증을 유지합니다. 버전 보기 자체는 읽기 전용입니다.
- 이번 UI 변경은 DB migration 및 워크플로 변경이 없습니다. 이 변경 커밋을 revert하고 로그인 필수 어드민 빌드를 다시 배포하면 이전 UI로 돌아갑니다. 요청·PR·반영 기록을 삭제하거나 되돌리지 않습니다. UI 변경 전 기준 커밋: `632afcdca6a88627bae79e92ac972c14fe788b81`.

### 어드민 로그인 유지

- 로그인 쿠키와 서명 토큰은 6시간 유효합니다. 유효한 세션만 같은 출처의 `POST /api/session/refresh`로 6시간 갱신할 수 있습니다. 만료·위조·접근 중지 계정은 갱신할 수 없습니다.
- 페이지 이동 및 실제 클릭·키 입력·스크롤 제스처에 맞춰 최대 분당 한 번 갱신합니다. 자동 상태 조회, 열린 탭, 창 포커스만으로는 갱신하지 않습니다. 로그인 시각은 갱신 후에도 보존합니다.
- 구성원 권한은 매 요청마다 확인합니다. DB 일시 오류는 503으로 구분하여 로그인 화면으로 보내지 않고, 조회 실패 시 재시도할 수 있습니다.
- 로그아웃은 진행 중인 갱신 응답을 기다린 뒤 쿠키를 지웁니다. 새 DB나 Secret, migration은 필요 없습니다. 배포 전에 발급된 유효한 1시간 세션도 화면을 새로고침하면 갱신됩니다.
- 로그인 문구는 [토스플레이스 UX 라이팅](https://docs.tossplace.com/guide/front-integration/plugin/design/ux-writing.html)의 짧고 구체적인 다음 행동 안내와 [GOV.UK 오류 안내](https://design-system.service.gov.uk/components/error-summary/)의 제목·시각적 구분을 참고했습니다. 로그인 실패는 붉은 안내 상자, 제목, 설명으로 구분합니다.
