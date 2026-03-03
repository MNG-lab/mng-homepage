# DGLab Content Schema (P0)

Date: 2026-03-02  
Principle: separate content from presentation, and manage user-facing text as `ko/en` pairs.

## 1) Root Shape

```json
{
  "site": {},
  "home": {},
  "research": [],
  "professor": {},
  "members": {
    "pi": {},
    "current": [],
    "alumni": []
  },
  "publications": [],
  "gallery": [],
  "contact": {},
  "join": {}
}
```

## 2) Common Field Rules

- Localized text: `{ "ko": "...", "en": "..." }`
- Link: `{ "label": { "ko": "...", "en": "..." }, "url": "...", "external": true }`
- Date: prefer ISO 8601 (`YYYY-MM-DD`); keep `year` if only year is available.
- Image: split `src`, `alt`, and `caption`.
- Default ordering: ascending `order`.

## 3) Type-like Definitions

```json
{
  "LocalizedText": {
    "ko": "string",
    "en": "string"
  },
  "NavItem": {
    "key": "string",
    "label": "LocalizedText",
    "path": "string"
  },
  "ResearchItem": {
    "id": "string",
    "slug": "string",
    "title": "LocalizedText",
    "summary": "LocalizedText",
    "body": "LocalizedText",
    "tags": ["string"],
    "coverImage": {
      "src": "string",
      "alt": "LocalizedText"
    },
    "order": "number"
  },
  "ProfessorProfile": {
    "name": "LocalizedText",
    "title": "LocalizedText",
    "intro": "LocalizedText",
    "focusAreas": ["LocalizedText"],
    "responsibilities": ["LocalizedText"],
    "email": "string",
    "scholarUrl": "string"
  },
  "MemberItem": {
    "id": "string",
    "name": {
      "ko": "string",
      "en": "string"
    },
    "role": "LocalizedText",
    "group": "current|alumni|pi",
    "affiliation": "LocalizedText",
    "email": "string|null",
    "photo": {
      "src": "string",
      "alt": "LocalizedText"
    },
    "researchInterests": ["LocalizedText"],
    "order": "number"
  },
  "PublicationItem": {
    "id": "string",
    "year": "number",
    "title": "string",
    "authors": ["string"],
    "journal": "string",
    "doi": "string|null",
    "url": "string|null",
    "theme": ["string"],
    "featured": "boolean"
  },
  "GalleryItem": {
    "id": "string",
    "year": "number",
    "category": "string",
    "title": "LocalizedText",
    "images": [
      {
        "src": "string",
        "alt": "LocalizedText",
        "caption": "LocalizedText"
      }
    ]
  },
  "Contact": {
    "address": "LocalizedText",
    "email": "string",
    "tel": "string",
    "mapEmbedUrl": "string|null",
    "links": ["Link"]
  }
}
```

## 4) Recommended File Layout

```text
content/
  site.json
  home.json
  research.json
  professor.json
  members.json
  publications.json
  gallery.json
  contact.json
  join.json
```

## 5) Migration Checklist (Schema)

- Convert legacy text to `ko/en` structure.
- Ensure people/publication/gallery entries have `id` and order key (`order` or `year`).
- Normalize external links to `https`.
- Keep contact/email/phone formats consistent.
