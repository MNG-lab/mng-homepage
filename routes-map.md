# DGLab URL Mapping (P0)

Date: 2026-03-02  
Goal: migrate to the new information architecture without losing legacy URL value.

## 1) Canonical Routes (New)

| Key | New URL | Notes |
| --- | --- | --- |
| home | `/` | Home |
| research | `/research` | Research overview + detail entry |
| professor | `/professor` | PI profile |
| members | `/members` | Current / Alumni |
| publications | `/publications` | Year and filter support |
| gallery | `/gallery` | Year and category |
| contact | `/contact` | Address / email / map |
| join | `/join-us` | Recruitment / FAQ |

## 2) Legacy -> New Mapping

| Legacy URL | New URL | Policy | Priority |
| --- | --- | --- | --- |
| `/` | `/` | keep | P0 |
| `/research` | `/research` | keep | P0 |
| `/professor` | `/professor` | keep | P0 |
| `/members` | `/members` | keep | P0 |
| `/publications/publications` | `/publications` | 301 redirect | P0 |
| `/publications` | `/publications` | keep | P0 |
| `/contact` | `/contact` | keep | P0 |
| `/gallery` | `/gallery` | keep | P1 |
| `/news` (if exists) | `/gallery` or `/` news section | 301 redirect | P2 |

## 3) Redirect Policy

- Apply server-level 301 redirects on the production domain (`dglab.yonsei.ac.kr`).
- Preserve query strings and UTM parameters.
- Normalize trailing slash policy to canonical URLs.
- Normalize mixed-case URLs to lowercase canonical URLs.
- Serve a real 404 page (do not force-redirect all 404s to home).

## 4) GitHub Pages Staging Policy

- On staging (`github.io`), SPA fallback behavior is limited.
- Strategy fixed: `BrowserRouter + 404 fallback` (`dist/index.html` copied to `dist/404.html` in deploy workflow).
- After custom-domain cutover, switch to `BrowserRouter + server 301`.

## 5) Validation Checklist

- Verify internal links use canonical URLs only.
- Verify navigation and footer links work.
- Verify key legacy URLs redirect to new URLs.
- Verify crawl errors and redirect chains in Search Console.
