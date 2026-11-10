CREATE TABLE members (email TEXT PRIMARY KEY, sub TEXT UNIQUE, role TEXT NOT NULL CHECK(role IN ('owner','admin','editor')), active INTEGER NOT NULL DEFAULT 1);
INSERT INTO members(email,role) VALUES ('chominho96@gmail.com','owner');
CREATE TABLE ownership (id INTEGER PRIMARY KEY CHECK(id=1), from_email TEXT NOT NULL, to_email TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE operations (id TEXT PRIMARY KEY, actor TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, issue INTEGER, result TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE operation_claims (resource TEXT PRIMARY KEY, operation TEXT NOT NULL);
