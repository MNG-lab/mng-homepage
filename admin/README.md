# MNG 홈페이지 관리 어드민 — 운영 안내

Cloudflare Workers Free와 D1을 사용하는 운영 어드민입니다.

- 어드민: https://admin.mng-lab.workers.dev
- 홈페이지: https://dglab.yonsei.ac.kr/
- 작업 대상 및 자동화 실행: `main`
- 운영 요청: `admin-request` 라벨 + `<!-- mng-admin:v1 -->` 본문 표시
- 검토 브랜치: `admin/issue-<이슈 번호>-<실행 ID>`
- Codex 연결: 기존 운영 Secret `CODEX_CLI_KEY`. GitHub에서 직접 실행하는 기존 자동화도 같은 인증을 사용합니다.

## 운영 순서

요청 작성 → Codex 실행 → PR 생성 → 홈페이지 미리보기·CI 확인 → 관리자 승인 → main 병합 → Cloudflare Pages 운영 배포.
PR을 만들었다고 바로 운영 홈페이지가 바뀌지는 않습니다. 승인 후에도 Pages 배포가 완료되기까지 잠시 걸립니다.
어드민 UI 배포는 홈페이지 배포와 별개입니다. GitHub main 갱신만으로 Worker가 자동 배포되지는 않으며 아래 명령으로 배포합니다.

```sh
npm ci
node --test admin/tests/*.test.mjs
npm run admin:build:production
ADMIN_TEST_ENV=production node admin/tests/connected-smoke.mjs
npx wrangler d1 migrations apply mng-admin --remote --config admin/wrangler.jsonc
npx wrangler deploy --config admin/wrangler.jsonc
```

Wrangler 배포는 운영 UI를 다시 빌드합니다. 운영 config는 `ADMIN_ENV=production`, `GITHUB_BASE=main`, `GITHUB_WORKFLOW_REF=main`만 허용하며 잘못 섞인 설정은 거부합니다. 무료 플랜을 유지하고 새로운 유료 서비스는 사용하지 않습니다.

## 데이터와 인증

운영 D1 이름은 `mng-admin`입니다. 기존 구성원·관리 기록·요청 처리 기록을 이전하고 데이터 일치 검증 후 연결합니다. 주소가 바뀌어 이전 주소의 로그인 쿠키는 사용할 수 없으므로 처음 한 번 다시 로그인합니다. 테스트 요청 캐시와 운영 요청 캐시는 다른 이름으로 저장하고, 운영 화면에는 테스트 요청을 표시하지 않습니다. 테스트 로그인 기록이 운영 Codex 연결 완료로 표시되지 않으며, 테스트 runner는 운영 인증 갱신 콜백을 호출할 수 없습니다.

`0007_production.sql`은 기기 로그인 기록에 환경을 추가하고 운영 인증 갱신 시각을 별도 테이블에 저장합니다. 기존 데이터 삭제는 없습니다. 모든 마이그레이션을 적용한 뒤 Worker를 배포하세요.

로그인 계정은 현재 승인된 `chominho96@gmail.com`이며, 6시간 활동 기반 서버 세션 및 접근 제한을 유지합니다. Google OAuth 앱은 제한된 허용 계정으로 운영합니다. 새 구성원은 어드민 구성원과 Google 테스트 사용자 양쪽에 추가해야 합니다. OAuth 앱 공개 전환은 이번 배포 범위에 포함하지 않습니다.

## GitHub와 함께 사용하기

GitHub와 어드민은 같은 이슈·PR·Actions를 조회하고 조작합니다. 별도 이슈 복사본을 만들지 않습니다.

| GitHub에서 한 작업 | 어드민에서 보이는 결과 / 가능한 작업 |
| --- | --- |
| 기존 수정 요청 템플릿(`codex-auto`)으로 이슈 작성 | 요청 목록·실행 상태·PR·미리보기 조회, 홈페이지 변경 승인·실패 재실행·종료 |
| 기존 롤백 템플릿으로 이슈 작성 | ‘특정 변경 취소’로 표시, PR 검토·홈페이지 변경 승인, 실패한 원래 롤백 실행 재시도 |
| PR에 추가 커밋 반영 | 최신 SHA의 diff·CI·미리보기를 다시 확인. 이전 SHA로 승인 불가 |
| PR 병합 / 닫기 / 다시 열기 | 원본 이슈 상태도 완료·종료·다시 열기로 맞춤. 어드민 목록에도 반영 |
| 원본 이슈 닫기 | 연결된 열린 PR을 닫음. 실행 중인 작업은 게시 전 종료 여부 확인 |

