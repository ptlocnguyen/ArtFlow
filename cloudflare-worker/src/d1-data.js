const DIRECT_ACTIONS = new Set([
  "listProducts",
  "listCustomers",
  "listOrders",
  "listStockMovements",
  "listUsers",
  "listAuditLogs",
  "me",
  "exportD1Snapshot"
]);

function number(value) {
  return Number(value || 0);
}

export function publicProduct(row) {
  return {
    id: row.id, sku: row.sku, name: row.name, category: row.category,
    brand: row.brand || "", barcode: row.barcode || "", unit: row.unit || "cái",
    weightGrams: number(row.weight_grams), dimensions: row.dimensions || "",
    origin: row.origin || "", material: row.material || "",
    costPrice: number(row.cost_price), salePrice: number(row.sale_price),
    stock: number(row.stock), lowStock: number(row.low_stock),
    imageUrl: row.image_url || "", shortDescription: row.short_description || "",
    keyFeatures: row.key_features || "", targetAudience: row.target_audience || "",
    seoKeywords: row.seo_keywords || "", contentStatus: row.content_status || "not_started",
    contentOwner: row.content_owner || "", contentNote: row.content_note || "",
    websiteProductUrl: row.website_product_url || "", shopeeProductUrl: row.shopee_product_url || "",
    tiktokProductUrl: row.tiktok_product_url || "", facebookProductUrl: row.facebook_product_url || "",
    contentPostLinks: row.content_post_links || "", contentDocId: row.content_doc_id || "",
    contentDocUrl: row.content_doc_url || "", mediaFolderId: row.media_folder_id || "",
    mediaFolderUrl: row.media_folder_url || "", imageFolderId: row.image_folder_id || "",
    imageFolderUrl: row.image_folder_url || "", videoFolderId: row.video_folder_id || "",
    videoFolderUrl: row.video_folder_url || "", status: row.status || "active",
    createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}

export function publicCustomer(row) {
  const totalSpent = number(row.total_spent);
  return {
    id: row.id, name: row.name, phone: row.phone, email: row.email || "",
    group: row.group || "Bán lẻ", status: row.status || "active",
    totalSpent,
    loyaltyPoints: row.loyalty_points === "" || row.loyalty_points == null
      ? Math.floor(totalSpent / 10000)
      : number(row.loyalty_points),
    lifetimePoints: number(row.lifetime_points), lastOrderAt: row.last_order_at || "",
    note: row.note || "", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}

function publicOrderItem(row) {
  return {
    id: row.id, orderId: row.order_id, productId: row.product_id,
    sku: row.sku, name: row.name, quantity: number(row.quantity),
    unitPrice: number(row.unit_price), costPrice: number(row.cost_price),
    discountPercent: number(row.discount_percent), lineTotal: number(row.line_total),
    createdAt: row.created_at || ""
  };
}

function publicOrder(row, items) {
  const total = number(row.total);
  const returnedAmount = number(row.returned_amount);
  return {
    id: row.id, code: row.code, customerId: row.customer_id,
    status: row.status || "pending", paymentStatus: row.payment_status || "unpaid",
    paymentMethod: row.payment_method || "cash", subtotal: number(row.subtotal),
    discount: number(row.discount), discountPercent: number(row.discount_percent),
    loyaltyPointsUsed: number(row.loyalty_points_used), loyaltyDiscount: number(row.loyalty_discount),
    cashReceived: number(row.cash_received), changeAmount: number(row.change_amount),
    roundingAmount: number(row.rounding_amount), shippingFee: number(row.shipping_fee),
    total, returnedAmount, refundedAmount: number(row.refunded_amount),
    netTotal: Math.max(0, total - returnedAmount), note: row.note || "",
    createdBy: row.created_by || "", createdAt: row.created_at || "",
    updatedAt: row.updated_at || "", channel: row.channel || "pos",
    shippingStatus: row.shipping_status || "none", carrier: row.carrier || "",
    trackingCode: row.tracking_code || "", receiptPdfUrl: row.receipt_pdf_url || "",
    items: (items || []).map(publicOrderItem)
  };
}

function publicSalesReturnItem(row) {
  return {
    id: row.id, returnId: row.return_id, orderItemId: row.order_item_id,
    productId: row.product_id, sku: row.sku, name: row.name,
    quantity: number(row.quantity), unitPrice: number(row.unit_price),
    costPrice: number(row.cost_price), discountPercent: number(row.discount_percent),
    lineTotal: number(row.line_total), createdAt: row.created_at || ""
  };
}

export function publicStockMovement(row) {
  return {
    id: row.id, productId: row.product_id, sku: row.sku,
    productName: row.product_name, type: row.type,
    quantityDelta: number(row.quantity_delta), stockBefore: number(row.stock_before),
    stockAfter: number(row.stock_after), reason: row.reason || "",
    referenceType: row.reference_type || "", referenceId: row.reference_id || "",
    createdBy: row.created_by || "", createdAt: row.created_at || ""
  };
}

export async function requireSession(db, token) {
  if (!token) return null;
  return db.prepare(
    `SELECT id, name, email, role, status, session_expires_at
     FROM users
     WHERE session_token = ? AND status = 'active'
       AND session_expires_at IS NOT NULL
       AND datetime(session_expires_at) >= datetime('now')
     LIMIT 1`
  ).bind(String(token)).first();
}

async function listProducts(db) {
  const [products, options, owners] = await Promise.all([
    db.prepare("SELECT * FROM products WHERE status <> 'deleted' ORDER BY name COLLATE NOCASE").all(),
    db.prepare("SELECT * FROM product_options WHERE status <> 'deleted' ORDER BY type, name COLLATE NOCASE").all(),
    db.prepare("SELECT id, name, email FROM users WHERE status = 'active' ORDER BY name COLLATE NOCASE").all()
  ]);
  return {
    ok: true,
    products: products.results.map(publicProduct),
    productOptions: options.results.map(row => ({
      id: row.id, type: row.type, name: row.name, status: row.status || "active",
      createdAt: row.created_at || "", updatedAt: row.updated_at || ""
    })),
    contentOwners: owners.results
  };
}

async function listCustomers(db) {
  const result = await db.prepare(
    "SELECT * FROM customers WHERE status <> 'deleted' ORDER BY name COLLATE NOCASE"
  ).all();
  return { ok: true, customers: result.results.map(publicCustomer) };
}

export async function listOrders(db) {
  const [orders, items, returns, returnItems, refunds] = await Promise.all([
    db.prepare("SELECT * FROM orders WHERE status <> 'deleted' ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM order_items ORDER BY created_at").all(),
    db.prepare("SELECT * FROM sales_returns ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM sales_return_items ORDER BY created_at").all(),
    db.prepare("SELECT * FROM order_refunds ORDER BY COALESCE(refund_date, created_at) DESC").all()
  ]);
  const itemsByOrder = groupBy(items.results, row => row.order_id);
  const itemsByReturn = groupBy(returnItems.results, row => row.return_id);
  return {
    ok: true,
    orders: orders.results.map(row => publicOrder(row, itemsByOrder[row.id] || [])),
    salesReturns: returns.results.map(row => ({
      id: row.id, code: row.code, orderId: row.order_id, customerId: row.customer_id,
      amount: number(row.amount), note: row.note || "", createdBy: row.created_by || "",
      createdAt: row.created_at || "",
      items: (itemsByReturn[row.id] || []).map(publicSalesReturnItem)
    })),
    orderRefunds: refunds.results.map(row => ({
      id: row.id, orderId: row.order_id, salesReturnId: row.sales_return_id || "",
      cashTransactionId: row.cash_transaction_id, accountId: row.account_id,
      categoryId: row.category_id, amount: number(row.amount),
      refundDate: row.refund_date || "", note: row.note || "",
      createdBy: row.created_by || "", createdAt: row.created_at || ""
    }))
  };
}

async function listStockMovements(db) {
  const result = await db.prepare("SELECT * FROM stock_movements ORDER BY created_at DESC").all();
  return { ok: true, movements: result.results.map(publicStockMovement) };
}

async function listUsers(db, user) {
  if (user.role !== "admin") return { ok: false, error: "Admin access required" };
  const rows = (await db.prepare(
    "SELECT id,name,email,role,status,last_login_at FROM users WHERE status<>'deleted' ORDER BY name COLLATE NOCASE"
  ).all()).results;
  return { ok: true, users: rows.map(row => ({
    id: row.id, name: row.name, email: row.email, role: row.role,
    status: row.status, lastLoginAt: row.last_login_at || ""
  })) };
}

async function listAuditLogs(db, user, payload) {
  if (user.role !== "admin") return { ok: false, error: "Admin access required" };
  const limit = Math.min(1000, Math.max(1, Number(payload.limit || 500)));
  const [logResult, health, unresolvedResult] = await db.batch([
    db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?").bind(limit),
    db.prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         MAX(completed_at) AS last_completed_at
       FROM audit_events`
    ),
    db.prepare(
      `SELECT * FROM audit_events
       WHERE status IN ('pending','failed')
       ORDER BY created_at DESC LIMIT 100`
    )
  ]);
  const unresolved = unresolvedResult.results.map(row => ({
    id: row.request_id,
    action: row.action,
    description: row.status === "pending" ? `${row.action} (đang xác minh)` : `${row.action} (cần kiểm tra)`,
    entity_type: row.entity_type || "system",
    entity_id: row.entity_id || "",
    actor_id: row.actor_id || "",
    actor_name: row.actor_name || "System",
    actor_email: row.actor_email || "",
    detail_json: JSON.stringify({
      auditStatus: row.status,
      request: parseJson(row.request_json, {}),
      result: parseJson(row.result_json, {}),
      error: row.error_text || ""
    }),
    created_at: row.created_at,
    timezone: "Asia/Ho_Chi_Minh"
  }));
  const rows = [...logResult.results, ...unresolved]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
  const status = health.results[0] || {};
  return { ok: true, auditHealth: {
    pending: number(status.pending),
    failed: number(status.failed),
    lastCompletedAt: status.last_completed_at || ""
  }, logs: rows.map(row => ({
    id: row.id, action: row.action, description: row.description || row.action,
    entityType: row.entity_type || "", entityId: row.entity_id || "",
    actorId: row.actor_id || "", actorName: row.actor_name || "System",
    actorEmail: row.actor_email || "", detail: parseJson(row.detail_json, {}),
    createdAt: row.created_at || "", timezone: row.timezone || "Asia/Ho_Chi_Minh"
  })) };
}

const SNAPSHOT_TABLES = [
  "users", "products", "product_options", "content_items", "team_items",
  "sales_channels", "channel_products", "inventory_reservations", "campaigns",
  "workspace_tasks", "app_settings", "incense_wishes", "customers", "orders",
  "order_items", "sales_returns", "sales_return_items", "order_refunds",
  "stock_movements", "accounting_accounts", "accounting_categories",
  "accounting_reconciliations", "platform_payouts", "platform_payout_items", "suppliers", "purchase_orders",
  "purchase_order_items", "supplier_payments", "purchase_returns",
  "purchase_return_items", "supplier_credit_applications", "cash_transactions",
  "audit_logs", "audit_events"
];

async function exportSnapshot(db, user) {
  if (user.role !== "admin") return { ok: false, error: "Admin access required" };
  const tables = {};
  for (const table of SNAPSHOT_TABLES) {
    const rows = (await db.prepare(`SELECT * FROM ${table}`).all()).results;
    if (table === "users") {
      rows.forEach(row => {
        delete row.password_hash;
        delete row.salt;
        delete row.session_token;
        delete row.session_expires_at;
        delete row.d1_verified_at;
      });
    }
    tables[table] = rows;
  }
  return {
    ok: true,
    snapshot: {
      schemaVersion: "2026-07-09-d1-4",
      exportedAt: new Date().toISOString(),
      tables
    }
  };
}

function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function groupBy(values, keyForValue) {
  return values.reduce((groups, value) => {
    const key = keyForValue(value);
    if (!groups[key]) groups[key] = [];
    groups[key].push(value);
    return groups;
  }, {});
}

export async function readDirectD1(env, payload, options = {}) {
  if (!env.DB) return null;
  const user = await requireSession(env.DB, payload.token);
  if (!user) {
    // Business reads belong to D1, so an invalid session is a real D1
    // response rather than a reason to fall through to legacy Sheets.
    // Identity reads remain eligible for the Apps Script owner.
    const businessRead = payload.action === "getPageData" ||
      (DIRECT_ACTIONS.has(payload.action) && !["me", "listUsers"].includes(payload.action));
    return businessRead
      ? { ok: false, error: "Invalid session", code: "invalid_session", dataSource: "d1" }
      : null;
  }
  const handlers = {
    listProducts, listCustomers, listOrders, listStockMovements,
    listUsers: (db, current) => listUsers(db, current),
    listAuditLogs: (db, current) => listAuditLogs(db, current, payload),
    exportD1Snapshot: (db, current) => exportSnapshot(db, current),
    me: async (db, current) => ({ ok: true, user: {
      id: current.id, name: current.name, email: current.email,
      role: current.role, status: current.status
    } })
  };
  if (payload.action === "getPageData") {
    let rawScopes = payload.scopes || [];
    if (!Array.isArray(rawScopes)) {
      try {
        rawScopes = JSON.parse(String(rawScopes));
      } catch {
        rawScopes = String(rawScopes).split(",");
      }
    }
    const scopeActions = {
      products: "listProducts",
      customers: "listCustomers",
      orders: "listOrders",
      stockMovements: "listStockMovements"
    };
    const requested = rawScopes.map(value => String(value).trim()).filter(Boolean);
    if (!requested.length || requested.some(scope => !scopeActions[scope])) return null;
    const actions = requested.map(scope => scopeActions[scope]);
    const results = await Promise.all(actions.map(action => handlers[action](env.DB)));
    return results.reduce((output, result) => Object.assign(output, result), { ok: true });
  }
  if (!DIRECT_ACTIONS.has(payload.action)) return null;
  return handlers[payload.action](env.DB, user);
}

export async function syncIdentityToD1(env, payload, response) {
  if (!env.DB) return;
  if (payload.action === "logout" && payload.token) {
    await env.DB.prepare(
      "UPDATE users SET session_token = '', session_expires_at = '', d1_verified_at = NULL WHERE session_token = ?"
    ).bind(String(payload.token)).run();
    return;
  }
  if (payload.action === "deleteUser" && payload.id) {
    await env.DB.prepare(
      "UPDATE users SET status = 'deleted', session_token = '', session_expires_at = '', d1_verified_at = NULL WHERE id = ?"
    ).bind(String(payload.id)).run();
    return;
  }
  if (!response || !response.ok || !response.user || !response.user.id) return;
  const user = response.user;
  const isLogin = ["login", "setupAdmin"].includes(payload.action) && response.token;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, role, status, session_token, session_expires_at, last_login_at, d1_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       role = excluded.role,
       status = excluded.status,
       session_token = CASE
         WHEN excluded.status <> 'active' THEN ''
         WHEN excluded.session_token <> '' THEN excluded.session_token
         ELSE users.session_token
       END,
       session_expires_at = CASE
         WHEN excluded.status <> 'active' THEN ''
         WHEN excluded.session_expires_at <> '' THEN excluded.session_expires_at
         ELSE users.session_expires_at
       END,
       last_login_at = COALESCE(NULLIF(excluded.last_login_at, ''), users.last_login_at),
       d1_verified_at = CASE
         WHEN excluded.status <> 'active' THEN NULL
         WHEN excluded.d1_verified_at IS NOT NULL THEN excluded.d1_verified_at
         ELSE users.d1_verified_at
       END`
  ).bind(
    String(user.id),
    user.name || "",
    user.email || "",
    user.role || "",
    user.status || "active",
    isLogin ? String(response.token) : "",
    isLogin ? expiresAt : "",
    user.lastLoginAt || "",
    isLogin ? new Date().toISOString() : null
  ).run();
}

export async function recordSessionValidation(env, payload, response) {
  if (!env.DB || !payload.token || !response) return;
  const error = String(response.error || "").toLowerCase();
  if (response.ok === false && /invalid session|session expired|unauthenticated/.test(error)) {
    await env.DB.prepare(
      "UPDATE users SET session_token = '', session_expires_at = '', d1_verified_at = NULL WHERE session_token = ?"
    ).bind(String(payload.token)).run();
    return;
  }
  if (response.ok !== false) {
    await env.DB.prepare(
      "UPDATE users SET d1_verified_at = datetime('now') WHERE session_token = ? AND status = 'active'"
    ).bind(String(payload.token)).run();
  }
}
