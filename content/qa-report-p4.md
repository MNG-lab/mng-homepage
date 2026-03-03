# P4 QA Report

Date: 2026-03-03  
Branch: `codex/p4-cross-browser-smoke`

## 1) Automated Checks

- Build: `npm run build` -> pass
- Route smoke: `npm run qa:smoke` -> pass (`8/8`)
- Smoke report: `content/qa-smoke-p4.md`
- Responsive matrix: `npm run qa:matrix:responsive` -> pass (`24/24`)
- Responsive matrix report: `content/qa-responsive-matrix-report.md`
- Cross-browser smoke: `npm run qa:cross-browser` -> pass (`24/24`)
- Cross-browser report: `content/qa-cross-browser-report.md`

## 2) Performance Baseline

- Route-level code splitting (`React.lazy` + `Suspense`) is active.
- Current production build snapshot:
  - Entry JS: `dist/assets/index-zRYCitJF.js` ~ `175.68 kB` (gzip `57.73 kB`)
  - Largest route chunk: `PublicationsPage` ~ `12.18 kB` (gzip `4.57 kB`)

## 3) Accessibility Baseline

- Route fallback status region uses:
  - `role="status"`
  - `aria-live="polite"`
- Skip link to `#main-content` is present in layout.

## 4) Remaining Manual QA (P4 Exit Criteria)

- [x] Responsive matrix execution with screenshots (mobile/tablet/desktop)
- [x] Cross-browser run (Chrome/Edge/Safari baseline via Chromium/Firefox/WebKit)
- [ ] Final accessibility review (heading order, alt text, contrast)
- [x] Content-level external link sanity checks during release candidate run (`npm run preflight:p5` includes `npm run validate:content:urls`)

## 5) External Link Sanity Baseline (RC)

- Command: `npm run preflight:p5`
- Result: pass (`8/8`)
- URL health summary: `content/p3-validation-report.md` (`38/39` passed, one known `403` from `onlinelibrary.wiley.com`)

## 6) Responsive Matrix Baseline

- Command: `npm run qa:matrix:responsive`
- Result: pass (`24/24`)
- Screenshots: `content/qa-screenshots/{mobile,tablet,desktop}/*.png`

## 7) Cross-Browser Baseline

- Command: `npm run qa:cross-browser`
- Result: pass (`24/24`)
- Browser mapping: Chromium(Chrome/Edge), Firefox, WebKit(Safari)
