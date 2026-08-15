CREATE TABLE IF NOT EXISTS tiktok_connections (
  id TEXT PRIMARY KEY,
  sales_channel_id TEXT NOT NULL DEFAULT '',
  open_id TEXT NOT NULL DEFAULT '',
  seller_name TEXT NOT NULL DEFAULT '',
  seller_base_region TEXT NOT NULL DEFAULT '',
  shop_id TEXT NOT NULL DEFAULT '',
  shop_cipher TEXT NOT NULL DEFAULT '',
  shop_name TEXT NOT NULL DEFAULT '',
  access_token_ciphertext TEXT NOT NULL DEFAULT '',
  access_token_iv TEXT NOT NULL DEFAULT '',
  refresh_token_ciphertext TEXT NOT NULL DEFAULT '',
  refresh_token_iv TEXT NOT NULL DEFAULT '',
  access_token_expires_at TEXT NOT NULL DEFAULT '',
  refresh_token_expires_at TEXT NOT NULL DEFAULT '',
  granted_scopes TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  last_token_refresh_at TEXT NOT NULL DEFAULT '',
  last_shop_sync_at TEXT NOT NULL DEFAULT '',
  last_product_sync_at TEXT NOT NULL DEFAULT '',
  last_inventory_sync_at TEXT NOT NULL DEFAULT '',
  last_order_sync_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tiktok_connections_shop
  ON tiktok_connections(shop_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_connections_status_expiry
  ON tiktok_connections(status, access_token_expires_at);

CREATE TABLE IF NOT EXISTS tiktok_oauth_states (
  state_hash TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL DEFAULT '',
  return_url TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tiktok_oauth_states_expiry
  ON tiktok_oauth_states(expires_at, used_at);

CREATE TABLE IF NOT EXISTS tiktok_product_mappings (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  tiktok_product_id TEXT NOT NULL,
  tiktok_sku_id TEXT NOT NULL,
  seller_sku TEXT NOT NULL DEFAULT '',
  tiktok_title TEXT NOT NULL DEFAULT '',
  warehouse_inventory_json TEXT NOT NULL DEFAULT '[]',
  remote_stock REAL NOT NULL DEFAULT 0,
  remote_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT '',
  sync_stock TEXT NOT NULL DEFAULT 'true',
  sync_price TEXT NOT NULL DEFAULT 'false',
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(connection_id, tiktok_sku_id)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_product_mappings_product
  ON tiktok_product_mappings(product_id, status);
CREATE INDEX IF NOT EXISTS idx_tiktok_product_mappings_remote_product
  ON tiktok_product_mappings(connection_id, tiktok_product_id, status);

CREATE TABLE IF NOT EXISTS tiktok_webhook_events (
  notification_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT '',
  shop_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tiktok_webhook_events_status
  ON tiktok_webhook_events(status, received_at);

INSERT INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-08-15-1"', datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value_json = excluded.value_json,
  updated_at = excluded.updated_at;
