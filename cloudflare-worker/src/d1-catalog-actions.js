import {
  publicCustomer,
  publicProduct,
  publicStockMovement,
  requireSession
} from "./d1-data.js";

const ACTIONS = new Set([
  "createProduct", "updateProduct", "archiveProduct", "importProducts",
  "provisionProductContent",
  "provisionMissingProductContent",
  "createProductOption", "updateProductOption", "toggleProductOption",
  "createCustomer", "updateCustomer", "archiveCustomer", "importCustomers",
  "receiveStock", "adjustStock"
]);

const PRODUCT_COLUMNS = [
  "id", "sku", "name", "category", "cost_price", "sale_price", "stock", "low_stock",
  "status", "created_at", "updated_at", "brand", "barcode", "unit", "weight_grams",
  "dimensions", "origin", "material", "image_url", "short_description", "key_features",
  "target_audience", "seo_keywords", "content_status", "content_owner", "content_note",
  "content_doc_id", "content_doc_url", "media_folder_id", "media_folder_url",
  "image_folder_id", "image_folder_url", "video_folder_id", "video_folder_url",
  "website_product_url", "shopee_product_url", "tiktok_product_url",
  "facebook_product_url", "content_post_links"
];

function nowIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).reduce((output, part) => {
    output[part.type] = part.value;
    return output;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function clean(value) {
  return String(value || "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProduct(body) {
  const input = {
    sku: clean(body.sku).toUpperCase(),
    name: clean(body.name),
    category: clean(body.category),
    brand: clean(body.brand),
    barcode: clean(body.barcode),
    unit: clean(body.unit) || "cái",
    weight_grams: Math.max(0, number(body.weightGrams ?? body.weight_grams)),
    dimensions: clean(body.dimensions),
    origin: clean(body.origin),
    material: clean(body.material),
    cost_price: number(body.costPrice ?? body.cost_price, NaN),
    sale_price: number(body.salePrice ?? body.sale_price, NaN),
    stock: number(body.stock, NaN),
    low_stock: number(body.lowStock ?? body.low_stock, NaN),
    image_url: clean(body.imageUrl ?? body.image_url),
    short_description: clean(body.shortDescription ?? body.short_description),
    key_features: clean(body.keyFeatures ?? body.key_features),
    target_audience: clean(body.targetAudience ?? body.target_audience),
    seo_keywords: clean(body.seoKeywords ?? body.seo_keywords),
    content_status: ["not_started", "drafting", "review", "ready", "published"].includes(
      clean(body.contentStatus ?? body.content_status)
    ) ? clean(body.contentStatus ?? body.content_status) : "not_started",
    content_owner: clean(body.contentOwner ?? body.content_owner),
    content_note: clean(body.contentNote ?? body.content_note),
    website_product_url: clean(body.websiteProductUrl ?? body.website_product_url),
    shopee_product_url: clean(body.shopeeProductUrl ?? body.shopee_product_url),
    tiktok_product_url: clean(body.tiktokProductUrl ?? body.tiktok_product_url),
    facebook_product_url: clean(body.facebookProductUrl ?? body.facebook_product_url),
    content_post_links: clean(body.contentPostLinks ?? body.content_post_links),
    status: ["active", "archived"].includes(clean(body.status)) ? clean(body.status) : "active"
  };
  if (!input.sku || !input.name || !input.category) throw new Error("Product SKU, name and category are required");
  if ([input.cost_price, input.sale_price, input.stock, input.low_stock].some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Product numeric fields are invalid");
  }
  if (input.sale_price < input.cost_price) throw new Error("Sale price must be greater than or equal to cost price");
  return input;
}

function productRecord(input, existing = null) {
  const now = nowIso();
  return {
    id: existing?.id || crypto.randomUUID(),
    ...input,
    created_at: existing?.created_at || now,
    updated_at: now,
    content_doc_id: existing?.content_doc_id || "",
    content_doc_url: existing?.content_doc_url || "",
    media_folder_id: existing?.media_folder_id || "",
    media_folder_url: existing?.media_folder_url || "",
    image_folder_id: existing?.image_folder_id || "",
    image_folder_url: existing?.image_folder_url || "",
    video_folder_id: existing?.video_folder_id || "",
    video_folder_url: existing?.video_folder_url || ""
  };
}

function upsertStatement(db, table, record, columns) {
  return db.prepare(
    `INSERT INTO ${table} (${columns.map(column => `"${column}"`).join(",")})
     VALUES (${columns.map(() => "?").join(",")})
     ON CONFLICT(id) DO UPDATE SET ${columns.filter(column => column !== "id")
       .map(column => `"${column}" = excluded."${column}"`).join(",")}`
  ).bind(...columns.map(column => record[column] ?? ""));
}

function movementFor(product, type, before, after, reason, actorId, referenceType = "manual", referenceId = "") {
  return {
    id: crypto.randomUUID(), product_id: product.id, sku: product.sku,
    product_name: product.name, type, quantity_delta: after - before,
    stock_before: before, stock_after: after, reason,
    reference_type: referenceType, reference_id: referenceId,
    created_by: actorId, created_at: nowIso()
  };
}

function movementStatement(db, movement) {
  const columns = [
    "id", "product_id", "sku", "product_name", "type", "quantity_delta",
    "stock_before", "stock_after", "reason", "reference_type", "reference_id",
    "created_by", "created_at"
  ];
  return upsertStatement(db, "stock_movements", movement, columns);
}

function optionPublic(row) {
  return {
    id: row.id, type: row.type, name: row.name, status: row.status || "active",
    createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}

async function requireRole(db, token, roles) {
  const user = await requireSession(db, token);
  if (!user) throw new Error("Invalid session");
  if (!roles.includes(user.role)) throw new Error("Access denied");
  return user;
}

async function ensureOptions(db, product) {
  const now = nowIso();
  const statements = [];
  for (const [type, rawName] of [["category", product.category], ["brand", product.brand], ["unit", product.unit]]) {
    const name = clean(rawName);
    if (!name) continue;
    const existing = await db.prepare(
      "SELECT id FROM product_options WHERE type = ? AND lower(name) = lower(?) AND status <> 'deleted'"
    ).bind(type, name).first();
    if (!existing) {
      statements.push(upsertStatement(db, "product_options", {
        id: crypto.randomUUID(), type, name, status: "active", created_at: now, updated_at: now
      }, ["id", "type", "name", "status", "created_at", "updated_at"]));
    }
  }
  if (statements.length) await db.batch(statements);
}

async function createProduct(env, body, user) {
  const input = normalizeProduct(body);
  const duplicate = await env.DB.prepare(
    "SELECT id FROM products WHERE upper(sku) = ? AND status <> 'deleted'"
  ).bind(input.sku).first();
  if (duplicate) return { ok: false, error: "SKU already exists" };
  const product = productRecord(input);
  const statements = [upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS)];
  if (product.stock > 0) {
    statements.push(movementStatement(env.DB, movementFor(
      product, "initial", 0, product.stock, "Tồn kho ban đầu", user.id, "product", product.id
    )));
  }
  await env.DB.batch(statements);
  await ensureOptions(env.DB, product);
  let contentSetupWarning = "";
  if (body.createAssets !== false && String(body.createAssets || "true") !== "false" && env.APPS_SCRIPT_URL) {
    try {
      const response = await fetch(env.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "provisionProductContentBridge", token: body.token, bridgeProduct: product }),
        redirect: "follow",
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Google asset provisioning failed");
      Object.assign(product, result.assetPatch || {});
      await upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS).run();
    } catch (error) {
      contentSetupWarning = error?.message || String(error);
    }
  }
  return { ok: true, product: publicProduct(product), contentSetupWarning };
}

async function provisionProduct(env, body) {
  const product = await env.DB.prepare(
    "SELECT * FROM products WHERE id=? AND status<>'deleted'"
  ).bind(clean(body.id)).first();
  if (!product) return { ok: false, error: "Product not found" };
  if (product.content_doc_url && product.media_folder_url && product.image_folder_url && product.video_folder_url) {
    return { ok: true, product: publicProduct(product), alreadyProvisioned: true };
  }
  if (!env.APPS_SCRIPT_URL) return { ok: false, error: "Google bridge is not configured" };
  const response = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "provisionProductContentBridge", token: body.token, bridgeProduct: product }),
    redirect: "follow", signal: AbortSignal.timeout(30000)
  });
  const result = await response.json();
  if (!result.ok) return result;
  Object.assign(product, result.assetPatch || {}, { updated_at: nowIso() });
  await upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS).run();
  return { ok: true, product: publicProduct(product), alreadyProvisioned: false };
}

