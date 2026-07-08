PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS d1_meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS d1_api_cache (
  cache_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_d1_api_cache_action ON d1_api_cache(action);
CREATE INDEX IF NOT EXISTS idx_d1_api_cache_expires_at ON d1_api_cache(expires_at);

CREATE TABLE IF NOT EXISTS d1_sync_log (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL,
  source TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  password_hash TEXT,
  salt TEXT,
  role TEXT,
  status TEXT,
  session_token TEXT,
  session_expires_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  name TEXT,
  category TEXT,
  cost_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  low_stock REAL DEFAULT 0,
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  brand TEXT,
  barcode TEXT,
  unit TEXT,
  weight_grams REAL DEFAULT 0,
  dimensions TEXT,
  origin TEXT,
  material TEXT,
  image_url TEXT,
  short_description TEXT,
  key_features TEXT,
  target_audience TEXT,
  seo_keywords TEXT,
  content_status TEXT,
  content_owner TEXT,
  content_note TEXT,
  content_doc_id TEXT,
  content_doc_url TEXT,
  media_folder_id TEXT,
  media_folder_url TEXT,
  image_folder_id TEXT,
  image_folder_url TEXT,
  video_folder_id TEXT,
  video_folder_url TEXT,
  website_product_url TEXT,
  shopee_product_url TEXT,
  tiktok_product_url TEXT,
  facebook_product_url TEXT,
  content_post_links TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_brand ON products(category, brand);

CREATE TABLE IF NOT EXISTS product_options (
  id TEXT PRIMARY KEY,
  type TEXT,
  name TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_options_type_name ON product_options(type, name);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  type TEXT,
  title TEXT,
  product_id TEXT,
  channel TEXT,
  status TEXT,
  priority TEXT,
  due_date TEXT,
  publish_at TEXT,
  template TEXT,
  owner TEXT,
  collaborators TEXT,
  tags TEXT,
  campaign TEXT,
  brief TEXT,
  checklist_json TEXT,
  asset_checklist_json TEXT,
  comment_log_json TEXT,
  prompt_text TEXT,
  target_metric TEXT,
  result_json TEXT,
  note TEXT,
  publish_url TEXT,
  content_doc_id TEXT,
  content_doc_url TEXT,
  media_folder_id TEXT,
  media_folder_url TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_owner_due ON content_items(owner, due_date);
CREATE INDEX IF NOT EXISTS idx_content_items_product ON content_items(product_id);

CREATE TABLE IF NOT EXISTS team_items (
  id TEXT PRIMARY KEY,
  item_type TEXT,
  title TEXT,
  status TEXT,
  owner TEXT,
  reference_type TEXT,
  reference_id TEXT,
  detail_json TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_team_items_type_status ON team_items(item_type, status);
CREATE INDEX IF NOT EXISTS idx_team_items_owner ON team_items(owner);
CREATE INDEX IF NOT EXISTS idx_team_items_reference ON team_items(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS sales_channels (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT,
  type TEXT,
  status TEXT,
  sync_mode TEXT,
  default_price_policy TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_channels_code ON sales_channels(code);

CREATE TABLE IF NOT EXISTS channel_products (
  id TEXT PRIMARY KEY,
  channel_id TEXT,
  product_id TEXT,
  channel_sku TEXT,
  channel_name TEXT,
  channel_price REAL DEFAULT 0,
  channel_stock REAL DEFAULT 0,
  sync_stock TEXT,
  sync_price TEXT,
  status TEXT,
  last_sync_at TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_channel_products_channel ON channel_products(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_products_product ON channel_products(product_id);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  order_id TEXT,
  channel_id TEXT,
  quantity REAL DEFAULT 0,
  status TEXT,
  reason TEXT,
  created_by TEXT,
  created_at TEXT,
  released_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  owner TEXT,
  channels TEXT,
  start_date TEXT,
  end_date TEXT,
  goal TEXT,
  budget REAL DEFAULT 0,
  target_revenue REAL DEFAULT 0,
  target_profit REAL DEFAULT 0,
  note TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE TABLE IF NOT EXISTS workspace_tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT,
  priority TEXT,
  owner TEXT,
  source_type TEXT,
  source_id TEXT,
  product_id TEXT,
  channel_id TEXT,
  campaign_id TEXT,
  due_date TEXT,
  description TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_status_due ON workspace_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_source ON workspace_tasks(source_type, source_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT,
  updated_by TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS incense_wishes (
  id TEXT PRIMARY KEY,
  kind TEXT,
  wish TEXT,
  actor_id TEXT,
  actor_name TEXT,
  actor_email TEXT,
  created_at TEXT,
  offerings TEXT
);
CREATE INDEX IF NOT EXISTS idx_incense_wishes_created ON incense_wishes(created_at);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  "group" TEXT,
  status TEXT,
  total_spent REAL DEFAULT 0,
  last_order_at TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  loyalty_points REAL DEFAULT 0,
  lifetime_points REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  code TEXT,
  customer_id TEXT,
  status TEXT,
  payment_status TEXT,
  payment_method TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total REAL DEFAULT 0,
  note TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  channel TEXT,
  shipping_status TEXT,
  carrier TEXT,
  tracking_code TEXT,
  returned_amount REAL DEFAULT 0,
  refunded_amount REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  loyalty_points_used REAL DEFAULT 0,
  loyalty_discount REAL DEFAULT 0,
  cash_received REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  rounding_amount REAL DEFAULT 0,
  receipt_pdf_url TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status, shipping_status);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  product_id TEXT,
  sku TEXT,
  name TEXT,
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT,
  discount_percent REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  code TEXT,
  order_id TEXT,
  customer_id TEXT,
  amount REAL DEFAULT 0,
  note TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_returns_order ON sales_returns(order_id);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT,
  order_item_id TEXT,
  product_id TEXT,
  sku TEXT,
  name TEXT,
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON sales_return_items(return_id);

CREATE TABLE IF NOT EXISTS order_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  sales_return_id TEXT,
  cash_transaction_id TEXT,
  account_id TEXT,
  category_id TEXT,
  amount REAL DEFAULT 0,
  refund_date TEXT,
  note TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON order_refunds(order_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  sku TEXT,
  product_name TEXT,
  type TEXT,
  quantity_delta REAL DEFAULT 0,
  stock_before REAL DEFAULT 0,
  stock_after REAL DEFAULT 0,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  opening_balance REAL DEFAULT 0,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS accounting_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_accounting_categories_type ON accounting_categories(type, status);

CREATE TABLE IF NOT EXISTS accounting_reconciliations (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  system_balance REAL DEFAULT 0,
  actual_balance REAL DEFAULT 0,
  difference REAL DEFAULT 0,
  note TEXT,
  reconciled_by TEXT,
  reconciled_at TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_accounting_reconciliations_account ON accounting_reconciliations(account_id, reconciled_at);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  tax_code TEXT,
  address TEXT,
  status TEXT,
  total_purchased REAL DEFAULT 0,
  outstanding REAL DEFAULT 0,
  last_purchase_at TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  credit_balance REAL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  code TEXT,
  supplier_id TEXT,
  status TEXT,
  payment_status TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  due_date TEXT,
  invoice_number TEXT,
  note TEXT,
  created_by TEXT,
  received_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  returned_amount REAL DEFAULT 0,
  credit_applied_amount REAL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_code ON purchase_orders(code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT,
  product_id TEXT,
  sku TEXT,
  name TEXT,
  quantity REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT,
  supplier_id TEXT,
  cash_transaction_id TEXT,
  amount REAL DEFAULT 0,
  payment_date TEXT,
  note TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_order ON supplier_payments(purchase_order_id);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  code TEXT,
  purchase_order_id TEXT,
  supplier_id TEXT,
  amount REAL DEFAULT 0,
  note TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_order ON purchase_returns(purchase_order_id);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT,
  purchase_order_item_id TEXT,
  product_id TEXT,
  sku TEXT,
  name TEXT,
  quantity REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return ON purchase_return_items(return_id);

CREATE TABLE IF NOT EXISTS supplier_credit_applications (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  purchase_order_id TEXT,
  amount REAL DEFAULT 0,
  note TEXT,
  created_by TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_supplier_credit_applications_supplier ON supplier_credit_applications(supplier_id);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY,
  type TEXT,
  account_id TEXT,
  category_id TEXT,
  amount REAL DEFAULT 0,
  transaction_date TEXT,
  description TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_by TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account ON cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_transactions(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT,
  description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  actor_id TEXT,
  actor_name TEXT,
  actor_email TEXT,
  detail_json TEXT,
  created_at TEXT,
  timezone TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at)
VALUES ('schema_version', '"2026-07-08-d1-1"', CURRENT_TIMESTAMP);
