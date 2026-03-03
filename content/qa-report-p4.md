# P4 QA Report

Date: 2026-03-03  
Branch: `codex/p4-qa-matrix`

## 1) Automated Checks

- Build: `npm run build` -> pass
- Route smoke: `npm run qa:smoke` -> pass (`8/8`)
- Smoke report: `content/qa-smoke-p4.md`

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

- [ ] Responsive matrix execution with screenshots (mobile/tablet/desktop)
- [ ] Cross-browser run (Chrome/Edge/Safari)
- [ ] Final accessibility review (heading order, alt text, contrast)
- [ ] Content-level external link sanity checks during release candidate run
