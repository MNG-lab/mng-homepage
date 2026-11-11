-- Read cache only. GitHub remains authoritative for every write.
CREATE TABLE github_catalog (
  kind TEXT NOT NULL,
  id INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE TABLE github_catalog_sync (
  kind TEXT PRIMARY KEY,
  since TEXT,
  boundary TEXT,
  page INTEGER NOT NULL DEFAULT 1,
  checked_at INTEGER NOT NULL DEFAULT 0,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