어드민에서 승인·종료·재실행한 결과도 동일 GitHub 이슈·PR·Actions에서 확인할 수 있습니다. GitHub 이슈에 `@codex`/`/codex`로 추가 요청을 남겼을 때 연결된 열린 PR이 하나 있으면 해당 PR을 사용합니다. 여러 개면 임의로 고르지 않고 원하는 PR에 댓글을 남기도록 안내합니다.

요청은 30초, 열린 PR 검사는 15초마다 조회합니다. 읽기 캐시는 15초이며 즉시 push 스트리밍은 아닙니다. 상태 동기화 Actions가 실행되는 시간도 필요합니다. 재실행은 서버에서 최신 실행·열린 요청·연결된 PR을 다시 확인하고 중복 제출을 차단합니다.

GitHub 롤백은 지정한 커밋/PR의 **변경 취소**입니다. 어드민 버전 화면의 되돌리기는 src/public/index.html 전체 **스냅샷 복원**입니다. 두 동작의 이름과 설명을 구분하고 서로 바꿔 실행하지 않습니다.

연결 규칙: 운영 요청 라벨은 `admin-request`, `codex-auto`, `rollback-request`, `rollback-simple-request`이며, PR은 같은 저장소의 main 대상 `admin/issue-N-*`, `codex/issue-N-*`, `codex/rollback-issue-N-*` 브랜치입니다. 테스트 요청·외부 fork·일반 개발 이슈는 제외합니다. 홈페이지 파일 범위를 벗어난 변경이나 100개 이상 파일 변경은 어드민 승인을 막고 GitHub 검토를 안내합니다.

기존 요청·PR도 다시 읽어 연결합니다. 새 실행은 요청 번호를 실행 이름에 넣습니다. 과거의 번호 없는 Actions 실행은 임의로 요청에 연결하지 않습니다. 그런 실패 요청은 GitHub Actions에서 직접 실행 후 확인해야 할 수 있습니다. PR 없는 직접 push도 홈페이지 버전으로 임의 생성하지 않습니다.

## 장애 시

인증 오류로 멈춘 요청은 최고 관리자가 설정 → Codex 연결에서 로그인한 뒤 같은 요청을 다시 실행합니다. 운영 인증은 `CODEX_CLI_KEY`만 갱신하며 인증 원문은 DB·로그에 남기지 않습니다.
Worker UI 문제는 Cloudflare의 직전 Worker 버전으로 되돌릴 수 있습니다. 홈페이지 복원은 어드민 버전 화면 또는 기존 GitHub 절차로 수행합니다. 테스트 환경으로 되돌릴 때는 운영 config를 임의 수정해 배포하지 말고, 운영/테스트 설정·UI·인증 검증을 함께 점검해야 합니다.

## 운영 리소스와 이름

- Worker: `admin` / 계정 Workers 주소: `mng-lab.workers.dev`
- 운영 D1: `mng-admin` (`eb83b146-a930-4155-8c1d-c426ac856aa0`)
- 로그인 콜백: `https://admin.mng-lab.workers.dev/auth/google/callback`
- 공통 Actions 콜백 주소: `admin/shared/hosting.js`
- 수정 자동화: `.github/workflows/admin-request.yml`, `request-job.mjs`, `run-request-codex.mjs`
- Google 프로젝트 표시 이름과 OAuth 클라이언트 이름은 운영 이름을 사용합니다. 이미 생성된 Google 프로젝트 ID는 변경할 수 없습니다.

주소 이전 중 `ADMIN_MAINTENANCE=true`이면 API·로그인·화면 요청을 503으로 일시 중지합니다. 이전 완료 후 기본 설정으로 재배포하면 해제됩니다. D1 원본은 테이블별 데이터 일치와 운영 검증을 마친 뒤 정리하며 운영 Worker는 새 DB만 사용합니다.

GitHub에서 배포된 홈페이지를 확인하는 ‘미리보기’ 기능은 그대로 제공합니다. `preview_urls=false`는 Cloudflare의 설정 키입니다. 과거 테스트 이슈·브랜치·인증을 운영과 구분하는 식별자와 테스트 데이터는 호환성을 위해 유지하며 운영 리소스 이름으로 사용하지 않습니다. 과거 검증 기록은 [샌드박스 기록](docs/sandbox-history.md)에 분리했습니다.
