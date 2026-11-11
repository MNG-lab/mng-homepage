CREATE TABLE codex_credential_state (id INTEGER PRIMARY KEY CHECK(id=1), updated_at INTEGER NOT NULL);
CREATE TABLE request_run_results (
 run_id TEXT NOT NULL, attempt INTEGER NOT NULL, issue INTEGER NOT NULL,
 sha TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('success','auth_required','failed')),
 created_at INTEGER NOT NULL, PRIMARY KEY(run_id,attempt)
);
