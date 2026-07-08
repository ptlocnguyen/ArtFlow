ALTER TABLE users ADD COLUMN d1_verified_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_d1_verified
ON users(session_token, d1_verified_at);

INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-07-08-d1-2"', CURRENT_TIMESTAMP);
