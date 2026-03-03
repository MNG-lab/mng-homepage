# MNG Homepage (React + Vite)

MNG Lab 홈페이지 마이그레이션 프로젝트입니다.  
현재 저장소는 실제 운영 구조(페이지 라우팅, 콘텐츠 데이터, QA/검증 스크립트, GitHub Pages 배포 워크플로)를 포함합니다.

## 1) 요구사항

- Node.js 20 이상 권장
- npm 10 이상 권장

확인:

```bash
node -v
npm -v
```

## 2) 로컬 실행

### macOS / Linux

```bash
cd /Users/user/Desktop/mng-homepage
npm install
npm run dev
```

### Windows (PowerShell)

```powershell
cd C:\Users\user\Desktop\mng-homepage
npm install
npm run dev
```

## 3) 빌드

`build` 전에 `prebuild`가 자동 실행되어 `public/sitemap.xml`, `public/robots.txt`를 생성합니다.

```bash
npm run build
```

## 4) 주요 스크립트

- `npm run dev`: 개발 서버
- `npm run build`: 프로덕션 빌드 (`prebuild` 자동 포함)
- `npm run preview`: 빌드 결과 미리보기
- `npm run qa:smoke`: 주요 라우트 스모크 테스트
- `npm run qa:matrix:responsive`: 반응형 QA 매트릭스(모바일/태블릿/데스크톱) 스크린샷 수집 + 리포트 생성
- `npm run qa:cross-browser`: 크로스브라우저 라우트 스모크(Chromium/Firefox/WebKit) 리포트 생성
- `npm run qa:accessibility`: 접근성 점검(heading-order/image-alt/color-contrast) 리포트 생성
- `npm run validate:content`: 콘텐츠 구조 검증
- `npm run validate:content:urls`: 콘텐츠 + 외부 URL 상태 검증
- `npm run verify:members`: 레거시 멤버 데이터 정합 리포트 생성
- `npm run validate:redirects`: 레거시->신규 URL 매핑 검증 리포트 생성
- `npm run verify:routes:published`: 배포 URL 라우트/레거시 진입 경로 검증
- `npm run verify:rollback:deploy -- --sha <commit-sha>`: 특정 SHA의 롤백 배포 반영 여부 검증
- `npm run check:pages:status`: 최신 Pages 배포 상태/롤백 SHA 리포트 생성
- `npm run preflight:p5`: P5 배포 전 점검(SEO/빌드/콘텐츠/외부 링크/스모크/접근성/리다이렉트/배포상태) 일괄 실행
- `npm run generate:seo`: sitemap/robots 수동 생성

`qa:matrix:responsive` 최초 1회 실행 전 브라우저 설치:

```bash
npx playwright install chromium
```

`qa:cross-browser`까지 포함하려면:

```bash
npx playwright install chromium firefox webkit
```

## 5) 사이트 URL(SEO) 설정

Canonical URL, OG URL, sitemap/robots 기준 URL은 `VITE_SITE_URL`로 제어합니다.

기본값:

- `https://mng-lab.github.io/mng-homepage`

### macOS / Linux

```bash
VITE_SITE_URL=https://dglab.yonsei.ac.kr npm run build
```

### Windows (PowerShell)

```powershell
$env:VITE_SITE_URL="https://dglab.yonsei.ac.kr"; npm run build
```

## 6) GitHub Pages 배포

- 워크플로: `.github/workflows/deploy-pages.yml`
- PR 품질 게이트: `.github/workflows/ci-quality.yml`
- `main` 브랜치 push 시 자동 배포
- SPA fallback: `dist/index.html` -> `dist/404.html`

최초 1회:

1. GitHub 저장소 `Settings > Pages`
2. Source를 `GitHub Actions`로 설정
3. `main`에 push 후 `Actions`의 `Deploy to GitHub Pages` 성공 확인

## 7) 운영 문서

- 마이그레이션 체크리스트: `content/migration-checklist.md`
- 릴리스 핸드오프 요약: `content/release-handoff-summary-2026-03-03.md`
- Pages 안정화 체크리스트: `content/p5-pages-checklist.md`
- 배포 상태 리포트: `content/p5-deployment-status-report.md`
- 커스텀 도메인/HTTPS 수동 가이드: `content/p5-custom-domain-guide.md`
