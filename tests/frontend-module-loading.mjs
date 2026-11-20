import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const expectedModules = {
  "accounting-settings.html": ["channels", "accounting"],
  "accounting.html": ["channels", "accounting"],
  "activity.html": ["admin"],
  "channel-settings.html": ["channels"],
  "channels.html": ["channels"],
  "content.html": ["content"],
  "customers.html": ["orders", "customers"],
  "incense.html": ["channels", "team"],
  "inventory.html": ["inventory"],
  "meeting-minutes.html": ["channels", "team"],
  "order-create.html": ["order-create"],
  "orders.html": ["orders"],
  "products.html": ["products"],
  "purchase-create.html": ["purchase-create"],
  "purchasing.html": ["purchasing"],
  "reports.html": ["reports"],
  "settings.html": ["settings"],
  "suppliers.html": ["purchasing"],
  "team-pricing.html": ["channels", "team"],
  "team.html": ["channels", "team"],
  "users.html": ["admin"]
};

const appSource = fs.readFileSync(path.join("assets", "js", "app.js"), "utf8");
for (const controller of ["renderProducts", "renderCustomers", "renderCustomerDetail", "renderInventory", "renderStockMovements", "renderStockReceiveForm", "renderStockAdjustForm", "renderPurchaseCreatePage", "renderSettingsPage", "renderSettingsPreview", "renderApiMissing", "renderAuthForm", "renderOrdersRows", "renderOrderDetail", "renderUsers", "renderAuditLogs", "renderAuditDetail", "renderContentWorkspace", "renderContentItemForm", "renderOrderCreatePage", "renderProductPicker", "renderOrderItemRowV2", "submitOrderForm"]) {
  assert.ok(!appSource.includes(`function ${controller}(`), `${controller} must remain owned by its page module`);
}

for (const [file, expected] of Object.entries(expectedModules)) {
  const html = fs.readFileSync(path.join("pages", file), "utf8");
  assert.ok(!html.includes("xlsx.bundle.js"), `${file} must lazy-load XLSX instead of blocking initial render`);
  const actual = [...html.matchAll(/assets\/js\/pages\/([a-z-]+)\.js/g)].map(match => match[1]);
  assert.deepEqual(actual, expected, `${file} must load only its owning page modules`);

  const appIndex = html.indexOf("assets/js/app.js");
  assert.ok(appIndex >= 0, `${file} must load app.js`);
  for (const module of actual) {
    assert.ok(html.indexOf(`assets/js/pages/${module}.js`) < appIndex, `${file} must load ${module} before app.js`);
  }
}

const totalReferences = Object.values(expectedModules).reduce((sum, modules) => sum + modules.length, 0);
assert.equal(totalReferences, 28, "Page-module budget changed; update the ownership map intentionally");

const purchaseCreateHtml = fs.readFileSync(path.join("pages", "purchase-create.html"), "utf8");
for (const selector of ["data-purchase-editor", "data-purchase-items", "data-purchase-supplier", "data-purchase-product-list", "data-purchase-summary-total"]) {
  assert.ok(purchaseCreateHtml.includes(selector), `purchase-create.html must own ${selector}`);
}
assert.ok(!purchaseCreateHtml.includes('<form class="purchase-create-form" data-purchase-create-form></form>'), "Purchase editor HTML must not be an empty JavaScript mount point");

const settingsHtml = fs.readFileSync(path.join("pages", "settings.html"), "utf8");
for (const field of ["storeName", "legalName", "paperSize", "taxCode", "invoiceLegalNotice"]) {
  assert.ok(settingsHtml.includes(`name="${field}"`), `settings.html must own the ${field} field`);
}
for (const preview of ["data-settings-preview-store", "data-settings-preview-legal", "data-settings-preview-notice"]) {
  assert.ok(settingsHtml.includes(preview), `settings.html must own ${preview}`);
}
assert.ok(!settingsHtml.includes('<form class="panel form-grid settings-form" data-settings-form></form>'), "Settings HTML must not be an empty JavaScript mount point");

const orderCreateHtml = fs.readFileSync(path.join("pages", "order-create.html"), "utf8");
for (const selector of ["data-order-create-editor", "data-order-items", "data-order-customer-options", "data-product-picker-list", "data-summary-total"]) {
  assert.ok(orderCreateHtml.includes(selector), `order-create.html must own ${selector}`);
}
assert.ok(!orderCreateHtml.includes('<form class="order-create-form" data-order-create-form></form>'), "Order editor HTML must not be an empty JavaScript mount point");

const authHtml = fs.readFileSync("index.html", "utf8");
for (const state of ["loading", "backend-error", "form"]) {
  assert.ok(authHtml.includes(`data-auth-state="${state}"`), `index.html must own the ${state} auth state`);
}
for (const field of ["name", "email", "password"]) {
  assert.ok(authHtml.includes(`name="${field}"`), `index.html must own the ${field} auth field`);
}
assert.ok(authHtml.indexOf("assets/js/pages/auth.js") < authHtml.indexOf("assets/js/app.js"), "Auth controller must load before app.js");
assert.ok(!authHtml.includes("Google Sheet"), "Auth copy must describe the current D1 architecture");

console.log(`Frontend module loading QA passed for ${Object.keys(expectedModules).length} pages and ${totalReferences} module references.`);
