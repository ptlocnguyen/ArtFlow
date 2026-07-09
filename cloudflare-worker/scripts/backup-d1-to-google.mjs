import fs from "node:fs";
import path from "node:path";

function unquote(value) {
  return String(value || "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

function readVars(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).map(line => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    return match ? [match[1], unquote(match[2])] : null;
  }).filter(Boolean));
}

const args = process.argv.slice(2);
const tokenIndex = args.indexOf("--token");
const token = tokenIndex >= 0 ? args[tokenIndex + 1] : process.env.ARTFLOW_ADMIN_TOKEN;
if (!token) throw new Error("Provide an admin session using --token or ARTFLOW_ADMIN_TOKEN.");

const vars = readVars(path.resolve(".dev.vars"));
const appsScriptUrl = unquote(process.env.APPS_SCRIPT_URL || vars.APPS_SCRIPT_URL);
const workerUrl = unquote(process.env.WORKER_URL || "https://artflow-pos-api.ptlocnguyen.workers.dev");
if (!appsScriptUrl) throw new Error("Missing APPS_SCRIPT_URL in .dev.vars.");

async function post(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Backend returned invalid JSON (${response.status}).`); }
  if (!response.ok || !result.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

console.log("Exporting D1 snapshot...");
const exported = await post(workerUrl, { action: "exportD1Snapshot", token });
console.log("Storing compressed backup in Google Drive...");
const stored = await post(appsScriptUrl, { action: "storeD1Backup", token, snapshot: exported.snapshot });
console.log(`Backup created: ${stored.backupFileName} (${stored.bytes} bytes)`);
console.log(stored.backupFileUrl);
