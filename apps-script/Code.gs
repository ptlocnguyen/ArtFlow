const SPREADSHEET_ID = "1L6b0QGzti33SVadVMKG2AnlsIKHjg98mNhuU3gJSd18";
const SESSION_DAYS = 14;
const USER_CACHE_SECONDS = 300;
const HASH_ROUNDS = 12000;
const DATABASE_SCHEMA_VERSION = "2026-07-01-content-team-1";
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

let databaseReady = false;
let spreadsheetCache = null;
const sheetCache = {};
let requestAuditContext = null;

const SHEETS = {
  users: [
    "id",
    "name",
    "email",
    "password_hash",
    "salt",
    "role",
    "status",
    "session_token",
    "session_expires_at",
    "created_at",
    "updated_at",
    "last_login_at"
  ],
  products: [
    "id",
    "sku",
    "name",
    "category",
    "cost_price",
    "sale_price",
    "stock",
    "low_stock",
    "status",
    "created_at",
    "updated_at",
    "brand",
    "barcode",
    "unit",
    "weight_grams",
    "dimensions",
    "origin",
    "material",
    "image_url",
    "short_description",
    "key_features",
    "target_audience",
    "seo_keywords",
    "content_status",
    "content_owner",
    "content_note",
    "content_doc_id",
    "content_doc_url",
    "media_folder_id",
    "media_folder_url",
    "image_folder_id",
    "image_folder_url",
    "video_folder_id",
    "video_folder_url",
    "website_product_url",
    "shopee_product_url",
    "tiktok_product_url",
    "facebook_product_url",
    "content_post_links"
  ],
  product_options: [
    "id",
    "type",
    "name",
    "status",
    "created_at",
    "updated_at"
  ],
  content_items: [
    "id",
    "type",
    "title",
    "product_id",
    "channel",
    "status",
    "priority",
    "due_date",
    "publish_at",
    "template",
    "owner",
    "collaborators",
    "tags",
    "campaign",
    "brief",
    "checklist_json",
    "asset_checklist_json",
    "comment_log_json",
    "prompt_text",
    "target_metric",
    "result_json",
    "note",
    "publish_url",
    "content_doc_id",
    "content_doc_url",
    "media_folder_id",
    "media_folder_url",
    "created_by",
    "created_at",
    "updated_at"
  ],
  team_items: [
    "id",
    "item_type",
    "title",
    "status",
    "owner",
    "reference_type",
    "reference_id",
    "detail_json",
    "created_by",
    "created_at",
    "updated_at"
  ],
  app_settings: [
    "key",
    "value_json",
    "updated_by",
    "updated_at"
  ],
  customers: [
    "id",
    "name",
    "phone",
    "email",
    "group",
    "status",
    "total_spent",
    "last_order_at",
    "note",
    "created_at",
    "updated_at",
    "loyalty_points",
    "lifetime_points"
  ],
  orders: [
    "id",
    "code",
    "customer_id",
    "status",
    "payment_status",
    "payment_method",
    "subtotal",
    "discount",
    "shipping_fee",
    "total",
    "note",
    "created_by",
    "created_at",
    "updated_at",
    "channel",
    "shipping_status",
    "carrier",
    "tracking_code",
    "returned_amount",
    "refunded_amount",
    "discount_percent",
    "loyalty_points_used",
    "loyalty_discount",
    "cash_received",
    "change_amount",
    "rounding_amount",
    "receipt_pdf_url"
  ],
  order_items: [
    "id",
    "order_id",
    "product_id",
    "sku",
    "name",
    "quantity",
    "unit_price",
    "cost_price",
    "line_total",
    "created_at",
    "discount_percent"
  ],
  sales_returns: [
    "id",
    "code",
    "order_id",
    "customer_id",
    "amount",
    "note",
    "created_by",
    "created_at"
  ],
  sales_return_items: [
    "id",
    "return_id",
    "order_item_id",
    "product_id",
    "sku",
    "name",
    "quantity",
    "unit_price",
    "cost_price",
    "line_total",
    "created_at"
  ],
  order_refunds: [
    "id",
    "order_id",
    "sales_return_id",
    "cash_transaction_id",
    "account_id",
    "category_id",
    "amount",
    "refund_date",
    "note",
    "created_by",
    "created_at"
  ],
  stock_movements: [
    "id",
    "product_id",
    "sku",
    "product_name",
    "type",
    "quantity_delta",
    "stock_before",
    "stock_after",
    "reason",
    "reference_type",
    "reference_id",
    "created_by",
    "created_at"
  ],
  accounting_accounts: [
    "id",
    "name",
    "type",
    "opening_balance",
    "status",
    "created_at",
    "updated_at"
  ],
  accounting_categories: [
    "id",
    "name",
    "type",
    "status",
    "created_at",
    "updated_at"
  ],
  accounting_reconciliations: [
    "id",
    "account_id",
    "system_balance",
    "actual_balance",
    "difference",
    "note",
    "reconciled_by",
    "reconciled_at",
    "created_at"
  ],
  suppliers: [
    "id",
    "code",
    "name",
    "phone",
    "email",
    "tax_code",
    "address",
    "status",
    "total_purchased",
    "outstanding",
    "last_purchase_at",
    "note",
    "created_at",
    "updated_at",
    "credit_balance"
  ],
  purchase_orders: [
    "id",
    "code",
    "supplier_id",
    "status",
    "payment_status",
    "subtotal",
    "discount",
    "shipping_fee",
    "total",
    "paid_amount",
    "due_date",
    "invoice_number",
    "note",
    "created_by",
    "received_at",
    "created_at",
    "updated_at",
    "returned_amount",
    "credit_applied_amount"
  ],
  purchase_order_items: [
    "id",
    "purchase_order_id",
    "product_id",
    "sku",
    "name",
    "quantity",
    "unit_cost",
    "line_total",
    "created_at"
  ],
  supplier_payments: [
    "id",
    "purchase_order_id",
    "supplier_id",
    "cash_transaction_id",
    "amount",
    "payment_date",
    "note",
    "created_by",
    "created_at"
  ],
  purchase_returns: [
    "id",
    "code",
    "purchase_order_id",
    "supplier_id",
    "amount",
    "note",
    "created_by",
    "created_at"
  ],
  purchase_return_items: [
    "id",
    "return_id",
    "purchase_order_item_id",
    "product_id",
    "sku",
    "name",
    "quantity",
    "unit_cost",
    "line_total",
    "created_at"
  ],
  supplier_credit_applications: [
    "id",
    "supplier_id",
    "purchase_order_id",
    "amount",
    "note",
    "created_by",
    "created_at"
  ],
  cash_transactions: [
    "id",
    "type",
    "account_id",
    "category_id",
    "amount",
    "transaction_date",
    "description",
    "reference_type",
    "reference_id",
    "created_by",
    "status",
    "created_at",
    "updated_at"
  ],
  audit_logs: [
    "id",
    "action",
    "description",
    "entity_type",
    "entity_id",
    "actor_id",
    "actor_name",
    "actor_email",
    "detail_json",
    "created_at",
    "timezone"
  ]
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    setupDatabase();

    const body = parseBody(e);
    const action = body.action || "";
    requestAuditContext = buildAuditContext(action, body);

    switch (action) {
      case "bootstrapStatus":
        return json(bootstrapStatus());
      case "setupAdmin":
        return json(setupAdmin(body));
      case "login":
        return json(loginUser(body));
      case "me":
        return json(getCurrentUser(body));
      case "logout":
        return json(logoutUser(body));
      case "listUsers":
        return json(listUsers(body));
      case "createUser":
        return json(createUser(body));
      case "toggleUser":
        return json(toggleUser(body));
      case "deleteUser":
        return json(deleteUser(body));
      case "listAuditLogs":
        return json(listAuditLogs(body));
      case "listProducts":
        return json(listProducts(body));
      case "createProduct":
        return json(createProduct(body));
      case "updateProduct":
        return json(updateProduct(body));
      case "archiveProduct":
        return json(archiveProduct(body));
      case "createProductOption":
        return json(createProductOption(body));
      case "updateProductOption":
        return json(updateProductOption(body));
      case "toggleProductOption":
        return json(toggleProductOption(body));
      case "getContentWorkspaceData":
        return json(getContentWorkspaceData(body));
      case "createContentItem":
        return json(createContentItem(body));
      case "updateContentItem":
        return json(updateContentItem(body));
      case "archiveContentItem":
        return json(archiveContentItem(body));
      case "provisionContentItemAssets":
        return json(provisionContentItemAssets(body));
      case "getTeamWorkspaceData":
        return json(getTeamWorkspaceData(body));
      case "createTeamItem":
        return json(createTeamItem(body));
      case "updateTeamItem":
        return json(updateTeamItem(body));
      case "archiveTeamItem":
        return json(archiveTeamItem(body));
      case "getAppSettings":
        return json(getAppSettings(body));
      case "updateAppSettings":
        return json(updateAppSettings(body));
      case "importProducts":
        return json(importProducts(body));
      case "provisionProductContent":
        return json(provisionProductContent(body));
      case "provisionMissingProductContent":
        return json(provisionMissingProductContent(body));
      case "testProductContentConfiguration":
        return json(testProductContentConfiguration(body));
      case "listCustomers":
        return json(listCustomers(body));
      case "createCustomer":
        return json(createCustomer(body));
      case "updateCustomer":
        return json(updateCustomer(body));
      case "archiveCustomer":
        return json(archiveCustomer(body));
      case "importCustomers":
        return json(importCustomers(body));
      case "listOrders":
        return json(listOrders(body));
      case "createOrder":
        return json(createOrder(body));
      case "createOrderReceiptPdf":
        return json(createOrderReceiptPdf(body));
      case "updateOrderStatus":
        return json(updateOrderStatus(body));
      case "updateOrderFulfillment":
        return json(updateOrderFulfillment(body));
      case "cancelOrder":
        return json(cancelOrder(body));
      case "returnOrder":
        return json(returnOrder(body));
      case "refundOrder":
        return json(refundOrder(body));
      case "listStockMovements":
        return json(listStockMovements(body));
      case "receiveStock":
        return json(receiveStock(body));
      case "adjustStock":
        return json(adjustStock(body));
      case "getPageData":
        return json(getPageData(body));
      case "getAccountingData":
        return json(getAccountingData(body));
      case "createCashTransaction":
        return json(createCashTransaction(body));
      case "archiveCashTransaction":
        return json(archiveCashTransaction(body));
      case "createAccountingAccount":
        return json(createAccountingAccount(body));
      case "updateAccountingAccount":
        return json(updateAccountingAccount(body));
      case "archiveAccountingAccount":
        return json(archiveAccountingAccount(body));
      case "createAccountingReconciliation":
        return json(createAccountingReconciliation(body));
      case "createAccountingCategory":
        return json(createAccountingCategory(body));
      case "updateAccountingCategory":
        return json(updateAccountingCategory(body));
      case "archiveAccountingCategory":
        return json(archiveAccountingCategory(body));
      case "getPurchasingData":
        return json(getPurchasingData(body));
      case "createSupplier":
        return json(createSupplier(body));
      case "updateSupplier":
        return json(updateSupplier(body));
      case "archiveSupplier":
        return json(archiveSupplier(body));
      case "createPurchaseOrder":
        return json(createPurchaseOrder(body));
      case "updatePurchaseOrder":
        return json(updatePurchaseOrder(body));
      case "receivePurchaseOrder":
        return json(receivePurchaseOrder(body));
      case "payPurchaseOrder":
        return json(payPurchaseOrder(body));
      case "cancelPurchaseOrder":
        return json(cancelPurchaseOrder(body));
      case "returnPurchaseOrder":
        return json(returnPurchaseOrder(body));
      case "applySupplierCredit":
        return json(applySupplierCredit(body));
      default:
        return json({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return json({ ok: false, error: err.message || String(err) });
  }
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return (e && e.parameter) ? e.parameter : {};
}

function json(payload) {
  const auditContext = requestAuditContext;
  requestAuditContext = null;
  if (auditContext && payload && payload.ok) {
    try {
      recordAuditLog(auditContext, payload);
    } catch (error) {
      console.error("Audit log write failed: " + (error.message || String(error)));
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function auditActionMetadata(action) {
  return {
    setupAdmin: ["Thiết lập tài khoản quản trị", "user"],
    login: ["Đăng nhập hệ thống", "session"],
    logout: ["Đăng xuất hệ thống", "session"],
    createUser: ["Tạo tài khoản nhân viên", "user"],
    toggleUser: ["Đổi trạng thái tài khoản nhân viên", "user"],
    deleteUser: ["Xóa tài khoản nhân viên", "user"],
    createProduct: ["Tạo sản phẩm", "product"],
    updateProduct: ["Cập nhật sản phẩm", "product"],
    archiveProduct: ["Đổi trạng thái sản phẩm", "product"],
    createProductOption: ["Tạo thuộc tính sản phẩm", "product_option"],
    updateProductOption: ["Đổi tên thuộc tính sản phẩm", "product_option"],
    toggleProductOption: ["Đổi trạng thái thuộc tính sản phẩm", "product_option"],
    createContentItem: ["Tạo chủ đề content", "content_item"],
    updateContentItem: ["Cập nhật chủ đề content", "content_item"],
    archiveContentItem: ["Ẩn chủ đề content", "content_item"],
    provisionContentItemAssets: ["Tạo tài nguyên content", "content_item"],
    importProducts: ["Nhập sản phẩm từ file", "product_import"],
    provisionProductContent: ["Tạo tài nguyên content sản phẩm", "product"],
    provisionMissingProductContent: ["Tạo hàng loạt tài nguyên content sản phẩm", "product_content_batch"],
    testProductContentConfiguration: ["Kiểm tra kết nối Drive content", "product_content_setup"],
    createCustomer: ["Tạo khách hàng", "customer"],
    updateCustomer: ["Cập nhật khách hàng", "customer"],
    archiveCustomer: ["Đổi trạng thái khách hàng", "customer"],
    importCustomers: ["Nhập khách hàng từ file", "customer_import"],
    createOrder: ["Tạo đơn hàng", "order"],
    createOrderReceiptPdf: ["Tạo PDF hóa đơn", "order_receipt"],
    updateOrderStatus: ["Cập nhật trạng thái đơn hàng", "order"],
    updateOrderFulfillment: ["Cập nhật giao hàng", "order"],
    cancelOrder: ["Hủy đơn hàng", "order"],
    returnOrder: ["Ghi nhận khách trả hàng", "sales_return"],
    refundOrder: ["Hoàn tiền đơn hàng", "order_refund"],
    receiveStock: ["Nhập kho thủ công", "stock_movement"],
    adjustStock: ["Điều chỉnh tồn kho", "stock_movement"],
    createCashTransaction: ["Ghi giao dịch thu chi", "cash_transaction"],
    archiveCashTransaction: ["Xóa giao dịch thu chi", "cash_transaction"],
    createAccountingAccount: ["Tạo tài khoản tiền", "accounting_account"],
    updateAccountingAccount: ["Cập nhật tài khoản tiền", "accounting_account"],
    archiveAccountingAccount: ["Đổi trạng thái tài khoản tiền", "accounting_account"],
    createAccountingReconciliation: ["Đối soát tài khoản tiền", "reconciliation"],
    createAccountingCategory: ["Tạo danh mục thu chi", "accounting_category"],
    updateAccountingCategory: ["Cập nhật danh mục thu chi", "accounting_category"],
    archiveAccountingCategory: ["Đổi trạng thái danh mục thu chi", "accounting_category"],
    createSupplier: ["Tạo nhà cung cấp", "supplier"],
    updateSupplier: ["Cập nhật nhà cung cấp", "supplier"],
    archiveSupplier: ["Đổi trạng thái nhà cung cấp", "supplier"],
    createPurchaseOrder: ["Tạo phiếu mua hàng", "purchase_order"],
    updatePurchaseOrder: ["Cập nhật phiếu mua hàng", "purchase_order"],
    receivePurchaseOrder: ["Nhận hàng phiếu mua", "purchase_order"],
    payPurchaseOrder: ["Thanh toán phiếu mua", "supplier_payment"],
    cancelPurchaseOrder: ["Hủy phiếu mua hàng", "purchase_order"],
    returnPurchaseOrder: ["Trả hàng nhà cung cấp", "purchase_return"],
    applySupplierCredit: ["Bù trừ dư có nhà cung cấp", "supplier_credit"]
  }[action] || null;
}

function buildAuditContext(action, body) {
  const metadata = auditActionMetadata(action);
  if (!metadata) return null;
  const token = String(body.token || "");
  let actor = null;
  if (token && action !== "login" && action !== "setupAdmin") {
    actor = readRows("users").find(function (user) {
      return user.session_token === token && user.status === "active";
    }) || null;
  }
  return {
    action: action,
    description: metadata[0],
    entityType: metadata[1],
    body: body,
    actor: actor,
    before: auditBeforeSnapshot(action, body)
  };
}

function auditBeforeSnapshot(action, body) {
  const sources = {
    toggleUser: ["users", "id"], deleteUser: ["users", "id"],
    updateProduct: ["products", "id"], archiveProduct: ["products", "id"], provisionProductContent: ["products", "id"],
    updateProductOption: ["product_options", "id"], toggleProductOption: ["product_options", "id"],
    updateContentItem: ["content_items", "id"], archiveContentItem: ["content_items", "id"], provisionContentItemAssets: ["content_items", "id"],
    updateCustomer: ["customers", "id"], archiveCustomer: ["customers", "id"],
    updateOrderStatus: ["orders", "id"], updateOrderFulfillment: ["orders", "id"], cancelOrder: ["orders", "id"],
    returnOrder: ["orders", "orderId"], refundOrder: ["orders", "orderId"],
    receiveStock: ["products", "productId"], adjustStock: ["products", "productId"],
    archiveCashTransaction: ["cash_transactions", "id"],
    updateAccountingAccount: ["accounting_accounts", "id"], archiveAccountingAccount: ["accounting_accounts", "id"],
    updateAccountingCategory: ["accounting_categories", "id"], archiveAccountingCategory: ["accounting_categories", "id"],
    updateSupplier: ["suppliers", "id"], archiveSupplier: ["suppliers", "id"],
    updatePurchaseOrder: ["purchase_orders", "id"], receivePurchaseOrder: ["purchase_orders", "id"],
    payPurchaseOrder: ["purchase_orders", "id"], cancelPurchaseOrder: ["purchase_orders", "id"],
    returnPurchaseOrder: ["purchase_orders", "purchaseOrderId"], applySupplierCredit: ["purchase_orders", "purchaseOrderId"]
  };
  const source = sources[action];
  if (!source) return null;
  const key = source[1];
  const id = String(body[key] || body.id || body.order_id || body.product_id || body.purchase_order_id || "");
  if (!id) return null;
  return readRows(source[0]).find(function (item) { return String(item.id) === id; }) || null;
}

function sanitizeAuditValue(value, depth) {
  if (depth > 4) return "[depth limited]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map(function (item) {
      return sanitizeAuditValue(item, depth + 1);
    });
    if (value.length > 20) items.push("[" + (value.length - 20) + " more items]");
    return items;
  }
  if (typeof value === "object") {
    const output = {};
    Object.keys(value).slice(0, 40).forEach(function (key) {
      if (/^_|token|password|hash|salt|session/i.test(key)) return;
      output[key] = sanitizeAuditValue(value[key], depth + 1);
    });
    return output;
  }
  if (typeof value === "string" && value.length > 2000) return value.slice(0, 2000) + "...[truncated]";
  return value;
}

function auditEntityId(context, payload) {
  const preferredByAction = {
    returnOrder: "salesReturn",
    refundOrder: "refund",
    receiveStock: "movement",
    adjustStock: "movement",
    payPurchaseOrder: "payment",
    returnPurchaseOrder: "purchaseReturn",
    applySupplierCredit: "creditApplication"
  };
  const preferred = preferredByAction[context.action];
  if (preferred && payload[preferred] && payload[preferred].id) return String(payload[preferred].id);
  const resultKeys = [
    "user", "product", "option", "contentItem", "customer", "order", "salesReturn", "refund", "movement",
    "transaction", "account", "category", "reconciliation", "supplier", "purchaseOrder",
    "purchaseReturn", "payment", "creditApplication"
  ];
  for (let i = 0; i < resultKeys.length; i += 1) {
    const value = payload[resultKeys[i]];
    if (value && value.id) return String(value.id);
  }
  if (context.action === "importProducts" || context.action === "importCustomers") {
    return "created:" + Number(payload.created || 0) + ",updated:" + Number(payload.updated || 0);
  }
  return String(context.body.id || context.body.productId || context.body.customerId || context.body.orderId || context.body.purchaseOrderId || "");
}

function recordAuditLog(context, payload) {
  const actor = context.actor || payload.user || null;
  const details = {
    before: sanitizeAuditValue(context.before, 0),
    request: sanitizeAuditValue(context.body, 0),
    result: sanitizeAuditValue(payload, 0)
  };
  let detailJson = JSON.stringify(details);
  if (detailJson.length > 45000) {
    detailJson = JSON.stringify({ truncated: true, action: context.action, description: context.description });
  }
  appendRow("audit_logs", {
    id: Utilities.getUuid(),
    action: context.action,
    description: context.description,
    entity_type: context.entityType,
    entity_id: auditEntityId(context, payload),
    actor_id: actor ? actor.id : "",
    actor_name: actor ? actor.name : "System",
    actor_email: actor ? actor.email : "",
    detail_json: detailJson,
    created_at: nowIso(),
    timezone: "Asia/Ho_Chi_Minh"
  });
}

function publicAuditLog(log) {
  let detail = {};
  try {
    detail = log.detail_json ? JSON.parse(log.detail_json) : {};
  } catch (error) {
    detail = { raw: String(log.detail_json || "") };
  }
  return {
    id: log.id,
    action: log.action,
    description: log.description || log.action,
    entityType: log.entity_type || "",
    entityId: log.entity_id || "",
    actorId: log.actor_id || "",
    actorName: log.actor_name || "System",
    actorEmail: log.actor_email || "",
    detail: detail,
    createdAt: log.created_at || "",
    timezone: log.timezone || "Asia/Ho_Chi_Minh"
  };
}

function listAuditLogs(body) {
  requireAdmin(body.token);
  const limit = Math.min(1000, Math.max(1, Number(body.limit || 500)));
  const logs = readRows("audit_logs")
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .slice(0, limit)
    .map(publicAuditLog);
  return { ok: true, logs: logs };
}

function setupDatabase() {
  if (databaseReady) return;

  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty("database_schema_version") === DATABASE_SCHEMA_VERSION) {
    databaseReady = true;
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (properties.getProperty("database_schema_version") === DATABASE_SCHEMA_VERSION) {
      databaseReady = true;
      return;
    }

    const ss = getSpreadsheet();

    Object.keys(SHEETS).forEach(function (name) {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        sheet.appendRow(SHEETS[name]);
        sheet.setFrozenRows(1);
      } else {
        ensureHeaders(sheet, SHEETS[name]);
      }
      sheetCache[name] = sheet;
    });

    ensureAccountingDefaults();
    ensureProductOptionDefaults();
    properties.setProperty("database_schema_version", DATABASE_SCHEMA_VERSION);
    databaseReady = true;
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("PASTE_") === 0) {
    throw new Error("Missing SPREADSHEET_ID in Apps Script");
  }

  if (!spreadsheetCache) {
    spreadsheetCache = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return spreadsheetCache;
}

function getSheet(name) {
  if (!sheetCache[name]) {
    sheetCache[name] = getSpreadsheet().getSheetByName(name);
    if (!sheetCache[name] && SHEETS[name]) {
      sheetCache[name] = getSpreadsheet().insertSheet(name);
      sheetCache[name].appendRow(SHEETS[name]);
      sheetCache[name].setFrozenRows(1);
    }
  }

  if (!sheetCache[name]) throw new Error("Sheet not found: " + name);
  return sheetCache[name];
}

function ensureHeaders(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  let changed = false;

  expectedHeaders.forEach(function (header, index) {
    if (currentHeaders[index] !== header) {
      currentHeaders[index] = header;
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }

  if (sheet.getFrozenRows() < 1) {
    sheet.setFrozenRows(1);
  }
}

function readRows(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];

  return values
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "";
      });
    })
    .map(function (row, index) {
      const obj = { _row: index + 2 };
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });
}

