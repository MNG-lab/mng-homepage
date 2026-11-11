CREATE TABLE device_flows (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, subject TEXT NOT NULL, kind TEXT NOT NULL,
 sha TEXT NOT NULL, state TEXT NOT NULL, code TEXT, run_id TEXT,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX one_active_device_flow ON device_flows((1)) WHERE state IN ('queued','waiting','saving','testing');
