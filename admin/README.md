# MNG 홈페이지 어드민 — 로그인 연결 및 화면 확인 단계

수정 요청·반영·복원은 실제 GitHub 작업을 실행하지 않는 인터랙션 데모입니다.
별도 Cloudflare 테스트 Worker에는 실제 Google 로그인이 연결되어 있습니다.
예시 요청과 진행 상태는 브라우저 localStorage에만 저장합니다. 실제 개인정보나 토큰을 입력하지 마세요.

## 실행

프로젝트 `.nvmrc`의 Node 버전에서:

```sh
npm ci
npm run admin:dev
```

- 개발 주소: http://127.0.0.1:4190
- 빌드: `npm run admin:build` → `dist-admin/`
- 빌드 미리보기: `npm run admin:preview`
- UI 동작 검사: `npx playwright install chromium` 후 `npm run admin:test`
- 홈페이지의 기존 `npm run build`와 출력물은 별개입니다.

## 화면에서 확인할 흐름

1. 새 수정 요청 작성 → 접수 → 자동 작업 → 확인 필요
2. 변경 전후 확인 → 관리자 반영 승인 → 반영 완료
3. 변경 이력 → 이 시점으로 복원 → 새 요청 → 확인 후 승인
4. 실패 요청 재시도 / 요청 취소
5. 설정에서 관리자·편집자 화면 전환
6. 데모 초기화

로컬 데모의 권한 전환과 작업 검사 결과는 화면 체험용입니다. 별도 테스트 Worker는 서버 인증을 적용합니다.
Codex 인증 입력, 실제 PR 병합, 실제 롤백은 아직 연결하지 않습니다.

## 다음 단계의 격리 조건

- 개발 브랜치: `codex/admin-portal` (`main`에 push/merge하지 않음)
- 최초 테스트 관리자: `chominho96@gmail.com`
- Cloudflare 운영 프로젝트 `mng-homepage`와 별도 테스트 리소스 사용
- 테스트 요청·워크플로·기준 브랜치가 운영 자동화와 충돌하지 않도록 분리
- 실제 연동 전 서버 측 로그인·역할 검증, 요청 중복 방지, 테스트 대상 강제 검증 적용
- 테스트 인증 갱신은 운영 GitHub Secrets를 덮어쓰지 않음

## 화면 주소

- `/dashboard`: 대시보드
- `/requests`: 수정 요청 목록
- `/requests/new`: 새 요청 작성
- `/requests/:id`: 개별 요청 상세 (직접 접근·새로고침 지원)
- `/history`: 변경 이력
- `/settings`: 설정

주요 화면·요청 상세 이동은 브라우저 뒤로가기/앞으로가기에 반영합니다.
짧은 확인 대화상자(변경 취소 확인·데모 초기화)와 필터 변경은 별도 URL을 만들지 않습니다.
복원은 선택한 요청이 반영된 직후의 홈페이지 전체 스냅샷으로 돌아갑니다. 이후 변경은 현재 상태에서 제거하지만 과거 요청·반영 이력은 삭제하지 않습니다. 복원 준비 이후 새 변경이 반영되면 재검토가 필요하도록 차단합니다.

## 소유권 이전 설계 (구현 예정)

개인 계정에 종속되지 않도록 Owner(최고 관리자), Admin(관리자), Editor(편집자)를 분리합니다.
최초 관리자 이메일은 초기 설정에만 사용하고, 실제 권한은 서버에서 관리합니다.

- Owner: 사용자·역할 관리, 소유권 이전, 외부 서비스 인증 갱신
- Admin: 요청 작성, 반영·복원 승인
- Editor: 요청 작성과 상태 확인
- 이전은 기존 Owner의 재인증 → 새 담당자 지정 → 새 담당자의 로그인·수락 순서로 처리합니다.
- 이전 완료와 기존 Owner의 권한 변경은 원자적으로 처리하고, 마지막 Owner의 삭제·강등을 차단합니다.
- 이전 요청에는 만료·취소 기능을 제공하며, 권한 변경 이력을 남깁니다.
- 역할은 매 요청마다 서버에서 확인하며, 이전 후 기존 세션이 예전 권한을 계속 갖지 않도록 합니다.

