# P5 GitHub Pages Stabilization Checklist

Date: 2026-03-03  
Branch: `codex/p5-rollback-verify-script`

## 1) Workflow Baseline

- [x] Deploy workflow triggers on `main` push
- [x] PR quality gate workflow added (`.github/workflows/ci-quality.yml`)
- [x] Build uses deterministic install (`npm ci`)
- [x] SPA fallback prepared (`dist/404.html` from `dist/index.html`)
- [x] `.nojekyll` artifact included
- [x] Run integrated preflight (`npm run preflight:p5`) and review `content/p5-preflight-report.md`

## 2) GitHub Settings

- [ ] Repository -> Settings -> Pages -> Source = `GitHub Actions`
- [x] Confirm latest `Deploy to GitHub Pages` workflow run is green (`npm run check:pages:status`, `content/p5-deployment-status-report.md`)
- [x] Confirm published URL opens (`npm run check:pages:status`, `content/p5-deployment-status-report.md`)

## 3) Route Verification (Published Site)

- [x] `/`
- [x] `/research`
- [x] `/professor`
- [x] `/members`
- [x] `/publications`
- [x] `/gallery`
- [x] `/contact`
- [x] `/join-us`
- [x] Run redirect baseline checker (`npm run validate:redirects`) and review `content/redirect-validation-report.md`
- [x] Run published route checker (`npm run verify:routes:published`) and review `content/p5-route-verification-report.md`
- [x] Confirm legacy entry routes are reachable in published site (`/research-1`, `/research-2`, `/research-3`, `/2023-1`, `/2024`, `/와글와글`, etc.)
- Note: on `github.io`, direct access to non-root routes is served via `404.html` SPA fallback (HTTP 404 + app HTML). This is expected before custom-domain/server redirect cutover.

## 4) Custom Domain Cutover

- [ ] Domain selected and DNS records prepared
- [ ] Domain connected in Pages settings
- [ ] HTTPS enabled and certificate issued
- [ ] Canonical URL / sitemap base URL updated if domain changes (`VITE_SITE_URL` 값으로 빌드 후 반영)
- Guide: `content/p5-custom-domain-guide.md`

## 5) Rollback Plan

- [x] Keep last known good commit hash documented (`content/p5-deployment-status-report.md`)
- [x] If critical issue occurs, revert main to previous deploy commit and push (command template in `content/p5-deployment-status-report.md`)
- [x] Rollback verification command added (`npm run verify:rollback:deploy -- --sha <commit-sha>`)
- [ ] Verify rollback deployment from Actions history (execute command with actual rollback SHA)
