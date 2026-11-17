import assert from "node:assert/strict";
import worker from "../cloudflare-worker/src/index.js";
import { D1_OWNED_ACTIONS } from "../cloudflare-worker/src/data-ownership.js";

const originalFetch = globalThis.fetch;
let upstreamCalls = 0;

globalThis.fetch = async (_url, options = {}) => {
  upstreamCalls += 1;
  const payload = JSON.parse(options.body || "{}");
  if (payload.action === "login") {
    return Response.json({
      ok: true,
      token: "apps-script-token",
      user: { id: "user-1", name: "QA", email: "qa@example.invalid", role: "admin", status: "active" }
    });
  }
  return Response.json({ ok: true, source: "apps-script" });
};

async function call(action, patch = {}, envPatch = {}) {
  const response = await worker.fetch(new Request("https://local.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token: "qa-token", ...patch })
  }), {
    APPS_SCRIPT_URL: "https://apps-script.example.invalid/exec",
    ALLOWED_ORIGINS: "https://local.test",
    ...envPatch
  }, {});
  return { response, data: await response.json() };
}

try {
  for (const action of ["getPageData", "listProducts", "createOrder", "getAccountingData", "createPurchaseOrder", "createOrderReceiptPdf"]) {
    const before = upstreamCalls;
    const result = await call(action, action === "getPageData" ? { scopes: ["products"] } : {});
    assert.equal(result.response.status, 503, `${action} must fail closed without D1`);
    assert.equal(result.data.code, "d1_unavailable", `${action} must identify D1 as unavailable`);
    assert.equal(result.data.transient, true, `${action} must be safe for offline retry`);
    assert.equal(upstreamCalls, before, `${action} must not fall back to Apps Script/Sheets`);
  }

  const readOnlyD1 = {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; }
      };
    }
  };
  const invalidBefore = upstreamCalls;
  const invalidSession = await call("getPageData", { scopes: ["products"] }, { DB: readOnlyD1 });
  assert.equal(invalidSession.response.status, 200, "Invalid session is not a D1 outage");
  assert.equal(invalidSession.data.code, "invalid_session");
  assert.equal(invalidSession.response.headers.get("X-ArtFlow-Data-Source"), "d1");
  assert.equal(upstreamCalls, invalidBefore, "Invalid D1 session must not fall back to Apps Script");

  const loginBefore = upstreamCalls;
  const login = await call("login", { email: "qa@example.invalid", password: "not-used-by-mock" });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.ok, true);
  assert.equal(upstreamCalls, loginBefore + 1, "Apps Script must remain the identity owner");

  assert.ok(D1_OWNED_ACTIONS.has("returnOrder"));
  assert.ok(D1_OWNED_ACTIONS.has("payPurchaseOrder"));
  assert.ok(D1_OWNED_ACTIONS.has("syncTikTokInventory"));
  assert.ok(!D1_OWNED_ACTIONS.has("login"));
  assert.ok(!D1_OWNED_ACTIONS.has("createUser"));
  assert.ok(!D1_OWNED_ACTIONS.has("testProductContentConfiguration"));

  console.log(`Data source ownership QA passed for ${D1_OWNED_ACTIONS.size} D1-owned actions.`);
} finally {
  globalThis.fetch = originalFetch;
}
