# P5 Custom Domain & HTTPS Guide (Manual)

Date: 2026-03-03  
Scope: GitHub Pages + external DNS provider manual steps

## 1) Decide Final Domain

- Primary domain example: `dglab.yonsei.ac.kr`
- Keep GitHub Pages URL as fallback: `https://mng-lab.github.io/mng-homepage/`

## 2) Configure GitHub Pages

1. Open repository Settings -> Pages.
2. Confirm Source is `GitHub Actions`.
3. In **Custom domain**, enter your final domain (example: `dglab.yonsei.ac.kr`) and save.

## 3) Configure DNS at Hosting Provider

### If using subdomain (`sub.example.com`) recommended for lab site

- Add `CNAME` record:
  - Host/Name: `dglab` (or target subdomain prefix)
  - Value/Target: `mng-lab.github.io`
  - TTL: default (300~3600)

### If using apex/root domain (`example.com`)

- Add `A` records to GitHub Pages IPs:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- Add `AAAA` records (optional but recommended):
  - `2606:50c0:8000::153`
  - `2606:50c0:8001::153`
  - `2606:50c0:8002::153`
  - `2606:50c0:8003::153`

## 4) Enable HTTPS

1. Return to Settings -> Pages.
2. Wait for DNS validation to complete.
3. Enable **Enforce HTTPS**.

## 5) Post-cutover Validation

- `https://<custom-domain>/` loads successfully.
- `https://<custom-domain>/research` etc. route fallback works.
- Rebuild with domain base URL:
  - macOS/Linux: `VITE_SITE_URL=https://<custom-domain> npm run build`
  - PowerShell: `$env:VITE_SITE_URL="https://<custom-domain>"; npm run build`
- `npm run verify:routes:published -- --base-url https://<custom-domain> --write-report`
- Update canonical/OG/sitemap base URL only after custom domain is stable.

## 6) Rollback (Domain Layer)

- If issue occurs, remove Custom domain in Pages settings.
- Revert DNS to previous production target.
- Continue serving from `github.io` URL until issue is resolved.
