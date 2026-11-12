-- Images live in GitHub; only ownership, quotas and immutable URLs live in D1.
CREATE TABLE attachments (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL, actor_sub TEXT NOT NULL,
 name TEXT NOT NULL, media_type TEXT NOT NULL, size INTEGER NOT NULL,
 digest TEXT NOT NULL, path TEXT NOT NULL, url TEXT, removed INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX attachments_request ON attachments(request_id, actor_sub);
CREATE INDEX attachments_actor_time ON attachments(actor_sub, created_at);