async function updateProduct(env, body, user) {
  const existing = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND status <> 'deleted'"
  ).bind(clean(body.id)).first();
  if (!existing) return { ok: false, error: "Product not found" };
  const input = normalizeProduct(body);
  const duplicate = await env.DB.prepare(
    "SELECT id FROM products WHERE upper(sku) = ? AND id <> ? AND status <> 'deleted'"
  ).bind(input.sku, existing.id).first();
  if (duplicate) return { ok: false, error: "SKU already exists" };
  const product = productRecord(input, existing);
  const statements = [upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS)];
  if (number(existing.stock) !== product.stock) {
    statements.push(movementStatement(env.DB, movementFor(
      product, "product_edit", number(existing.stock), product.stock,
      "Cập nhật trực tiếp từ hồ sơ sản phẩm", user.id, "product", product.id
    )));
  }
  await env.DB.batch(statements);
  await ensureOptions(env.DB, product);
  return { ok: true, product: publicProduct(product) };
}

async function archiveProduct(env, body) {
  const existing = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND status <> 'deleted'"
  ).bind(clean(body.id)).first();
  if (!existing) return { ok: false, error: "Product not found" };
  existing.status = clean(body.status) === "active" ? "active" : "archived";
  existing.updated_at = nowIso();
  await upsertStatement(env.DB, "products", existing, PRODUCT_COLUMNS).run();
  return { ok: true, product: publicProduct(existing) };
}

