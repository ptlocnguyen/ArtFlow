ALTER TABLE users ADD COLUMN password_hash_v2 TEXT;
ALTER TABLE users ADD COLUMN password_salt_v2 TEXT;
ALTER TABLE users ADD COLUMN password_iterations_v2 INTEGER;
ALTER TABLE users ADD COLUMN auth_migrated_at TEXT;

INSERT OR REPLACE INTO d1_meta(key,value_json,updated_at)
VALUES('auth_schema_version','"2026-11-19-d1-auth-1"',datetime('now'));

INSERT OR REPLACE INTO d1_meta(key,value_json,updated_at)
VALUES('schema_version','"2026-11-19-d1-auth-1"',datetime('now'));
