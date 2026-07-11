PRAGMA foreign_keys = ON;

ALTER TABLE accounting_categories ADD COLUMN "group" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE cash_transactions ADD COLUMN channel_id TEXT NOT NULL DEFAULT '';
ALTER TABLE cash_transactions ADD COLUMN document_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS platform_payouts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL DEFAULT '',
  channel_code TEXT NOT NULL DEFAULT '',
  payout_code TEXT NOT NULL,
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  payout_date TEXT NOT NULL DEFAULT '',
  account_id TEXT NOT NULL DEFAULT '',
  gross_amount REAL NOT NULL DEFAULT 0,
  total_fees REAL NOT NULL DEFAULT 0,
  total_refunds REAL NOT NULL DEFAULT 0,
  expected_amount REAL NOT NULL DEFAULT 0,
  actual_amount REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  source_file_name TEXT NOT NULL DEFAULT '',
  source_file_url TEXT NOT NULL DEFAULT '',
  source_file_note TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  posted_transaction_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_payout_unique_code
  ON platform_payouts(channel_code, payout_code) WHERE status <> 'archived';
CREATE INDEX IF NOT EXISTS idx_platform_payout_status_date
  ON platform_payouts(status, payout_date);

CREATE TABLE IF NOT EXISTS platform_payout_items (
  id TEXT PRIMARY KEY,
  payout_id TEXT NOT NULL,
  order_id TEXT NOT NULL DEFAULT '',
  order_code TEXT NOT NULL DEFAULT '',
  platform_order_code TEXT NOT NULL DEFAULT '',
  product_total REAL NOT NULL DEFAULT 0,
  shipping_fee REAL NOT NULL DEFAULT 0,
  seller_discount REAL NOT NULL DEFAULT 0,
  platform_discount REAL NOT NULL DEFAULT 0,
  commission_fee REAL NOT NULL DEFAULT 0,
  payment_fee REAL NOT NULL DEFAULT 0,
  affiliate_fee REAL NOT NULL DEFAULT 0,
  ads_fee REAL NOT NULL DEFAULT 0,
  shipping_subsidy REAL NOT NULL DEFAULT 0,
  refund_amount REAL NOT NULL DEFAULT 0,
  penalty_fee REAL NOT NULL DEFAULT 0,
  expected_net_amount REAL NOT NULL DEFAULT 0,
  platform_net_amount REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (payout_id) REFERENCES platform_payouts(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_payout_items_payout ON platform_payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_platform_payout_items_order ON platform_payout_items(order_id, order_code);

INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-07-11-accounting-commerce-1"', CURRENT_TIMESTAMP);
