# GitHub Pages Disabled Fallback

Date: 2026-07-03

Production hosting has moved to Cloudflare Pages:

- Primary URL: `https://dglab.yonsei.ac.kr/`
- Redirect: `https://www.dglab.yonsei.ac.kr/` -> `https://dglab.yonsei.ac.kr/`
- DNS target: `mng-homepage.pages.dev`

GitHub Pages is intentionally disabled as an automatic production deploy path.
The workflow `.github/workflows/deploy-pages.yml` is kept as a manual fallback
with `workflow_dispatch` only.

The old GitHub Pages `public/CNAME` file was removed so the Cloudflare Pages
build output does not publish a stale GitHub Pages custom-domain marker. The
previous GitHub Pages custom domain was:

```text
www.dglab.yonsei.ac.kr
```

To temporarily re-enable GitHub Pages:

1. Re-add the `push` trigger for `main` in `.github/workflows/deploy-pages.yml`.
2. Restore a `public/CNAME` file if a GitHub Pages custom domain is required.
3. In GitHub repository settings, enable Pages with source `GitHub Actions`.
4. Point DNS back to the appropriate GitHub Pages target only after Cloudflare
   rollback is intended.
