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

## 수정 요청과 사진 첨부

어드민과 GitHub 양식은 페이지와 수정 내용만 필수로 받습니다. 수정 유형은 따로 고르지 않아도 되며 문구·링크·사진·배치·새 콘텐츠·오류 수정 등 원하는 작업을 자유롭게 적습니다. 사진·참고 자료와 세부 주소는 선택 입력이고, 정확한 문구·제외 범위는 추가 항목입니다. 어드민 제목은 첫 문장으로 자동 제안하며 수정할 수 있습니다. GitHub는 제목을 직접 입력하고 추가 항목도 펼쳐진 양식으로 표시됩니다. 기존 GitHub 이슈도 같은 상세 화면에서 확인하며 Markdown·HTML 형식의 GitHub 첨부 이미지를 표시합니다.

사진 선택·드래그·붙여넣기를 지원합니다. JPG/PNG/GIF/WebP 원본을 파일당 10MB, 요청당 8개·전체 40MB까지 받습니다. 제출할 때 기존 GitHub App의 Contents 권한으로 `admin-attachments` 전용 브랜치에 저장하며, 커밋 SHA에 고정된 원본 URL을 이슈에 넣습니다. 파일은 공개 저장소에 보관됩니다. 새 유료 저장소나 결제 등록은 없습니다. 첨부 브랜치는 운영 코드에 병합하지 않으며 Cloudflare Pages 배포 대상에서 제외해야 합니다.

`0008_attachments.sql`은 D1에 파일의 소유자·용량·고정 URL만 저장합니다. 원본 파일은 DB에 저장하지 않습니다. 업로드는 로그인·출처·형식·크기·소유권을 검사하고, 같은 사진 재전송은 기존 파일을 재사용합니다. 요청당 한도와 계정당 하루 100개 업로드 한도를 적용합니다. 작성 중 첨부 제거는 요청에서만 제외하며 이미 업로드한 원본은 GitHub 이력에 남습니다. 개인정보나 비공개 자료는 올리지 마세요.

자동화는 신뢰할 수 있는 GitHub 첨부 주소에서 사진을 크기 제한 내에서 내려받고, Codex 이미지 입력과 로컬 원본 파일로 전달합니다. 임의 내부 주소로의 리디렉션은 거부합니다. 일반 외부 링크는 참고 자료로 전달되며, 사진 파일 자체를 써야 하면 파일 첨부를 권장합니다.

## 변경 취소 요청

관리자·최고 관리자는 완료된 일반 수정 요청 상세의 ‘이 변경 취소’에서 이유를 적어 취소 요청을 만듭니다. 원래 요청과 반영된 PR·커밋은 서버에서 확인하고 고정하며, 같은 변경의 취소 요청이 있으면 기존 요청을 안내합니다. 취소 PR을 병합하지 않고 종료한 경우에는 다시 요청할 수 있습니다. 새 수정 요청에는 별도의 변경 취소 탭을 두지 않습니다. 개발자가 번호를 지정해야 하는 경우 GitHub의 ‘특정 변경 취소’와 ‘직전 변경 취소’ 양식을 사용합니다. 기존 두 GitHub 롤백 양식과 같은 자동화를 사용하며 Codex 인증이 필요하지 않습니다. 처음 실행한 대상 커밋을 봇 댓글에 기록하고 재실행 때도 그 대상을 유지합니다. 결과는 검토용 PR이며 자동 병합하지 않습니다. 충돌·이미 취소된 변경은 실패로 안내합니다. 홈페이지 이외의 파일이 바뀌는 PR은 GitHub에서 개발 담당자가 검토해야 합니다.

홈페이지 버전 화면의 ‘이 버전으로 되돌리기’는 홈페이지 전체 스냅샷 복원입니다. 변경 취소와 목적·범위가 다르므로 두 동작을 구분합니다.

추가 검증: `node --test admin/tests/composer.test.mjs`, 운영 빌드 후 `node admin/tests/composer-smoke.mjs`.

## 배포 전 화면 검토

```sh
npm ci
npm run admin:build:review
npm run admin:review
```

[로컬 검토 화면](http://127.0.0.1:4196/requests/new)에서 새 양식, 완료된 요청의 변경 취소, GitHub 양식 변경안을 확인합니다. Node.js 24의 메모리 SQLite와 가상 GitHub 응답으로 실제 요청 API를 실행합니다. 사진도 메모리에만 저장하며 프로세스를 종료하면 초기화됩니다. 로그인·권한 설정·Codex·운영 DB·외부 GitHub에 연결하지 않습니다. 127.0.0.1에서만 열리며 배포용 서버가 아닙니다. 필요하면 `MNG_REVIEW_PORT`로 포트를 지정합니다.

검토 빌드는 `dist-admin-review`에 저장되어 운영 빌드 `dist-admin`과 분리됩니다. 이 명령들은 main push나 Cloudflare 배포를 실행하지 않습니다.