function appendRow(name, obj) {
  const sheet = getSheet(name);
  const headers = SHEETS[name];
  const values = headers.map(function (key) {
    return obj[key] === undefined ? "" : obj[key];
  });
  sheet.appendRow(values);
}

function updateRow(name, rowNumber, patch) {
  const sheet = getSheet(name);
  const headers = SHEETS[name];
  const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  headers.forEach(function (key, i) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      existing[i] = patch[key];
    }
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([existing]);
}

function deleteRows(name, rowNumbers) {
  const sheet = getSheet(name);
  rowNumbers
    .map(function (rowNumber) { return Number(rowNumber); })
    .filter(function (rowNumber) { return rowNumber >= 2; })
    .sort(function (a, b) { return b - a; })
    .forEach(function (rowNumber) {
      sheet.deleteRow(rowNumber);
    });
}

function publicAppSettings() {
  const settings = {};
  readRows("app_settings").forEach(function (row) {
    const key = String(row.key || "").trim();
    if (!key) return;
    try {
      settings[key] = row.value_json ? JSON.parse(row.value_json) : null;
    } catch (error) {
      settings[key] = row.value_json || "";
    }
  });
  return settings;
}

function getAppSettings(body) {
  requireUser(body.token);
  return { ok: true, settings: publicAppSettings() };
}

function updateAppSettings(body) {
  const user = requireUser(body.token);
  const key = String(body.key || "").trim();
  if (!key || !/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) {
    return { ok: false, error: "Setting key is invalid" };
  }

  const value = Object.prototype.hasOwnProperty.call(body, "value") ? body.value : {};
  let valueJson = JSON.stringify(value);
  if (valueJson.length > 45000) {
    return { ok: false, error: "Setting value is too large" };
  }

  const now = nowIso();
  const existing = readRows("app_settings").find(function (row) {
    return String(row.key || "") === key;
  });
  const patch = {
    key: key,
    value_json: valueJson,
    updated_by: user.id,
    updated_at: now
  };

  if (existing) {
    updateRow("app_settings", existing._row, patch);
  } else {
    appendRow("app_settings", patch);
  }

  return { ok: true, settings: publicAppSettings() };
}

function nowIso() {
  return Utilities.formatDate(new Date(), VIETNAM_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") + "+07:00";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function makeToken() {
  return Utilities.getUuid() + "-" + Utilities.getUuid();
}

function digestHex(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value));

  return bytes.map(function (byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    const hex = normalized.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function hashPassword(password, salt) {
  let hash = String(password) + ":" + String(salt);
  for (let i = 0; i < HASH_ROUNDS; i += 1) {
    hash = digestHex(hash + ":" + salt + ":" + i);
  }
  return hash;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at || ""
  };
}

function getUserCache() {
  return CacheService.getScriptCache();
}

function cacheSessionUser(user) {
  if (!user || !user.session_token) return;
  getUserCache().put(
    "session:" + user.session_token,
    JSON.stringify(user),
    USER_CACHE_SECONDS
  );
}

function removeCachedSession(token) {
  if (token) {
    getUserCache().remove("session:" + token);
  }
}

function requireUser(token) {
  const sessionToken = String(token || "");
  if (!sessionToken) {
    throw new Error("Unauthenticated");
  }

  const cached = getUserCache().get("session:" + sessionToken);
  if (cached) {
    const cachedUser = JSON.parse(cached);
    if (new Date(cachedUser.session_expires_at).getTime() >= Date.now()) {
      return cachedUser;
    }
    removeCachedSession(sessionToken);
  }

  const user = readRows("users").find(function (item) {
    return item.session_token === sessionToken && item.status === "active";
  });

  if (!user) {
    throw new Error("Invalid session");
  }

  if (!user.session_expires_at || new Date(user.session_expires_at).getTime() < Date.now()) {
    throw new Error("Session expired");
  }

  cacheSessionUser(user);
  return user;
}

function requireAdmin(token) {
  const user = requireUser(token);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

function activeAdminCount() {
  return readRows("users").filter(function (user) {
    return user.role === "admin" && user.status === "active";
  }).length;
}

function assertNotLastActiveAdmin(user) {
  if (user.role === "admin" && user.status === "active" && activeAdminCount() <= 1) {
    throw new Error("Cannot disable or delete the last active admin");
  }
}

function bootstrapStatus() {
  const users = readRows("users");
  return {
    ok: true,
    hasAdmin: users.some(function (user) {
      return user.role === "admin" && user.status !== "deleted";
    })
  };
}

function setupAdmin(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const users = readRows("users");
    if (users.some(function (user) { return user.role === "admin" && user.status !== "deleted"; })) {
      return { ok: false, error: "Admin account already exists" };
    }

    return createUserInternal({
      name: body.name,
      email: body.email,
      password: body.password,
      role: "admin",
      loginAfterCreate: true
    });
  } finally {
    lock.releaseLock();
  }
}

function loginUser(body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = readRows("users").find(function (item) {
    return item.email === email && item.status === "active";
  });

  if (!user || user.password_hash !== hashPassword(password, user.salt)) {
    return { ok: false, error: "Email hoặc mật khẩu không đúng" };
  }

  const token = makeToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  updateRow("users", user._row, {
    session_token: token,
    session_expires_at: expires,
    last_login_at: nowIso(),
    updated_at: nowIso()
  });

  user.session_token = token;
  user.session_expires_at = expires;
  user.last_login_at = nowIso();
  cacheSessionUser(user);

  return { ok: true, token: token, user: publicUser(user) };
}

function getCurrentUser(body) {
  const user = requireUser(body.token);
  return { ok: true, user: publicUser(user) };
}

function logoutUser(body) {
  const user = requireUser(body.token);
  removeCachedSession(body.token);
  updateRow("users", user._row, {
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });
  return { ok: true };
}

function listUsers(body) {
  requireAdmin(body.token);
  const users = readRows("users")
    .filter(function (user) {
      return user.status !== "deleted";
    })
    .map(publicUser);

  return { ok: true, users: users };
}

function createUser(body) {
  requireAdmin(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    return createUserInternal({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role || "sales",
      loginAfterCreate: false
    });
  } finally {
    lock.releaseLock();
  }
}

function createUserInternal(options) {
  const name = String(options.name || "").trim();
  const email = normalizeEmail(options.email);
  const password = String(options.password || "");
  const role = String(options.role || "sales");
  const allowedRoles = ["admin", "sales", "inventory", "viewer"];

  if (!name || !email || password.length < 8 || allowedRoles.indexOf(role) === -1) {
    return { ok: false, error: "Dữ liệu tài khoản không hợp lệ" };
  }

  const users = readRows("users");
  if (users.some(function (user) { return user.email === email && user.status !== "deleted"; })) {
    return { ok: false, error: "Email đã tồn tại" };
  }

  const salt = makeToken();
  const now = nowIso();
  const token = options.loginAfterCreate ? makeToken() : "";
  const expires = options.loginAfterCreate
    ? new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : "";
  const user = {
    id: Utilities.getUuid(),
    name: name,
    email: email,
    password_hash: hashPassword(password, salt),
    salt: salt,
    role: role,
    status: "active",
    session_token: token,
    session_expires_at: expires,
    created_at: now,
    updated_at: now,
    last_login_at: options.loginAfterCreate ? now : ""
  };

  appendRow("users", user);
  if (token) cacheSessionUser(user);

  return {
    ok: true,
    token: token,
    user: publicUser(user)
  };
}

function toggleUser(body) {
  const admin = requireAdmin(body.token);
  const id = String(body.id || "");
  if (!id || id === admin.id) {
    return { ok: false, error: "Không thể cập nhật tài khoản này" };
  }

  const user = readRows("users").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!user) {
    return { ok: false, error: "Không tìm thấy nhân viên" };
  }

  const nextStatus = user.status === "active" ? "disabled" : "active";
  if (nextStatus === "disabled") {
    assertNotLastActiveAdmin(user);
  }
  removeCachedSession(user.session_token);
  updateRow("users", user._row, {
    status: nextStatus,
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });

  user.status = nextStatus;
  return { ok: true, user: publicUser(user) };
}

function deleteUser(body) {
  const admin = requireAdmin(body.token);
  const id = String(body.id || "");
  if (!id || id === admin.id) {
    return { ok: false, error: "Không thể xóa tài khoản này" };
  }

  const user = readRows("users").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!user) {
    return { ok: false, error: "Không tìm thấy nhân viên" };
  }

  assertNotLastActiveAdmin(user);
  removeCachedSession(user.session_token);
  updateRow("users", user._row, {
    status: "deleted",
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });

  return { ok: true };
}

function requireCatalogManager(token) {
  const user = requireUser(token);
  if (["admin", "inventory"].indexOf(user.role) === -1) {
    throw new Error("Catalog access required");
  }
  return user;
}

function normalizeSku(sku) {
  return String(sku || "").trim().toUpperCase();
}

function normalizeProductInput(body) {
  const sku = normalizeSku(body.sku);
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const costPrice = Number(body.costPrice);
  const salePrice = Number(body.salePrice);
  const stock = Number(body.stock);
  const lowStock = Number(body.lowStock);
  const allowedStatuses = ["active", "archived"];
  const status = allowedStatuses.indexOf(String(body.status || "active")) === -1
    ? "active"
    : String(body.status || "active");

  if (!sku || !name || !category) {
    throw new Error("Product SKU, name and category are required");
  }

  if ([costPrice, salePrice, stock, lowStock].some(function (value) { return !isFinite(value) || value < 0; })) {
    throw new Error("Product numeric fields are invalid");
  }

  if (salePrice < costPrice) {
    throw new Error("Sale price must be greater than or equal to cost price");
  }

  return {
    sku: sku,
    name: name,
    category: category,
    brand: String(body.brand || "").trim(),
    barcode: String(body.barcode || "").trim(),
    unit: String(body.unit || "cái").trim() || "cái",
    weight_grams: Math.max(0, Number(body.weightGrams || body.weight_grams || 0) || 0),
    dimensions: String(body.dimensions || "").trim(),
    origin: String(body.origin || "").trim(),
    material: String(body.material || "").trim(),
    cost_price: costPrice,
    sale_price: salePrice,
    stock: stock,
    low_stock: lowStock,
    image_url: String(body.imageUrl || body.image_url || "").trim(),
    short_description: String(body.shortDescription || body.short_description || "").trim(),
    key_features: String(body.keyFeatures || body.key_features || "").trim(),
    target_audience: String(body.targetAudience || body.target_audience || "").trim(),
    seo_keywords: String(body.seoKeywords || body.seo_keywords || "").trim(),
    content_status: ["not_started", "drafting", "review", "ready", "published"].indexOf(String(body.contentStatus || body.content_status || "not_started")) === -1
      ? "not_started"
      : String(body.contentStatus || body.content_status || "not_started"),
    content_owner: String(body.contentOwner || body.content_owner || "").trim(),
    content_note: String(body.contentNote || body.content_note || "").trim(),
    website_product_url: String(body.websiteProductUrl || body.website_product_url || "").trim(),
    shopee_product_url: String(body.shopeeProductUrl || body.shopee_product_url || "").trim(),
    tiktok_product_url: String(body.tiktokProductUrl || body.tiktok_product_url || "").trim(),
    facebook_product_url: String(body.facebookProductUrl || body.facebook_product_url || "").trim(),
    content_post_links: String(body.contentPostLinks || body.content_post_links || "").trim(),
    status: status
  };
}

function publicProduct(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    brand: product.brand || "",
    barcode: product.barcode || "",
    unit: product.unit || "cái",
    weightGrams: Number(product.weight_grams || 0),
    dimensions: product.dimensions || "",
    origin: product.origin || "",
    material: product.material || "",
    costPrice: Number(product.cost_price || 0),
    salePrice: Number(product.sale_price || 0),
    stock: Number(product.stock || 0),
    lowStock: Number(product.low_stock || 0),
    imageUrl: product.image_url || "",
    shortDescription: product.short_description || "",
    keyFeatures: product.key_features || "",
    targetAudience: product.target_audience || "",
    seoKeywords: product.seo_keywords || "",
    contentStatus: product.content_status || "not_started",
    contentOwner: product.content_owner || "",
    contentNote: product.content_note || "",
    websiteProductUrl: product.website_product_url || "",
    shopeeProductUrl: product.shopee_product_url || "",
    tiktokProductUrl: product.tiktok_product_url || "",
    facebookProductUrl: product.facebook_product_url || "",
    contentPostLinks: product.content_post_links || "",
    contentDocId: product.content_doc_id || "",
    contentDocUrl: product.content_doc_url || "",
    mediaFolderId: product.media_folder_id || "",
    mediaFolderUrl: product.media_folder_url || "",
    imageFolderId: product.image_folder_id || "",
    imageFolderUrl: product.image_folder_url || "",
    videoFolderId: product.video_folder_id || "",
    videoFolderUrl: product.video_folder_url || "",
    status: product.status || "active",
    createdAt: product.created_at || "",
    updatedAt: product.updated_at || ""
  };
}

function listProducts(body) {
  requireUser(body.token);
  const products = readRows("products")
    .filter(function (product) {
      return product.status !== "deleted";
    })
    .map(publicProduct);

  const productOptions = readRows("product_options")
    .filter(function (option) { return option.status !== "deleted"; })
    .map(publicProductOption);
  const contentOwners = readRows("users")
    .filter(function (user) { return user.status === "active"; })
    .map(function (user) { return { id: user.id, name: user.name, email: user.email }; });

  return { ok: true, products: products, productOptions: productOptions, contentOwners: contentOwners };
}

function normalizeProductOptionType(type) {
  const value = String(type || "").trim();
  return ["category", "brand", "unit"].indexOf(value) === -1 ? "" : value;
}

function publicProductOption(option) {
  return {
    id: option.id,
    type: option.type,
    name: option.name,
    status: option.status || "active",
    createdAt: option.created_at || "",
    updatedAt: option.updated_at || ""
  };
}

function appendProductOption(type, name, now) {
  const option = {
    id: Utilities.getUuid(),
    type: type,
    name: name,
    status: "active",
    created_at: now,
    updated_at: now
  };
  appendRow("product_options", option);
  return option;
}

function createProductOption(body) {
  requireCatalogManager(body.token);
  const type = normalizeProductOptionType(body.type);
  const name = String(body.name || "").trim();
  if (!type || !name || name.length > 100) return { ok: false, error: "Thuộc tính sản phẩm không hợp lệ" };

  const options = readRows("product_options");
  const existing = options.find(function (option) {
    return option.type === type && String(option.name || "").trim().toLowerCase() === name.toLowerCase() && option.status !== "deleted";
  });
  if (existing) {
    if (existing.status === "active") return { ok: false, error: "Giá trị này đã tồn tại" };
    const patch = { status: "active", updated_at: nowIso() };
    updateRow("product_options", existing._row, patch);
    return { ok: true, option: publicProductOption(Object.assign({}, existing, patch)) };
  }

  return { ok: true, option: publicProductOption(appendProductOption(type, name, nowIso())) };
}

function updateProductOption(body) {
  requireCatalogManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || "");
    const name = String(body.name || "").trim();
    if (!id || !name || name.length > 100) return { ok: false, error: "Tên thuộc tính không hợp lệ" };
    const options = readRows("product_options");
    const option = options.find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!option) return { ok: false, error: "Không tìm thấy thuộc tính sản phẩm" };
    if (options.some(function (item) {
      return item.id !== id && item.type === option.type && item.status !== "deleted" && String(item.name || "").trim().toLowerCase() === name.toLowerCase();
    })) return { ok: false, error: "Giá trị này đã tồn tại" };

    const now = nowIso();
    const fieldByType = { category: "category", brand: "brand", unit: "unit" };
    const productField = fieldByType[option.type];
    let updatedProducts = 0;
    if (productField && name !== option.name) {
      readRows("products").filter(function (product) {
        return product.status !== "deleted" && String(product[productField] || "") === String(option.name || "");
      }).forEach(function (product) {
        const productPatch = { updated_at: now };
        productPatch[productField] = name;
        updateRow("products", product._row, productPatch);
        updatedProducts += 1;
      });
    }
    const patch = { name: name, updated_at: now };
    updateRow("product_options", option._row, patch);
    return { ok: true, option: publicProductOption(Object.assign({}, option, patch)), updatedProducts: updatedProducts };
  } finally {
    lock.releaseLock();
  }
}

function toggleProductOption(body) {
  requireCatalogManager(body.token);
  const id = String(body.id || "");
  const status = String(body.status || "") === "active" ? "active" : "archived";
  const option = readRows("product_options").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });
  if (!option) return { ok: false, error: "Không tìm thấy thuộc tính sản phẩm" };
  const patch = { status: status, updated_at: nowIso() };
  updateRow("product_options", option._row, patch);
  return { ok: true, option: publicProductOption(Object.assign({}, option, patch)) };
}

function requireContentManager(token) {
  const user = requireUser(token);
  if (["admin", "inventory", "sales"].indexOf(user.role) === -1) {
    throw new Error("Content access required");
  }
  return user;
}

function normalizeContentItemInput(body) {
  const allowedTypes = ["product", "campaign", "idea", "post", "video", "brief"];
  const allowedStatuses = ["idea", "briefing", "drafting", "review", "revision", "ready", "scheduled", "published", "archived"];
  const allowedPriorities = ["low", "normal", "high", "urgent"];
  const type = allowedTypes.indexOf(String(body.type || "campaign")) === -1 ? "campaign" : String(body.type || "campaign");
  const status = allowedStatuses.indexOf(String(body.status || "idea")) === -1 ? "idea" : String(body.status || "idea");
  const priority = allowedPriorities.indexOf(String(body.priority || "normal")) === -1 ? "normal" : String(body.priority || "normal");
  const title = String(body.title || "").trim();
  const publishAt = String(body.publishAt || body.publish_at || "").trim().slice(0, 16);
  if (!title || title.length > 180) throw new Error("Content title is invalid");
  return {
    type: type,
    title: title,
    product_id: String(body.productId || body.product_id || "").trim(),
    channel: String(body.channel || "multi").trim() || "multi",
    status: status,
    priority: priority,
    due_date: String(body.dueDate || body.due_date || "").slice(0, 10),
    publish_at: publishAt,
    template: String(body.template || "").trim(),
    owner: String(body.owner || "").trim(),
    collaborators: String(body.collaborators || "").trim(),
    tags: String(body.tags || "").trim(),
    campaign: String(body.campaign || "").trim(),
    brief: String(body.brief || "").trim(),
    checklist_json: normalizeContentJson(body.checklistJson || body.checklist_json || body.checklist, "array"),
    asset_checklist_json: normalizeContentJson(body.assetChecklistJson || body.asset_checklist_json || body.assetChecklist, "array"),
    comment_log_json: normalizeContentJson(body.commentLogJson || body.comment_log_json || body.commentLog, "array"),
    prompt_text: String(body.promptText || body.prompt_text || "").trim(),
    target_metric: String(body.targetMetric || body.target_metric || "").trim(),
    result_json: normalizeContentJson(body.resultJson || body.result_json || body.result, "object"),
    note: String(body.note || "").trim(),
    publish_url: String(body.publishUrl || body.publish_url || "").trim()
  };
}

function normalizeContentJson(value, fallbackType) {
  if (value === undefined || value === null || value === "") return fallbackType === "object" ? "{}" : "[]";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed);
    } catch (error) {
      return fallbackType === "object" ? "{}" : "[]";
    }
  }
  return JSON.stringify(value);
}

function parseContentJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function publicContentItem(item) {
  return {
    id: item.id,
    type: item.type || "campaign",
    title: item.title || "",
    productId: item.product_id || "",
    channel: item.channel || "multi",
    status: item.status || "idea",
    priority: item.priority || "normal",
    dueDate: item.due_date || "",
    publishAt: item.publish_at || "",
    template: item.template || "",
    owner: item.owner || "",
    collaborators: item.collaborators || "",
    tags: item.tags || "",
    campaign: item.campaign || "",
    brief: item.brief || "",
    checklist: parseContentJson(item.checklist_json, []),
    assetChecklist: parseContentJson(item.asset_checklist_json, []),
    commentLog: parseContentJson(item.comment_log_json, []),
    promptText: item.prompt_text || "",
    targetMetric: item.target_metric || "",
    result: parseContentJson(item.result_json, {}),
    note: item.note || "",
    publishUrl: item.publish_url || "",
    contentDocId: item.content_doc_id || "",
    contentDocUrl: item.content_doc_url || "",
    mediaFolderId: item.media_folder_id || "",
    mediaFolderUrl: item.media_folder_url || "",
    createdBy: item.created_by || "",
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || ""
  };
}

function getContentWorkspaceData(body) {
  requireUser(body.token);
  const items = readRows("content_items")
    .filter(function (item) { return item.status !== "deleted"; })
    .sort(function (a, b) { return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)); })
    .map(publicContentItem);
  const products = readRows("products")
    .filter(function (product) { return product.status !== "deleted"; })
    .map(publicProduct);
  const contentOwners = readRows("users")
    .filter(function (user) { return user.status === "active"; })
    .map(function (user) { return { id: user.id, name: user.name, email: user.email }; });
  return { ok: true, contentItems: items, products: products, contentOwners: contentOwners };
}

function contentItemFolderName(item, product) {
  const prefix = product && product.sku ? "[" + product.sku + "] " : "";
  return prefix + "Content - " + item.title;
}

function createContentItemAssets(item, product) {
  const properties = PropertiesService.getScriptProperties();
  const root = contentWorkspaceFolder(properties);
  const patch = {};
  let documentId = String(item.content_doc_id || driveIdFromUrl(item.content_doc_url));
  let mediaFolderId = String(item.media_folder_id || driveIdFromUrl(item.media_folder_url));
  const folderName = contentItemFolderName(item, product);

  if (!documentId) {
    const document = DocumentApp.create(folderName);
    documentId = document.getId();
    DriveApp.getFileById(documentId).moveTo(root);
    const body = document.getBody();
    body.appendParagraph(item.title).setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph("Loại: " + item.type + " | Kênh: " + item.channel + " | Trạng thái: " + item.status);
    if (product) body.appendParagraph("Sản phẩm: " + product.sku + " - " + product.name);
    body.appendParagraph("BRIEF").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(item.brief || "[Điền mục tiêu, insight, thông điệp chính, yêu cầu hình ảnh/video]");
    body.appendParagraph("NỘI DUNG NHÁP").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph("[Soạn nội dung tại đây]");
    body.appendParagraph("CHECKLIST").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph("- Hook / tiêu đề\n- Caption / mô tả\n- CTA\n- Hashtag / SEO keywords\n- Link đăng / lịch đăng");
    document.saveAndClose();
  }
  const documentFile = DriveApp.getFileById(documentId);
  patch.content_doc_id = documentId;
  patch.content_doc_url = documentFile.getUrl();

  let mediaFolder;
  if (!mediaFolderId) {
    mediaFolder = root.createFolder(folderName + " - Media");
    mediaFolderId = mediaFolder.getId();
    mediaFolder.createFolder("01_Hinh_anh");
    mediaFolder.createFolder("02_Video");
    mediaFolder.createFolder("03_Tai_lieu");
  } else {
    mediaFolder = DriveApp.getFolderById(mediaFolderId);
  }
  patch.media_folder_id = mediaFolderId;
  patch.media_folder_url = mediaFolder.getUrl();
  return patch;
}

function createContentItem(body) {
  const user = requireContentManager(body.token);
  const input = normalizeContentItemInput(body);
  const products = readRows("products");
  const product = input.product_id ? products.find(function (item) { return item.id === input.product_id && item.status !== "deleted"; }) : null;
  if (input.product_id && !product) return { ok: false, error: "Product not found" };

  const now = nowIso();
  const item = Object.assign({
    id: Utilities.getUuid(),
    content_doc_id: "",
    content_doc_url: "",
    media_folder_id: "",
    media_folder_url: "",
    created_by: user.id,
    created_at: now,
    updated_at: now
  }, input);
  let assetWarning = "";
  if (body.createAssets !== false && String(body.createAssets || "true") !== "false") {
    try {
      Object.assign(item, createContentItemAssets(item, product));
    } catch (error) {
      assetWarning = error.message || String(error);
    }
  }
  appendRow("content_items", item);
  return { ok: true, contentItem: publicContentItem(item), assetWarning: assetWarning };
}

function updateContentItem(body) {
  requireContentManager(body.token);
  const id = String(body.id || "");
  const input = normalizeContentItemInput(body);
  const items = readRows("content_items");
  const item = items.find(function (entry) { return entry.id === id && entry.status !== "deleted"; });
  if (!item) return { ok: false, error: "Content item not found" };
  if (input.product_id && !readRows("products").some(function (product) { return product.id === input.product_id && product.status !== "deleted"; })) {
    return { ok: false, error: "Product not found" };
  }
  const patch = Object.assign({}, input, { updated_at: nowIso() });
  updateRow("content_items", item._row, patch);
  return { ok: true, contentItem: publicContentItem(Object.assign({}, item, patch)) };
}

function archiveContentItem(body) {
  requireContentManager(body.token);
  const id = String(body.id || "");
  const item = readRows("content_items").find(function (entry) { return entry.id === id && entry.status !== "deleted"; });
  if (!item) return { ok: false, error: "Content item not found" };
  const patch = { status: "deleted", updated_at: nowIso() };
  updateRow("content_items", item._row, patch);
  return { ok: true };
}

function provisionContentItemAssets(body) {
  requireContentManager(body.token);
  const id = String(body.id || "");
  const item = readRows("content_items").find(function (entry) { return entry.id === id && entry.status !== "deleted"; });
  if (!item) return { ok: false, error: "Content item not found" };
  const product = item.product_id ? readRows("products").find(function (entry) { return entry.id === item.product_id && entry.status !== "deleted"; }) : null;
  const patch = Object.assign(createContentItemAssets(item, product), { updated_at: nowIso() });
  updateRow("content_items", item._row, patch);
  return { ok: true, contentItem: publicContentItem(Object.assign({}, item, patch)) };
}

function normalizeTeamItemType(type) {
  const value = String(type || "").trim();
  return ["meeting", "plan", "pricing", "decision"].indexOf(value) === -1 ? "meeting" : value;
}

function parseTeamItemJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeTeamItemInput(body) {
  const itemType = normalizeTeamItemType(body.itemType || body.item_type || body.type);
  const detail = parseTeamItemJson(body.itemJson || body.detailJson || body.detail_json || body.item || {});
  const title = String(detail.title || body.title || "").trim();
  if (!title || title.length > 200) throw new Error("Team Hub title is invalid");
  detail.title = title;
  detail.status = String(detail.status || body.status || "draft").trim() || "draft";
  detail.owner = String(detail.owner || body.owner || "").trim();
  return {
    itemType: itemType,
    title: title,
    status: detail.status,
    owner: detail.owner,
    referenceType: String(body.referenceType || body.reference_type || detail.sourceType || "").trim(),
    referenceId: String(body.referenceId || body.reference_id || detail.sourceId || detail.productId || "").trim(),
    detail: detail
  };
}

function publicTeamItem(item) {
  const detail = parseTeamItemJson(item.detail_json);
  detail.id = item.id;
  detail.title = detail.title || item.title || "";
  detail.status = detail.status || item.status || "draft";
  detail.owner = detail.owner || item.owner || "";
  detail.createdAt = item.created_at || detail.createdAt || "";
  detail.updatedAt = item.updated_at || detail.updatedAt || "";
  return detail;
}

function getTeamWorkspaceData(body) {
  requireUser(body.token);
  const grouped = { meeting: [], plan: [], pricing: [], decision: [] };
  readRows("team_items")
    .filter(function (item) { return item.status !== "deleted"; })
    .sort(function (a, b) { return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)); })
    .forEach(function (item) {
      const type = normalizeTeamItemType(item.item_type);
      grouped[type].push(publicTeamItem(item));
    });
  const products = readRows("products")
    .filter(function (product) { return product.status !== "deleted"; })
    .map(publicProduct);
  const users = readRows("users")
    .filter(function (user) { return user.status === "active"; })
    .map(function (user) { return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }; });
  return {
    ok: true,
    teamMeetings: grouped.meeting,
    teamPlans: grouped.plan,
    teamPricingModels: grouped.pricing,
    teamDecisions: grouped.decision,
    products: products,
    contentOwners: users.map(function (user) { return { id: user.id, name: user.name, email: user.email }; }),
    users: users
  };
}

function createTeamItem(body) {
  const user = requireUser(body.token);
  const input = normalizeTeamItemInput(body);
  const now = nowIso();
  input.detail.id = Utilities.getUuid();
  input.detail.createdAt = now;
  input.detail.updatedAt = now;
  const item = {
    id: input.detail.id,
    item_type: input.itemType,
    title: input.title,
    status: input.status,
    owner: input.owner,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    detail_json: JSON.stringify(input.detail),
    created_by: user.id,
    created_at: now,
    updated_at: now
  };
  appendRow("team_items", item);
  return { ok: true, teamItem: publicTeamItem(item) };
}

function updateTeamItem(body) {
  requireUser(body.token);
  const id = String(body.id || "");
  const input = normalizeTeamItemInput(body);
  const item = readRows("team_items").find(function (entry) {
    return entry.id === id && entry.item_type === input.itemType && entry.status !== "deleted";
  });
  if (!item) return { ok: false, error: "Team Hub item not found" };
  const now = nowIso();
  input.detail.id = id;
  input.detail.createdAt = item.created_at || input.detail.createdAt || "";
  input.detail.updatedAt = now;
  const patch = {
    title: input.title,
    status: input.status,
    owner: input.owner,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    detail_json: JSON.stringify(input.detail),
    updated_at: now
  };
  updateRow("team_items", item._row, patch);
  return { ok: true, teamItem: publicTeamItem(Object.assign({}, item, patch)) };
}

function archiveTeamItem(body) {
  requireUser(body.token);
  const id = String(body.id || "");
  const itemType = normalizeTeamItemType(body.itemType || body.item_type || body.type);
  const item = readRows("team_items").find(function (entry) {
    return entry.id === id && entry.item_type === itemType && entry.status !== "deleted";
  });
  if (!item) return { ok: false, error: "Team Hub item not found" };
  const detail = parseTeamItemJson(item.detail_json);
  detail.status = "archived";
  detail.updatedAt = nowIso();
  const patch = { status: "deleted", detail_json: JSON.stringify(detail), updated_at: detail.updatedAt };
  updateRow("team_items", item._row, patch);
  return { ok: true };
}

function ensureProductOptionDefaults() {
  const existing = readRows("product_options");
  if (existing.length) return;
  const products = readRows("products");
  const values = { category: {}, brand: {}, unit: {} };
  products.forEach(function (product) {
    [["category", product.category], ["brand", product.brand], ["unit", product.unit]].forEach(function (entry) {
      const name = String(entry[1] || "").trim();
      if (name) values[entry[0]][name.toLowerCase()] = name;
    });
  });
  ["cái", "bộ", "hộp", "chai", "tuýp", "tờ", "cuộn", "kg"].forEach(function (name) {
    values.unit[name.toLowerCase()] = values.unit[name.toLowerCase()] || name;
  });
  const now = nowIso();
  Object.keys(values).forEach(function (type) {
    Object.keys(values[type]).sort().forEach(function (key) {
      appendProductOption(type, values[type][key], now);
    });
  });
}

function ensureProductOptionsFromInputs(inputs) {
  const options = readRows("product_options");
  const known = {};
  options.filter(function (option) { return option.status !== "deleted"; }).forEach(function (option) {
    known[option.type + ":" + String(option.name || "").trim().toLowerCase()] = true;
  });
  const now = nowIso();
  (inputs || []).forEach(function (input) {
    [["category", input.category], ["brand", input.brand], ["unit", input.unit]].forEach(function (entry) {
      const name = String(entry[1] || "").trim();
      const key = entry[0] + ":" + name.toLowerCase();
      if (name && !known[key]) {
        appendProductOption(entry[0], name, now);
        known[key] = true;
      }
    });
  });
}

function createProduct(body) {
  const user = requireCatalogManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const input = normalizeProductInput(body);
    const products = readRows("products");
    if (products.some(function (product) { return normalizeSku(product.sku) === input.sku && product.status !== "deleted"; })) {
      return { ok: false, error: "SKU already exists" };
    }
    ensureProductOptionsFromInputs([input]);

    const now = nowIso();
    const product = {
      id: Utilities.getUuid(),
      sku: input.sku,
      name: input.name,
      category: input.category,
      brand: input.brand,
      barcode: input.barcode,
      unit: input.unit,
      weight_grams: input.weight_grams,
      dimensions: input.dimensions,
      origin: input.origin,
      material: input.material,
      cost_price: input.cost_price,
      sale_price: input.sale_price,
      stock: input.stock,
      low_stock: input.low_stock,
      image_url: input.image_url,
      short_description: input.short_description,
      key_features: input.key_features,
      target_audience: input.target_audience,
      seo_keywords: input.seo_keywords,
      content_status: input.content_status,
      content_owner: input.content_owner,
      content_note: input.content_note,
      website_product_url: input.website_product_url,
      shopee_product_url: input.shopee_product_url,
      tiktok_product_url: input.tiktok_product_url,
      facebook_product_url: input.facebook_product_url,
      content_post_links: input.content_post_links,
      content_doc_id: "",
      content_doc_url: "",
      media_folder_id: "",
      media_folder_url: "",
      image_folder_id: "",
      image_folder_url: "",
      video_folder_id: "",
      video_folder_url: "",
      status: input.status,
      created_at: now,
      updated_at: now
    };

    let contentSetupWarning = "";
    try {
      Object.assign(product, createProductContentAssets(product));
    } catch (error) {
      contentSetupWarning = error.message || String(error);
    }
    appendRow("products", product);
    if (Number(product.stock || 0) > 0) {
      logStockMovement({
        product: product,
        type: "initial",
        quantityDelta: Number(product.stock || 0),
        stockBefore: 0,
        stockAfter: Number(product.stock || 0),
        reason: "Tồn kho ban đầu",
        referenceType: "product",
        referenceId: product.id,
        createdBy: user.id,
        createdAt: now
      });
    }
    return { ok: true, product: publicProduct(product), contentSetupWarning: contentSetupWarning };
  } finally {
    lock.releaseLock();
  }
}

function updateProduct(body) {
  const user = requireCatalogManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const id = String(body.id || "");
    const input = normalizeProductInput(body);
    const products = readRows("products");
    const product = products.find(function (item) {
      return item.id === id && item.status !== "deleted";
    });

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    if (products.some(function (item) { return item.id !== id && normalizeSku(item.sku) === input.sku && item.status !== "deleted"; })) {
      return { ok: false, error: "SKU already exists" };
    }
    ensureProductOptionsFromInputs([input]);

    const patch = {
      sku: input.sku,
      name: input.name,
      category: input.category,
      brand: input.brand,
      barcode: input.barcode,
      unit: input.unit,
      weight_grams: input.weight_grams,
      dimensions: input.dimensions,
      origin: input.origin,
      material: input.material,
      cost_price: input.cost_price,
      sale_price: input.sale_price,
      stock: input.stock,
      low_stock: input.low_stock,
      image_url: input.image_url,
      short_description: input.short_description,
      key_features: input.key_features,
      target_audience: input.target_audience,
      seo_keywords: input.seo_keywords,
      content_status: input.content_status,
      content_owner: input.content_owner,
      content_note: input.content_note,
      website_product_url: input.website_product_url,
      shopee_product_url: input.shopee_product_url,
      tiktok_product_url: input.tiktok_product_url,
      facebook_product_url: input.facebook_product_url,
      content_post_links: input.content_post_links,
      status: input.status,
      updated_at: nowIso()
    };

    updateRow("products", product._row, patch);
    syncProductContentAssetNames(Object.assign({}, product, patch));
    const oldStock = Number(product.stock || 0);
    const newStock = Number(patch.stock || 0);
    if (oldStock !== newStock) {
      logStockMovement({
        product: Object.assign({}, product, patch),
        type: "product_edit",
        quantityDelta: newStock - oldStock,
        stockBefore: oldStock,
        stockAfter: newStock,
        reason: "Cập nhật trực tiếp từ hồ sơ sản phẩm",
        referenceType: "product",
        referenceId: product.id,
        createdBy: user.id,
        createdAt: patch.updated_at
      });
    }
    return { ok: true, product: publicProduct(Object.assign({}, product, patch)) };
  } finally {
    lock.releaseLock();
  }
}

function archiveProduct(body) {
  requireCatalogManager(body.token);

  const id = String(body.id || "");
  const nextStatus = String(body.status || "archived") === "active" ? "active" : "archived";
  const product = readRows("products").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  const patch = {
    status: nextStatus,
    updated_at: nowIso()
  };
  updateRow("products", product._row, patch);

  return { ok: true, product: publicProduct(Object.assign({}, product, patch)) };
}

function productContentFolderName(product) {
  return "[" + product.sku + "] " + product.name;
}

function syncProductContentAssetNames(product) {
  try {
    if (product.content_doc_id) {
      DriveApp.getFileById(product.content_doc_id).setName("Content - " + product.sku + " - " + product.name);
    }
    if (product.media_folder_id) {
      DriveApp.getFolderById(product.media_folder_id).setName(productContentFolderName(product));
    }
  } catch (error) {
    console.error("Product content asset rename failed: " + (error.message || String(error)));
  }
}

function requireFolderProperty(properties, primaryKey, fallbackKey) {
  const folderId = properties.getProperty(primaryKey) || (fallbackKey ? properties.getProperty(fallbackKey) : "");
  if (!folderId) {
    throw new Error("Chưa cấu hình Script Property " + primaryKey);
  }
  return DriveApp.getFolderById(folderId);
}

function contentWorkspaceFolder(properties) {
  const folderId = properties.getProperty("CONTENT_WORKSPACE_FOLDER_ID") ||
    properties.getProperty("PRODUCT_CONTENT_ROOT_FOLDER_ID") ||
    properties.getProperty("PRODUCT_MEDIA_PARENT_FOLDER_ID") ||
    properties.getProperty("PRODUCT_DOCS_PARENT_FOLDER_ID");
  if (!folderId) {
    throw new Error("Chưa cấu hình Script Property CONTENT_WORKSPACE_FOLDER_ID");
  }
  return DriveApp.getFolderById(folderId);
}

function testProductContentConfiguration(body) {
  if (body && body.token) requireCatalogManager(body.token);
  const properties = PropertiesService.getScriptProperties();
  const docsParent = requireFolderProperty(properties, "PRODUCT_DOCS_PARENT_FOLDER_ID", "PRODUCT_CONTENT_ROOT_FOLDER_ID");
  const mediaParent = requireFolderProperty(properties, "PRODUCT_MEDIA_PARENT_FOLDER_ID", "PRODUCT_CONTENT_ROOT_FOLDER_ID");
  const stamp = Utilities.formatDate(new Date(), VIETNAM_TIMEZONE, "yyyyMMdd-HHmmss");
  let testFile = null;
  let testFolder = null;

  try {
    const testDocument = DocumentApp.create("ArtFlow Drive Test " + stamp);
    testDocument.getBody().appendParagraph("Kiểm tra quyền tạo tài nguyên sản phẩm ArtFlow lúc " + nowIso());
    testDocument.saveAndClose();
    testFile = DriveApp.getFileById(testDocument.getId());
    testFile.moveTo(docsParent);

    testFolder = mediaParent.createFolder("ArtFlow Drive Test " + stamp);
    testFolder.createFolder("01_Hinh_anh");

    const result = {
      ok: true,
      docsParentName: docsParent.getName(),
      mediaParentName: mediaParent.getName(),
      documentCreated: true,
      folderCreated: true,
      testedAt: nowIso()
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    try {
      if (testFile) testFile.setTrashed(true);
      if (testFolder) testFolder.setTrashed(true);
    } catch (cleanupError) {
      console.error("Product content test cleanup failed: " + (cleanupError.message || String(cleanupError)));
    }
  }
}

function createProductContentAssets(product) {
  const properties = PropertiesService.getScriptProperties();
  const folderName = productContentFolderName(product);
  const patch = {};
  let documentId = String(product.content_doc_id || driveIdFromUrl(product.content_doc_url));
  let mediaFolderId = String(product.media_folder_id || driveIdFromUrl(product.media_folder_url));
  let imageFolderId = String(product.image_folder_id || driveIdFromUrl(product.image_folder_url));
  let videoFolderId = String(product.video_folder_id || driveIdFromUrl(product.video_folder_url));

  if (!documentId) {
    const docsParent = requireFolderProperty(properties, "PRODUCT_DOCS_PARENT_FOLDER_ID", "PRODUCT_CONTENT_ROOT_FOLDER_ID");
    const document = DocumentApp.create("Content - " + product.sku + " - " + product.name);
    documentId = document.getId();
    DriveApp.getFileById(documentId).moveTo(docsParent);
    const body = document.getBody();
    body.appendParagraph(product.name).setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph("SKU: " + product.sku + " | Danh mục: " + product.category);
    body.appendParagraph("MÔ TẢ NGẮN").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(product.short_description || "[Điền mô tả ngắn của sản phẩm]");
    body.appendParagraph("ĐIỂM NỔI BẬT / USP").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(product.key_features || "[Điền các điểm nổi bật, mỗi ý một dòng]");
    body.appendParagraph("ĐỐI TƯỢNG KHÁCH HÀNG").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(product.target_audience || "[Điền chân dung khách hàng mục tiêu]");
    body.appendParagraph("TỪ KHÓA").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(product.seo_keywords || "[Điền từ khóa tìm kiếm]");
    body.appendParagraph("NỘI DUNG THEO KÊNH").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph("Website / Facebook / TikTok / Shopee / Lazada");
    body.appendParagraph("LINK KÊNH BÁN").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph([
      "Website: " + (product.website_product_url || "[chưa có]"),
      "Shopee: " + (product.shopee_product_url || "[chưa có]"),
      "TikTok Shop: " + (product.tiktok_product_url || "[chưa có]"),
      "Facebook: " + (product.facebook_product_url || "[chưa có]")
    ].join("\n"));
    document.saveAndClose();
  }
  const documentFile = DriveApp.getFileById(documentId);
  patch.content_doc_id = documentId;
  patch.content_doc_url = documentFile.getUrl();

  let mediaFolder;
  if (!mediaFolderId) {
    const mediaParent = requireFolderProperty(properties, "PRODUCT_MEDIA_PARENT_FOLDER_ID", "PRODUCT_CONTENT_ROOT_FOLDER_ID");
    mediaFolder = mediaParent.createFolder(folderName);
    mediaFolderId = mediaFolder.getId();
    mediaFolder.createFolder("03_Tai_lieu_tham_khao");
  } else {
    mediaFolder = DriveApp.getFolderById(mediaFolderId);
  }
  patch.media_folder_id = mediaFolderId;
  patch.media_folder_url = mediaFolder.getUrl();

  let imageFolder;
  if (!imageFolderId) {
    imageFolder = mediaFolder.createFolder("01_Hinh_anh");
    imageFolderId = imageFolder.getId();
  } else {
    imageFolder = DriveApp.getFolderById(imageFolderId);
  }
  patch.image_folder_id = imageFolderId;
  patch.image_folder_url = imageFolder.getUrl();

  let videoFolder;
  if (!videoFolderId) {
    videoFolder = mediaFolder.createFolder("02_Video");
    videoFolderId = videoFolder.getId();
  } else {
    videoFolder = DriveApp.getFolderById(videoFolderId);
  }
  patch.video_folder_id = videoFolderId;
  patch.video_folder_url = videoFolder.getUrl();
  return patch;
}

function driveIdFromUrl(url) {
  const match = String(url || "").match(/[-\w]{20,}/);
  return match ? match[0] : "";
}

function productContentAssetsComplete(product) {
  return Boolean(product.content_doc_url && product.media_folder_url && product.image_folder_url && product.video_folder_url);
}

function provisionProductContent(body) {
  requireCatalogManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const id = String(body.id || "");
    const product = readRows("products").find(function (item) {
      return item.id === id && item.status !== "deleted";
    });
    if (!product) return { ok: false, error: "Product not found" };
    if (productContentAssetsComplete(product)) {
      return { ok: true, product: publicProduct(product), alreadyProvisioned: true };
    }

    const patch = Object.assign(createProductContentAssets(product), { updated_at: nowIso() });
    updateRow("products", product._row, patch);
    return { ok: true, product: publicProduct(Object.assign({}, product, patch)), alreadyProvisioned: false };
  } finally {
    lock.releaseLock();
  }
}

