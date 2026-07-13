import fs from "node:fs";

const frontend = fs.readFileSync("assets/js/app.js", "utf8");
const appsScript = fs.readFileSync("apps-script/Code.gs", "utf8");
const workerFiles = fs.readdirSync("cloudflare-worker/src").filter(file => file.endsWith(".js"));
const worker = workerFiles
  .map(file => fs.readFileSync(`cloudflare-worker/src/${file}`, "utf8"))
  .join("\n");
const migration = fs.readFileSync(
  "cloudflare-worker/migrations/0004_durable_audit_events.sql",
  "utf8"
);

const actionBlock = frontend.slice(
  frontend.indexOf("function actionForPath"),
  frontend.indexOf("async function apiRequest")
);
const actions = [...actionBlock.matchAll(/:\s*"([A-Za-z0-9]+)"/g)].map(match => match[1]);
const missing = [...new Set(actions)].filter(action => {
  return !appsScript.includes(`case "${action}"`) && !worker.includes(`"${action}"`);
});

if (missing.length) {
  throw new Error(`Frontend actions without a backend handler: ${missing.join(", ")}`);
}
if (!worker.includes('"listAuditLogs"') || !worker.includes("audit_events")) {
  throw new Error("D1 audit history or durable audit events are not wired.");
}
if (/auditD1Mutation[\s\S]{0,120}\.catch\(\(\) => \{\}\)/.test(worker)) {
  throw new Error("Audit write failures must not be swallowed.");
}
const readOnlyBlock = worker.slice(
  worker.indexOf("const CORE_READ_ONLY_ACTIONS"),
  worker.indexOf("function changesCoreData")
);
if (readOnlyBlock.includes('"login"') || readOnlyBlock.includes('"logout"')) {
  throw new Error("Login and logout activity must be recorded in D1 audit history.");
}
if (!worker.includes('"audit_logs", "audit_events"')) {
  throw new Error("D1 backups must include audit logs and durable audit events.");
}
if (!migration.includes("request_id TEXT PRIMARY KEY") || !migration.includes("idx_audit_logs_request_id")) {
  throw new Error("Durable audit migration is incomplete.");
}

const purchasingWorker = fs.readFileSync("cloudflare-worker/src/d1-purchasing-actions.js", "utf8");
const paymentWorkerBlock = purchasingWorker.slice(
  purchasingWorker.indexOf('if(b.action==="payPurchaseOrder")'),
  purchasingWorker.indexOf('if(b.action==="applySupplierCredit")')
);
const paymentAppsBlock = appsScript.slice(
  appsScript.indexOf("function payPurchaseOrder(body)"),
  appsScript.indexOf("function cancelPurchaseOrder(body)")
);
if (!paymentWorkerBlock.includes("env.DB.batch") || !paymentWorkerBlock.includes("INSERT INTO cash_transactions(id,type,account_id") || !paymentWorkerBlock.includes("INSERT INTO supplier_payments(id,purchase_order_id")) {
  throw new Error("D1 purchase payment must atomically create explicit cash transaction and supplier payment rows.");
}
if (!paymentWorkerBlock.includes('row.status!=="received"') || !paymentWorkerBlock.includes('row.payment_status==="paid"') || !paymentWorkerBlock.includes("amount<=0") || !paymentWorkerBlock.includes("amount>outstanding")) {
  throw new Error("D1 purchase payment guards are incomplete.");
}
if (!paymentAppsBlock.includes('order.status !== "received"') || !paymentAppsBlock.includes('order.payment_status === "paid"') || !paymentAppsBlock.includes("amount <= 0") || !paymentAppsBlock.includes("amount > outstanding")) {
  throw new Error("Apps Script purchase payment guards are incomplete.");
}
if (!paymentAppsBlock.includes('deleteRows("supplier_payments"') || !paymentAppsBlock.includes('deleteRows("cash_transactions"')) {
  throw new Error("Apps Script purchase payment must compensate partial writes on failure.");
}

console.log(`Data integrity QA passed for ${new Set(actions).size} API actions.`);
