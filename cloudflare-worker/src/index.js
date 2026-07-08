import {
  isDirectReadAction,
  markCoreReadsDirty,
  recordSessionValidation,
  readDirectD1,
  refreshD1FromRead,
  syncIdentityToD1
} from "./d1-data.js";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 45000;
const DEFAULT_D1_CACHE_TTL_SECONDS = 180;

const READ_CACHE_ACTIONS = new Set([
  "listProducts",
  "listCustomers",
  "listOrders",
  "listStockMovements",
  "getPageData",
  "getAccountingData",
  "getPurchasingData",
  "getContentWorkspaceData",
  "getTeamWorkspaceData",
  "getOmniWorkspaceData",
  "getIncenseData",
  "getAppSettings"
]);
const CORE_READ_ONLY_ACTIONS = new Set([
  "bootstrapStatus",
  "login",
  "logout",
  "me",
  "listUsers",
  "listAuditLogs",
  "exportD1Snapshot",
  "testProductContentConfiguration"
]);

function changesCoreData(action) {
  return !READ_CACHE_ACTIONS.has(action) &&
    !CORE_READ_ONLY_ACTIONS.has(action) &&
    !String(action).startsWith("get") &&
    !String(action).startsWith("list");
}

function makeRequestId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";

  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (configured.includes(origin)) return origin;

  try {
    const url = new URL(origin);
    const isLocal =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    return isLocal ? origin : null;
  } catch {
    return null;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Client-Request-Id",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff"
  };
}

function json(payload, status, origin, requestId, extraHeaders = {}) {
  return new Response(JSON.stringify({ requestId, ...payload }), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
      ...extraHeaders
    }
  });
}

