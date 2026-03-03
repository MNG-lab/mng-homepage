# P5 Preflight Report

Generated at: 2026-03-03T02:10:21.125Z

## Summary

- PASS: 9
- FAIL: 0

## Task Results

| Task | Command | Duration | Result | Output (tail) |
| --- | --- | --- | --- | --- |
| Generate SEO assets | `npm run generate:seo` | 0.2s | PASS | - site URL: https://mng-lab.github.io/mng-homepage / - sitemap: /Users/user/Desktop/mng-homepage/public/sitemap.xml / - robots: /Users/user/Desktop/mng-homepage/public/robots.txt |
| Build production bundle | `npm run build` | 1.2s | PASS | dist/assets/GalleryPage-BpotAyPI.js          14.04 kB │ gzip:  3.93 kB / dist/assets/index-CUnkr7tU.js               177.24 kB │ gzip: 58.24 kB / ✓ built in 377ms |
| Validate content schema | `npm run validate:content` | 0.3s | PASS | - warnings: 0 / - info: 4 / Report written: /Users/user/Desktop/mng-homepage/content/p3-validation-report.md |
| External link sanity check | `npm run validate:content:urls` | 28.7s | PASS | Warnings / - URL check failed: https://onlinelibrary.wiley.com/doi/full/10.1002/ardp.202400218 (403) / Report written: /Users/user/Desktop/mng-homepage/content/p3-validation-report.md |
| Run smoke test | `npm run qa:smoke` | 2.2s | PASS | > node scripts/qa-smoke.mjs / Smoke test complete: 8/8 passed / Report written: /Users/user/Desktop/mng-homepage/content/qa-smoke-p4.md |
| Run accessibility audit | `npm run qa:accessibility` | 11.0s | PASS | > node scripts/qa-accessibility.mjs / Accessibility audit complete: PASS=8, WARN=0, FAIL=0 / Report written: /Users/user/Desktop/mng-homepage/content/qa-accessibility-report.md |
| Validate redirect mapping | `npm run validate:redirects` | 7.3s | PASS | - /publications/publications -> /publications: Expected redirect but response did not redirect. / - /publications -> /publications: Canonical route returns 404. / Report written: /Users/user/Desktop/mng-homepage/content/redirect-validation-report.md |
| Verify published routes | `npm run verify:routes:published` | 3.9s | PASS | - fallback(404): 7 / - legacy entry routes: 10/10 passed / Report written: /Users/user/Desktop/mng-homepage/content/p5-route-verification-report.md |
| Check pages deployment status | `npm run check:pages:status` | 1.1s | PASS | - pass: 4 / - fail: 0 / Report written: /Users/user/Desktop/mng-homepage/content/p5-deployment-status-report.md |
