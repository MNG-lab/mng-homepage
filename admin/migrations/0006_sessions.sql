CREATE TABLE sessions (
 id_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 subject TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