async function productOptionAction(env, body) {
  const now = nowIso();
  if (body.action === "createProductOption") {
    const type = clean(body.type);
    const name = clean(body.name);
    if (!["category", "brand", "unit"].includes(type) || !name || name.length > 100) {
      return { ok: false, error: "Thuộc tính sản phẩm không hợp lệ" };
    }
    const existing = await env.DB.prepare(
      "SELECT * FROM product_options WHERE type = ? AND lower(name) = lower(?) AND status <> 'deleted'"
    ).bind(type, name).first();
    if (existing?.status === "active") return { ok: false, error: "Giá trị này đã tồn tại" };
    const option = existing
      ? { ...existing, status: "active", updated_at: now }
      : { id: crypto.randomUUID(), type, name, status: "active", created_at: now, updated_at: now };
    await upsertStatement(env.DB, "product_options", option, ["id", "type", "name", "status", "created_at", "updated_at"]).run();
    return { ok: true, option: optionPublic(option) };
  }
  const option = await env.DB.prepare(
    "SELECT * FROM product_options WHERE id = ? AND status <> 'deleted'"
  ).bind(clean(body.id)).first();
  if (!option) return { ok: false, error: "Không tìm thấy thuộc tính sản phẩm" };
  if (body.action === "updateProductOption") {
    const name = clean(body.name);
    if (!name || name.length > 100) return { ok: false, error: "Tên thuộc tính không hợp lệ" };
    const duplicate = await env.DB.prepare(
      "SELECT id FROM product_options WHERE type = ? AND lower(name) = lower(?) AND id <> ? AND status <> 'deleted'"
    ).bind(option.type, name, option.id).first();
    if (duplicate) return { ok: false, error: "Giá trị này đã tồn tại" };
    option.name = name;
  } else {
    option.status = clean(body.status) === "active" ? "active" : "archived";
  }
  option.updated_at = now;
  await upsertStatement(env.DB, "product_options", option, ["id", "type", "name", "status", "created_at", "updated_at"]).run();
  return { ok: true, option: optionPublic(option) };
}