function provisionMissingProductContent(body) {
  requireCatalogManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const batchSize = Math.min(3, Math.max(1, Number(body.batchSize || 3)));
    const missing = readRows("products").filter(function (product) {
      return product.status !== "deleted" && !productContentAssetsComplete(product);
    });
    const selected = missing.slice(0, batchSize);
    const products = [];
    const failures = [];

    selected.forEach(function (product) {
      try {
        const patch = Object.assign(createProductContentAssets(product), { updated_at: nowIso() });
        updateRow("products", product._row, patch);
        products.push(publicProduct(Object.assign({}, product, patch)));
      } catch (error) {
        failures.push({ id: product.id, sku: product.sku, name: product.name, error: error.message || String(error) });
      }
    });

    const remaining = Math.max(0, missing.length - products.length);
    return {
      ok: true,
      products: products,
      failures: failures,
      processed: selected.length,
      created: products.length,
      failed: failures.length,
      remaining: remaining
    };
  } finally {
    lock.releaseLock();
  }
}

function importProducts(body) {
  const user = requireCatalogManager(body.token);
  let rows = body.products || [];
  if (typeof rows === "string") rows = JSON.parse(rows);
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    return { ok: false, error: "Product import must contain between 1 and 500 rows" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const products = readRows("products");
    const seen = {};
    const prepared = rows.map(function (row, index) {
      let input;
      try {
        input = normalizeProductInput(row || {});
      } catch (error) {
        throw new Error("Row " + (index + 2) + ": " + error.message);
      }
      if (seen[input.sku]) {
        throw new Error("Row " + (index + 2) + ": duplicate SKU " + input.sku);
      }
      seen[input.sku] = true;
      const existing = products.find(function (product) {
        return normalizeSku(product.sku) === input.sku && product.status !== "deleted";
      });
      return { input: input, existing: existing };
    });
    ensureProductOptionsFromInputs(prepared.map(function (entry) { return entry.input; }));

    const now = nowIso();
    let created = 0;
    let updated = 0;
    const saved = prepared.map(function (entry) {
      const input = entry.input;
      const existing = entry.existing;
      if (!existing) {
        const product = {
          id: Utilities.getUuid(),
          sku: input.sku,
          name: input.name,
          category: input.category,
          brand: input.brand,
          barcode: input.barcode,
          unit: input.unit,
          weight_grams: input.weight_grams,
          dimensions: input.dimensions,
          origin: input.origin,
          material: input.material,
          cost_price: input.cost_price,
          sale_price: input.sale_price,
          stock: input.stock,
          low_stock: input.low_stock,
          image_url: input.image_url,
          short_description: input.short_description,
          key_features: input.key_features,
          target_audience: input.target_audience,
          seo_keywords: input.seo_keywords,
          content_status: input.content_status,
          content_owner: input.content_owner,
          content_note: input.content_note,
          website_product_url: input.website_product_url,
          shopee_product_url: input.shopee_product_url,
          tiktok_product_url: input.tiktok_product_url,
          facebook_product_url: input.facebook_product_url,
          content_post_links: input.content_post_links,
          status: input.status,
          created_at: now,
          updated_at: now
        };
        appendRow("products", product);
        if (product.stock > 0) {
          logStockMovement({ product: product, type: "csv_import", quantityDelta: product.stock, stockBefore: 0, stockAfter: product.stock, reason: "Nhập sản phẩm từ CSV", referenceType: "product_import", referenceId: product.id, createdBy: user.id, createdAt: now });
        }
        created += 1;
        return publicProduct(product);
      }

      const patch = {
        sku: input.sku,
        name: input.name,
        category: input.category,
        brand: input.brand,
        barcode: input.barcode,
        unit: input.unit,
        weight_grams: input.weight_grams,
        dimensions: input.dimensions,
        origin: input.origin,
        material: input.material,
        cost_price: input.cost_price,
        sale_price: input.sale_price,
        stock: input.stock,
        low_stock: input.low_stock,
        image_url: input.image_url,
        short_description: input.short_description,
        key_features: input.key_features,
        target_audience: input.target_audience,
        seo_keywords: input.seo_keywords,
        content_status: input.content_status,
        content_owner: input.content_owner,
        content_note: input.content_note,
        website_product_url: input.website_product_url,
        shopee_product_url: input.shopee_product_url,
        tiktok_product_url: input.tiktok_product_url,
        facebook_product_url: input.facebook_product_url,
        content_post_links: input.content_post_links,
        status: input.status,
        updated_at: now
      };
      updateRow("products", existing._row, patch);
      const oldStock = Number(existing.stock || 0);
      if (oldStock !== input.stock) {
        logStockMovement({ product: Object.assign({}, existing, patch), type: "csv_import", quantityDelta: input.stock - oldStock, stockBefore: oldStock, stockAfter: input.stock, reason: "Cập nhật sản phẩm từ CSV", referenceType: "product_import", referenceId: existing.id, createdBy: user.id, createdAt: now });
      }
      updated += 1;
      return publicProduct(Object.assign({}, existing, patch));
    });

    return { ok: true, products: saved, created: created, updated: updated };
  } finally {
    lock.releaseLock();
  }
}

function publicStockMovement(movement) {
  return {
    id: movement.id,
    productId: movement.product_id,
    sku: movement.sku,
    productName: movement.product_name,
    type: movement.type,
    quantityDelta: Number(movement.quantity_delta || 0),
    stockBefore: Number(movement.stock_before || 0),
    stockAfter: Number(movement.stock_after || 0),
    reason: movement.reason || "",
    referenceType: movement.reference_type || "",
    referenceId: movement.reference_id || "",
    createdBy: movement.created_by || "",
    createdAt: movement.created_at || ""
  };
}

function logStockMovement(options) {
  const product = options.product;
  const now = options.createdAt || nowIso();
  const movement = {
    id: Utilities.getUuid(),
    product_id: product.id,
    sku: product.sku,
    product_name: product.name,
    type: options.type,
    quantity_delta: Number(options.quantityDelta || 0),
    stock_before: Number(options.stockBefore || 0),
    stock_after: Number(options.stockAfter || 0),
    reason: options.reason || "",
    reference_type: options.referenceType || "",
    reference_id: options.referenceId || "",
    created_by: options.createdBy || "",
    created_at: now
  };
  appendRow("stock_movements", movement);
  return movement;
}

function listStockMovements(body) {
  requireUser(body.token);
  const movements = readRows("stock_movements")
    .map(publicStockMovement)
    .sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

  return { ok: true, movements: movements };
}

function normalizeStockReason(reason) {
  return String(reason || "").trim();
}

function receiveStock(body) {
  const user = requireCatalogManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const productId = String(body.productId || body.product_id || "");
    const quantity = Number(body.quantity);
    const reason = normalizeStockReason(body.reason) || "Nhập kho";

    if (!productId || !isFinite(quantity) || quantity < 1) {
      return { ok: false, error: "Stock quantity is invalid" };
    }

    const product = readRows("products").find(function (item) {
      return item.id === productId && item.status !== "deleted";
    });

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    const now = nowIso();
    const stockBefore = Number(product.stock || 0);
    const stockAfter = stockBefore + quantity;
    updateRow("products", product._row, {
      stock: stockAfter,
      updated_at: now
    });
    const movement = logStockMovement({
      product: product,
      type: "receive",
      quantityDelta: quantity,
      stockBefore: stockBefore,
      stockAfter: stockAfter,
      reason: reason,
      referenceType: "manual",
      createdBy: user.id,
      createdAt: now
    });

    return {
      ok: true,
      product: publicProduct(Object.assign({}, product, { stock: stockAfter, updated_at: now })),
      movement: publicStockMovement(movement)
    };
  } finally {
    lock.releaseLock();
  }
}

function adjustStock(body) {
  const user = requireCatalogManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const productId = String(body.productId || body.product_id || "");
    const stockAfter = Number(body.stock);
    const reason = normalizeStockReason(body.reason) || "Điều chỉnh kiểm kho";

    if (!productId || !isFinite(stockAfter) || stockAfter < 0) {
      return { ok: false, error: "Adjusted stock is invalid" };
    }

    const product = readRows("products").find(function (item) {
      return item.id === productId && item.status !== "deleted";
    });

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    const now = nowIso();
    const stockBefore = Number(product.stock || 0);
    updateRow("products", product._row, {
      stock: stockAfter,
      updated_at: now
    });
    const movement = logStockMovement({
      product: product,
      type: "adjustment",
      quantityDelta: stockAfter - stockBefore,
      stockBefore: stockBefore,
      stockAfter: stockAfter,
      reason: reason,
      referenceType: "manual",
      createdBy: user.id,
      createdAt: now
    });

    return {
      ok: true,
      product: publicProduct(Object.assign({}, product, { stock: stockAfter, updated_at: now })),
      movement: publicStockMovement(movement)
    };
  } finally {
    lock.releaseLock();
  }
}

function requireCustomerManager(token) {
  const user = requireUser(token);
  if (["admin", "sales"].indexOf(user.role) === -1) {
    throw new Error("Customer access required");
  }
  return user;
}

function normalizePhone(phone) {
  return String(phone || "").trim().replace(/\s+/g, "");
}

function normalizeCustomerInput(body) {
  const name = String(body.name || "").trim();
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const group = String(body.group || "").trim() || "Bán lẻ";
  const note = String(body.note || "").trim();
  const allowedStatuses = ["active", "archived"];
  const status = allowedStatuses.indexOf(String(body.status || "active")) === -1
    ? "active"
    : String(body.status || "active");

  if (!name || !phone) {
    throw new Error("Customer name and phone are required");
  }

  if (email && email.indexOf("@") === -1) {
    throw new Error("Customer email is invalid");
  }

  return {
    name: name,
    phone: phone,
    email: email,
    group: group,
    note: note,
    status: status
  };
}

function publicCustomer(customer) {
  const totalSpent = Number(customer.total_spent || 0);
  const loyaltyPoints = customer.loyalty_points === "" || customer.loyalty_points === undefined
    ? Math.floor(totalSpent / 10000)
    : Number(customer.loyalty_points || 0);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || "",
    group: customer.group || "Bán lẻ",
    status: customer.status || "active",
    totalSpent: totalSpent,
    loyaltyPoints: loyaltyPoints,
    lifetimePoints: Number(customer.lifetime_points || 0),
    lastOrderAt: customer.last_order_at || "",
    note: customer.note || "",
    createdAt: customer.created_at || "",
    updatedAt: customer.updated_at || ""
  };
}

function listCustomers(body) {
  requireUser(body.token);
  const customers = readRows("customers")
    .filter(function (customer) {
      return customer.status !== "deleted";
    })
    .map(publicCustomer);

  return { ok: true, customers: customers };
}

function createCustomer(body) {
  requireCustomerManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const input = normalizeCustomerInput(body);
    const customers = readRows("customers");

    if (customers.some(function (customer) { return normalizePhone(customer.phone) === input.phone && customer.status !== "deleted"; })) {
      return { ok: false, error: "Phone already exists" };
    }

    if (input.email && customers.some(function (customer) { return normalizeEmail(customer.email) === input.email && customer.status !== "deleted"; })) {
      return { ok: false, error: "Email already exists" };
    }

    const now = nowIso();
    const customer = {
      id: Utilities.getUuid(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      group: input.group,
      status: input.status,
      total_spent: 0,
      last_order_at: "",
      note: input.note,
      created_at: now,
      updated_at: now,
      loyalty_points: 0,
      lifetime_points: 0
    };

    appendRow("customers", customer);
    return { ok: true, customer: publicCustomer(customer) };
  } finally {
    lock.releaseLock();
  }
}

function updateCustomer(body) {
  requireCustomerManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const id = String(body.id || "");
    const input = normalizeCustomerInput(body);
    const customers = readRows("customers");
    const customer = customers.find(function (item) {
      return item.id === id && item.status !== "deleted";
    });

    if (!customer) {
      return { ok: false, error: "Customer not found" };
    }

    if (customers.some(function (item) { return item.id !== id && normalizePhone(item.phone) === input.phone && item.status !== "deleted"; })) {
      return { ok: false, error: "Phone already exists" };
    }

    if (input.email && customers.some(function (item) { return item.id !== id && normalizeEmail(item.email) === input.email && item.status !== "deleted"; })) {
      return { ok: false, error: "Email already exists" };
    }

    const patch = {
      name: input.name,
      phone: input.phone,
      email: input.email,
      group: input.group,
      status: input.status,
      note: input.note,
      updated_at: nowIso()
    };

    updateRow("customers", customer._row, patch);
    return { ok: true, customer: publicCustomer(Object.assign({}, customer, patch)) };
  } finally {
    lock.releaseLock();
  }
}

function archiveCustomer(body) {
  requireCustomerManager(body.token);

  const id = String(body.id || "");
  const nextStatus = String(body.status || "archived") === "active" ? "active" : "archived";
  const customer = readRows("customers").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!customer) {
    return { ok: false, error: "Customer not found" };
  }

  const patch = {
    status: nextStatus,
    updated_at: nowIso()
  };
  updateRow("customers", customer._row, patch);

  return { ok: true, customer: publicCustomer(Object.assign({}, customer, patch)) };
}

function importCustomers(body) {
  requireCustomerManager(body.token);
  let rows = body.customers || [];
  if (typeof rows === "string") rows = JSON.parse(rows);
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    return { ok: false, error: "Customer import must contain between 1 and 500 rows" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const customers = readRows("customers");
    const seenPhones = {};
    const seenEmails = {};
    const prepared = rows.map(function (row, index) {
      let input;
      try {
        input = normalizeCustomerInput(row || {});
      } catch (error) {
        throw new Error("Row " + (index + 2) + ": " + error.message);
      }
      if (seenPhones[input.phone]) throw new Error("Row " + (index + 2) + ": duplicate phone " + input.phone);
      if (input.email && seenEmails[input.email]) throw new Error("Row " + (index + 2) + ": duplicate email " + input.email);
      seenPhones[input.phone] = true;
      if (input.email) seenEmails[input.email] = true;

      const existing = customers.find(function (customer) {
        return normalizePhone(customer.phone) === input.phone && customer.status !== "deleted";
      });
      if (input.email && customers.some(function (customer) {
        return customer.status !== "deleted" &&
          normalizeEmail(customer.email) === input.email &&
          (!existing || customer.id !== existing.id);
      })) {
        throw new Error("Row " + (index + 2) + ": email already belongs to another customer");
      }
      return { input: input, existing: existing };
    });

    const now = nowIso();
    let created = 0;
    let updated = 0;
    const saved = prepared.map(function (entry) {
      const input = entry.input;
      const existing = entry.existing;
      if (!existing) {
        const customer = {
          id: Utilities.getUuid(),
          name: input.name,
          phone: input.phone,
          email: input.email,
          group: input.group,
          status: input.status,
          total_spent: 0,
          last_order_at: "",
          note: input.note,
          created_at: now,
          updated_at: now,
          loyalty_points: 0,
          lifetime_points: 0
        };
        appendRow("customers", customer);
        created += 1;
        return publicCustomer(customer);
      }

      const patch = {
        name: input.name,
        phone: input.phone,
        email: input.email,
        group: input.group,
        status: input.status,
        note: input.note,
        updated_at: now
      };
      updateRow("customers", existing._row, patch);
      updated += 1;
      return publicCustomer(Object.assign({}, existing, patch));
    });
    return { ok: true, customers: saved, created: created, updated: updated };
  } finally {
    lock.releaseLock();
  }
}

function requireOrderManager(token) {
  const user = requireUser(token);
  if (["admin", "sales"].indexOf(user.role) === -1) {
    throw new Error("Order access required");
  }
  return user;
}

function orderChannelPrefix(channel) {
  return {
    pos: "POS",
    website: "WEB",
    shopee: "SHP",
    lazada: "LZD",
    tiktok: "TTS",
    facebook: "FB"
  }[String(channel || "pos")] || "AF";
}

function orderCodeForDate(date, sequence, channel) {
  const timezone = VIETNAM_TIMEZONE;
  const datePart = Utilities.formatDate(date, timezone, "yyyyMMdd");
  return orderChannelPrefix(channel) + "-" + datePart + "-" + String(sequence).padStart(4, "0");
}

function nextOrderCode(orders, channel) {
  const today = new Date();
  const prefix = orderChannelPrefix(channel) + "-" + Utilities.formatDate(today, VIETNAM_TIMEZONE, "yyyyMMdd") + "-";
  const sameDayOrders = orders.filter(function (order) {
    return String(order.code || "").indexOf(prefix) === 0;
  });
  return orderCodeForDate(today, sameDayOrders.length + 1, channel);
}

function nextSalesReturnCode(returns) {
  const today = new Date();
  const prefix = "SRT-" + Utilities.formatDate(today, VIETNAM_TIMEZONE, "yyyyMMdd") + "-";
  const count = returns.filter(function (item) { return String(item.code || "").indexOf(prefix) === 0; }).length;
  return prefix + String(count + 1).padStart(4, "0");
}

function parseOrderItems(body) {
  let items = body.items || [];
  if (typeof items === "string") {
    items = JSON.parse(items);
  }

  if (!Array.isArray(items) || !items.length) {
    throw new Error("Order must include at least one item");
  }

  const merged = {};
  items.forEach(function (item) {
    const productId = String(item.productId || item.product_id || "");
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice || item.unit_price || 0);
    const discountPercent = Math.min(100, Math.max(0, Number(item.discountPercent || item.discount_percent || 0) || 0));
    if (!productId || !isFinite(quantity) || quantity < 1) {
      throw new Error("Order item is invalid");
    }
    if (Object.prototype.hasOwnProperty.call(item, "unitPrice") || Object.prototype.hasOwnProperty.call(item, "unit_price")) {
      if (!isFinite(unitPrice) || unitPrice < 0) throw new Error("Order item price is invalid");
    }
    const key = [productId, unitPrice, discountPercent].join(":");
    if (!merged[key]) {
      merged[key] = { productId: productId, quantity: 0, unitPrice: unitPrice, discountPercent: discountPercent, hasCustomPrice: Object.prototype.hasOwnProperty.call(item, "unitPrice") || Object.prototype.hasOwnProperty.call(item, "unit_price") };
    }
    merged[key].quantity += quantity;
  });

  return Object.keys(merged).map(function (key) {
    return merged[key];
  });
}

