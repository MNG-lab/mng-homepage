# Content Migration Checklist (P3)

Date: 2026-03-02  
Branch: `codex/p3-content-migration`

## Source Pages

- https://dglab.yonsei.ac.kr/
- https://dglab.yonsei.ac.kr/professor
- https://dglab.yonsei.ac.kr/members
- https://dglab.yonsei.ac.kr/research
- https://dglab.yonsei.ac.kr/research-1
- https://dglab.yonsei.ac.kr/research-2
- https://dglab.yonsei.ac.kr/research-3
- https://dglab.yonsei.ac.kr/publications/publications
- https://dglab.yonsei.ac.kr/gallery
- https://dglab.yonsei.ac.kr/contact

## Migrated in This Step

- [x] Contact address/email/phone migrated from legacy Contact/Footer text.
- [x] Research section mapped to legacy Research 1/2/3 topics and source links.
- [x] Professor route/template added (`/professor`) with dedicated profile content and source link.
- [x] Members page updated with legacy PI info and multiple verified member emails.
- [x] Publications full archive migrated across 14 legacy pages with metadata enrichment.
- [x] Gallery categories linked to legacy archive routes (`~2023`, `2024`, `waglewagle`).
- [x] Per-page source links added for auditability.
- [x] Automated content validation script added (`npm run validate:content:urls`) and baseline report generated.

## Pending Items

- [x] Full member role/status verification for all extracted emails (`content/member-verification-report.md`).
- [x] Gallery item-level caption/image migration (archive pages `2023-1`, `2024`, `와글와글`).
- [ ] Legacy-to-new URL redirection behavior validation in production environment.

## Validation Notes

- Legacy publication page indicates 14 pages of items (UI pagination observed and migrated).
- Legacy contact information appears in multiple variants:
  - `02-2123-7584` (Lab)
  - `02-2123-2699` (Office)
  - `+82-2-2123-7286` (Footer variant)
- Membership emails extracted directly from legacy HTML `mailto:` links.
- URL validation baseline (2026-03-03): `38/39` passed.
  - One external URL (`onlinelibrary.wiley.com`) returns `403` to automated probes.
- Gallery migration baseline (2026-03-03): 22 image items extracted with caption metadata.
- Member verification baseline (2026-03-03): `PASS 5 / WARN 3 / INFO 17`.
  - WARN targets: `ksjsjj2000@naver.com`, `yeonalex1@yonsei.ac.kr`, `c223jin@yonsei.ac.kr` (legacy Members page data differs from migrated current roster).
