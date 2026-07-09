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

console.log(`Data integrity QA passed for ${new Set(actions).size} API actions.`);