function normalizeOrderInput(body) {
  const allowedStatuses = ["pending", "confirmed", "packed", "shipping", "paid", "completed"];
  const allowedPaymentStatuses = ["unpaid", "paid"];
  const allowedChannels = ["pos", "website", "shopee", "lazada", "tiktok", "facebook"];
  const allowedShippingStatuses = ["none", "preparing", "shipping", "delivered", "returned"];
  const customerId = String(body.customerId || body.customer_id || "");
  const status = allowedStatuses.indexOf(String(body.status || "pending")) === -1
    ? "pending"
    : String(body.status || "pending");
  const rawPaymentStatus = String(body.paymentStatus || body.payment_status || "");
  const paymentStatus = allowedPaymentStatuses.indexOf(rawPaymentStatus) === -1
    ? (status === "pending" ? "unpaid" : "paid")
    : rawPaymentStatus;
  const discount = Number(body.discount || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent || body.discount_percent || 0) || 0));
  const loyaltyPointsUsed = Math.max(0, Math.floor(Number(body.loyaltyPointsUsed || body.loyalty_points_used || 0) || 0));
  const loyaltyDiscount = Math.max(0, Number(body.loyaltyDiscount || body.loyalty_discount || 0) || 0);
  const cashReceived = Math.max(0, Number(body.cashReceived || body.cash_received || 0) || 0);
  const roundingAmount = Number(body.roundingAmount || body.rounding_amount || 0) || 0;
  const shippingFee = Number(body.shippingFee || body.shipping_fee || 0);
  const paymentMethod = String(body.paymentMethod || body.payment_method || "cash").trim() || "cash";
  const channel = allowedChannels.indexOf(String(body.channel || "pos")) === -1
    ? "pos"
    : String(body.channel || "pos");
  const shippingStatus = allowedShippingStatuses.indexOf(String(body.shippingStatus || body.shipping_status || "none")) === -1
    ? "none"
    : String(body.shippingStatus || body.shipping_status || "none");
  const carrier = String(body.carrier || "").trim();
  const trackingCode = String(body.trackingCode || body.tracking_code || "").trim();
  const note = String(body.note || "").trim();

  if (!customerId) {
    throw new Error("Order customer is required");
  }

  if ([discount, shippingFee, loyaltyDiscount, cashReceived].some(function (value) { return !isFinite(value) || value < 0; }) || !isFinite(roundingAmount)) {
    throw new Error("Order discount or shipping fee is invalid");
  }

  return {
    customerId: customerId,
    items: parseOrderItems(body),
    status: status,
    paymentStatus: paymentStatus,
    paymentMethod: paymentMethod,
    channel: channel,
    shippingStatus: shippingStatus,
    carrier: carrier,
    trackingCode: trackingCode,
    discount: discount,
    discountPercent: discountPercent,
    loyaltyPointsUsed: loyaltyPointsUsed,
    loyaltyDiscount: loyaltyDiscount,
    cashReceived: cashReceived,
    roundingAmount: roundingAmount,
    shippingFee: shippingFee,
    note: note
  };
}

function publicOrder(order, items) {
  const total = Number(order.total || 0);
  const returnedAmount = Number(order.returned_amount || 0);
  const refundedAmount = Number(order.refunded_amount || 0);
  return {
    id: order.id,
    code: order.code,
    customerId: order.customer_id,
    status: order.status || "pending",
    paymentStatus: order.payment_status || "unpaid",
    paymentMethod: order.payment_method || "cash",
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    discountPercent: Number(order.discount_percent || 0),
    loyaltyPointsUsed: Number(order.loyalty_points_used || 0),
    loyaltyDiscount: Number(order.loyalty_discount || 0),
    cashReceived: Number(order.cash_received || 0),
    changeAmount: Number(order.change_amount || 0),
    roundingAmount: Number(order.rounding_amount || 0),
    shippingFee: Number(order.shipping_fee || 0),
    total: total,
    returnedAmount: returnedAmount,
    refundedAmount: refundedAmount,
    netTotal: Math.max(0, total - returnedAmount),
    note: order.note || "",
    createdBy: order.created_by || "",
    createdAt: order.created_at || "",
    updatedAt: order.updated_at || "",
    channel: order.channel || "pos",
    shippingStatus: order.shipping_status || "none",
    carrier: order.carrier || "",
    trackingCode: order.tracking_code || "",
    receiptPdfUrl: order.receipt_pdf_url || "",
    items: (items || []).map(publicOrderItem)
  };
}

function publicSalesReturnItem(item) {
  return {
    id: item.id,
    returnId: item.return_id,
    orderItemId: item.order_item_id,
    productId: item.product_id,
    sku: item.sku,
    name: item.name,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    costPrice: Number(item.cost_price || 0),
    discountPercent: Number(item.discount_percent || 0),
    lineTotal: Number(item.line_total || 0),
    createdAt: item.created_at || ""
  };
}

function publicSalesReturn(salesReturn, items) {
  return {
    id: salesReturn.id,
    code: salesReturn.code,
    orderId: salesReturn.order_id,
    customerId: salesReturn.customer_id,
    amount: Number(salesReturn.amount || 0),
    note: salesReturn.note || "",
    createdBy: salesReturn.created_by || "",
    createdAt: salesReturn.created_at || "",
    items: (items || []).map(publicSalesReturnItem)
  };
}

function publicOrderRefund(refund) {
  return {
    id: refund.id,
    orderId: refund.order_id,
    salesReturnId: refund.sales_return_id || "",
    cashTransactionId: refund.cash_transaction_id,
    accountId: refund.account_id,
    categoryId: refund.category_id,
    amount: Number(refund.amount || 0),
    refundDate: refund.refund_date || "",
    note: refund.note || "",
    createdBy: refund.created_by || "",
    createdAt: refund.created_at || ""
  };
}

function publicOrderItem(item) {
  return {
    id: item.id,
    orderId: item.order_id,
    productId: item.product_id,
    sku: item.sku,
    name: item.name,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    costPrice: Number(item.cost_price || 0),
    discountPercent: Number(item.discount_percent || 0),
    lineTotal: Number(item.line_total || 0),
    createdAt: item.created_at || ""
  };
}

function listOrders(body) {
  requireUser(body.token);
  const items = readRows("order_items");
  const itemsByOrder = {};
  items.forEach(function (item) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  });
  const orders = readRows("orders")
    .filter(function (order) {
      return order.status !== "deleted";
    })
    .map(function (order) {
      return publicOrder(order, itemsByOrder[order.id] || []);
    });

  const returnItems = readRows("sales_return_items");
  const returnItemsByReturn = {};
  returnItems.forEach(function (item) {
    if (!returnItemsByReturn[item.return_id]) returnItemsByReturn[item.return_id] = [];
    returnItemsByReturn[item.return_id].push(item);
  });
  const salesReturns = readRows("sales_returns")
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .map(function (salesReturn) {
      return publicSalesReturn(salesReturn, returnItemsByReturn[salesReturn.id] || []);
    });
  const orderRefunds = readRows("order_refunds")
    .sort(function (a, b) { return String(b.refund_date || b.created_at).localeCompare(String(a.refund_date || a.created_at)); })
    .map(publicOrderRefund);

  return { ok: true, orders: orders, salesReturns: salesReturns, orderRefunds: orderRefunds };
}

function createOrder(body) {
  const user = requireOrderManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const input = normalizeOrderInput(body);
    const customers = readRows("customers");
    const customer = customers.find(function (item) {
      return item.id === input.customerId && item.status === "active";
    });

    if (!customer) {
      return { ok: false, error: "Customer not found or inactive" };
    }

    const products = readRows("products");
    const orderItems = input.items.map(function (item) {
      const product = products.find(function (candidate) {
        return candidate.id === item.productId && candidate.status === "active";
      });

      if (!product) {
        throw new Error("Product not found or inactive");
      }

      const stock = Number(product.stock || 0);
      if (stock < item.quantity) {
        throw new Error("Not enough stock for " + product.name);
      }

      const unitPrice = item.hasCustomPrice ? Number(item.unitPrice || 0) : Number(product.sale_price || 0);
      const costPrice = Number(product.cost_price || 0);
      const gross = unitPrice * item.quantity;
      const lineTotal = Math.max(0, gross - Math.round(gross * Number(item.discountPercent || 0) / 100));
      return {
        product: product,
        quantity: item.quantity,
        unitPrice: unitPrice,
        costPrice: costPrice,
        discountPercent: Number(item.discountPercent || 0),
        lineTotal: lineTotal
      };
    });

    const subtotal = orderItems.reduce(function (sum, item) {
      return sum + item.lineTotal;
    }, 0);
    const percentDiscount = Math.round(subtotal * input.discountPercent / 100);
    const availablePoints = customer.loyalty_points === "" || customer.loyalty_points === undefined
      ? Math.floor(Number(customer.total_spent || 0) / 10000)
      : Math.max(0, Number(customer.loyalty_points || 0));
    const maxPointDiscount = Math.floor(Math.max(0, subtotal - percentDiscount - input.discount) * 0.2);
    const loyaltyPointsUsed = Math.min(input.loyaltyPointsUsed, availablePoints, Math.floor(maxPointDiscount / 1000));
    const loyaltyDiscount = Math.min(input.loyaltyDiscount || loyaltyPointsUsed * 1000, loyaltyPointsUsed * 1000);
    const beforeRound = Math.max(0, subtotal - percentDiscount - input.discount - loyaltyDiscount + input.shippingFee);
    const total = Math.max(0, beforeRound + input.roundingAmount);
    const cashReceived = input.cashReceived;
    const changeAmount = Math.max(0, cashReceived - total);
    const loyaltyPointsEarned = Math.floor(total / 10000);
    const now = nowIso();
    const order = {
      id: Utilities.getUuid(),
      code: nextOrderCode(readRows("orders"), input.channel),
      customer_id: customer.id,
      status: input.status,
      payment_status: input.paymentStatus,
      payment_method: input.paymentMethod,
      subtotal: subtotal,
      discount: input.discount,
      shipping_fee: input.shippingFee,
      total: total,
      note: input.note,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      channel: input.channel,
      shipping_status: input.shippingStatus,
      carrier: input.carrier,
      tracking_code: input.trackingCode,
      returned_amount: 0,
      refunded_amount: 0,
      discount_percent: input.discountPercent,
      loyalty_points_used: loyaltyPointsUsed,
      loyalty_discount: loyaltyDiscount,
      cash_received: cashReceived,
      change_amount: changeAmount,
      rounding_amount: input.roundingAmount,
      receipt_pdf_url: ""
    };

    appendRow("orders", order);

    const savedItems = orderItems.map(function (item) {
      const orderItem = {
        id: Utilities.getUuid(),
        order_id: order.id,
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        cost_price: item.costPrice,
        line_total: item.lineTotal,
        created_at: now,
        discount_percent: item.discountPercent
      };
      appendRow("order_items", orderItem);
      const stockBefore = Number(item.product.stock || 0);
      const stockAfter = stockBefore - item.quantity;
      updateRow("products", item.product._row, {
        stock: stockAfter,
        updated_at: now
      });
      logStockMovement({
        product: item.product,
        type: "sale",
        quantityDelta: -item.quantity,
        stockBefore: stockBefore,
        stockAfter: stockAfter,
        reason: "Tạo đơn " + order.code,
        referenceType: "order",
        referenceId: order.id,
        createdBy: user.id,
        createdAt: now
      });
      return orderItem;
    });

    updateRow("customers", customer._row, {
      total_spent: Number(customer.total_spent || 0) + total,
      loyalty_points: Math.max(0, availablePoints - loyaltyPointsUsed) + loyaltyPointsEarned,
      lifetime_points: Number(customer.lifetime_points || 0) + loyaltyPointsEarned,
      last_order_at: now,
      updated_at: now
    });

    return { ok: true, order: publicOrder(order, savedItems) };
  } finally {
    lock.releaseLock();
  }
}

function receiptSettingValue(settings, key, fallback) {
  settings = settings || {};
  return String(settings[key] === undefined || settings[key] === null ? fallback : settings[key]).trim();
}

function receiptSettingBoolean(settings, key, fallback) {
  settings = settings || {};
  if (settings[key] === undefined || settings[key] === null || settings[key] === "") return fallback;
  return settings[key] === true || String(settings[key]) === "true" || String(settings[key]) === "on";
}

function receiptMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function receiptMmToPt(mm) {
  return Number(mm || 0) * 72 / 25.4;
}

function receiptPaperProfile(settings, itemCount) {
  const raw = receiptSettingValue(settings, "paperSize", receiptSettingValue(settings, "paperWidth", "80"));
  const keyMap = {
    "57": "thermal58",
    "58": "thermal58",
    "76": "thermal76",
    "80": "thermal80",
    "112": "thermal112",
    "a5": "a5",
    "a4": "a4",
    "thermal58": "thermal58",
    "thermal76": "thermal76",
    "thermal80": "thermal80",
    "thermal112": "thermal112"
  };
  const key = keyMap[String(raw).toLowerCase()] || "thermal80";
  const specs = {
    thermal58: { key: "thermal58", label: "58mm", widthMm: 58, marginMm: 3, fontSize: 8, titleSize: 12, totalSize: 12, compact: true, thermal: true },
    thermal76: { key: "thermal76", label: "76mm", widthMm: 76, marginMm: 4, fontSize: 9, titleSize: 14, totalSize: 13, compact: false, thermal: true },
    thermal80: { key: "thermal80", label: "80mm", widthMm: 80, marginMm: 4, fontSize: 9, titleSize: 14, totalSize: 13, compact: false, thermal: true },
    thermal112: { key: "thermal112", label: "112mm", widthMm: 112, marginMm: 6, fontSize: 10, titleSize: 16, totalSize: 14, compact: false, thermal: true },
    a5: { key: "a5", label: "A5", widthMm: 148, heightMm: 210, marginMm: 10, fontSize: 10, titleSize: 18, totalSize: 15, compact: false, thermal: false },
    a4: { key: "a4", label: "A4", widthMm: 210, heightMm: 297, marginMm: 14, fontSize: 11, titleSize: 20, totalSize: 16, compact: false, thermal: false }
  };
  const profile = specs[key] || specs.thermal80;
  const baseHeight = profile.thermal ? 128 : profile.heightMm;
  const itemHeight = profile.compact ? 12 : 10;
  return Object.assign({}, profile, {
    heightMm: profile.thermal ? Math.min(1000, Math.max(180, baseHeight + Math.max(1, Number(itemCount || 0)) * itemHeight)) : profile.heightMm
  });
}

function receiptSetTextStyle(element, options) {
  options = options || {};
  try {
    const text = element.editAsText();
    text.setFontFamily("Arial");
    if (options.fontSize) text.setFontSize(options.fontSize);
    if (options.bold !== undefined) text.setBold(Boolean(options.bold));
    if (options.color) text.setForegroundColor(options.color);
  } catch (error) {}
  return element;
}

function receiptAppendParagraph(body, text, options) {
  options = options || {};
  const paragraph = body.appendParagraph(String(text || ""));
  paragraph.setSpacingBefore(options.before || 0).setSpacingAfter(options.after === undefined ? 2 : options.after);
  if (options.align) paragraph.setAlignment(options.align);
  receiptSetTextStyle(paragraph, options);
  return paragraph;
}

function receiptSetCell(cell, text, options) {
  options = options || {};
  cell.setText(String(text === undefined || text === null ? "" : text));
  receiptSetTextStyle(cell, options);
  try {
    cell.setPaddingTop(options.paddingTop === undefined ? 2 : options.paddingTop);
    cell.setPaddingBottom(options.paddingBottom === undefined ? 2 : options.paddingBottom);
    cell.setPaddingLeft(options.paddingLeft === undefined ? 2 : options.paddingLeft);
    cell.setPaddingRight(options.paddingRight === undefined ? 2 : options.paddingRight);
  } catch (error) {}
  if (options.background) {
    try {
      cell.setBackgroundColor(options.background);
    } catch (error) {}
  }
  return cell;
}

function receiptAppendRule(body, profile) {
  receiptAppendParagraph(body, profile.compact ? "------------------------------" : "----------------------------------------", {
    fontSize: profile.fontSize,
    color: "#64748b",
    align: DocumentApp.HorizontalAlignment.CENTER,
    after: 3
  });
}

function receiptFormatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (isNaN(date.getTime())) return String(value || "");
  return Utilities.formatDate(date, VIETNAM_TIMEZONE, "HH:mm dd/MM/yyyy");
}

function receiptTrySetColumnWidths(table, widths) {
  widths.forEach(function (width, index) {
    try {
      table.setColumnWidth(index, width);
    } catch (error) {}
  });
}

function appendReceiptInfoRow(table, label, value, profile) {
  const row = table.appendTableRow();
  receiptSetCell(row.appendTableCell(label), label, { bold: true, fontSize: profile.fontSize });
  receiptSetCell(row.appendTableCell(String(value || "")), String(value || ""), { fontSize: profile.fontSize });
  return row;
}

function appendReceiptTotalRow(table, label, value, bold, profile) {
  const row = table.appendTableRow();
  const options = {
    bold: bold,
    fontSize: bold ? profile.totalSize : profile.fontSize,
    background: bold ? "#f1f5f9" : ""
  };
  receiptSetCell(row.appendTableCell(label), label, options);
  receiptSetCell(row.appendTableCell(receiptMoney(value)), receiptMoney(value), options);
  return row;
}

function createOrderReceiptPdf(body) {
  requireOrderManager(body.token);
  const id = String(body.orderId || body.order_id || body.id || "");
  const orders = readRows("orders");
  const order = orders.find(function (item) {
    return item.id === id && item.status !== "deleted";
  });
  if (!order) return { ok: false, error: "Order not found" };

  let settings = body.receiptSettings || {};
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch (error) {
      settings = {};
    }
  }

  const items = readRows("order_items").filter(function (item) {
    return item.order_id === order.id;
  });
  const customer = readRows("customers").find(function (item) {
    return item.id === order.customer_id;
  });
  const profile = receiptPaperProfile(settings, items.length);
  const contentWidth = receiptMmToPt(profile.widthMm - profile.marginMm * 2);
  const storeName = receiptSettingValue(settings, "storeName", "ArtFlow");
  const storeInfo = receiptSettingValue(settings, "storeInfo", "Họa cụ và phụ kiện mỹ thuật");
  const phone = receiptSettingValue(settings, "phone", "");
  const address = receiptSettingValue(settings, "address", "");
  const taxCode = receiptSettingValue(settings, "taxCode", "");
  const footer = receiptSettingValue(settings, "footer", "Cảm ơn quý khách. Hẹn gặp lại!");
  const showSku = receiptSettingBoolean(settings, "showSku", true);
  const showCustomer = receiptSettingBoolean(settings, "showCustomer", true);
  const showPoints = receiptSettingBoolean(settings, "showPoints", true);
  const showUnitPrice = receiptSettingBoolean(settings, "showUnitPrice", true);
  const document = DocumentApp.create("Hoa don " + order.code);
  const docBody = document.getBody();
  docBody.clear();
  docBody
    .setMarginTop(receiptMmToPt(profile.marginMm))
    .setMarginBottom(receiptMmToPt(profile.marginMm))
    .setMarginLeft(receiptMmToPt(profile.marginMm))
    .setMarginRight(receiptMmToPt(profile.marginMm))
    .setPageWidth(receiptMmToPt(profile.widthMm))
    .setPageHeight(receiptMmToPt(profile.heightMm));

  receiptAppendParagraph(docBody, storeName.toUpperCase(), {
    bold: true,
    fontSize: profile.titleSize,
    align: DocumentApp.HorizontalAlignment.CENTER,
    after: 3
  });
  if (storeInfo) receiptAppendParagraph(docBody, storeInfo, { fontSize: profile.fontSize, align: DocumentApp.HorizontalAlignment.CENTER });
  if (address) receiptAppendParagraph(docBody, address, { fontSize: profile.fontSize, align: DocumentApp.HorizontalAlignment.CENTER });
  if (phone) receiptAppendParagraph(docBody, "ĐT: " + phone, { fontSize: profile.fontSize, align: DocumentApp.HorizontalAlignment.CENTER });
  if (taxCode) receiptAppendParagraph(docBody, "MST: " + taxCode, { fontSize: profile.fontSize, align: DocumentApp.HorizontalAlignment.CENTER });
  receiptAppendRule(docBody, profile);
  receiptAppendParagraph(docBody, "PHIẾU BÁN HÀNG", {
    bold: true,
    fontSize: profile.titleSize - 1,
    align: DocumentApp.HorizontalAlignment.CENTER,
    after: 2
  });

  const infoTable = docBody.appendTable();
  infoTable.setBorderWidth(0);
  receiptTrySetColumnWidths(infoTable, [contentWidth * 0.34, contentWidth * 0.66]);
  appendReceiptInfoRow(infoTable, "Mã đơn", order.code, profile);
  appendReceiptInfoRow(infoTable, "Thời gian", receiptFormatDateTime(order.created_at || nowIso()), profile);
  appendReceiptInfoRow(infoTable, "Kênh", order.channel || "pos", profile);
  appendReceiptInfoRow(infoTable, "Thanh toán", order.payment_method || "", profile);
  if (showCustomer) appendReceiptInfoRow(infoTable, "Khách", customer ? customer.name : "Khách lẻ", profile);
  if (customer && customer.phone) appendReceiptInfoRow(infoTable, "SĐT", customer.phone, profile);
  receiptAppendRule(docBody, profile);

  const itemTable = docBody.appendTable();
  itemTable.setBorderWidth(0);
  const header = itemTable.appendTableRow();
  const itemHeaders = profile.compact ? ["Sản phẩm", "SL", "Tiền"] : ["Sản phẩm", "SL", "Đơn giá", "Tiền"];
  itemHeaders.forEach(function (title) {
    receiptSetCell(header.appendTableCell(title), title, { bold: true, fontSize: profile.fontSize, background: "#f1f5f9" });
  });
  receiptTrySetColumnWidths(itemTable, profile.compact
    ? [contentWidth * 0.64, contentWidth * 0.12, contentWidth * 0.24]
    : [contentWidth * 0.50, contentWidth * 0.10, contentWidth * 0.20, contentWidth * 0.20]);
  items.forEach(function (item) {
    const row = itemTable.appendTableRow();
    const discountPercent = Number(item.discount_percent || 0);
    const productLines = [
      item.name,
      showSku && item.sku ? "SKU: " + item.sku : "",
      showUnitPrice ? "Đơn giá: " + receiptMoney(item.unit_price) + (discountPercent ? " - giảm " + discountPercent.toFixed(1) + "%" : "") : ""
    ].filter(Boolean).join("\n");
    receiptSetCell(row.appendTableCell(productLines), productLines, { fontSize: profile.fontSize });
    receiptSetCell(row.appendTableCell(String(Number(item.quantity || 0))), String(Number(item.quantity || 0)), { fontSize: profile.fontSize, bold: true });
    if (!profile.compact) receiptSetCell(row.appendTableCell(receiptMoney(item.unit_price)), receiptMoney(item.unit_price), { fontSize: profile.fontSize });
    receiptSetCell(row.appendTableCell(receiptMoney(item.line_total)), receiptMoney(item.line_total), { fontSize: profile.fontSize, bold: true });
  });
  receiptAppendRule(docBody, profile);

  const totalTable = docBody.appendTable();
  totalTable.setBorderWidth(0);
  receiptTrySetColumnWidths(totalTable, [contentWidth * 0.55, contentWidth * 0.45]);
  appendReceiptTotalRow(totalTable, "Tạm tính", order.subtotal, false, profile);
  const discountTotal = Number(order.discount || 0) + Number(order.loyalty_discount || 0);
  if (discountTotal) appendReceiptTotalRow(totalTable, "Giảm", discountTotal, false, profile);
  if (Number(order.shipping_fee || 0)) appendReceiptTotalRow(totalTable, "Phí giao hàng", order.shipping_fee, false, profile);
  if (Number(order.rounding_amount || 0)) appendReceiptTotalRow(totalTable, "Làm tròn", order.rounding_amount, false, profile);
  appendReceiptTotalRow(totalTable, "TỔNG THANH TOÁN", order.total, true, profile);
  if (Number(order.cash_received || 0)) {
    appendReceiptTotalRow(totalTable, "Tiền nhận", order.cash_received, false, profile);
    appendReceiptTotalRow(totalTable, "Tiền thối", order.change_amount, false, profile);
  }
  if (showPoints) {
    appendReceiptInfoRow(totalTable, "Điểm dùng/cộng", Number(order.loyalty_points_used || 0) + " / " + Math.floor(Number(order.total || 0) / 10000), profile);
  }
  if (order.note) {
    receiptAppendRule(docBody, profile);
    receiptAppendParagraph(docBody, "Ghi chú: " + order.note, { fontSize: profile.fontSize });
  }
  receiptAppendRule(docBody, profile);
  if (footer) receiptAppendParagraph(docBody, footer, { fontSize: profile.fontSize, align: DocumentApp.HorizontalAlignment.CENTER });
  receiptAppendParagraph(docBody, "PDF lưu lúc " + receiptFormatDateTime(nowIso()) + " - " + profile.label, {
    fontSize: Math.max(6, profile.fontSize - 1),
    color: "#64748b",
    align: DocumentApp.HorizontalAlignment.CENTER
  });
  document.saveAndClose();

  const sourceFile = DriveApp.getFileById(document.getId());
  const pdfBlob = sourceFile.getBlob().getAs(MimeType.PDF).setName("Hoa-don-" + order.code + "-" + profile.label + ".pdf");
  const folderId = PropertiesService.getScriptProperties().getProperty("ORDER_RECEIPTS_FOLDER_ID");
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const pdfFile = folder.createFile(pdfBlob);
  const previousPdfId = driveIdFromUrl(order.receipt_pdf_url);
  if (previousPdfId && previousPdfId !== pdfFile.getId()) {
    try {
      DriveApp.getFileById(previousPdfId).setTrashed(true);
    } catch (cleanupError) {
      console.error("Old receipt PDF cleanup failed: " + (cleanupError.message || String(cleanupError)));
    }
  }
  sourceFile.setTrashed(true);
  const patch = { receipt_pdf_url: pdfFile.getUrl(), updated_at: nowIso() };
  updateRow("orders", order._row, patch);
  return { ok: true, order: publicOrder(Object.assign({}, order, patch), items), receiptPdfUrl: pdfFile.getUrl() };
}

