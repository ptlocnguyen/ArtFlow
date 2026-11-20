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
  for (const sharedUiPart of ["data-modal-backdrop", "data-modal-form", "data-menu-close", "data-toast", "data-loading-overlay", "data-loading-text"]) {
    assert.ok(html.includes(sharedUiPart), `${file} must own shared UI structure: ${sharedUiPart}`);
  }
}

assert.ok(!appSource.includes("els.sharedUi.innerHTML"), "Shared UI must remain owned by page HTML");

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
assert.ok(orderCreateHtml.includes("assets/css/order-create.css"), "order-create.html must load its viewport-fit layout rules");
for (const selector of ["data-order-create-editor", "data-order-items", "data-order-customer-options", "data-product-picker-list", "data-summary-total"]) {
  assert.ok(orderCreateHtml.includes(selector), `order-create.html must own ${selector}`);
}
assert.ok(!orderCreateHtml.includes('<form class="order-create-form" data-order-create-form></form>'), "Order editor HTML must not be an empty JavaScript mount point");
const orderCreateCss = fs.readFileSync(path.join("assets", "css", "order-create.css"), "utf8");
assert.ok(orderCreateCss.includes('body[data-page="orderCreate"] .workspace > .view.active'), "Desktop order creation must fit the remaining workspace height");
assert.ok(orderCreateCss.includes("max-height: 900px"), "Short desktop screens must use the compact order layout");
assert.ok(orderCreateCss.includes(".order-items-large { overflow-y: auto; }"), "Only long order item lists may scroll inside the desktop workflow");

const teamPricingHtml = fs.readFileSync(path.join("pages", "team-pricing.html"), "utf8");
for (const selector of ["data-team-pricing-page-form", "data-pricing-selected-product", "data-pricing-lines", "data-pricing-scenarios", "data-team-pricing-preview", "data-team-pricing-comments"]) {
  assert.ok(teamPricingHtml.includes(selector), `team-pricing.html must own ${selector}`);
}
for (const field of ["title", "status", "owner", "productId", "baseCost", "quantity", "priceTarget", "channelId", "selectedScenarioId"]) {
  assert.ok(teamPricingHtml.includes(`name="${field}"`), `team-pricing.html must own the ${field} field`);
}
assert.ok(!teamPricingHtml.includes("<section data-team-pricing-page></section>"), "Team pricing HTML must not be an empty JavaScript mount point");
const teamSource = fs.readFileSync(path.join("assets", "js", "pages", "team.js"), "utf8");
const pricingPageController = teamSource.slice(teamSource.indexOf("function renderTeamPricingPage("), teamSource.indexOf("async function submitTeamPricingPageForm("));
assert.ok(!pricingPageController.includes("container.innerHTML"), "Team pricing page controller must hydrate HTML instead of replacing its layout");

const suppliersHtml = fs.readFileSync(path.join("pages", "suppliers.html"), "utf8");
for (const selector of ["data-supplier-detail-name", "data-supplier-detail-payable", "data-supplier-detail-note-row", "data-supplier-product-history-list", "data-supplier-detail-orders", "data-supplier-detail-edit"]) {
  assert.ok(suppliersHtml.includes(selector), `suppliers.html must own ${selector}`);
}
assert.ok(!suppliersHtml.includes('<aside class="management-drawer" data-supplier-detail hidden aria-label="Chi tiết nhà cung cấp"></aside>'), "Supplier detail must not be an empty JavaScript mount point");

const purchasingHtml = fs.readFileSync(path.join("pages", "purchasing.html"), "utf8");
for (const selector of ["data-purchase-detail-code", "data-purchase-detail-status", "data-purchase-detail-outstanding", "data-purchase-detail-items", "data-purchase-detail-note-section", "data-purchase-detail-print"]) {
  assert.ok(purchasingHtml.includes(selector), `purchasing.html must own ${selector}`);
}
assert.ok(!purchasingHtml.includes('<aside class="management-drawer operation-detail" data-purchase-detail hidden aria-label="Chi tiết phiếu mua"></aside>'), "Purchase detail must not be an empty JavaScript mount point");
const purchasingSource = fs.readFileSync(path.join("assets", "js", "pages", "purchasing.js"), "utf8");
assert.ok(!purchasingSource.includes("drawer.innerHTML"), "Purchasing drawers must hydrate their HTML-owned structure");

const customersHtml = fs.readFileSync(path.join("pages", "customers.html"), "utf8");
assert.ok(customersHtml.includes("assets/css/customers.css"), "customers.html must load its page-width layout rules");
for (const selector of ["data-customer-detail-template", "data-customer-detail-avatar", "data-customer-detail-spent", "data-customer-detail-phone", "data-customer-detail-orders", "data-customer-detail-note", "data-customer-detail-actions"]) {
  assert.ok(customersHtml.includes(selector), `customers.html must own ${selector}`);
}
const customersCss = fs.readFileSync(path.join("assets", "css", "customers.css"), "utf8");
assert.ok(customersCss.includes('body[data-page="customers"] .resource-index'), "Customer table panel must fill its content area");
assert.ok(customersCss.includes("width: 100%"), "Customer table panel must use the available content width");
const customersSource = fs.readFileSync(path.join("assets", "js", "pages", "customers.js"), "utf8");
assert.ok(!customersSource.includes('<section class="customer-detail-hero'), "Customer detail layout must remain owned by its HTML template");
assert.ok(customersSource.includes("hydrateCustomerDetail"), "Customer controller must hydrate the HTML-owned detail template");

