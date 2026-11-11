-- Preserve test records and membership; production reads use a separate namespace.
ALTER TABLE device_flows ADD COLUMN environment TEXT NOT NULL DEFAULT 'preview';
DROP INDEX one_active_device_flow;
CREATE UNIQUE INDEX one_active_device_flow ON device_flows(environment) WHERE state IN ('queued','waiting','saving','testing');
CREATE TABLE production_credential_state (id INTEGER PRIMARY KEY CHECK(id=1), updated_at INTEGER NOT NULL);
