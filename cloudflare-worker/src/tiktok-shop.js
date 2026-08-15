import { requireSession } from "./d1-data.js";

const ACTIONS = new Set([
  "getTikTokConnection",
  "startTikTokAuthorization",
  "refreshTikTokConnection",
  "disconnectTikTokShop",
  "syncTikTokCatalog",
  "syncTikTokInventory"
]);
const API_BASE = "https://open-api.tiktokglobalshop.com";
const AUTH_BASE = "https://auth.tiktok-shops.com/api/v2";
const AUTHORIZE_BASE = "https://services.tiktokshop.com/open/authorize";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function clean(value) { return String(value || "").trim(); }
function isoNow() { return new Date().toISOString(); }
function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}
function base64Encode(bytes) {
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(output);
}
function base64Decode(value) {
  const binary = atob(clean(value));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function base64Url(bytes) {
  return base64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(clean(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(left, right) {
  const a = textEncoder.encode(clean(left).toLowerCase());
  const b = textEncoder.encode(clean(right).toLowerCase());
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function requireTikTokConfig(env) {
  const missing = ["TIKTOK_APP_KEY", "TIKTOK_APP_SECRET", "TIKTOK_TOKEN_ENCRYPTION_KEY", "TIKTOK_SERVICE_ID"]
    .filter(key => !clean(env[key]));
  if (missing.length) throw new Error(`TikTok Shop chưa được cấu hình: ${missing.join(", ")}`);
}

async function encryptionKey(env) {
  const bytes = base64Decode(env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  if (bytes.byteLength !== 32) throw new Error("TIKTOK_TOKEN_ENCRYPTION_KEY phải là khóa base64 32 byte");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptToken(env, connectionId, kind, token) {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: textEncoder.encode(`artflow:tiktok:${connectionId}:${kind}`)
  }, await encryptionKey(env), textEncoder.encode(token));
  return { ciphertext: base64Encode(new Uint8Array(encrypted)), iv: base64Encode(iv) };
}
async function decryptToken(env, row, kind) {
  const ciphertext = row[`${kind}_token_ciphertext`];
  const iv = row[`${kind}_token_iv`];
  if (!ciphertext || !iv) throw new Error(`Không tìm thấy ${kind} token của TikTok Shop`);
  const decrypted = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: base64Decode(iv),
    additionalData: textEncoder.encode(`artflow:tiktok:${row.id}:${kind}`)
  }, await encryptionKey(env), base64Decode(ciphertext));
  return textDecoder.decode(decrypted);
}

function publicConnection(row, env) {
  const configured = Boolean(env?.TIKTOK_APP_KEY && env?.TIKTOK_APP_SECRET && env?.TIKTOK_TOKEN_ENCRYPTION_KEY && env?.TIKTOK_SERVICE_ID);
  if (!row) return {
    configured,
    connected: false,
    status: configured ? "disconnected" : "not_configured",
    scopes: [],
    mappedSkuCount: 0,
    unmatchedSkuCount: 0
  };
  return {
    configured,
    connected: row.status === "active",
    id: row.id,
    salesChannelId: row.sales_channel_id || "",
    shopId: row.shop_id || "",
    shopName: row.shop_name || row.seller_name || "TikTok Shop",
    region: row.seller_base_region || "",
    status: row.status || "active",
    scopes: parseJson(row.granted_scopes || "[]", []),
    accessTokenExpiresAt: row.access_token_expires_at || "",
    refreshTokenExpiresAt: row.refresh_token_expires_at || "",
    lastTokenRefreshAt: row.last_token_refresh_at || "",
    lastShopSyncAt: row.last_shop_sync_at || "",
    lastProductSyncAt: row.last_product_sync_at || "",
    lastInventorySyncAt: row.last_inventory_sync_at || "",
    lastOrderSyncAt: row.last_order_sync_at || "",
    lastError: row.last_error || "",
    mappedSkuCount: asNumber(row.mapped_sku_count),
    unmatchedSkuCount: asNumber(row.unmatched_sku_count)
  };
}

export async function readTikTokConnectionSummary(env) {
  if (!env.DB) return publicConnection(null, env);
  try {
    const row = await env.DB.prepare(
      `SELECT c.*,
        SUM(CASE WHEN m.status='active' AND m.product_id<>'' THEN 1 ELSE 0 END) AS mapped_sku_count,
        SUM(CASE WHEN m.status='active' AND m.product_id='' THEN 1 ELSE 0 END) AS unmatched_sku_count
       FROM tiktok_connections c
       LEFT JOIN tiktok_product_mappings m ON m.connection_id=c.id
       WHERE c.status<>'deleted'
       GROUP BY c.id
       ORDER BY CASE c.status WHEN 'active' THEN 0 ELSE 1 END, c.updated_at DESC
       LIMIT 1`
    ).first();
    return publicConnection(row, env);
  } catch (error) {
    if (/no such table/i.test(error?.message || "")) return publicConnection(null, env);
    throw error;
  }
}

function expiryIso(value, fallbackSeconds) {
  const numeric = asNumber(value);
  if (!numeric) return new Date(Date.now() + fallbackSeconds * 1000).toISOString();
  const epochMs = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  return new Date(epochMs).toISOString();
}
function tokenData(payload) {
  const data = payload?.data || payload || {};
  if (asNumber(payload?.code) !== 0 || !data.access_token || !data.refresh_token) {
    throw new Error(payload?.message || "TikTok Shop không trả về token hợp lệ");
  }
  if (data.user_type != null && asNumber(data.user_type) !== 0) {
    throw new Error("Tài khoản ủy quyền không phải tài khoản người bán TikTok Shop");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: expiryIso(data.access_token_expire_in, 7 * 86400),
    refreshTokenExpiresAt: expiryIso(data.refresh_token_expire_in, 30 * 86400),
    openId: clean(data.open_id),
    sellerName: clean(data.seller_name),
    sellerBaseRegion: clean(data.seller_base_region),
    scopes: Array.isArray(data.granted_scopes || data.granted_permissions)
      ? (data.granted_scopes || data.granted_permissions)
      : clean(data.granted_scopes || data.granted_permissions).split(",").map(item => item.trim()).filter(Boolean)
  };
}
async function requestToken(env, path, params) {
  const url = new URL(`${AUTH_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("app_key", env.TIKTOK_APP_KEY);
  url.searchParams.set("app_secret", env.TIKTOK_APP_SECRET);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `TikTok OAuth HTTP ${response.status}`);
  return tokenData(payload);
}

async function signedRequest(env, connection, path, options = {}) {
  const method = options.method || "GET";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const query = {
    app_key: env.TIKTOK_APP_KEY,
    timestamp,
    ...(options.query || {})
  };
  const bodyText = options.body ? JSON.stringify(options.body) : "";
  const parameters = Object.keys(query)
    .filter(key => !["sign", "access_token"].includes(key))
    .sort()
    .map(key => `${key}${Array.isArray(query[key]) ? query[key].join(",") : query[key]}`)
    .join("");
  const signingValue = `${env.TIKTOK_APP_SECRET}${path}${parameters}${bodyText}${env.TIKTOK_APP_SECRET}`;
  query.sign = await hmacHex(env.TIKTOK_APP_SECRET, signingValue);
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item));
    else url.searchParams.set(key, String(value));
  });
  const accessToken = await decryptToken(env, connection, "access");
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": accessToken
    },
    body: bodyText || undefined,
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || asNumber(payload.code) !== 0) {
    const error = new Error(payload.message || `TikTok Shop API HTTP ${response.status}`);
    error.code = payload.code || response.status;
    throw error;
  }
  return payload.data || {};
}

async function authorizedShops(env, accessTokenData) {
  const temporary = {
    id: "oauth",
    access_token_ciphertext: "",
    access_token_iv: ""
  };
  const encrypted = await encryptToken(env, temporary.id, "access", accessTokenData.accessToken);
  temporary.access_token_ciphertext = encrypted.ciphertext;
  temporary.access_token_iv = encrypted.iv;
  return signedRequest(env, temporary, "/authorization/202309/shops");
}

async function ensureTikTokChannel(db, stamp) {
  const existing = await db.prepare("SELECT * FROM sales_channels WHERE code='tiktok' AND status<>'deleted' LIMIT 1").first();
  if (existing) {
    await db.prepare("UPDATE sales_channels SET sync_mode='api',status='active',updated_at=? WHERE id=?")
      .bind(stamp, existing.id).run();
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO sales_channels(id,code,name,type,status,sync_mode,default_price_policy,note,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, "tiktok", "TikTok Shop", "marketplace", "active", "api", "manual", "Kết nối qua TikTok Shop Open API", stamp, stamp).run();
  return id;
}

function allowedReturnUrl(env, candidate) {
  const fallback = clean(env.TIKTOK_UI_RETURN_URL) || "https://ptlocnguyen.github.io/ArtFlow/pages/channels.html";
  try {
    const value = new URL(candidate || fallback);
    const origins = clean(env.ALLOWED_ORIGINS).split(",").map(item => item.trim()).filter(Boolean);
    const local = value.protocol === "http:" && ["localhost", "127.0.0.1"].includes(value.hostname);
    if (!local && !origins.includes(value.origin)) return fallback;
    value.searchParams.delete("tiktok");
    value.searchParams.delete("tiktok_error");
    value.hash = "";
    return value.toString();
  } catch { return fallback; }
}

async function recordTikTokAudit(db, action, actor, entityId, details) {
  const stamp = isoNow();
  const labels = {
    connectTikTokShop: "Kết nối TikTok Shop",
    disconnectTikTokShop: "Ngắt kết nối TikTok Shop",
    refreshTikTokConnection: "Làm mới kết nối TikTok Shop",
    syncTikTokCatalog: "Đồng bộ danh mục TikTok Shop",
    syncTikTokInventory: "Đồng bộ tồn kho TikTok Shop"
  };
  await db.prepare(
    `INSERT INTO audit_logs
      (id,request_id,action,description,entity_type,entity_id,actor_id,actor_name,actor_email,detail_json,created_at,timezone)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    crypto.randomUUID(), crypto.randomUUID(), action, labels[action] || action, "tiktok_shop", entityId || "",
    actor?.id || "", actor?.name || "System", actor?.email || "", JSON.stringify(details || {}), stamp, "Asia/Ho_Chi_Minh"
  ).run();
}

async function activeConnection(db, id = "") {
  if (id) return db.prepare("SELECT * FROM tiktok_connections WHERE id=? AND status='active'").bind(id).first();
  return db.prepare("SELECT * FROM tiktok_connections WHERE status='active' ORDER BY updated_at DESC LIMIT 1").first();
}

async function refreshConnection(env, row) {
  const refreshToken = await decryptToken(env, row, "refresh");
  const tokens = await requestToken(env, "token/refresh", { refresh_token: refreshToken, grant_type: "refresh_token" });
  const access = await encryptToken(env, row.id, "access", tokens.accessToken);
  const refresh = await encryptToken(env, row.id, "refresh", tokens.refreshToken);
  const stamp = isoNow();
  await env.DB.prepare(
    `UPDATE tiktok_connections SET
      open_id=?,seller_name=?,seller_base_region=?,access_token_ciphertext=?,access_token_iv=?,
      refresh_token_ciphertext=?,refresh_token_iv=?,access_token_expires_at=?,refresh_token_expires_at=?,
      granted_scopes=?,last_token_refresh_at=?,last_error='',updated_at=? WHERE id=?`
  ).bind(
    tokens.openId || row.open_id, tokens.sellerName || row.seller_name, tokens.sellerBaseRegion || row.seller_base_region,
    access.ciphertext, access.iv, refresh.ciphertext, refresh.iv, tokens.accessTokenExpiresAt,
    tokens.refreshTokenExpiresAt, JSON.stringify(tokens.scopes || []), stamp, stamp, row.id
  ).run();
  return env.DB.prepare("SELECT * FROM tiktok_connections WHERE id=?").bind(row.id).first();
}

async function connectionWithFreshToken(env, id = "") {
  let row = await activeConnection(env.DB, id);
  if (!row) throw new Error("Chưa kết nối TikTok Shop");
  if (new Date(row.access_token_expires_at || 0).getTime() <= Date.now() + 5 * 60 * 1000) {
    row = await refreshConnection(env, row);
  }
  return row;
}

function productList(data) {
  return data.products || data.product_list || [];
}
function productSkus(product) {
  return product.skus || product.sku_list || [];
}
function skuStock(sku) {
  const inventory = sku.inventory || sku.inventories || [];
  return inventory.reduce((sum, item) => sum + asNumber(item.quantity ?? item.available_stock), 0);
}
function skuPrice(sku) {
  return asNumber(sku.price?.tax_exclusive_price ?? sku.price?.sale_price ?? sku.price?.amount ?? sku.sale_price);
}
function skuCurrency(sku) { return clean(sku.price?.currency || sku.currency); }

async function syncCatalog(env, connection) {
  const products = [];
  let pageToken = "";
  for (let page = 0; page < 10; page += 1) {
    const query = { shop_cipher: connection.shop_cipher, page_size: 100 };
    if (pageToken) query.page_token = pageToken;
    const data = await signedRequest(env, connection, "/product/202502/products/search", {
      method: "POST",
      query: { ...query, status: "ALL" }
    });
    products.push(...productList(data));
    pageToken = clean(data.next_page_token || data.page_token);
    if (!pageToken) break;
  }

  const localRows = (await env.DB.prepare("SELECT id,sku,name,stock,sale_price FROM products WHERE status<>'deleted'").all()).results;
  const localBySku = new Map(localRows.map(row => [clean(row.sku).toLowerCase(), row]));
  const stamp = isoNow();
  let mapped = 0;
  let unmatched = 0;
  let remoteSkuCount = 0;
  for (const remoteProduct of products) {
    for (const sku of productSkus(remoteProduct)) {
      remoteSkuCount += 1;
      const sellerSku = clean(sku.seller_sku || sku.sellerSku);
      const local = localBySku.get(sellerSku.toLowerCase()) || null;
      if (local) mapped += 1; else unmatched += 1;
      const inventory = sku.inventory || sku.inventories || [];
      const existing = await env.DB.prepare(
        "SELECT id,created_at,sync_stock,sync_price FROM tiktok_product_mappings WHERE connection_id=? AND tiktok_sku_id=?"
      ).bind(connection.id, clean(sku.id)).first();
      await env.DB.prepare(
        `INSERT INTO tiktok_product_mappings
          (id,connection_id,product_id,tiktok_product_id,tiktok_sku_id,seller_sku,tiktok_title,
           warehouse_inventory_json,remote_stock,remote_price,currency,sync_stock,sync_price,status,last_sync_at,last_error,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(connection_id,tiktok_sku_id) DO UPDATE SET
           product_id=excluded.product_id,tiktok_product_id=excluded.tiktok_product_id,seller_sku=excluded.seller_sku,
           tiktok_title=excluded.tiktok_title,warehouse_inventory_json=excluded.warehouse_inventory_json,
           remote_stock=excluded.remote_stock,remote_price=excluded.remote_price,currency=excluded.currency,
           status='active',last_sync_at=excluded.last_sync_at,last_error='',updated_at=excluded.updated_at`
      ).bind(
        existing?.id || crypto.randomUUID(), connection.id, local?.id || "", clean(remoteProduct.id), clean(sku.id), sellerSku,
        clean(remoteProduct.title || remoteProduct.name), JSON.stringify(inventory), skuStock(sku), skuPrice(sku), skuCurrency(sku),
        existing?.sync_stock || "true", existing?.sync_price || "false", "active", stamp, "", existing?.created_at || stamp, stamp
      ).run();
    }
  }
  await mirrorChannelProducts(env.DB, connection, stamp);
  await env.DB.prepare("UPDATE tiktok_connections SET last_product_sync_at=?,last_error='',updated_at=? WHERE id=?")
    .bind(stamp, stamp, connection.id).run();
  return { products: products.length, remoteSkuCount, mapped, unmatched };
}

async function mirrorChannelProducts(db, connection, stamp) {
  const rows = (await db.prepare(
    `SELECT m.*,p.name AS product_name FROM tiktok_product_mappings m
     LEFT JOIN products p ON p.id=m.product_id
     WHERE m.connection_id=? AND m.status='active' AND m.product_id<>''`
  ).bind(connection.id).all()).results;
  for (const row of rows) {
    const existing = await db.prepare(
      "SELECT id,created_at FROM channel_products WHERE channel_id=? AND product_id=? AND status<>'deleted' LIMIT 1"
    ).bind(connection.sales_channel_id, row.product_id).first();
    await db.prepare(
      `INSERT INTO channel_products
        (id,channel_id,product_id,channel_sku,channel_name,channel_price,channel_stock,sync_stock,sync_price,status,last_sync_at,note,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET channel_sku=excluded.channel_sku,channel_name=excluded.channel_name,
        channel_price=excluded.channel_price,channel_stock=excluded.channel_stock,sync_stock=excluded.sync_stock,
        sync_price=excluded.sync_price,status='active',last_sync_at=excluded.last_sync_at,note=excluded.note,updated_at=excluded.updated_at`
    ).bind(
      existing?.id || crypto.randomUUID(), connection.sales_channel_id, row.product_id, row.seller_sku,
      row.tiktok_title || row.product_name || "", row.remote_price, row.remote_stock, row.sync_stock, row.sync_price,
      "active", stamp, `TikTok product ${row.tiktok_product_id}; SKU ${row.tiktok_sku_id}`, existing?.created_at || stamp, stamp
    ).run();
  }
}

async function ensureWarehouseInventory(env, connection, mappings) {
  const byProduct = new Map();
  mappings.forEach(row => {
    if (!byProduct.has(row.tiktok_product_id)) byProduct.set(row.tiktok_product_id, []);
    byProduct.get(row.tiktok_product_id).push(row);
  });
  for (const [productId, rows] of byProduct) {
    if (rows.every(row => parseJson(row.warehouse_inventory_json || "[]", []).length)) continue;
    const data = await signedRequest(env, connection, `/product/202309/products/${encodeURIComponent(productId)}`, {
      query: { shop_cipher: connection.shop_cipher, locale: "vi-VN" }
    });
    const skuById = new Map(productSkus(data).map(sku => [clean(sku.id), sku]));
    for (const row of rows) {
      const inventory = skuById.get(row.tiktok_sku_id)?.inventory || [];
      if (!inventory.length) continue;
      row.warehouse_inventory_json = JSON.stringify(inventory);
      await env.DB.prepare("UPDATE tiktok_product_mappings SET warehouse_inventory_json=?,updated_at=? WHERE id=?")
        .bind(row.warehouse_inventory_json, isoNow(), row.id).run();
    }
  }
}

async function syncInventory(env, connection) {
  const mappings = (await env.DB.prepare(
    `SELECT m.*,p.stock AS local_stock,p.name AS product_name FROM tiktok_product_mappings m
     JOIN products p ON p.id=m.product_id
     WHERE m.connection_id=? AND m.status='active' AND m.sync_stock='true' AND p.status<>'deleted'`
  ).bind(connection.id).all()).results;
  await ensureWarehouseInventory(env, connection, mappings);
  const grouped = new Map();
  mappings.forEach(row => {
    if (!grouped.has(row.tiktok_product_id)) grouped.set(row.tiktok_product_id, []);
    grouped.get(row.tiktok_product_id).push(row);
  });
  let updated = 0;
  const failures = [];
  for (const [productId, rows] of grouped) {
    try {
      const skus = rows.map(row => {
        const warehouses = parseJson(row.warehouse_inventory_json || "[]", []);
        if (!warehouses.length) throw new Error(`SKU ${row.seller_sku || row.tiktok_sku_id} chưa có thông tin kho TikTok`);
        const quantity = Math.max(0, Math.floor(asNumber(row.local_stock)));
        return {
          id: row.tiktok_sku_id,
          inventory: warehouses.map(item => ({ warehouse_id: item.warehouse_id || item.id, quantity }))
        };
      });
      await signedRequest(env, connection, `/product/202309/products/${encodeURIComponent(productId)}/inventory/update`, {
        method: "POST",
        query: { shop_cipher: connection.shop_cipher },
        body: { skus }
      });
      const stamp = isoNow();
      for (const row of rows) {
        await env.DB.prepare("UPDATE tiktok_product_mappings SET remote_stock=?,last_sync_at=?,last_error='',updated_at=? WHERE id=?")
          .bind(Math.max(0, Math.floor(asNumber(row.local_stock))), stamp, stamp, row.id).run();
      }
      updated += rows.length;
    } catch (error) {
      failures.push({ productId, error: error?.message || String(error) });
      for (const row of rows) {
        await env.DB.prepare("UPDATE tiktok_product_mappings SET last_error=?,updated_at=? WHERE id=?")
          .bind(clean(error?.message || error).slice(0, 1000), isoNow(), row.id).run();
      }
    }
  }
  const stamp = isoNow();
  await mirrorChannelProducts(env.DB, connection, stamp);
  await env.DB.prepare("UPDATE tiktok_connections SET last_inventory_sync_at=?,last_error=?,updated_at=? WHERE id=?")
    .bind(stamp, failures.length ? `${failures.length} sản phẩm đồng bộ lỗi` : "", stamp, connection.id).run();
  return { matchedSkuCount: mappings.length, updated, failed: failures.length, failures: failures.slice(0, 20) };
}

export async function handleTikTokAction(env, body) {
  if (!env.DB || !ACTIONS.has(body.action)) return null;
  try {
    const user = await requireSession(env.DB, body.token);
    if (!user) throw new Error("Invalid session");
    if (body.action === "getTikTokConnection") return { ok: true, tiktokConnection: await readTikTokConnectionSummary(env) };
    requireTikTokConfig(env);
    if (body.action === "startTikTokAuthorization") {
      if (user.role !== "admin") throw new Error("Admin access required");
      const rawState = base64Url(randomBytes(32));
      const stateHash = await sha256Hex(rawState);
      const stamp = isoNow();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const returnUrl = allowedReturnUrl(env, body.returnUrl);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM tiktok_oauth_states WHERE datetime(expires_at)<datetime('now') OR used_at<>''"),
        env.DB.prepare("INSERT INTO tiktok_oauth_states(state_hash,actor_id,return_url,expires_at,used_at,created_at) VALUES(?,?,?,?,?,?)")
          .bind(stateHash, user.id, returnUrl, expiresAt, "", stamp)
      ]);
      const authorizeUrl = new URL(AUTHORIZE_BASE);
      authorizeUrl.searchParams.set("service_id", env.TIKTOK_SERVICE_ID);
      authorizeUrl.searchParams.set("state", rawState);
      return { ok: true, authorizeUrl: authorizeUrl.toString(), expiresAt };
    }
    if (user.role !== "admin" && user.role !== "inventory") throw new Error("Catalog access required");
    const connection = await activeConnection(env.DB, clean(body.id));
    if (!connection) throw new Error("Chưa kết nối TikTok Shop");
    if (body.action === "refreshTikTokConnection") {
      if (user.role !== "admin") throw new Error("Admin access required");
      const refreshed = await refreshConnection(env, connection);
      return { ok: true, tiktokConnection: publicConnection(refreshed, env) };
    }
    if (body.action === "disconnectTikTokShop") {
      if (user.role !== "admin") throw new Error("Admin access required");
      const stamp = isoNow();
      await env.DB.prepare(
        `UPDATE tiktok_connections SET status='revoked',access_token_ciphertext='',access_token_iv='',
         refresh_token_ciphertext='',refresh_token_iv='',last_error='',updated_at=? WHERE id=?`
      ).bind(stamp, connection.id).run();
      return { ok: true, tiktokConnection: await readTikTokConnectionSummary(env) };
    }
    const fresh = await connectionWithFreshToken(env, connection.id);
    if (body.action === "syncTikTokCatalog") {
      const result = await syncCatalog(env, fresh);
      return { ok: true, result, tiktokConnection: await readTikTokConnectionSummary(env) };
    }
    const result = await syncInventory(env, fresh);
    return { ok: true, result, tiktokConnection: await readTikTokConnectionSummary(env) };
  } catch (error) {
    return { ok: false, error: error?.message || String(error), code: error?.code || "tiktok_error" };
  }
}

export async function handleTikTokOAuthCallback(request, env) {
  requireTikTokConfig(env);
  const url = new URL(request.url);
  const rawState = clean(url.searchParams.get("state"));
  const code = clean(url.searchParams.get("code"));
  const stateHash = rawState ? await sha256Hex(rawState) : "";
  const state = stateHash
    ? await env.DB.prepare("SELECT * FROM tiktok_oauth_states WHERE state_hash=? AND used_at='' AND datetime(expires_at)>datetime('now')").bind(stateHash).first()
    : null;
  const fallback = allowedReturnUrl(env, "");
  if (!state) return redirectWithStatus(fallback, "error", "Phiên kết nối TikTok không hợp lệ hoặc đã hết hạn");
  const stamp = isoNow();
  await env.DB.prepare("UPDATE tiktok_oauth_states SET used_at=? WHERE state_hash=?").bind(stamp, stateHash).run();
  const returnUrl = allowedReturnUrl(env, state.return_url);
  const denied = clean(url.searchParams.get("error"));
  if (denied || !code || code === "null") return redirectWithStatus(returnUrl, "error", denied || "Bạn đã hủy ủy quyền TikTok Shop");
  try {
    const tokens = await requestToken(env, "token/get", { auth_code: code, grant_type: "authorized_code" });
    const shopsData = await authorizedShops(env, tokens);
    const shops = shopsData.shops || shopsData.authorized_shops || [];
    const shop = shops[0];
    if (!shop) throw new Error("TikTok Shop không trả về cửa hàng đã ủy quyền");
    const shopId = clean(shop.id || shop.shop_id);
    const existing = await env.DB.prepare("SELECT * FROM tiktok_connections WHERE shop_id=? LIMIT 1").bind(shopId).first();
    const id = existing?.id || crypto.randomUUID();
    const access = await encryptToken(env, id, "access", tokens.accessToken);
    const refresh = await encryptToken(env, id, "refresh", tokens.refreshToken);
    const channelId = await ensureTikTokChannel(env.DB, stamp);
    await env.DB.prepare(
      `INSERT INTO tiktok_connections
        (id,sales_channel_id,open_id,seller_name,seller_base_region,shop_id,shop_cipher,shop_name,
         access_token_ciphertext,access_token_iv,refresh_token_ciphertext,refresh_token_iv,
         access_token_expires_at,refresh_token_expires_at,granted_scopes,status,last_token_refresh_at,
         last_shop_sync_at,last_product_sync_at,last_inventory_sync_at,last_order_sync_at,last_error,created_by,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET sales_channel_id=excluded.sales_channel_id,open_id=excluded.open_id,
        seller_name=excluded.seller_name,seller_base_region=excluded.seller_base_region,shop_cipher=excluded.shop_cipher,
        shop_name=excluded.shop_name,access_token_ciphertext=excluded.access_token_ciphertext,access_token_iv=excluded.access_token_iv,
        refresh_token_ciphertext=excluded.refresh_token_ciphertext,refresh_token_iv=excluded.refresh_token_iv,
        access_token_expires_at=excluded.access_token_expires_at,refresh_token_expires_at=excluded.refresh_token_expires_at,
        granted_scopes=excluded.granted_scopes,status='active',last_token_refresh_at=excluded.last_token_refresh_at,
        last_shop_sync_at=excluded.last_shop_sync_at,last_error='',updated_at=excluded.updated_at`
    ).bind(
      id, channelId, tokens.openId, tokens.sellerName, tokens.sellerBaseRegion, shopId,
      clean(shop.cipher || shop.shop_cipher), clean(shop.name || shop.shop_name || tokens.sellerName || "TikTok Shop"),
      access.ciphertext, access.iv, refresh.ciphertext, refresh.iv, tokens.accessTokenExpiresAt,
      tokens.refreshTokenExpiresAt, JSON.stringify(tokens.scopes || []), "active", stamp, stamp,
      existing?.last_product_sync_at || "", existing?.last_inventory_sync_at || "", existing?.last_order_sync_at || "",
      "", state.actor_id, existing?.created_at || stamp, stamp
    ).run();
    const actor = await env.DB.prepare("SELECT id,name,email FROM users WHERE id=?").bind(state.actor_id).first();
    await recordTikTokAudit(env.DB, "connectTikTokShop", actor, id, { shopId, shopName: shop.name || shop.shop_name || "" });
    return redirectWithStatus(returnUrl, "connected", "");
  } catch (error) {
    return redirectWithStatus(returnUrl, "error", error?.message || String(error));
  }
}

function redirectWithStatus(returnUrl, status, error) {
  const url = new URL(returnUrl);
  url.searchParams.set("tiktok", status);
  if (error) url.searchParams.set("tiktok_error", error.slice(0, 300));
  return Response.redirect(url.toString(), 302);
}

export async function handleTikTokWebhook(request, env) {
  requireTikTokConfig(env);
  const rawBody = await request.text();
  if (textEncoder.encode(rawBody).byteLength > 1024 * 1024) {
    return new Response(JSON.stringify({ ok: false, error: "Payload too large" }), { status: 413, headers: { "content-type": "application/json" } });
  }
  const expected = await hmacHex(env.TIKTOK_APP_SECRET, `${env.TIKTOK_APP_KEY}${rawBody}`);
  const provided = clean(request.headers.get("Authorization")).replace(/^HMAC-SHA256\s+/i, "");
  if (!provided || !timingSafeEqual(expected, provided)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  let payload;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const notificationId = clean(payload.tts_notification_id || payload.notification_id) || await sha256Hex(rawBody);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tiktok_webhook_events
      (notification_id,event_type,shop_id,payload_json,status,attempts,error_text,received_at,processed_at)
     VALUES(?,?,?,?,?,?,?,?,?)`
  ).bind(notificationId, clean(payload.type || payload.event_type), clean(payload.shop_id), rawBody, "received", 0, "", isoNow(), "").run();
  return new Response(JSON.stringify({ code: 0, message: "Success" }), { status: 200, headers: { "content-type": "application/json" } });
}

export async function refreshDueTikTokTokens(env) {
  if (!env.DB || !env.TIKTOK_APP_KEY || !env.TIKTOK_APP_SECRET || !env.TIKTOK_TOKEN_ENCRYPTION_KEY) return;
  let rows;
  try {
    rows = (await env.DB.prepare(
      "SELECT * FROM tiktok_connections WHERE status='active' AND datetime(access_token_expires_at)<=datetime('now','+24 hours')"
    ).all()).results;
  } catch (error) {
    if (/no such table/i.test(error?.message || "")) return;
    throw error;
  }
  for (const row of rows) {
    try { await refreshConnection(env, row); }
    catch (error) {
      await env.DB.prepare("UPDATE tiktok_connections SET last_error=?,updated_at=? WHERE id=?")
        .bind(clean(error?.message || error).slice(0, 1000), isoNow(), row.id).run();
    }
  }
}
