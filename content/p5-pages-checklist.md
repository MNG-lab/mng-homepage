# P5 GitHub Pages Stabilization Checklist

Date: 2026-03-03  
Branch: `codex/p5-pages-stabilization`

## 1) Workflow Baseline

- [x] Deploy workflow triggers on `main` push
- [x] Build uses deterministic install (`npm ci`)
- [x] SPA fallback prepared (`dist/404.html` from `dist/index.html`)
- [x] `.nojekyll` artifact included

## 2) GitHub Settings

- [ ] Repository -> Settings -> Pages -> Source = `GitHub Actions`
- [ ] Confirm latest `Deploy to GitHub Pages` workflow run is green
- [ ] Confirm published URL opens from Actions deployment summary

## 3) Route Verification (Published Site)

- [ ] `/`
- [ ] `/research`
- [ ] `/professor`
- [ ] `/members`
- [ ] `/publications`
- [ ] `/gallery`
- [ ] `/contact`
- [ ] `/join-us`

## 4) Custom Domain Cutover

- [ ] Domain selected and DNS records prepared
- [ ] Domain connected in Pages settings
- [ ] HTTPS enabled and certificate issued
- [ ] Canonical URL / sitemap base URL updated if domain changes

## 5) Rollback Plan

- [ ] Keep last known good commit hash documented
- [ ] If critical issue occurs, revert main to previous deploy commit and push
- [ ] Verify rollback deployment from Actions history