function normalizeCustomer(body) {
  const value = {
    name: clean(body.name), phone: clean(body.phone).replace(/\s+/g, ""),
    email: clean(body.email).toLowerCase(), group: clean(body.group) || "Bán lẻ",
    note: clean(body.note),
    status: ["active", "archived"].includes(clean(body.status)) ? clean(body.status) : "active"
  };
  if (!value.name || !value.phone) throw new Error("Customer name and phone are required");
  if (value.email && !value.email.includes("@")) throw new Error("Customer email is invalid");
  return value;
}

async function saveCustomer(env, body, existing = null) {
  const input = normalizeCustomer(body);
  const duplicatePhone = await env.DB.prepare(
    "SELECT id FROM customers WHERE phone = ? AND id <> ? AND status <> 'deleted'"
  ).bind(input.phone, existing?.id || "").first();
  if (duplicatePhone) return { ok: false, error: "Phone already exists" };
  if (input.email) {
    const duplicateEmail = await env.DB.prepare(
      "SELECT id FROM customers WHERE lower(email) = ? AND id <> ? AND status <> 'deleted'"
    ).bind(input.email, existing?.id || "").first();
    if (duplicateEmail) return { ok: false, error: "Email already exists" };
  }
  const now = nowIso();
  const customer = {
    id: existing?.id || crypto.randomUUID(), ...input,
    total_spent: number(existing?.total_spent), loyalty_points: number(existing?.loyalty_points),
    lifetime_points: number(existing?.lifetime_points), last_order_at: existing?.last_order_at || "",
    created_at: existing?.created_at || now, updated_at: now
  };
  const columns = [
    "id", "name", "phone", "email", "group", "status", "total_spent",
    "last_order_at", "note", "created_at", "updated_at", "loyalty_points", "lifetime_points"
  ];
  await upsertStatement(env.DB, "customers", customer, columns).run();
  return { ok: true, customer: publicCustomer(customer) };
}

async function customerAction(env, body) {
  if (body.action === "createCustomer") return saveCustomer(env, body);
  const existing = await env.DB.prepare(
    "SELECT * FROM customers WHERE id = ? AND status <> 'deleted'"
  ).bind(clean(body.id)).first();
  if (!existing) return { ok: false, error: "Customer not found" };
  if (body.action === "archiveCustomer") {
    existing.status = clean(body.status) === "active" ? "active" : "archived";
    existing.updated_at = nowIso();
    await upsertStatement(env.DB, "customers", existing, [
      "id", "name", "phone", "email", "group", "status", "total_spent",
      "last_order_at", "note", "created_at", "updated_at", "loyalty_points", "lifetime_points"
    ]).run();
    return { ok: true, customer: publicCustomer(existing) };
  }
  return saveCustomer(env, body, existing);
}

async function stockAction(env, body, user) {
  const productId = clean(body.productId ?? body.product_id);
  const product = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND status <> 'deleted'"
  ).bind(productId).first();
  if (!product) return { ok: false, error: "Product not found" };
  const before = number(product.stock);
  let after;
  let type;
  let reason;
  if (body.action === "receiveStock") {
    const quantity = number(body.quantity, NaN);
    if (!Number.isFinite(quantity) || quantity < 1) return { ok: false, error: "Stock quantity is invalid" };
    after = before + quantity;
    type = "receive";
    reason = clean(body.reason) || "Nhập kho";
  } else {
    after = number(body.stock, NaN);
    if (!Number.isFinite(after) || after < 0) return { ok: false, error: "Adjusted stock is invalid" };
    type = "adjustment";
    reason = clean(body.reason) || "Điều chỉnh kiểm kho";
  }
  product.stock = after;
  product.updated_at = nowIso();
  const movement = movementFor(product, type, before, after, reason, user.id);
  await env.DB.batch([
    upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS),
    movementStatement(env.DB, movement)
  ]);
  return { ok: true, product: publicProduct(product), movement: publicStockMovement(movement) };
}

