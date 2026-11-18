import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const expectedModules = {
  "accounting-settings.html": ["channels", "accounting"],
  "accounting.html": ["channels", "accounting"],
  "activity.html": [],
  "channel-settings.html": ["channels"],
  "channels.html": ["channels"],
  "content.html": [],
  "customers.html": ["customers"],
  "incense.html": ["channels", "team"],
  "inventory.html": ["inventory"],
  "meeting-minutes.html": ["channels", "team"],
  "order-create.html": [],
  "orders.html": [],
  "products.html": ["products"],
  "purchase-create.html": [],
  "purchasing.html": ["purchasing"],
  "reports.html": ["reports"],
  "settings.html": [],
  "suppliers.html": ["purchasing"],
  "team-pricing.html": ["channels", "team"],
  "team.html": ["channels", "team"],
  "users.html": []
};

const appSource = fs.readFileSync(path.join("assets", "js", "app.js"), "utf8");
for (const controller of ["renderProducts", "renderCustomers", "renderCustomerDetail", "renderInventory", "renderStockMovements"]) {
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
assert.equal(totalReferences, 20, "Page-module budget changed; update the ownership map intentionally");

console.log(`Frontend module loading QA passed for ${Object.keys(expectedModules).length} pages and ${totalReferences} module references.`);
