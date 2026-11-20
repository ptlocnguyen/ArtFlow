import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("assets/js/pages/inventory.js", "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const escapeAttribute = escapeHtml;
const state = {
  products: [
    { id: "p-1", sku: "ART001", name: "Sản phẩm chính", stock: 2, lowStock: 5, status: "active" },
    { id: "p-2", sku: "<ART002>", name: "Tên <b>không an toàn</b>", stock: 12, lowStock: 3, status: "active" },
    { id: "p-old", sku: "OLD", name: "Đã lưu trữ", stock: 1, lowStock: 1, status: "archived" }
  ]
};

const controller = context.window.ArtFlowPageModules.inventory.create({
  els: {}, escapeAttribute, escapeHtml, filtered: items => items, formatDateTime: value => value,
  getSearchTerm: () => "", icon: () => "", inventoryFilters: { category: "all", stock: "all", sort: "risk" },
  money: { format: value => String(value) }, renderProductThumb: () => "", state, statusLabel: value => value
});

const receiveForm = controller.renderStockReceiveForm("p-1");
assert.match(receiveForm, /value="p-1" selected/);
assert.match(receiveForm, /name="quantity"[^>]*value="8"/);
assert.ok(!receiveForm.includes("Đã lưu trữ"), "Archived products must not be available for stock operations");

const adjustedForm = controller.renderStockAdjustForm("p-2");
assert.match(adjustedForm, /value="p-2" selected/);
assert.match(adjustedForm, /name="stock"[^>]*value="12"/);
assert.ok(adjustedForm.includes("&lt;ART002&gt;"), "SKU labels must be HTML escaped");
assert.ok(adjustedForm.includes("Tên &lt;b&gt;không an toàn&lt;/b&gt;"), "Product names must be HTML escaped");
assert.ok(!adjustedForm.includes("<b>không an toàn</b>"), "Raw product HTML must never enter the modal");

console.log("Inventory controller QA passed.");