앱 소유권 이전은 Cloudflare 계정, Google OAuth 프로젝트, GitHub 저장소·App의 소유권을 자동으로 이전하지 않습니다.
인수인계 시 각 서비스에 후임 담당자의 관리 권한을 설정하고, 새 인증 정보로 연결·로그인·테스트 요청을 검증한 뒤
기존 담당자의 접근 권한과 인증 정보를 회수합니다. 운영 전에는 조직이 관리하는 계정 구성을 우선 검토합니다.

## Google 로그인 테스트 배포

`npm run admin:build:auth`로 빌드한 뒤 `admin/wrangler.jsonc` 설정의 별도 Worker에 배포합니다.
`run_worker_first: true`로 HTML·정적 파일·API 모두 서버 인증을 거칩니다.
OAuth는 state/nonce/PKCE, Google 서명·발급자·대상·만료 검증을 사용하며, 세션은 Secure/HttpOnly 쿠키로 1시간 유지합니다.
로그아웃은 동일 출처 POST만 허용합니다. 테스트 Worker에는 GitHub 자격 증명이나 변경 API가 없습니다.

Worker Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `MEMBERS_JSON`.
`MEMBERS_JSON`은 이메일별 `{ "role": "owner|admin|editor", "sub": "선택적 Google subject" }` 객체입니다.
매 요청마다 서버의 최신 역할을 조회하므로 허용 목록에서 제거하면 기존 세션도 사용할 수 없습니다.
현재는 Secret 설정으로 관리하며, 초대·소유권 이전 UI와 영속 저장소는 다음 구현 단계입니다.
OAuth JSON·세션 키는 저장소, 빌드 결과, 로그에 포함하지 않습니다.
무료 Workers 계정만 사용하고 결제·유료 업그레이드는 수행하지 않습니다.

## GitHub 실연동 준비

실행 플래그 `GITHUB_ENABLED=true`를 설정하기 전까지 기존 로그인 데모를 유지합니다.
필수 설정: `GITHUB_REPOSITORY=MNG-lab/mng-homepage`, `GITHUB_TEST_BASE=codex/admin-sandbox`,
`GITHUB_WORKFLOW_REF=codex/admin-portal`, D1 `DB` 바인딩 및 `admin/migrations/0001_requests.sql`.
GitHub App의 `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`는 Worker Secret입니다.
개인 키는 PKCS#8 형식으로 변환해 사용합니다. 키 파일을 커밋하거나 브라우저로 전달하지 않습니다.

- 이슈는 `admin-preview` 라벨만 사용하며 운영 `codex-auto` / rollback 라벨은 사용하지 않습니다.
- 기존 등록된 `codex-comment.yml`을 테스트 브랜치 ref로 실행하면 격리된 reusable workflow만 실행합니다.
- Codex는 GitHub 자격 증명 없이 workspace-write sandbox에서 홈페이지 파일만 수정합니다.
- PR base와 merge API는 `codex/admin-sandbox`만 허용합니다. main, fork, 다른 저장소, 변경된 head SHA는 거부합니다.
- 승인에는 해당 head SHA의 `ci-quality.yml` 성공이 필요합니다.
- 요청 UUID를 D1에 먼저 예약합니다. 응답 유실 시 임의로 이슈 생성·workflow dispatch를 재시도하지 않습니다.
- 공개 GitHub 이슈에는 요청 내용만 기록하며 사용자 이메일이나 토큰을 포함하지 않습니다.

현재 실제 기능 플래그는 아직 켜지지 않았습니다. D1 생성 승인, 격리 브랜치 준비 및 E2E 검증 후 활성화합니다.
소유권 이전·실제 시점 복원·Codex 인증 갱신 API는 다음 단계입니다.
