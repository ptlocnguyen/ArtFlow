CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_transactions_platform_payout_once
  ON cash_transactions(reference_type, reference_id)
  WHERE reference_type = 'platform_payout' AND status <> 'deleted';

INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-07-11-accounting-commerce-2"', CURRENT_TIMESTAMP);
