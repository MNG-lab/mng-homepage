-- Existing sessions remain valid and use the default avatar until next login.
ALTER TABLE sessions ADD COLUMN picture TEXT;
