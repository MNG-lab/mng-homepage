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
- [x] Members page updated with legacy PI info and multiple verified member emails.
- [x] Publications updated with one verified item and DOI link.
- [x] Gallery categories linked to legacy archive routes (`~2023`, `2024`, `와글와글`).
- [x] Per-page source links added for auditability.

## Pending Items

- [ ] Publications full archive migration (legacy page shows multi-page list; only first verified record migrated).
- [ ] Full member role/status verification for all extracted emails.
- [ ] Gallery item-level caption/image migration (currently category-level baseline).
- [ ] Legacy-to-new URL redirection behavior validation in production environment.

## Validation Notes

- Legacy publication page indicates 14 pages of items (UI pagination observed).
- Legacy contact information appears in multiple variants:
  - `02-2123-7584` (Lab)
  - `02-2123-2699` (Office)
  - `+82-2-2123-7286` (Footer variant)
- Membership emails extracted directly from legacy HTML `mailto:` links.
