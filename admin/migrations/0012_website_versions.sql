-- Durable website identifiers, independent of GitHub issue/PR numbers and cache.
CREATE TABLE website_versions (
 scope TEXT NOT NULL,
 sha TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>0),
 PRIMARY KEY(scope,sha),
 UNIQUE(scope,version)
);