async function importProducts(env, body, user) {
  let rows = body.products || [];
  if (typeof rows === "string") rows = JSON.parse(rows);
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    return { ok: false, error: "Product import must contain between 1 and 500 rows" };
  }
  const seen = new Set();
  const products = [];
  const statements = [];
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const input = normalizeProduct(row || {});
    if (seen.has(input.sku)) throw new Error(`Duplicate SKU ${input.sku}`);
    seen.add(input.sku);
    const existing = await env.DB.prepare(
      "SELECT * FROM products WHERE upper(sku) = ? AND status <> 'deleted'"
    ).bind(input.sku).first();
    const product = productRecord(input, existing);
    statements.push(upsertStatement(env.DB, "products", product, PRODUCT_COLUMNS));
    if (number(existing?.stock) !== product.stock) {
      statements.push(movementStatement(env.DB, movementFor(
        product, "csv_import", number(existing?.stock), product.stock,
        existing ? "Cập nhật sản phẩm từ CSV" : "Nhập sản phẩm từ CSV",
        user.id, "product_import", product.id
      )));
    }
    products.push(publicProduct(product));
    if (existing) updated += 1;
    else created += 1;
  }
  for (let index = 0; index < statements.length; index += 75) {
    await env.DB.batch(statements.slice(index, index + 75));
  }
  for (const product of products) await ensureOptions(env.DB, {
    category: product.category, brand: product.brand, unit: product.unit
  });
  return { ok: true, products, created, updated };
}

async function importCustomers(env, body) {
  let rows = body.customers || [];
  if (typeof rows === "string") rows = JSON.parse(rows);
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    return { ok: false, error: "Customer import must contain between 1 and 500 rows" };
  }
  const customers = [];
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const input = normalizeCustomer(row || {});
    const existing = await env.DB.prepare(
      "SELECT * FROM customers WHERE phone = ? AND status <> 'deleted'"
    ).bind(input.phone).first();
    const result = await saveCustomer(env, row, existing);
    if (!result.ok) return result;
    customers.push(result.customer);
    if (existing) updated += 1;
    else created += 1;
  }
  return { ok: true, customers, created, updated };
}

export async function handleCatalogAction(env, body) {
  if (!env.DB || !ACTIONS.has(body.action)) return null;
  try {
    const isCustomerAction = ["createCustomer", "updateCustomer", "archiveCustomer", "importCustomers"].includes(body.action);
    const user = await requireRole(
      env.DB,
      body.token,
      isCustomerAction ? ["admin", "sales"] : ["admin", "inventory"]
    );
    if (body.action === "createProduct") return await createProduct(env, body, user);
    if (body.action === "provisionProductContent") return await provisionProduct(env, body);
    if (body.action === "provisionMissingProductContent") {
      const limit = Math.min(3, Math.max(1, number(body.batchSize, 3)));
      const missing = (await env.DB.prepare(
        `SELECT id FROM products WHERE status<>'deleted'
         AND (content_doc_url='' OR media_folder_url='' OR image_folder_url='' OR video_folder_url='')
         LIMIT ?`
      ).bind(limit).all()).results;
      const products = [], failures = [];
      for (const row of missing) {
        const result = await provisionProduct(env, { ...body, id: row.id });
        if (result.ok) products.push(result.product);
        else failures.push({ id: row.id, error: result.error });
      }
      const remaining = await env.DB.prepare(
        `SELECT COUNT(*) count FROM products WHERE status<>'deleted'
         AND (content_doc_url='' OR media_folder_url='' OR image_folder_url='' OR video_folder_url='')`
      ).first();
      return {
        ok: true, products, failures, processed: missing.length, created: products.length,
        failed: failures.length, remaining: number(remaining?.count)
      };
    }
    if (body.action === "updateProduct") return await updateProduct(env, body, user);
    if (body.action === "archiveProduct") return await archiveProduct(env, body);
    if (body.action === "importProducts") return await importProducts(env, body, user);
    if (body.action.includes("ProductOption")) return await productOptionAction(env, body);
    if (body.action === "importCustomers") {
      return await importCustomers(env, body);
    }
    if (["createCustomer", "updateCustomer", "archiveCustomer"].includes(body.action)) {
      return await customerAction(env, body);
    }
    return await stockAction(env, body, user);
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