const ordersHtml = fs.readFileSync(path.join("pages", "orders.html"), "utf8");
for (const selector of ["data-order-detail-template", "data-order-detail-code", "data-order-detail-pdf-link", "data-order-detail-customer", "data-order-detail-items", "data-order-detail-note", "data-order-detail-outstanding", "data-order-detail-total"]) {
  assert.ok(ordersHtml.includes(selector), `orders.html must own ${selector}`);
}
const ordersSource = fs.readFileSync(path.join("assets", "js", "pages", "orders.js"), "utf8");
assert.ok(!ordersSource.includes('<div class="order-detail">'), "Order detail layout must remain owned by its HTML template");
assert.ok(ordersSource.includes("hydrateOrderDetail"), "Orders controller must hydrate the HTML-owned detail template");
assert.ok(customersSource.includes("./orders.html?orderId="), "Customer order history must deep-link to the owning Orders page");
assert.ok(appSource.includes('routeParams.get("orderId")'), "Orders page must accept customer-history deep links");

const productsHtml = fs.readFileSync(path.join("pages", "products.html"), "utf8");
for (const selector of ["data-product-form-template", "name=\"sku\"", "name=\"category\"", "name=\"contentStatus\"", "name=\"contentPostLinks\"", "data-product-form-resource-note", "data-product-detail-template", "data-product-detail-name", "data-product-detail-sale-price", "data-product-detail-channel-prices", "data-product-detail-supplier-history", "data-product-detail-sales-links", "data-product-detail-google-links"]) {
  assert.ok(productsHtml.includes(selector), `products.html must own ${selector}`);
}
assert.ok(!appSource.includes('<div class="product-form-section full"><h3>Thông tin bán hàng</h3>'), "Product form layout must remain owned by its HTML template");
assert.ok(appSource.includes("hydrateProductForm"), "Product controller must hydrate the HTML-owned form template");
assert.ok(productsHtml.includes('name="stock" type="number" min="0" step="1" value="0"'), "New products must default stock to zero");
assert.ok(productsHtml.includes('name="lowStock" type="number" min="0" step="1" value="1"'), "New products must default the low-stock threshold to one");
assert.ok(appSource.includes('setValue("stock", "stock", 0)'), "Product editing must preserve a zero stock value");
assert.ok(appSource.includes('setValue("lowStock", "lowStock", 1)'), "Product creation must hydrate the low-stock threshold to one");
assert.ok(!appSource.includes('<div class="product-detail-hero full">'), "Product detail layout must remain owned by its HTML template");
assert.ok(appSource.includes("hydrateProductDetail"), "Product controller must hydrate the HTML-owned detail template");

const authHtml = fs.readFileSync("index.html", "utf8");
for (const state of ["loading", "backend-error", "form"]) {
  assert.ok(authHtml.includes(`data-auth-state="${state}"`), `index.html must own the ${state} auth state`);
}
for (const field of ["name", "email", "password"]) {
  assert.ok(authHtml.includes(`name="${field}"`), `index.html must own the ${field} auth field`);
}
assert.ok(authHtml.indexOf("assets/js/pages/auth.js") < authHtml.indexOf("assets/js/app.js"), "Auth controller must load before app.js");
assert.ok(!authHtml.includes("Google Sheet"), "Auth copy must describe the current D1 architecture");
const appCss = fs.readFileSync(path.join("assets", "css", "app.css"), "utf8");
assert.ok(appCss.includes('[data-auth-state="form"]:not([hidden])'), "Auth CSS must lay out the visible form state");
const baseCss = fs.readFileSync(path.join("assets", "css", "base.css"), "utf8");
assert.ok(baseCss.includes("[hidden]"), "Base CSS must preserve native hidden semantics across every page");
assert.ok(baseCss.includes("display: none !important"), "Hidden elements must not be overridden by component display rules");
const appShellCss = fs.readFileSync(path.join("assets", "css", "app-shell.css"), "utf8");
assert.ok(appShellCss.includes(".context-nav::-webkit-scrollbar"), "The workflow navigation must own a compact scrollbar style");
assert.ok(appShellCss.includes("scrollbar-color: rgba(126, 169, 218, .68) transparent"), "The workflow navigation scrollbar must stay subtly visible on the dark sidebar");

console.log(`Frontend module loading QA passed for ${Object.keys(expectedModules).length} pages and ${totalReferences} module references.`);
