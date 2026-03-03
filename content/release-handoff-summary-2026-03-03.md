# DGLab Renewal Handoff Summary

Date: 2026-03-03  
Status: Code changes complete, waiting for manual cutover

## 1) What Is Done

- P0-P4 core implementation and QA automation completed.
- P5 GitHub Pages deploy stabilization completed on code side.
- KR/EN language toggle applied across pages.
- Legacy entry path compatibility and published route verification completed.
- SEO assets generation (sitemap/robots/canonical base) integrated with build.
- Rollback verification tooling and deployment status reporting added.

## 2) Final Automated Baseline

- `npm run preflight:p5` -> PASS `9/9`
- `npm run qa:smoke` -> PASS `8/8`
- `npm run qa:matrix:responsive` -> PASS `24/24`
- `npm run qa:cross-browser` -> PASS `24/24`
- `npm run qa:accessibility` -> PASS `PASS 8 / WARN 0 / FAIL 0`

Reference reports:

- `content/p5-preflight-report.md`
- `content/qa-report-p4.md`
- `content/p5-deployment-status-report.md`
- `content/p5-route-verification-report.md`
- `content/redirect-validation-report.md`

## 3) Remaining Manual Work

- GitHub Settings -> Pages -> Source = `GitHub Actions` 확인
- Custom domain DNS 설정
- GitHub Pages custom domain 입력
- HTTPS(Enforce HTTPS) 활성화 확인
- 도메인 전환 후 `VITE_SITE_URL` 기준 재빌드/재배포
- (조건부) 실제 rollback 수행 시 `npm run verify:rollback:deploy -- --sha <rollback-sha>` 실행

Manual guide:

- `content/p5-custom-domain-guide.md`
- `content/p5-pages-checklist.md`

## 4) Post-Cutover Recommended Command Set

```bash
VITE_SITE_URL=https://<custom-domain> npm run build
npm run preflight:p5
npm run verify:routes:published -- --base-url https://<custom-domain> --write-report
```
