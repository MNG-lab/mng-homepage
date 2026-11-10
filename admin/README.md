# MNG 홈페이지 어드민 — 화면 확인 단계

현재 버전은 실제 GitHub/Cloudflare 작업을 실행하지 않는 인터랙션 데모입니다.
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
3. 변경 이력 → 이 변경 되돌리기 → 새 요청 → 확인 후 승인
4. 실패 요청 재시도 / 요청 취소
5. 설정에서 관리자·편집자 화면 전환
6. 데모 초기화

이 버전의 권한 전환과 검사 결과는 화면 체험용이며 실제 인증·인가가 아닙니다.
Codex 인증 입력, 실제 PR 병합, 실제 롤백은 아직 연결하지 않습니다.

## 다음 단계의 격리 조건

- 개발 브랜치: `codex/admin-portal` (`main`에 push/merge하지 않음)
- 최초 테스트 관리자: `chominho96@gmail.com`
- Cloudflare 운영 프로젝트 `mng-homepage`와 별도 테스트 리소스 사용
- 테스트 요청·워크플로·기준 브랜치가 운영 자동화와 충돌하지 않도록 분리
- 실제 연동 전 서버 측 로그인·역할 검증, 요청 중복 방지, 테스트 대상 강제 검증 적용
- 테스트 인증 갱신은 운영 GitHub Secrets를 덮어쓰지 않음