function updateOrderStatus(body) {
  requireOrderManager(body.token);

  const id = String(body.id || "");
  const allowedStatuses = ["pending", "confirmed", "packed", "shipping", "paid", "completed"];
  const status = allowedStatuses.indexOf(String(body.status || "")) === -1
    ? ""
    : String(body.status || "");
  const paymentStatus = String(body.paymentStatus || body.payment_status || "");

  if (!id || !status) {
    return { ok: false, error: "Order status is invalid" };
  }

  const orders = readRows("orders");
  const order = orders.find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!order) {
    return { ok: false, error: "Order not found" };
  }

  if (order.status === "cancelled") {
    return { ok: false, error: "Cannot update a cancelled order" };
  }

  const patch = {
    status: status,
    payment_status: paymentStatus || (status === "pending" ? "unpaid" : "paid"),
    updated_at: nowIso()
  };
  updateRow("orders", order._row, patch);

  const items = readRows("order_items").filter(function (item) {
    return item.order_id === id;
  });

  return { ok: true, order: publicOrder(Object.assign({}, order, patch), items) };
}

function updateOrderFulfillment(body) {
  requireOrderManager(body.token);

  const id = String(body.id || "");
  const allowedStatuses = ["pending", "confirmed", "packed", "shipping", "paid", "completed"];
  const allowedPaymentStatuses = ["unpaid", "paid"];
  const allowedShippingStatuses = ["none", "preparing", "shipping", "delivered", "returned"];

  if (!id) {
    return { ok: false, error: "Order is invalid" };
  }

  const orders = readRows("orders");
  const order = orders.find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!order) {
    return { ok: false, error: "Order not found" };
  }

  if (order.status === "cancelled") {
    return { ok: false, error: "Cannot update a cancelled order" };
  }

  const patch = { updated_at: nowIso() };
  const nextStatus = String(body.status || "");
  const nextPaymentStatus = String(body.paymentStatus || body.payment_status || "");
  const nextShippingStatus = String(body.shippingStatus || body.shipping_status || "");

  if (nextStatus) {
    if (allowedStatuses.indexOf(nextStatus) === -1) return { ok: false, error: "Order status is invalid" };
    patch.status = nextStatus;
  }
  if (nextPaymentStatus) {
    if (allowedPaymentStatuses.indexOf(nextPaymentStatus) === -1) return { ok: false, error: "Payment status is invalid" };
    patch.payment_status = nextPaymentStatus;
  }
  if (nextShippingStatus) {
    if (allowedShippingStatuses.indexOf(nextShippingStatus) === -1) return { ok: false, error: "Shipping status is invalid" };
    patch.shipping_status = nextShippingStatus;
  }

  if (Object.prototype.hasOwnProperty.call(body, "carrier")) {
    patch.carrier = String(body.carrier || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "trackingCode") || Object.prototype.hasOwnProperty.call(body, "tracking_code")) {
    patch.tracking_code = String(body.trackingCode || body.tracking_code || "").trim();
  }

  updateRow("orders", order._row, patch);

  const items = readRows("order_items").filter(function (item) {
    return item.order_id === id;
  });

  return { ok: true, order: publicOrder(Object.assign({}, order, patch), items) };
}

function cancelOrder(body) {
  const user = requireOrderManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const id = String(body.id || "");
    const orders = readRows("orders");
    const order = orders.find(function (item) {
      return item.id === id && item.status !== "deleted";
    });

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return { ok: true, order: publicOrder(order, readRows("order_items").filter(function (item) { return item.order_id === id; })) };
    }
    if (Number(order.returned_amount || 0) > 0 || Number(order.refunded_amount || 0) > 0) {
      return { ok: false, error: "Cannot cancel an order with returns or refunds" };
    }
    if (orderCollectedAmount(order) > 0) {
      return { ok: false, error: "Refund collected payments before cancelling the order" };
    }

    const now = nowIso();
    const items = readRows("order_items").filter(function (item) {
      return item.order_id === id;
    });
    const products = readRows("products");
    items.forEach(function (item) {
      const product = products.find(function (candidate) {
        return candidate.id === item.product_id && candidate.status !== "deleted";
      });
      if (product) {
        const stockBefore = Number(product.stock || 0);
        const stockAfter = stockBefore + Number(item.quantity || 0);
        updateRow("products", product._row, {
          stock: stockAfter,
          updated_at: now
        });
        logStockMovement({
          product: product,
          type: "order_cancel",
          quantityDelta: Number(item.quantity || 0),
          stockBefore: stockBefore,
          stockAfter: stockAfter,
          reason: "Hủy đơn " + order.code,
          referenceType: "order",
          referenceId: order.id,
          createdBy: user.id,
          createdAt: now
        });
      }
    });

    const customer = readRows("customers").find(function (item) {
      return item.id === order.customer_id && item.status !== "deleted";
    });
    if (customer) {
      const activeOrders = orders
        .filter(function (item) {
          return item.id !== id && item.customer_id === customer.id && ["pending", "confirmed", "packed", "shipping", "paid", "completed"].indexOf(item.status) !== -1;
        })
        .sort(function (a, b) {
          return String(b.created_at).localeCompare(String(a.created_at));
        });
      updateRow("customers", customer._row, {
        total_spent: Math.max(0, Number(customer.total_spent || 0) - Number(order.total || 0)),
        last_order_at: activeOrders[0] ? activeOrders[0].created_at : "",
        updated_at: now
      });
    }

    const patch = {
      status: "cancelled",
      payment_status: "unpaid",
      updated_at: now
    };
    updateRow("orders", order._row, patch);

    return { ok: true, order: publicOrder(Object.assign({}, order, patch), items) };
  } finally {
    lock.releaseLock();
  }
}

function orderCollectedAmount(order) {
  return readRows("cash_transactions")
    .filter(function (transaction) {
      return transaction.status !== "deleted" &&
        transaction.type === "income" &&
        transaction.reference_type === "order" &&
        [order.id, order.code].indexOf(transaction.reference_id) !== -1;
    })
    .reduce(function (sum, transaction) { return sum + Number(transaction.amount || 0); }, 0);
}

function orderRefundableAmount(order) {
  const returnedAmount = Number(order.returned_amount || 0);
  const refundedAmount = Number(order.refunded_amount || 0);
  const collectedAmount = orderCollectedAmount(order);
  return Math.max(0, Math.min(returnedAmount - refundedAmount, collectedAmount - refundedAmount));
}

function createOrderRefundInternal(order, user, body, salesReturnId) {
  const amount = Number(body.refundAmount || body.amount || 0);
  const maximum = orderRefundableAmount(order);
  if (!isFinite(amount) || amount <= 0 || amount > maximum) {
    throw new Error("Refund amount is invalid");
  }

  const accountId = String(body.accountId || body.account_id || "");
  const categoryId = String(body.categoryId || body.category_id || "");
  const account = readRows("accounting_accounts").find(function (item) {
    return item.id === accountId && item.status === "active";
  });
  const category = readRows("accounting_categories").find(function (item) {
    return item.id === categoryId && item.type === "expense" && item.status === "active";
  });
  if (!account || !category) throw new Error("Refund account or expense category is invalid");

  const refundDate = String(body.refundDate || body.refund_date || nowIso().slice(0, 10)).slice(0, 10);
  const note = String(body.refundNote || body.note || "").trim();
  const now = nowIso();
  const cashTransaction = {
    id: Utilities.getUuid(),
    type: "expense",
    account_id: accountId,
    category_id: categoryId,
    amount: amount,
    transaction_date: refundDate,
    description: note || "Hoàn tiền đơn " + order.code,
    reference_type: "order_refund",
    reference_id: order.code,
    created_by: user.id,
    status: "active",
    created_at: now,
    updated_at: now
  };
  appendRow("cash_transactions", cashTransaction);

  const refund = {
    id: Utilities.getUuid(),
    order_id: order.id,
    sales_return_id: salesReturnId || "",
    cash_transaction_id: cashTransaction.id,
    account_id: accountId,
    category_id: categoryId,
    amount: amount,
    refund_date: refundDate,
    note: note,
    created_by: user.id,
    created_at: now
  };
  appendRow("order_refunds", refund);

  const refundedAmount = Number(order.refunded_amount || 0) + amount;
  const netTotal = Math.max(0, Number(order.total || 0) - Number(order.returned_amount || 0));
  const netCollected = Math.max(0, orderCollectedAmount(order) - refundedAmount);
  const paymentStatus = netTotal === 0 && refundedAmount > 0 ? "refunded" : netCollected >= netTotal ? "paid" : "unpaid";
  const patch = { refunded_amount: refundedAmount, payment_status: paymentStatus, updated_at: now };
  updateRow("orders", order._row, patch);

  return {
    order: Object.assign({}, order, patch),
    refund: refund,
    cashTransaction: cashTransaction
  };
}

function returnOrder(body) {
  const user = requireOrderManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || body.orderId || body.order_id || "");
    const order = readRows("orders").find(function (item) {
      return item.id === id && item.status !== "deleted" && item.status !== "cancelled";
    });
    if (!order) return { ok: false, error: "Order is not eligible for return" };

    let requestedItems = body.items || [];
    if (typeof requestedItems === "string") requestedItems = JSON.parse(requestedItems);
    if (!Array.isArray(requestedItems) || !requestedItems.length) return { ok: false, error: "Return must include items" };
    const requestedByItem = {};
    requestedItems.forEach(function (item) {
      const itemId = String(item.orderItemId || item.order_item_id || item.id || "");
      const quantity = Number(item.quantity || 0);
      if (!itemId || !isFinite(quantity) || quantity < 0) throw new Error("Return item is invalid");
      if (quantity > 0) requestedByItem[itemId] = (requestedByItem[itemId] || 0) + quantity;
    });
    if (!Object.keys(requestedByItem).length) return { ok: false, error: "Return quantity is required" };

    const orderItems = readRows("order_items").filter(function (item) { return item.order_id === id; });
    const previousReturnItems = readRows("sales_return_items");
    const returnedByItem = {};
    previousReturnItems.forEach(function (item) {
      returnedByItem[item.order_item_id] = (returnedByItem[item.order_item_id] || 0) + Number(item.quantity || 0);
    });
    const selectedItems = Object.keys(requestedByItem).map(function (itemId) {
      const item = orderItems.find(function (candidate) { return candidate.id === itemId; });
      if (!item) throw new Error("Order item not found");
      const available = Number(item.quantity || 0) - Number(returnedByItem[itemId] || 0);
      const quantity = requestedByItem[itemId];
      if (quantity > available) throw new Error("Return quantity exceeds the remaining sold quantity");
      return { item: item, quantity: quantity, lineTotal: quantity * Number(item.unit_price || 0) };
    });

    const oldReturnedAmount = Number(order.returned_amount || 0);
    const rawReturnAmount = selectedItems.reduce(function (sum, entry) { return sum + entry.lineTotal; }, 0);
    const returnAmount = Math.min(rawReturnAmount, Math.max(0, Number(order.total || 0) - oldReturnedAmount));
    if (returnAmount <= 0) return { ok: false, error: "Order has no returnable value" };

    const products = readRows("products");
    selectedItems.forEach(function (entry) {
      const product = products.find(function (candidate) {
        return candidate.id === entry.item.product_id && candidate.status !== "deleted";
      });
      if (!product) throw new Error("Product not found for returned item");
      entry.product = product;
    });

    const requestedRefund = Number(body.refundAmount || 0);
    if (requestedRefund > 0) {
      if (user.role !== "admin") throw new Error("Admin access required for customer refunds");
      const futureReturnedAmount = oldReturnedAmount + returnAmount;
      const refundedAmount = Number(order.refunded_amount || 0);
      const maximumRefund = Math.max(0, Math.min(futureReturnedAmount - refundedAmount, orderCollectedAmount(order) - refundedAmount));
      if (!isFinite(requestedRefund) || requestedRefund > maximumRefund) throw new Error("Refund amount is invalid");
      const accountId = String(body.accountId || body.account_id || "");
      const categoryId = String(body.categoryId || body.category_id || "");
      const validAccount = readRows("accounting_accounts").some(function (item) { return item.id === accountId && item.status === "active"; });
      const validCategory = readRows("accounting_categories").some(function (item) { return item.id === categoryId && item.type === "expense" && item.status === "active"; });
      if (!validAccount || !validCategory) throw new Error("Refund account or expense category is invalid");
    }

    const now = nowIso();
    const salesReturn = {
      id: Utilities.getUuid(),
      code: nextSalesReturnCode(readRows("sales_returns")),
      order_id: order.id,
      customer_id: order.customer_id,
      amount: returnAmount,
      note: String(body.note || "").trim(),
      created_by: user.id,
      created_at: now
    };
    appendRow("sales_returns", salesReturn);

    const savedItems = selectedItems.map(function (entry) {
      const product = entry.product;
      const stockBefore = Number(product.stock || 0);
      const stockAfter = stockBefore + entry.quantity;
      updateRow("products", product._row, { stock: stockAfter, updated_at: now });
      logStockMovement({ product: product, type: "sales_return", quantityDelta: entry.quantity, stockBefore: stockBefore, stockAfter: stockAfter, reason: "Khách trả hàng " + salesReturn.code, referenceType: "sales_return", referenceId: salesReturn.id, createdBy: user.id, createdAt: now });
      const saved = {
        id: Utilities.getUuid(), return_id: salesReturn.id, order_item_id: entry.item.id,
        product_id: entry.item.product_id, sku: entry.item.sku, name: entry.item.name,
        quantity: entry.quantity, unit_price: Number(entry.item.unit_price || 0),
        cost_price: Number(entry.item.cost_price || 0), line_total: entry.lineTotal, created_at: now
      };
      appendRow("sales_return_items", saved);
      return saved;
    });

    const returnedAmount = oldReturnedAmount + returnAmount;
    const allItemsReturned = orderItems.every(function (item) {
      return Number(returnedByItem[item.id] || 0) + Number(requestedByItem[item.id] || 0) >= Number(item.quantity || 0);
    });
    const collectedAmount = orderCollectedAmount(order);
    const netTotal = Math.max(0, Number(order.total || 0) - returnedAmount);
    const netCollected = Math.max(0, collectedAmount - Number(order.refunded_amount || 0));
    const orderPatch = {
      returned_amount: returnedAmount,
      payment_status: netCollected >= netTotal && netTotal > 0 ? "paid" : "unpaid",
      shipping_status: allItemsReturned ? "returned" : order.shipping_status,
      updated_at: now
    };
    updateRow("orders", order._row, orderPatch);
    let savedOrder = Object.assign({}, order, orderPatch);

    const customer = readRows("customers").find(function (item) {
      return item.id === order.customer_id && item.status !== "deleted";
    });
    let savedCustomer = customer;
    if (customer) {
      const customerPatch = { total_spent: Math.max(0, Number(customer.total_spent || 0) - returnAmount), updated_at: now };
      updateRow("customers", customer._row, customerPatch);
      savedCustomer = Object.assign({}, customer, customerPatch);
    }

    let refundResult = null;
    if (requestedRefund > 0) {
      refundResult = createOrderRefundInternal(savedOrder, user, body, salesReturn.id);
      savedOrder = refundResult.order;
    }

    return {
      ok: true,
      order: publicOrder(savedOrder, orderItems),
      salesReturn: publicSalesReturn(salesReturn, savedItems),
      refund: refundResult ? publicOrderRefund(refundResult.refund) : null,
      transaction: refundResult ? publicCashTransaction(refundResult.cashTransaction) : null,
      customer: savedCustomer ? publicCustomer(savedCustomer) : null
    };
  } finally {
    lock.releaseLock();
  }
}

function refundOrder(body) {
  const user = requireAccountingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || body.orderId || body.order_id || "");
    const order = readRows("orders").find(function (item) {
      return item.id === id && item.status !== "deleted" && item.status !== "cancelled";
    });
    if (!order) return { ok: false, error: "Order is not eligible for refund" };
    const result = createOrderRefundInternal(order, user, body, "");
    const items = readRows("order_items").filter(function (item) { return item.order_id === order.id; });
    return {
      ok: true,
      order: publicOrder(result.order, items),
      refund: publicOrderRefund(result.refund),
      transaction: publicCashTransaction(result.cashTransaction)
    };
  } finally {
    lock.releaseLock();
  }
}

function requirePurchasingManager(token) {
  const user = requireUser(token);
  if (["admin", "inventory"].indexOf(user.role) === -1) {
    throw new Error("Purchasing access required");
  }
  return user;
}

function normalizeSupplierInput(body) {
  const name = String(body.name || "").trim();
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const taxCode = String(body.taxCode || body.tax_code || "").trim();
  const address = String(body.address || "").trim();
  const note = String(body.note || "").trim();

  if (!name || !phone) {
    throw new Error("Supplier name and phone are required");
  }
  if (email && email.indexOf("@") === -1) {
    throw new Error("Supplier email is invalid");
  }

  return { name: name, phone: phone, email: email, taxCode: taxCode, address: address, note: note };
}

function publicSupplier(supplier) {
  return {
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email || "",
    taxCode: supplier.tax_code || "",
    address: supplier.address || "",
    status: supplier.status || "active",
    totalPurchased: Number(supplier.total_purchased || 0),
    outstanding: Number(supplier.outstanding || 0),
    creditBalance: Number(supplier.credit_balance || 0),
    lastPurchaseAt: supplier.last_purchase_at || "",
    note: supplier.note || "",
    createdAt: supplier.created_at || "",
    updatedAt: supplier.updated_at || ""
  };
}

function publicPurchaseOrderItem(item) {
  return {
    id: item.id,
    purchaseOrderId: item.purchase_order_id,
    productId: item.product_id,
    sku: item.sku,
    name: item.name,
    quantity: Number(item.quantity || 0),
    unitCost: Number(item.unit_cost || 0),
    lineTotal: Number(item.line_total || 0),
    createdAt: item.created_at || ""
  };
}

function publicPurchaseOrder(order, items) {
  const total = Number(order.total || 0);
  const paidAmount = Number(order.paid_amount || 0);
  const returnedAmount = Number(order.returned_amount || 0);
  const creditAppliedAmount = Number(order.credit_applied_amount || 0);
  const netTotal = Math.max(0, total - returnedAmount);
  const settledAmount = paidAmount + creditAppliedAmount;
  return {
    id: order.id,
    code: order.code,
    supplierId: order.supplier_id,
    status: order.status || "draft",
    paymentStatus: order.payment_status || "unpaid",
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    shippingFee: Number(order.shipping_fee || 0),
    total: total,
    paidAmount: paidAmount,
    creditAppliedAmount: creditAppliedAmount,
    settledAmount: settledAmount,
    returnedAmount: returnedAmount,
    netTotal: netTotal,
    outstanding: Math.max(0, netTotal - settledAmount),
    creditAmount: Math.max(0, settledAmount - netTotal),
    dueDate: order.due_date || "",
    invoiceNumber: order.invoice_number || "",
    note: order.note || "",
    createdBy: order.created_by || "",
    receivedAt: order.received_at || "",
    createdAt: order.created_at || "",
    updatedAt: order.updated_at || "",
    items: (items || []).map(publicPurchaseOrderItem)
  };
}

