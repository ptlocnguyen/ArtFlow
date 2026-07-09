ALTER TABLE audit_logs ADD COLUMN request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_request_id
ON audit_logs(request_id)
WHERE request_id IS NOT NULL AND request_id <> '';

CREATE TABLE IF NOT EXISTS audit_events (
  request_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_email TEXT,
  request_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  entity_type TEXT,
  entity_id TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_events_status_created
ON audit_events(status, created_at);

INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-07-09-d1-4"', CURRENT_TIMESTAMP);