function upstreamTimeoutMs(env) {
  const configured = Number(env.UPSTREAM_TIMEOUT_MS || DEFAULT_UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 5000 ? configured : DEFAULT_UPSTREAM_TIMEOUT_MS;
}

function d1CacheTtlSeconds(env) {
  const configured = Number(env.D1_CACHE_TTL_SECONDS || DEFAULT_D1_CACHE_TTL_SECONDS);
  return Number.isFinite(configured) && configured >= 10 ? configured : DEFAULT_D1_CACHE_TTL_SECONDS;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function cacheKeyForPayload(payload) {
  const clone = { ...payload };
  const action = clone.action || "";
  const tokenHash = await sha256Hex(clone.token || "anonymous");
  delete clone.token;
  const payloadHash = await sha256Hex(stableStringify(clone));
  return {
    key: `${action}:${tokenHash}:${payloadHash}`,
    action,
    payloadHash
  };
}

async function readD1Cache(env, payload) {
  if (!env.DB || !READ_CACHE_ACTIONS.has(payload.action)) return null;
  const cache = await cacheKeyForPayload(payload);
  const row = await env.DB.prepare(
    "SELECT response_json FROM d1_api_cache WHERE cache_key = ? AND expires_at > datetime('now')"
  ).bind(cache.key).first();
  if (!row || !row.response_json) return null;
  try {
    return JSON.parse(row.response_json);
  } catch {
    return null;
  }
}

async function writeD1Cache(env, payload, responseJson) {
  if (!env.DB || !READ_CACHE_ACTIONS.has(payload.action) || !responseJson || responseJson.ok === false) return;
  const cache = await cacheKeyForPayload(payload);
  const ttl = d1CacheTtlSeconds(env);
  await env.DB.prepare(
    `INSERT INTO d1_api_cache (cache_key, action, payload_hash, response_json, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now', ?))
     ON CONFLICT(cache_key) DO UPDATE SET
       response_json = excluded.response_json,
       updated_at = datetime('now'),
       expires_at = excluded.expires_at`
  ).bind(cache.key, cache.action, cache.payloadHash, JSON.stringify(responseJson), `+${ttl} seconds`).run();
}

async function d1Status(env) {
  if (!env.DB) return { configured: false };
  try {
    const row = await env.DB.prepare("SELECT value_json FROM d1_meta WHERE key = 'schema_version'").first();
    return { configured: true, ok: true, schemaVersion: row ? row.value_json : "" };
  } catch (error) {
    return { configured: true, ok: false, error: error && error.message ? error.message : String(error) };
  }
}

export default {
  async fetch(request, env) {
    const requestId = request.headers.get("X-Client-Request-Id") || makeRequestId();
    const allowedOrigin = getAllowedOrigin(request, env);

    if (!allowedOrigin) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Forbidden origin",
        code: "forbidden_origin",
        requestId
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId
        }
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin)
      });
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        const d1 = await d1Status(env);
        return json({
          ok: true,
          service: "artflow-pos-api",
          upstreamConfigured: Boolean(env.APPS_SCRIPT_URL),
          d1,
          timeoutMs: upstreamTimeoutMs(env)
        }, 200, allowedOrigin, requestId);
      }
      return json({ ok: false, error: "Not found", code: "not_found" }, 404, allowedOrigin, requestId);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed", code: "method_not_allowed" }, 405, allowedOrigin, requestId);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: "Request body is too large", code: "body_too_large" }, 413, allowedOrigin, requestId);
    }

    let body = "";
    let payload = null;
    try {
      body = await request.text();

      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return json({ ok: false, error: "Request body is too large", code: "body_too_large" }, 413, allowedOrigin, requestId);
      }

      try {
        payload = JSON.parse(body);
      } catch {
        return json({ ok: false, error: "Invalid JSON body", code: "invalid_json" }, 400, allowedOrigin, requestId);
      }

      if (!payload || typeof payload.action !== "string" || !payload.action) {
        return json({ ok: false, error: "Missing action", code: "missing_action" }, 400, allowedOrigin, requestId);
      }

      const d1Response = await readDirectD1(env, payload).catch(error => {
        console.error("D1 direct read failed", {
          requestId,
          action: payload.action,
          message: error && error.message
        });
        return null;
      });
      if (d1Response) {
        return json(d1Response, 200, allowedOrigin, requestId, {
          "Server-Timing": "d1;dur=0",
          "X-ArtFlow-Data-Source": "d1"
        });
      }

      if (!env.APPS_SCRIPT_URL) {
        const d1Fallback = await readDirectD1(env, payload, { allowDirty: true }).catch(() => null);
        if (d1Fallback) {
          return json({
            ...d1Fallback,
            transient: true,
            cacheMode: "d1-fallback",
            warning: "Đang dùng dữ liệu D1 gần nhất vì Apps Script chưa được cấu hình."
          }, 200, allowedOrigin, requestId, {
            "X-ArtFlow-Data-Source": "d1-fallback"
          });
        }
        const cached = await readD1Cache(env, payload);
        if (cached) {
          return json({
            ...cached,
            transient: true,
            cacheMode: "d1-fallback",
            warning: "Đang dùng dữ liệu D1 cache vì Apps Script chưa được cấu hình."
          }, 200, allowedOrigin, requestId, {
            "X-ArtFlow-Cache": "d1-fallback"
          });
        }
        return json({ ok: false, error: "Proxy is not configured", code: "proxy_not_configured" }, 500, allowedOrigin, requestId);
      }

      const upstreamStartedAt = Date.now();
      const upstream = await fetch(env.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          "X-ArtFlow-Request-Id": requestId
        },
        body,
        redirect: "follow",
        signal: AbortSignal.timeout(upstreamTimeoutMs(env))
      });
      const upstreamDurationMs = Date.now() - upstreamStartedAt;

      const responseBody = await upstream.text();
      let responseJson;
      try {
        responseJson = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        const d1Fallback = await readDirectD1(env, payload, { allowDirty: true }).catch(() => null);
        if (d1Fallback) {
          return json({
            ...d1Fallback,
            transient: true,
            cacheMode: "d1-fallback",
            warning: "Apps Script phản hồi không hợp lệ, đang dùng dữ liệu D1 gần nhất."
          }, 200, allowedOrigin, requestId, {
            "Server-Timing": `apps-script;dur=${upstreamDurationMs}`,
            "X-Upstream-Duration-Ms": String(upstreamDurationMs),
            "X-ArtFlow-Data-Source": "d1-fallback"
          });
        }
        return json({
          ok: false,
          error: "Apps Script URL không trả JSON. Kiểm tra Web App URL và quyền truy cập Anyone.",
          code: "invalid_upstream_json",
          transient: true
        }, 502, allowedOrigin, requestId, {
          "Server-Timing": `apps-script;dur=${upstreamDurationMs}`,
          "X-Upstream-Duration-Ms": String(upstreamDurationMs)
        });
      }

      if (upstream.ok && responseJson && responseJson.ok !== false) {
        await syncIdentityToD1(env, payload, responseJson).catch(error => {
          console.error("D1 session sync failed", {
            requestId,
            action: payload.action,
            message: error && error.message
          });
        });
        await writeD1Cache(env, payload, responseJson).catch(error => {
          console.error("D1 cache write failed", { requestId, action: payload.action, message: error && error.message });
        });
        if (READ_CACHE_ACTIONS.has(payload.action)) {
          await refreshD1FromRead(env, payload, responseJson).catch(error => {
            console.error("D1 refresh failed", {
              requestId,
              action: payload.action,
              message: error && error.message
            });
          });
        } else if (!isDirectReadAction(payload.action) && changesCoreData(payload.action)) {
          await markCoreReadsDirty(env).catch(error => {
            console.error("D1 dirty marker failed", {
              requestId,
              action: payload.action,
              message: error && error.message
            });
          });
        }
      }
      await recordSessionValidation(env, payload, responseJson).catch(error => {
        console.error("D1 session validation update failed", {
          requestId,
          action: payload.action,
          message: error && error.message
        });
      });

      return new Response(JSON.stringify({ requestId, ...responseJson }), {
        status: upstream.ok ? 200 : upstream.status,
        headers: {
          ...corsHeaders(allowedOrigin),
          "Content-Type": "application/json; charset=utf-8",
          "Server-Timing": `apps-script;dur=${upstreamDurationMs}`,
          "X-Upstream-Duration-Ms": String(upstreamDurationMs),
          "X-Request-Id": requestId
        }
      });
    } catch (error) {
      const timeout = error && error.name === "TimeoutError";
      if (payload && payload.action) {
        const d1Fallback = await readDirectD1(env, payload, { allowDirty: true }).catch(() => null);
        if (d1Fallback) {
          return json({
            ...d1Fallback,
            transient: true,
            cacheMode: "d1-fallback",
            warning: timeout
              ? "Apps Script phản hồi chậm, đang dùng dữ liệu D1 gần nhất."
              : "Backend tạm mất kết nối, đang dùng dữ liệu D1 gần nhất."
          }, 200, allowedOrigin, requestId, {
            "X-ArtFlow-Data-Source": "d1-fallback"
          });
        }
        const cached = await readD1Cache(env, payload).catch(cacheError => {
          console.error("D1 cache read failed", { requestId, action: payload.action, message: cacheError && cacheError.message });
          return null;
        });
        if (cached) {
          return json({
            ...cached,
            transient: true,
            cacheMode: "d1-fallback",
            warning: timeout ? "Apps Script phản hồi chậm, đang dùng dữ liệu D1 cache." : "Backend tạm mất kết nối, đang dùng dữ liệu D1 cache."
          }, 200, allowedOrigin, requestId, {
            "X-ArtFlow-Cache": "d1-fallback"
          });
        }
      }
      console.error("Apps Script proxy request failed", {
        requestId,
        timeout,
        message: error && error.message
      });
      return json({
        ok: false,
        error: timeout ? "Apps Script phản hồi quá lâu. Vui lòng thử lại." : "Upstream service unavailable",
        code: timeout ? "upstream_timeout" : "upstream_unavailable",
        transient: true
      }, timeout ? 504 : 502, allowedOrigin, requestId);
    }
  }
};
