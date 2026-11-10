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

D1의 최신 역할을 매 요청마다 조회합니다. 회원 변경, 소유권 이전, 인증 갱신은 재로그인 후 10분 이내에 가능합니다.
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
테스트 인증이 아직 등록되지 않았다면 워크플로는 기존 `CODEX_CLI_KEY`를 사용합니다. 운영 Secret은 수정하지 않습니다.

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
