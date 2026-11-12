-- Preserve existing results while extending the failure classification.
CREATE TABLE request_run_results_v2 (
 run_id TEXT NOT NULL, attempt INTEGER NOT NULL, issue INTEGER NOT NULL,
 sha TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('success','auth_required','failed')),
 created_at INTEGER NOT NULL,
 failure_code TEXT CHECK(failure_code IS NULL OR failure_code IN ('rollback_conflict','rollback_no_changes','rollback_protected')),
 PRIMARY KEY(run_id,attempt)
);
INSERT INTO request_run_results_v2
 SELECT run_id,attempt,issue,sha,reason,created_at,failure_code FROM request_run_results;
DROP TABLE request_run_results;
ALTER TABLE request_run_results_v2 RENAME TO request_run_results;