function publicSupplierPayment(payment) {
  return {
    id: payment.id,
    purchaseOrderId: payment.purchase_order_id,
    supplierId: payment.supplier_id,
    cashTransactionId: payment.cash_transaction_id,
    amount: Number(payment.amount || 0),
    paymentDate: payment.payment_date || "",
    note: payment.note || "",
    createdBy: payment.created_by || "",
    createdAt: payment.created_at || ""
  };
}

function publicPurchaseReturnItem(item) {
  return {
    id: item.id,
    returnId: item.return_id,
    purchaseOrderItemId: item.purchase_order_item_id,
    productId: item.product_id,
    sku: item.sku,
    name: item.name,
    quantity: Number(item.quantity || 0),
    unitCost: Number(item.unit_cost || 0),
    lineTotal: Number(item.line_total || 0),
    createdAt: item.created_at || ""
  };
}

function publicPurchaseReturn(purchaseReturn, items) {
  return {
    id: purchaseReturn.id,
    code: purchaseReturn.code,
    purchaseOrderId: purchaseReturn.purchase_order_id,
    supplierId: purchaseReturn.supplier_id,
    amount: Number(purchaseReturn.amount || 0),
    note: purchaseReturn.note || "",
    createdBy: purchaseReturn.created_by || "",
    createdAt: purchaseReturn.created_at || "",
    items: (items || []).map(publicPurchaseReturnItem)
  };
}

function publicSupplierCreditApplication(application) {
  return {
    id: application.id,
    supplierId: application.supplier_id,
    purchaseOrderId: application.purchase_order_id,
    amount: Number(application.amount || 0),
    note: application.note || "",
    createdBy: application.created_by || "",
    createdAt: application.created_at || ""
  };
}

function nextSupplierCode(suppliers) {
  return "NCC-" + String(suppliers.length + 1).padStart(4, "0");
}

function nextPurchaseOrderCode(orders) {
  const today = new Date();
  const prefix = "PO-" + Utilities.formatDate(today, VIETNAM_TIMEZONE, "yyyyMMdd") + "-";
  const count = orders.filter(function (order) { return String(order.code || "").indexOf(prefix) === 0; }).length;
  return prefix + String(count + 1).padStart(4, "0");
}

function nextPurchaseReturnCode(returns) {
  const today = new Date();
  const prefix = "RTN-" + Utilities.formatDate(today, VIETNAM_TIMEZONE, "yyyyMMdd") + "-";
  const count = returns.filter(function (item) { return String(item.code || "").indexOf(prefix) === 0; }).length;
  return prefix + String(count + 1).padStart(4, "0");
}

function getPurchasingData(body) {
  requireUser(body.token);
  const suppliers = readRows("suppliers").filter(function (supplier) { return supplier.status !== "deleted"; });
  const items = readRows("purchase_order_items");
  const itemsByOrder = {};
  items.forEach(function (item) {
    if (!itemsByOrder[item.purchase_order_id]) itemsByOrder[item.purchase_order_id] = [];
    itemsByOrder[item.purchase_order_id].push(item);
  });
  const orders = readRows("purchase_orders")
    .filter(function (order) { return order.status !== "deleted"; })
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  const payments = readRows("supplier_payments")
    .sort(function (a, b) { return String(b.payment_date || b.created_at).localeCompare(String(a.payment_date || a.created_at)); });
  const returnItems = readRows("purchase_return_items");
  const returnItemsByReturn = {};
  returnItems.forEach(function (item) {
    if (!returnItemsByReturn[item.return_id]) returnItemsByReturn[item.return_id] = [];
    returnItemsByReturn[item.return_id].push(item);
  });
  const returns = readRows("purchase_returns")
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  const creditApplications = readRows("supplier_credit_applications")
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });

  return {
    ok: true,
    suppliers: suppliers.map(publicSupplier),
    purchaseOrders: orders.map(function (order) {
      return publicPurchaseOrder(order, itemsByOrder[order.id] || []);
    }),
    supplierPayments: payments.map(publicSupplierPayment),
    purchaseReturns: returns.map(function (purchaseReturn) {
      return publicPurchaseReturn(purchaseReturn, returnItemsByReturn[purchaseReturn.id] || []);
    }),
    supplierCreditApplications: creditApplications.map(publicSupplierCreditApplication)
  };
}

function getPageData(body) {
  requireUser(body.token);

  let scopes = body.scopes || [];
  if (typeof scopes === "string") {
    try {
      scopes = JSON.parse(scopes);
    } catch (err) {
      scopes = scopes.split(",");
    }
  }
  if (!Array.isArray(scopes)) scopes = [];

  const allowedScopes = ["products", "customers", "orders", "stockMovements", "accounting", "purchasing", "content", "team", "settings"];
  const requested = {};
  scopes.forEach(function (scope) {
    const normalized = String(scope || "").trim();
    if (allowedScopes.indexOf(normalized) !== -1) requested[normalized] = true;
  });

  const payload = { ok: true };
  function merge(result) {
    Object.keys(result || {}).forEach(function (key) {
      if (key !== "ok") payload[key] = result[key];
    });
  }

  if (requested.products) merge(listProducts(body));
  if (requested.customers) merge(listCustomers(body));
  if (requested.orders) merge(listOrders(body));
  if (requested.stockMovements) merge(listStockMovements(body));
  if (requested.accounting) merge(getAccountingData(body));
  if (requested.purchasing) merge(getPurchasingData(body));
  if (requested.content) merge(getContentWorkspaceData(body));
  if (requested.team) merge(getTeamWorkspaceData(body));
  if (requested.settings) merge(getAppSettings(body));

  return payload;
}

function createSupplier(body) {
  requirePurchasingManager(body.token);
  const input = normalizeSupplierInput(body);
  const suppliers = readRows("suppliers");
  if (suppliers.some(function (supplier) { return supplier.status !== "deleted" && normalizePhone(supplier.phone) === input.phone; })) {
    return { ok: false, error: "Supplier phone already exists" };
  }
  if (input.taxCode && suppliers.some(function (supplier) { return supplier.status !== "deleted" && String(supplier.tax_code || "") === input.taxCode; })) {
    return { ok: false, error: "Supplier tax code already exists" };
  }

  const now = nowIso();
  const supplier = {
    id: Utilities.getUuid(),
    code: nextSupplierCode(suppliers),
    name: input.name,
    phone: input.phone,
    email: input.email,
    tax_code: input.taxCode,
    address: input.address,
    status: "active",
    total_purchased: 0,
    outstanding: 0,
    last_purchase_at: "",
    note: input.note,
    created_at: now,
    updated_at: now,
    credit_balance: 0
  };
  appendRow("suppliers", supplier);
  return { ok: true, supplier: publicSupplier(supplier) };
}

function updateSupplier(body) {
  requirePurchasingManager(body.token);
  const id = String(body.id || "");
  const input = normalizeSupplierInput(body);
  const suppliers = readRows("suppliers");
  const supplier = suppliers.find(function (item) { return item.id === id && item.status !== "deleted"; });
  if (!supplier) return { ok: false, error: "Supplier not found" };
  if (suppliers.some(function (item) { return item.id !== id && item.status !== "deleted" && normalizePhone(item.phone) === input.phone; })) {
    return { ok: false, error: "Supplier phone already exists" };
  }
  if (input.taxCode && suppliers.some(function (item) { return item.id !== id && item.status !== "deleted" && String(item.tax_code || "") === input.taxCode; })) {
    return { ok: false, error: "Supplier tax code already exists" };
  }

  const patch = { name: input.name, phone: input.phone, email: input.email, tax_code: input.taxCode, address: input.address, note: input.note, updated_at: nowIso() };
  updateRow("suppliers", supplier._row, patch);
  return { ok: true, supplier: publicSupplier(Object.assign({}, supplier, patch)) };
}

function archiveSupplier(body) {
  requirePurchasingManager(body.token);
  const id = String(body.id || "");
  const nextStatus = String(body.status || "archived") === "active" ? "active" : "archived";
  const supplier = readRows("suppliers").find(function (item) { return item.id === id && item.status !== "deleted"; });
  if (!supplier) return { ok: false, error: "Supplier not found" };
  if (nextStatus === "archived" && (Number(supplier.outstanding || 0) > 0 || Number(supplier.credit_balance || 0) > 0)) {
    return { ok: false, error: "Cannot archive supplier with an unsettled balance" };
  }
  const patch = { status: nextStatus, updated_at: nowIso() };
  updateRow("suppliers", supplier._row, patch);
  return { ok: true, supplier: publicSupplier(Object.assign({}, supplier, patch)) };
}

function parsePurchaseItems(body) {
  let items = body.items || [];
  if (typeof items === "string") items = JSON.parse(items);
  if (!Array.isArray(items) || !items.length) throw new Error("Purchase order must include items");
  return items.map(function (item) {
    const productId = String(item.productId || item.product_id || "");
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost || item.unit_cost);
    if (!productId || !isFinite(quantity) || quantity < 1 || !isFinite(unitCost) || unitCost < 0) {
      throw new Error("Purchase item is invalid");
    }
    return { productId: productId, quantity: quantity, unitCost: unitCost };
  });
}

function createPurchaseOrder(body) {
  const user = requirePurchasingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const supplierId = String(body.supplierId || body.supplier_id || "");
    const supplier = readRows("suppliers").find(function (item) { return item.id === supplierId && item.status === "active"; });
    if (!supplier) return { ok: false, error: "Supplier not found or inactive" };
    const invoiceNumber = String(body.invoiceNumber || body.invoice_number || "").trim();
    if (invoiceNumber && readRows("purchase_orders").some(function (order) {
      return order.supplier_id === supplierId && order.status !== "cancelled" &&
        String(order.invoice_number || "").trim().toLowerCase() === invoiceNumber.toLowerCase();
    })) return { ok: false, error: "Invoice number already exists for this supplier" };
    const inputItems = parsePurchaseItems(body);
    const products = readRows("products");
    const preparedItems = inputItems.map(function (item) {
      const product = products.find(function (candidate) { return candidate.id === item.productId && candidate.status === "active"; });
      if (!product) throw new Error("Product not found or inactive");
      return { product: product, quantity: item.quantity, unitCost: item.unitCost, lineTotal: item.quantity * item.unitCost };
    });
    const subtotal = preparedItems.reduce(function (sum, item) { return sum + item.lineTotal; }, 0);
    const discount = Number(body.discount || 0);
    const shippingFee = Number(body.shippingFee || body.shipping_fee || 0);
    if (![discount, shippingFee].every(function (value) { return isFinite(value) && value >= 0; })) throw new Error("Purchase totals are invalid");
    const total = Math.max(0, subtotal - discount + shippingFee);
    const now = nowIso();
    const order = {
      id: Utilities.getUuid(), code: nextPurchaseOrderCode(readRows("purchase_orders")), supplier_id: supplierId,
      status: "draft", payment_status: "unpaid", subtotal: subtotal, discount: discount, shipping_fee: shippingFee,
      total: total, paid_amount: 0, due_date: String(body.dueDate || body.due_date || "").slice(0, 10),
      invoice_number: invoiceNumber, note: String(body.note || "").trim(),
      created_by: user.id, received_at: "", created_at: now, updated_at: now, returned_amount: 0,
      credit_applied_amount: 0
    };
    appendRow("purchase_orders", order);
    const savedItems = preparedItems.map(function (item) {
      const saved = { id: Utilities.getUuid(), purchase_order_id: order.id, product_id: item.product.id, sku: item.product.sku, name: item.product.name, quantity: item.quantity, unit_cost: item.unitCost, line_total: item.lineTotal, created_at: now };
      appendRow("purchase_order_items", saved);
      return saved;
    });
    return { ok: true, purchaseOrder: publicPurchaseOrder(order, savedItems) };
  } finally {
    lock.releaseLock();
  }
}

function updatePurchaseOrder(body) {
  const user = requirePurchasingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || "");
    const orders = readRows("purchase_orders");
    const order = orders.find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!order) return { ok: false, error: "Purchase order not found" };
    if (order.status !== "draft") return { ok: false, error: "Only draft purchase orders can be edited" };

    const supplierId = String(body.supplierId || body.supplier_id || "");
    const supplier = readRows("suppliers").find(function (item) { return item.id === supplierId && item.status === "active"; });
    if (!supplier) return { ok: false, error: "Supplier not found or inactive" };
    const invoiceNumber = String(body.invoiceNumber || body.invoice_number || "").trim();
    if (invoiceNumber && orders.some(function (item) {
      return item.id !== id && item.supplier_id === supplierId && item.status !== "cancelled" &&
        String(item.invoice_number || "").trim().toLowerCase() === invoiceNumber.toLowerCase();
    })) return { ok: false, error: "Invoice number already exists for this supplier" };

    const inputItems = parsePurchaseItems(body);
    const products = readRows("products");
    const preparedItems = inputItems.map(function (item) {
      const product = products.find(function (candidate) { return candidate.id === item.productId && candidate.status === "active"; });
      if (!product) throw new Error("Product not found or inactive");
      return { product: product, quantity: item.quantity, unitCost: item.unitCost, lineTotal: item.quantity * item.unitCost };
    });
    const subtotal = preparedItems.reduce(function (sum, item) { return sum + item.lineTotal; }, 0);
    const discount = Number(body.discount || 0);
    const shippingFee = Number(body.shippingFee || body.shipping_fee || 0);
    if (![discount, shippingFee].every(function (value) { return isFinite(value) && value >= 0; })) throw new Error("Purchase totals are invalid");
    const now = nowIso();
    const patch = {
      supplier_id: supplierId,
      subtotal: subtotal,
      discount: discount,
      shipping_fee: shippingFee,
      total: Math.max(0, subtotal - discount + shippingFee),
      due_date: String(body.dueDate || body.due_date || "").slice(0, 10),
      invoice_number: invoiceNumber,
      note: String(body.note || "").trim(),
      updated_at: now
    };
    updateRow("purchase_orders", order._row, patch);

    const existingItems = readRows("purchase_order_items").filter(function (item) { return item.purchase_order_id === id; });
    deleteRows("purchase_order_items", existingItems.map(function (item) { return item._row; }));
    const savedItems = preparedItems.map(function (item) {
      const saved = { id: Utilities.getUuid(), purchase_order_id: id, product_id: item.product.id, sku: item.product.sku, name: item.product.name, quantity: item.quantity, unit_cost: item.unitCost, line_total: item.lineTotal, created_at: now };
      appendRow("purchase_order_items", saved);
      return saved;
    });

    return { ok: true, purchaseOrder: publicPurchaseOrder(Object.assign({}, order, patch), savedItems), updatedBy: user.id };
  } finally {
    lock.releaseLock();
  }
}

function receivePurchaseOrder(body) {
  const user = requirePurchasingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || "");
    const order = readRows("purchase_orders").find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!order) return { ok: false, error: "Purchase order not found" };
    if (order.status !== "draft") return { ok: false, error: "Only draft purchase orders can be received" };
    const now = nowIso();
    const items = readRows("purchase_order_items").filter(function (item) { return item.purchase_order_id === id; });
    const products = readRows("products");
    items.forEach(function (item) {
      const product = products.find(function (candidate) { return candidate.id === item.product_id && candidate.status !== "deleted"; });
      if (!product) throw new Error("Product not found");
      const stockBefore = Number(product.stock || 0);
      const stockAfter = stockBefore + Number(item.quantity || 0);
      updateRow("products", product._row, { stock: stockAfter, cost_price: Number(item.unit_cost || product.cost_price || 0), updated_at: now });
      logStockMovement({ product: product, type: "purchase_receive", quantityDelta: Number(item.quantity || 0), stockBefore: stockBefore, stockAfter: stockAfter, reason: "Nhận hàng " + order.code, referenceType: "purchase_order", referenceId: order.id, createdBy: user.id, createdAt: now });
    });
    const patch = { status: "received", received_at: now, updated_at: now };
    updateRow("purchase_orders", order._row, patch);
    const supplier = readRows("suppliers").find(function (item) { return item.id === order.supplier_id && item.status !== "deleted"; });
    if (supplier) updateRow("suppliers", supplier._row, { total_purchased: Number(supplier.total_purchased || 0) + Number(order.total || 0), outstanding: Number(supplier.outstanding || 0) + Number(order.total || 0), last_purchase_at: now, updated_at: now });
    return { ok: true, purchaseOrder: publicPurchaseOrder(Object.assign({}, order, patch), items) };
  } finally {
    lock.releaseLock();
  }
}

function payPurchaseOrder(body) {
  const user = requireAccountingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || "");
    const order = readRows("purchase_orders").find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!order || order.status !== "received") return { ok: false, error: "Purchase order is not payable" };
    const netTotal = Math.max(0, Number(order.total || 0) - Number(order.returned_amount || 0));
    const creditAppliedAmount = Number(order.credit_applied_amount || 0);
    const outstanding = Math.max(0, netTotal - Number(order.paid_amount || 0) - creditAppliedAmount);
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0 || amount > outstanding) return { ok: false, error: "Payment amount is invalid" };
    const accountId = String(body.accountId || body.account_id || "");
    const categoryId = String(body.categoryId || body.category_id || "");
    const account = readRows("accounting_accounts").find(function (item) { return item.id === accountId && item.status === "active"; });
    const category = readRows("accounting_categories").find(function (item) { return item.id === categoryId && item.type === "expense" && item.status === "active"; });
    if (!account || !category) return { ok: false, error: "Payment account or expense category is invalid" };
    const paymentDate = String(body.paymentDate || body.payment_date || nowIso().slice(0, 10)).slice(0, 10);
    const note = String(body.note || "").trim();
    const now = nowIso();
    const cashTransaction = { id: Utilities.getUuid(), type: "expense", account_id: accountId, category_id: categoryId, amount: amount, transaction_date: paymentDate, description: note || "Thanh toán " + order.code, reference_type: "purchase_order", reference_id: order.code, created_by: user.id, status: "active", created_at: now, updated_at: now };
    appendRow("cash_transactions", cashTransaction);
    const payment = { id: Utilities.getUuid(), purchase_order_id: order.id, supplier_id: order.supplier_id, cash_transaction_id: cashTransaction.id, amount: amount, payment_date: paymentDate, note: note, created_by: user.id, created_at: now };
    appendRow("supplier_payments", payment);
    const paidAmount = Number(order.paid_amount || 0) + amount;
    const settledAmount = paidAmount + creditAppliedAmount;
    const patch = { paid_amount: paidAmount, payment_status: settledAmount >= netTotal ? "paid" : "partial", updated_at: now };
    updateRow("purchase_orders", order._row, patch);
    const supplier = readRows("suppliers").find(function (item) { return item.id === order.supplier_id && item.status !== "deleted"; });
    if (supplier) updateRow("suppliers", supplier._row, { outstanding: Math.max(0, Number(supplier.outstanding || 0) - amount), updated_at: now });
    const items = readRows("purchase_order_items").filter(function (item) { return item.purchase_order_id === order.id; });
    return { ok: true, purchaseOrder: publicPurchaseOrder(Object.assign({}, order, patch), items), payment: publicSupplierPayment(payment), transaction: publicCashTransaction(cashTransaction) };
  } finally {
    lock.releaseLock();
  }
}

function cancelPurchaseOrder(body) {
  const user = requirePurchasingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || "");
    const order = readRows("purchase_orders").find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!order) return { ok: false, error: "Purchase order not found" };
    if (order.status === "cancelled") return { ok: true, purchaseOrder: publicPurchaseOrder(order, []) };
    if (Number(order.paid_amount || 0) > 0) return { ok: false, error: "Cannot cancel a paid purchase order" };
    if (Number(order.credit_applied_amount || 0) > 0) return { ok: false, error: "Cannot cancel a purchase order with applied supplier credit" };
    if (Number(order.returned_amount || 0) > 0) return { ok: false, error: "Cannot cancel a purchase order with returns" };
    const items = readRows("purchase_order_items").filter(function (item) { return item.purchase_order_id === id; });
    const now = nowIso();
    if (order.status === "received") {
      const products = readRows("products");
      items.forEach(function (item) {
        const product = products.find(function (candidate) { return candidate.id === item.product_id && candidate.status !== "deleted"; });
        if (!product || Number(product.stock || 0) < Number(item.quantity || 0)) throw new Error("Cannot reverse received stock because items have been used or sold");
      });
      items.forEach(function (item) {
        const product = products.find(function (candidate) { return candidate.id === item.product_id && candidate.status !== "deleted"; });
        const stockBefore = Number(product.stock || 0);
        const stockAfter = stockBefore - Number(item.quantity || 0);
        updateRow("products", product._row, { stock: stockAfter, updated_at: now });
        logStockMovement({ product: product, type: "purchase_cancel", quantityDelta: -Number(item.quantity || 0), stockBefore: stockBefore, stockAfter: stockAfter, reason: "Hủy phiếu mua " + order.code, referenceType: "purchase_order", referenceId: order.id, createdBy: user.id, createdAt: now });
      });
      const supplier = readRows("suppliers").find(function (item) { return item.id === order.supplier_id && item.status !== "deleted"; });
      if (supplier) updateRow("suppliers", supplier._row, { total_purchased: Math.max(0, Number(supplier.total_purchased || 0) - Number(order.total || 0)), outstanding: Math.max(0, Number(supplier.outstanding || 0) - Number(order.total || 0)), updated_at: now });
    }
    const patch = { status: "cancelled", payment_status: "unpaid", updated_at: now };
    updateRow("purchase_orders", order._row, patch);
    return { ok: true, purchaseOrder: publicPurchaseOrder(Object.assign({}, order, patch), items) };
  } finally {
    lock.releaseLock();
  }
}

