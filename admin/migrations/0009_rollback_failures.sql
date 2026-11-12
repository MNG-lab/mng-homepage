ALTER TABLE request_run_results ADD COLUMN failure_code TEXT
 CHECK(failure_code IS NULL OR failure_code IN ('rollback_conflict','rollback_no_changes'));
