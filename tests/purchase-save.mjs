import assert from "node:assert/strict";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import worker from "../cloudflare-worker/src/index.js";

const requireWorker = createRequire(new URL("../cloudflare-worker/package.json", import.meta.url));
const { Miniflare } = requireWorker("miniflare");
// Ephemeral D1 only: no wrangler config, production bindings or credentials.
const mf = new Miniflare({
  modules: true,
  script: "export default { fetch() { return new Response('local test'); } };",
  compatibilityDate: "2026-07-13",
  d1Databases: ["DB"],
  d1Persist: false
});
let failures = 0;
try {
  const db = await mf.getD1Database("DB");
  for (const name of (await readdir(new URL("../cloudflare-worker/migrations/", import.meta.url))).filter(name => name.endsWith(".sql")).sort()) {
    const sql = await readFile(new URL(`../cloudflare-worker/migrations/${name}`, import.meta.url), "utf8");
    await db.exec(sql.replace(/\r?\n/g, " "));
  }
  await db.batch([
    db.prepare("INSERT INTO users(id,name,email,role,status,session_token,session_expires_at) VALUES('qa-admin','Local QA','qa@example.invalid','admin','active','qa-only','2099-01-01')"),
    db.prepare("INSERT INTO suppliers(id,name,phone,status) VALUES('qa-supplier','Local supplier','000','active')"),
    ...Array.from({ length: 120 }, (_, i) => db.prepare("INSERT INTO products(id,sku,name,status,stock) VALUES(?,?,?,'active',10)").bind(`qa-product-${i}`, `QA-${i}`, `Local product ${i}`))
  ]);
  function meteredDb() {
    let queries = 0;
    const tick = () => {
      if (++queries > 50) throw new Error("Too many API requests by single Worker invocation");
    };
    return {
      get queries() { return queries; },
      prepare(sql) {
        function wrap(statement) {
          return {
            bind(...values) { assert.ok(values.length <= 100); return wrap(statement.bind(...values)); },
            async first(...args) { tick(); return statement.first(...args); },
            async all(...args) { tick(); return statement.all(...args); },
            async run(...args) { tick(); return statement.run(...args); },
            rawStatement: statement
          };
        }
        return wrap(db.prepare(sql));
      },
      async batch(statements) { tick(); return db.batch(statements.map(s => s.rawStatement)); }
    };
  }
  const body = {
    action: "createPurchaseOrder", token: "qa-only", supplierId: "qa-supplier",
    dueDate: "2026-12-31", discount: 100, shippingFee: 500,
    items: [{ productId: "qa-product-0", quantity: 2, unitCost: 11200 }]
  };
  async function call(patch = {}) {
    const DB = meteredDb();
    const response = await worker.fetch(new Request("https://local.test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...patch })
    }), { DB }, {});
    return { status: response.status, data: await response.json(), queries: DB.queries };
  }
  async function test(name, fn) {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  const created = await call();
  assert.equal(created.data.ok, true, JSON.stringify(created));
  const id = created.data.purchaseOrder.id;
  const snapshot = async () => ({
    order: await db.prepare("SELECT * FROM purchase_orders WHERE id=?").bind(id).first(),
    items: (await db.prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id=? ORDER BY id").bind(id).all()).results
  });
  await test("edit replaces lines, preserves identity, records audit", async () => {
    const result = await call({ action: "updatePurchaseOrder", id, note: "Local edit", items: [{ productId: "qa-product-1", quantity: 3, unitCost: 6361 }] });
    assert.equal(result.data.ok, true, JSON.stringify(result));
    assert.equal(result.data.purchaseOrder.total, 19483);
    assert.equal(result.data.purchaseOrder.code, created.data.purchaseOrder.code);
    const saved = await snapshot();
    assert.equal(saved.items.length, 1);
    assert.equal(saved.items[0].product_id, "qa-product-1");
    assert.equal((await db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='updatePurchaseOrder' AND entity_id=?").bind(id).first()).n, 1);
  });
  await test("inactive product is a useful validation error, not upstream failure", async () => {
    const before = await snapshot();
    await db.prepare("UPDATE products SET status='archived' WHERE id='qa-product-0'").run();
    const result = await call({ action: "updatePurchaseOrder", id });
    await db.prepare("UPDATE products SET status='active' WHERE id='qa-product-0'").run();
    assert.equal(result.status, 200);
    assert.equal(result.data.ok, false);
    assert.notEqual(result.data.code, "upstream_unavailable");
    assert.deepEqual(await snapshot(), before);
  });
  await test("update without id cannot create another order", async () => {
    const before = await db.prepare("SELECT COUNT(*) n FROM purchase_orders").first();
    const result = await call({ action: "updatePurchaseOrder" });
    assert.equal(result.data.ok, false);
    assert.deepEqual(await db.prepare("SELECT COUNT(*) n FROM purchase_orders").first(), before);
  });
  await test("an archived product already in the draft stays editable without reactivation", async () => {
    await db.prepare("UPDATE products SET status='archived' WHERE id='qa-product-1'").run();
    const result = await call({ action: "updatePurchaseOrder", id, items: [{ productId: "qa-product-1", quantity: 4, unitCost: 11200 }] });
    assert.equal(result.data.ok, true, JSON.stringify(result));
    assert.equal(result.data.purchaseOrder.items[0].quantity, 4);
    assert.equal((await db.prepare("SELECT status FROM products WHERE id='qa-product-1'").first()).status, "archived");
    const newOrder = await call({ items: [{ productId: "qa-product-1", quantity: 4, unitCost: 11200 }] });
    assert.equal(newOrder.data.ok, false);
    await db.prepare("UPDATE products SET status='active' WHERE id='qa-product-1'").run();
  });
  await test("invalid numbers do not silently turn into zero", async () => {
    const result = await call({ action: "updatePurchaseOrder", id, discount: "invalid" });
    assert.equal(result.data.ok, false);
  });
  await test("large draft saves within D1 free query and binding limits", async () => {
    await db.prepare("UPDATE products SET status='active' WHERE id='qa-product-0'").run();
    const result = await call({ action: "updatePurchaseOrder", id, items: Array.from({ length: 120 }, (_, i) => ({ productId: `qa-product-${i}`, quantity: 2, unitCost: 11200 + i })) });
    assert.equal(result.data.ok, true, JSON.stringify(result));
    assert.equal(result.data.purchaseOrder.items.length, 120);
    assert.ok(result.queries < 20, `Used ${result.queries} D1 calls`);
    console.log(`  120 lines: ${result.queries} D1 calls including audit`);
  });
  await test("failed line insert rolls back header and deleted old lines", async () => {
    const before = await snapshot();
    await db.exec("CREATE TRIGGER qa_reject_line BEFORE INSERT ON purchase_order_items WHEN NEW.unit_cost=999 BEGIN SELECT RAISE(ABORT, 'qa forced insert failure'); END;");
    const result = await call({ action: "updatePurchaseOrder", id, note: "Must roll back", items: [{ productId: "qa-product-1", quantity: 1, unitCost: 999 }] });
    assert.equal(result.data.ok, false);
    assert.notEqual(result.data.code, "upstream_unavailable");
    assert.deepEqual(await snapshot(), before);
    await db.exec("DROP TRIGGER qa_reject_line;");
  });
  await test("received orders and unauthorized users cannot be edited", async () => {
    await db.prepare("UPDATE purchase_orders SET status='received' WHERE id=?").bind(id).run();
    const before = await snapshot();
    assert.equal((await call({ action: "updatePurchaseOrder", id })).data.ok, false);
    assert.equal((await call({ action: "updatePurchaseOrder", id, token: "invalid" })).data.ok, false);
    assert.deepEqual(await snapshot(), before);
  });
  if (process.argv.includes("--ui")) {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
    try {
      await mkdir(new URL("../test-artifacts/purchase-save/", import.meta.url), { recursive: true });
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        await test(`browser edits real local D1 and recovers after rejection (${viewport.width})`, async () => {
          await db.prepare("UPDATE purchase_orders SET status='draft' WHERE id=?").bind(id).run();
          assert.equal((await call({ action: "updatePurchaseOrder", id })).data.ok, true);
          const page = await browser.newPage({ viewport });
          const errors = [];
          page.on("pageerror", error => errors.push(error.message));
          page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
          await page.addInitScript(() => localStorage.setItem("artflow-pos.v2.authToken", "qa-only"));
          let lastSave;
          await page.route("**/*", async route => {
            const url = new URL(route.request().url());
            if (url.protocol === "file:") return route.continue();
            if (url.hostname !== "artflow-pos-api.ptlocnguyen.workers.dev") return route.abort();
            const payload = JSON.parse(route.request().postData() || "{}");
            let result;
            if (payload.action === "me") result = { status: 200, data: { ok: true, user: { id: "qa-admin", name: "Local QA", role: "admin", status: "active" } } };
            else if (payload.action === "getAppSettings") result = { status: 200, data: { ok: true, settings: {} } };
            else result = await call(payload);
            if (payload.action === "updatePurchaseOrder") lastSave = result;
            await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.data) });
          });
          try {
            const url = new URL("../pages/purchase-create.html", import.meta.url);
            url.searchParams.set("edit", id);
            await page.goto(url.href);
            const submit = page.getByRole("button", { name: "Lưu thay đổi", exact: true });
            await submit.waitFor();
            await page.locator("[data-purchase-quantity]").fill("3");
            await page.locator("[data-purchase-cost]").fill("11200");
            await page.waitForFunction(() => document.querySelector("[data-purchase-cost]")?.value === "11.200");
            await page.locator("#note").fill("Local browser edit");
            await db.prepare("UPDATE products SET status='deleted' WHERE id='qa-product-0'").run();
            await submit.click();
            await page.waitForFunction(() => document.querySelector("[data-toast]")?.textContent.includes("QA-0"));
            assert.equal(lastSave.data.ok, false);
            assert.ok(page.url().includes("purchase-create.html"));
            assert.equal(await page.locator("#note").inputValue(), "Local browser edit");
            assert.equal(await page.locator("[data-purchase-cost]").inputValue(), "11.200");
            assert.ok((await page.locator("[data-toast]").innerText()).includes("Mã yêu cầu:"));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
            await db.prepare("UPDATE products SET status='active' WHERE id='qa-product-0'").run();
            assert.equal((await db.prepare("SELECT status FROM products WHERE id='qa-product-0'").first()).status, "active");
            await page.locator("[data-toast]").evaluate(element => { element.textContent = ""; element.hidden = true; });
            await submit.click();
            await page.waitForFunction(() => document.querySelector("[data-toast]")?.textContent.length > 0);
            assert.ok((await page.locator("[data-toast]").innerText()).includes("Đã lưu"), `Unexpected success toast: ${await page.locator("[data-toast]").innerText()}`);
            assert.ok(page.url().includes("purchase-create.html"));
            assert.ok(page.url().includes(`edit=${id}`));
            assert.equal(lastSave.data.ok, true);
            const saved = await snapshot();
            assert.equal(saved.order.note, "Local browser edit");
            assert.equal(saved.items[0].quantity, 3);
            assert.equal(saved.items[0].unit_cost, 11200);
            assert.equal(saved.order.total, 34000);
            await page.locator("#note").fill("Second local browser edit");
            await submit.click();
            await page.waitForTimeout(500);
            assert.ok((await page.locator("[data-toast]").innerText()).includes("Đã lưu"));
            assert.equal((await snapshot()).order.note, "Second local browser edit", "A second save must update the same draft");
            assert.equal((await db.prepare("SELECT COUNT(*) n FROM purchase_orders WHERE id=?").bind(id).first()).n, 1);
            await page.goto(url.href);
            await submit.waitFor();
            const targetRow = page.locator('[data-purchase-item-row]:has([data-purchase-product][value="qa-product-0"])');
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: fileURLToPath(new URL(`../test-artifacts/purchase-save/edit-${viewport.width}.png`, import.meta.url)), fullPage: false });
            await db.prepare("UPDATE products SET status='deleted' WHERE id='qa-product-0'").run();
            await page.reload();
            await submit.waitFor();
            assert.equal(await targetRow.count(), 1, "Missing catalog products must not silently disappear from a draft");
            assert.deepEqual(errors, []);
          } finally {
            await db.prepare("UPDATE products SET status='active' WHERE id='qa-product-0'").run();
            await page.close();
          }
        });
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await mf.dispose();
}
assert.equal(failures, 0, `${failures} purchase save regression(s)`);