function returnPurchaseOrder(body) {
  const user = requirePurchasingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || body.purchaseOrderId || body.purchase_order_id || "");
    const order = readRows("purchase_orders").find(function (item) { return item.id === id && item.status !== "deleted"; });
    if (!order || order.status !== "received") return { ok: false, error: "Only received purchase orders can be returned" };

    let requestedItems = body.items || [];
    if (typeof requestedItems === "string") requestedItems = JSON.parse(requestedItems);
    if (!Array.isArray(requestedItems) || !requestedItems.length) return { ok: false, error: "Return must include items" };
    const requestedByItem = {};
    requestedItems.forEach(function (item) {
      const itemId = String(item.purchaseOrderItemId || item.purchase_order_item_id || item.id || "");
      const quantity = Number(item.quantity || 0);
      if (!itemId || !isFinite(quantity) || quantity < 0) throw new Error("Return item is invalid");
      if (quantity > 0) requestedByItem[itemId] = (requestedByItem[itemId] || 0) + quantity;
    });
    if (!Object.keys(requestedByItem).length) return { ok: false, error: "Return quantity is required" };

    const orderItems = readRows("purchase_order_items").filter(function (item) { return item.purchase_order_id === id; });
    const previousReturnItems = readRows("purchase_return_items");
    const returnedByItem = {};
    previousReturnItems.forEach(function (item) {
      returnedByItem[item.purchase_order_item_id] = (returnedByItem[item.purchase_order_item_id] || 0) + Number(item.quantity || 0);
    });
    const selectedItems = Object.keys(requestedByItem).map(function (itemId) {
      const item = orderItems.find(function (candidate) { return candidate.id === itemId; });
      if (!item) throw new Error("Purchase order item not found");
      const available = Number(item.quantity || 0) - Number(returnedByItem[itemId] || 0);
      const quantity = requestedByItem[itemId];
      if (quantity > available) throw new Error("Return quantity exceeds the remaining received quantity");
      return { item: item, quantity: quantity, lineTotal: quantity * Number(item.unit_cost || 0) };
    });

    const products = readRows("products");
    selectedItems.forEach(function (entry) {
      const product = products.find(function (candidate) { return candidate.id === entry.item.product_id && candidate.status !== "deleted"; });
      if (!product || Number(product.stock || 0) < entry.quantity) throw new Error("Cannot return items that are no longer in stock");
      entry.product = product;
    });

    const oldReturnedAmount = Number(order.returned_amount || 0);
    const rawReturnAmount = selectedItems.reduce(function (sum, entry) { return sum + entry.lineTotal; }, 0);
    const returnAmount = Math.min(rawReturnAmount, Math.max(0, Number(order.total || 0) - oldReturnedAmount));
    if (returnAmount <= 0) return { ok: false, error: "Purchase order has no refundable value" };

    const now = nowIso();
    const existingReturns = readRows("purchase_returns");
    const purchaseReturn = {
      id: Utilities.getUuid(),
      code: nextPurchaseReturnCode(existingReturns),
      purchase_order_id: order.id,
      supplier_id: order.supplier_id,
      amount: returnAmount,
      note: String(body.note || "").trim(),
      created_by: user.id,
      created_at: now
    };
    appendRow("purchase_returns", purchaseReturn);

    const savedItems = selectedItems.map(function (entry) {
      const stockBefore = Number(entry.product.stock || 0);
      const stockAfter = stockBefore - entry.quantity;
      updateRow("products", entry.product._row, { stock: stockAfter, updated_at: now });
      logStockMovement({ product: entry.product, type: "purchase_return", quantityDelta: -entry.quantity, stockBefore: stockBefore, stockAfter: stockAfter, reason: "Trả hàng " + purchaseReturn.code, referenceType: "purchase_return", referenceId: purchaseReturn.id, createdBy: user.id, createdAt: now });
      const saved = { id: Utilities.getUuid(), return_id: purchaseReturn.id, purchase_order_item_id: entry.item.id, product_id: entry.item.product_id, sku: entry.item.sku, name: entry.item.name, quantity: entry.quantity, unit_cost: Number(entry.item.unit_cost || 0), line_total: entry.lineTotal, created_at: now };
      appendRow("purchase_return_items", saved);
      return saved;
    });

    const paidAmount = Number(order.paid_amount || 0);
    const creditAppliedAmount = Number(order.credit_applied_amount || 0);
    const settledAmount = paidAmount + creditAppliedAmount;
    const oldNetTotal = Math.max(0, Number(order.total || 0) - oldReturnedAmount);
    const returnedAmount = oldReturnedAmount + returnAmount;
    const netTotal = Math.max(0, Number(order.total || 0) - returnedAmount);
    const oldOutstanding = Math.max(0, oldNetTotal - settledAmount);
    const newOutstanding = Math.max(0, netTotal - settledAmount);
    const oldCredit = Math.max(0, settledAmount - oldNetTotal);
    const newCredit = Math.max(0, settledAmount - netTotal);
    const paymentStatus = newCredit > 0 ? "credit" : settledAmount >= netTotal ? "paid" : settledAmount > 0 ? "partial" : "unpaid";
    const orderPatch = { returned_amount: returnedAmount, payment_status: paymentStatus, updated_at: now };
    updateRow("purchase_orders", order._row, orderPatch);

    const supplier = readRows("suppliers").find(function (item) { return item.id === order.supplier_id && item.status !== "deleted"; });
    let savedSupplier = supplier;
    if (supplier) {
      const supplierPatch = {
        total_purchased: Math.max(0, Number(supplier.total_purchased || 0) - returnAmount),
        outstanding: Math.max(0, Number(supplier.outstanding || 0) - (oldOutstanding - newOutstanding)),
        credit_balance: Math.max(0, Number(supplier.credit_balance || 0) + (newCredit - oldCredit)),
        updated_at: now
      };
      updateRow("suppliers", supplier._row, supplierPatch);
      savedSupplier = Object.assign({}, supplier, supplierPatch);
    }

    return {
      ok: true,
      purchaseOrder: publicPurchaseOrder(Object.assign({}, order, orderPatch), orderItems),
      purchaseReturn: publicPurchaseReturn(purchaseReturn, savedItems),
      supplier: savedSupplier ? publicSupplier(savedSupplier) : null
    };
  } finally {
    lock.releaseLock();
  }
}

function applySupplierCredit(body) {
  const user = requireAccountingManager(body.token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(body.id || body.purchaseOrderId || body.purchase_order_id || "");
    const order = readRows("purchase_orders").find(function (item) {
      return item.id === id && item.status === "received";
    });
    if (!order) return { ok: false, error: "Purchase order is not eligible for supplier credit" };

    const supplier = readRows("suppliers").find(function (item) {
      return item.id === order.supplier_id && item.status !== "deleted";
    });
    if (!supplier) return { ok: false, error: "Supplier not found" };

    const netTotal = Math.max(0, Number(order.total || 0) - Number(order.returned_amount || 0));
    const paidAmount = Number(order.paid_amount || 0);
    const currentApplied = Number(order.credit_applied_amount || 0);
    const outstanding = Math.max(0, netTotal - paidAmount - currentApplied);
    const availableCredit = Number(supplier.credit_balance || 0);
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0 || amount > outstanding || amount > availableCredit) {
      return { ok: false, error: "Supplier credit amount is invalid" };
    }

    const now = nowIso();
    const application = {
      id: Utilities.getUuid(),
      supplier_id: supplier.id,
      purchase_order_id: order.id,
      amount: amount,
      note: String(body.note || "").trim(),
      created_by: user.id,
      created_at: now
    };
    appendRow("supplier_credit_applications", application);

    const creditAppliedAmount = currentApplied + amount;
    const settledAmount = paidAmount + creditAppliedAmount;
    const orderPatch = {
      credit_applied_amount: creditAppliedAmount,
      payment_status: settledAmount >= netTotal ? "paid" : "partial",
      updated_at: now
    };
    updateRow("purchase_orders", order._row, orderPatch);

    const supplierPatch = {
      outstanding: Math.max(0, Number(supplier.outstanding || 0) - amount),
      credit_balance: Math.max(0, availableCredit - amount),
      updated_at: now
    };
    updateRow("suppliers", supplier._row, supplierPatch);

    const items = readRows("purchase_order_items").filter(function (item) {
      return item.purchase_order_id === order.id;
    });
    return {
      ok: true,
      purchaseOrder: publicPurchaseOrder(Object.assign({}, order, orderPatch), items),
      supplier: publicSupplier(Object.assign({}, supplier, supplierPatch)),
      creditApplication: publicSupplierCreditApplication(application)
    };
  } finally {
    lock.releaseLock();
  }
}

function ensureAccountingDefaults() {
  const now = nowIso();
  const accounts = readRows("accounting_accounts");
  if (!accounts.length) {
    [
      { name: "Tiền mặt", type: "cash" },
      { name: "Ngân hàng", type: "bank" },
      { name: "Ví sàn / COD", type: "wallet" }
    ].forEach(function (account) {
      appendRow("accounting_accounts", {
        id: Utilities.getUuid(),
        name: account.name,
        type: account.type,
        opening_balance: 0,
        status: "active",
        created_at: now,
        updated_at: now
      });
    });
  }

  const categories = readRows("accounting_categories");
  const defaults = [
    { name: "Thu bán hàng", type: "income" },
    { name: "Thu khác", type: "income" },
    { name: "Nhập hàng", type: "expense" },
    { name: "Vận chuyển", type: "expense" },
    { name: "Phí sàn / thanh toán", type: "expense" },
    { name: "Khuyến mãi / giảm giá", type: "expense" },
    { name: "Bao bì vật tư", type: "expense" },
    { name: "Marketing", type: "expense" },
    { name: "Lương / cộng tác viên", type: "expense" },
    { name: "Chi phí thuê mặt bằng", type: "expense" },
    { name: "Chi phí văn phòng", type: "expense" },
    { name: "Hoàn tiền khách hàng", type: "expense" },
    { name: "Chi khác", type: "expense" }
  ];

  defaults.forEach(function (category) {
    const exists = categories.some(function (item) {
      return item.status !== "deleted" &&
        item.type === category.type &&
        String(item.name || "").trim().toLowerCase() === category.name.toLowerCase();
    });
    if (!exists) {
      appendRow("accounting_categories", {
        id: Utilities.getUuid(),
        name: category.name,
        type: category.type,
        status: "active",
        created_at: now,
        updated_at: now
      });
      categories.push({ name: category.name, type: category.type, status: "active" });
    }
  });
}

function requireAccountingManager(token) {
  const user = requireUser(token);
  if (user.role !== "admin") {
    throw new Error("Accounting access required");
  }
  return user;
}

function normalizeAccountingType(type) {
  return String(type || "") === "expense" ? "expense" : "income";
}

function publicAccountingAccount(account, balance) {
  return {
    id: account.id,
    name: account.name,
    type: account.type || "cash",
    openingBalance: Number(account.opening_balance || 0),
    currentBalance: Number(balance || 0),
    status: account.status || "active",
    createdAt: account.created_at || "",
    updatedAt: account.updated_at || ""
  };
}

function publicAccountingCategory(category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type || "expense",
    status: category.status || "active",
    createdAt: category.created_at || "",
    updatedAt: category.updated_at || ""
  };
}

function publicAccountingReconciliation(reconciliation) {
  return {
    id: reconciliation.id,
    accountId: reconciliation.account_id,
    systemBalance: Number(reconciliation.system_balance || 0),
    actualBalance: Number(reconciliation.actual_balance || 0),
    difference: Number(reconciliation.difference || 0),
    note: reconciliation.note || "",
    reconciledBy: reconciliation.reconciled_by || "",
    reconciledAt: reconciliation.reconciled_at || "",
    createdAt: reconciliation.created_at || ""
  };
}

function publicCashTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type || "expense",
    accountId: transaction.account_id,
    categoryId: transaction.category_id,
    amount: Number(transaction.amount || 0),
    transactionDate: transaction.transaction_date || "",
    description: transaction.description || "",
    referenceType: transaction.reference_type || "",
    referenceId: transaction.reference_id || "",
    createdBy: transaction.created_by || "",
    status: transaction.status || "active",
    createdAt: transaction.created_at || "",
    updatedAt: transaction.updated_at || ""
  };
}

function calculateAccountBalances(accounts, transactions) {
  const balances = {};
  accounts.forEach(function (account) {
    balances[account.id] = Number(account.opening_balance || 0);
  });
  transactions
    .filter(function (transaction) { return transaction.status !== "deleted"; })
    .forEach(function (transaction) {
      const amount = Number(transaction.amount || 0);
      if (!balances.hasOwnProperty(transaction.account_id)) {
        balances[transaction.account_id] = 0;
      }
      balances[transaction.account_id] += transaction.type === "income" ? amount : -amount;
    });
  return balances;
}

function getAccountingData(body) {
  requireUser(body.token);

  const accounts = readRows("accounting_accounts").filter(function (account) {
    return account.status !== "deleted";
  });
  const categories = readRows("accounting_categories").filter(function (category) {
    return category.status !== "deleted";
  });
  const transactions = readRows("cash_transactions")
    .filter(function (transaction) {
      return transaction.status !== "deleted";
    })
    .sort(function (a, b) {
      return String(b.transaction_date || b.created_at).localeCompare(String(a.transaction_date || a.created_at));
    });
  const reconciliations = readRows("accounting_reconciliations")
    .sort(function (a, b) {
      return String(b.reconciled_at || b.created_at).localeCompare(String(a.reconciled_at || a.created_at));
    });
  const balances = calculateAccountBalances(accounts, transactions);

  return {
    ok: true,
    accounts: accounts.map(function (account) {
      return publicAccountingAccount(account, balances[account.id]);
    }),
    categories: categories.map(publicAccountingCategory),
    transactions: transactions.map(publicCashTransaction),
    reconciliations: reconciliations.map(publicAccountingReconciliation)
  };
}

function createAccountingAccount(body) {
  requireAccountingManager(body.token);

  const name = String(body.name || "").trim();
  const allowedTypes = ["cash", "bank", "wallet", "other"];
  const type = allowedTypes.indexOf(String(body.type || "cash")) === -1 ? "cash" : String(body.type || "cash");
  const openingBalance = Number(body.openingBalance || body.opening_balance || 0);

  if (!name || !isFinite(openingBalance)) {
    return { ok: false, error: "Accounting account is invalid" };
  }

  const accounts = readRows("accounting_accounts");
  if (accounts.some(function (account) {
    return account.status !== "deleted" && String(account.name || "").trim().toLowerCase() === name.toLowerCase();
  })) {
    return { ok: false, error: "Account already exists" };
  }

  const now = nowIso();
  const account = {
    id: Utilities.getUuid(),
    name: name,
    type: type,
    opening_balance: openingBalance,
    status: "active",
    created_at: now,
    updated_at: now
  };
  appendRow("accounting_accounts", account);

  return { ok: true, account: publicAccountingAccount(account, openingBalance) };
}

function updateAccountingAccount(body) {
  requireAccountingManager(body.token);

  const id = String(body.id || "");
  const name = String(body.name || "").trim();
  const allowedTypes = ["cash", "bank", "wallet", "other"];
  const type = allowedTypes.indexOf(String(body.type || "cash")) === -1 ? "cash" : String(body.type || "cash");
  const openingBalance = Number(body.openingBalance || body.opening_balance || 0);

  if (!id || !name || !isFinite(openingBalance)) {
    return { ok: false, error: "Accounting account is invalid" };
  }

  const accounts = readRows("accounting_accounts");
  const account = accounts.find(function (item) {
    return item.id === id && item.status !== "deleted";
  });
  if (!account) {
    return { ok: false, error: "Account not found" };
  }
  if (accounts.some(function (item) {
    return item.id !== id && item.status !== "deleted" && String(item.name || "").trim().toLowerCase() === name.toLowerCase();
  })) {
    return { ok: false, error: "Account already exists" };
  }

  const patch = {
    name: name,
    type: type,
    opening_balance: openingBalance,
    updated_at: nowIso()
  };
  updateRow("accounting_accounts", account._row, patch);

  const transactions = readRows("cash_transactions").filter(function (transaction) {
    return transaction.status !== "deleted";
  });
  const balance = calculateAccountBalances([Object.assign({}, account, patch)], transactions)[id];
  return { ok: true, account: publicAccountingAccount(Object.assign({}, account, patch), balance) };
}

function archiveAccountingAccount(body) {
  requireAccountingManager(body.token);

  const id = String(body.id || "");
  const nextStatus = String(body.status || "archived") === "active" ? "active" : "archived";
  const account = readRows("accounting_accounts").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });
  if (!account) {
    return { ok: false, error: "Account not found" };
  }
  if (nextStatus === "archived" && readRows("accounting_accounts").filter(function (item) {
    return item.status === "active";
  }).length <= 1) {
    return { ok: false, error: "Cannot archive the last active account" };
  }

  const patch = { status: nextStatus, updated_at: nowIso() };
  updateRow("accounting_accounts", account._row, patch);

  const transactions = readRows("cash_transactions").filter(function (transaction) {
    return transaction.status !== "deleted";
  });
  const balance = calculateAccountBalances([Object.assign({}, account, patch)], transactions)[id];
  return { ok: true, account: publicAccountingAccount(Object.assign({}, account, patch), balance) };
}

function createAccountingReconciliation(body) {
  const user = requireAccountingManager(body.token);

  const accountId = String(body.accountId || body.account_id || "");
  const actualBalance = Number(body.actualBalance || body.actual_balance);
  const note = String(body.note || "").trim();
  const reconciledAt = String(body.reconciledAt || body.reconciled_at || nowIso().slice(0, 10)).slice(0, 10);

  if (!accountId || !isFinite(actualBalance)) {
    return { ok: false, error: "Reconciliation is invalid" };
  }

  const accounts = readRows("accounting_accounts");
  const account = accounts.find(function (item) {
    return item.id === accountId && item.status === "active";
  });
  if (!account) {
    return { ok: false, error: "Account not found or inactive" };
  }

  const transactions = readRows("cash_transactions").filter(function (transaction) {
    return transaction.status !== "deleted";
  });
  const systemBalance = calculateAccountBalances([account], transactions)[accountId] || 0;
  const now = nowIso();
  const reconciliation = {
    id: Utilities.getUuid(),
    account_id: accountId,
    system_balance: systemBalance,
    actual_balance: actualBalance,
    difference: actualBalance - systemBalance,
    note: note,
    reconciled_by: user.id,
    reconciled_at: reconciledAt,
    created_at: now
  };
  appendRow("accounting_reconciliations", reconciliation);

  return { ok: true, reconciliation: publicAccountingReconciliation(reconciliation) };
}

function createAccountingCategory(body) {
  requireAccountingManager(body.token);

  const name = String(body.name || "").trim();
  const type = normalizeAccountingType(body.type);

  if (!name) {
    return { ok: false, error: "Accounting category is invalid" };
  }

  const categories = readRows("accounting_categories");
  if (categories.some(function (category) {
    return category.status !== "deleted" &&
      category.type === type &&
      String(category.name || "").trim().toLowerCase() === name.toLowerCase();
  })) {
    return { ok: false, error: "Category already exists" };
  }

  const now = nowIso();
  const category = {
    id: Utilities.getUuid(),
    name: name,
    type: type,
    status: "active",
    created_at: now,
    updated_at: now
  };
  appendRow("accounting_categories", category);

  return { ok: true, category: publicAccountingCategory(category) };
}

function updateAccountingCategory(body) {
  requireAccountingManager(body.token);

  const id = String(body.id || "");
  const name = String(body.name || "").trim();
  const type = normalizeAccountingType(body.type);

  if (!id || !name) {
    return { ok: false, error: "Accounting category is invalid" };
  }

  const categories = readRows("accounting_categories");
  const category = categories.find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!category) {
    return { ok: false, error: "Category not found" };
  }

  if (categories.some(function (item) {
    return item.id !== id &&
      item.status !== "deleted" &&
      item.type === type &&
      String(item.name || "").trim().toLowerCase() === name.toLowerCase();
  })) {
    return { ok: false, error: "Category already exists" };
  }

  const patch = {
    name: name,
    type: type,
    updated_at: nowIso()
  };
  updateRow("accounting_categories", category._row, patch);

  return { ok: true, category: publicAccountingCategory(Object.assign({}, category, patch)) };
}

function archiveAccountingCategory(body) {
  requireAccountingManager(body.token);

  const id = String(body.id || "");
  const nextStatus = String(body.status || "archived") === "active" ? "active" : "archived";
  const category = readRows("accounting_categories").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!category) {
    return { ok: false, error: "Category not found" };
  }

  const patch = {
    status: nextStatus,
    updated_at: nowIso()
  };
  updateRow("accounting_categories", category._row, patch);

  return { ok: true, category: publicAccountingCategory(Object.assign({}, category, patch)) };
}

function createCashTransaction(body) {
  const user = requireAccountingManager(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const type = normalizeAccountingType(body.type);
    const accountId = String(body.accountId || body.account_id || "");
    const categoryId = String(body.categoryId || body.category_id || "");
    const amount = Number(body.amount);
    const transactionDate = String(body.transactionDate || body.transaction_date || nowIso().slice(0, 10)).slice(0, 10);
    const description = String(body.description || "").trim();
    const referenceType = String(body.referenceType || body.reference_type || "manual").trim() || "manual";
    const referenceId = String(body.referenceId || body.reference_id || "").trim();

    if (!accountId || !categoryId || !isFinite(amount) || amount <= 0 || !description) {
      return { ok: false, error: "Cash transaction is invalid" };
    }

    const account = readRows("accounting_accounts").find(function (item) {
      return item.id === accountId && item.status === "active";
    });
    if (!account) {
      return { ok: false, error: "Account not found" };
    }

    const category = readRows("accounting_categories").find(function (item) {
      return item.id === categoryId && item.type === type && item.status === "active";
    });
    if (!category) {
      return { ok: false, error: "Category not found" };
    }

    const now = nowIso();
    const transaction = {
      id: Utilities.getUuid(),
      type: type,
      account_id: accountId,
      category_id: categoryId,
      amount: amount,
      transaction_date: transactionDate,
      description: description,
      reference_type: referenceType,
      reference_id: referenceId,
      created_by: user.id,
      status: "active",
      created_at: now,
      updated_at: now
    };
    appendRow("cash_transactions", transaction);

    return { ok: true, transaction: publicCashTransaction(transaction) };
  } finally {
    lock.releaseLock();
  }
}

function archiveCashTransaction(body) {
  requireAccountingManager(body.token);

  const id = String(body.id || "");
  const transaction = readRows("cash_transactions").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!transaction) {
    return { ok: false, error: "Transaction not found" };
  }
  if (transaction.reference_type && transaction.reference_type !== "manual") {
    return { ok: false, error: "Linked transactions must be reversed from their source document" };
  }

  updateRow("cash_transactions", transaction._row, {
    status: "deleted",
    updated_at: nowIso()
  });

  return { ok: true };
}
