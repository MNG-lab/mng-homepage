CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  actor_sub TEXT NOT NULL,
  payload TEXT NOT NULL,
  issue_number INTEGER UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('creating','created','dispatching','dispatched','uncertain')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS requests_issue ON requests(issue_number);
