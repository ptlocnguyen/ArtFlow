const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 25000;

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
        return json({
          ok: true,
          service: "artflow-pos-api",
          upstreamConfigured: Boolean(env.APPS_SCRIPT_URL),
          timeoutMs: upstreamTimeoutMs(env)
        }, 200, allowedOrigin, requestId);
      }
      return json({ ok: false, error: "Not found", code: "not_found" }, 404, allowedOrigin, requestId);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed", code: "method_not_allowed" }, 405, allowedOrigin, requestId);
    }

    if (!env.APPS_SCRIPT_URL) {
      return json({ ok: false, error: "Proxy is not configured", code: "proxy_not_configured" }, 500, allowedOrigin, requestId);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: "Request body is too large", code: "body_too_large" }, 413, allowedOrigin, requestId);
    }

    try {
      const body = await request.text();

      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return json({ ok: false, error: "Request body is too large", code: "body_too_large" }, 413, allowedOrigin, requestId);
      }

      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return json({ ok: false, error: "Invalid JSON body", code: "invalid_json" }, 400, allowedOrigin, requestId);
      }

      if (!payload || typeof payload.action !== "string" || !payload.action) {
        return json({ ok: false, error: "Missing action", code: "missing_action" }, 400, allowedOrigin, requestId);
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
