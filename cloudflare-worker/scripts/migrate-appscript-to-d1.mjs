import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "..");
const repoRoot = resolve(workerRoot, "..");
const outputFile = resolve(repoRoot, "tmp", "artflow-d1-import.sql");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function readDevVar(key) {
  const file = resolve(workerRoot, ".dev.vars");
  if (!existsSync(file)) return "";
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find(item => item.trim().startsWith(`${key}=`));
  return line ? cleanEnvValue(line.slice(key.length + 1)) : "";
}

function cleanEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildSql(snapshot, selectedTables) {
  const tables = snapshot.tables || {};
  const names = selectedTables.length ? selectedTables : Object.keys(tables);
  const chunks = [
    "PRAGMA foreign_keys = OFF;"
  ];

  names.forEach(name => {
    const rows = Array.isArray(tables[name]) ? tables[name] : [];
    chunks.push(`DELETE FROM ${sqlIdentifier(name)};`);
    rows.forEach(row => {
      const columns = Object.keys(row);
      if (!columns.length) return;
      chunks.push(
        `INSERT OR REPLACE INTO ${sqlIdentifier(name)} (${columns.map(sqlIdentifier).join(", ")}) VALUES (${columns.map(column => sqlString(row[column])).join(", ")});`
      );
    });
  });

  chunks.push(
    `INSERT OR REPLACE INTO d1_meta (key, value_json, updated_at) VALUES ('last_sheet_import', ${sqlString(JSON.stringify({
      schemaVersion: snapshot.schemaVersion || "",
      exportedAt: snapshot.exportedAt || "",
      importedAt: new Date().toISOString()
    }))}, datetime('now'));`,
    "PRAGMA foreign_keys = ON;"
  );
  return `${chunks.join("\n")}\n`;
}

async function main() {
  const token = argValue("--token") || process.env.ARTFLOW_ADMIN_TOKEN || "";
  const appsScriptUrl = cleanEnvValue(argValue("--apps-script-url") || process.env.APPS_SCRIPT_URL || readDevVar("APPS_SCRIPT_URL"));
  const database = argValue("--database") || "artflow-pos-db";
  const tables = (argValue("--tables") || "").split(",").map(item => item.trim()).filter(Boolean);
  const dryRun = process.argv.includes("--dry-run");

  if (!token) {
    throw new Error("Missing admin token. Run with --token <TOKEN> or set ARTFLOW_ADMIN_TOKEN.");
  }
  if (!appsScriptUrl) {
    throw new Error("Missing Apps Script URL. Set APPS_SCRIPT_URL or keep it in cloudflare-worker/.dev.vars.");
  }
  try {
    new URL(appsScriptUrl);
  } catch {
    throw new Error("Apps Script URL is invalid. Check APPS_SCRIPT_URL in cloudflare-worker/.dev.vars or pass --apps-script-url.");
  }

  console.log("Fetching Apps Script snapshot...");
  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "exportD1Snapshot",
      token,
      tables: tables.join(",")
    })
  });
  const snapshot = await response.json().catch(() => ({}));
  if (!response.ok || snapshot.ok === false) {
    throw new Error(snapshot.error || "Apps Script export failed. Deploy the latest Code.gs and verify the admin token.");
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  const sql = buildSql(snapshot, tables);
  writeFileSync(outputFile, sql, "utf8");
  console.log(`Wrote ${outputFile}`);
  console.log(`Tables: ${Object.keys(snapshot.tables || {}).length}, SQL size: ${Buffer.byteLength(sql)} bytes`);

  if (dryRun) {
    console.log("Dry-run only. Not importing into D1.");
    return;
  }

  console.log(`Importing into D1 database ${database}...`);
  const wranglerCli = resolve(workerRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  const result = spawnSync(
    process.execPath,
    [wranglerCli, "d1", "execute", database, "--remote", "--file", outputFile],
    { cwd: workerRoot, stdio: "inherit" }
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`D1 import failed with exit code ${result.status}`);
  }
  console.log("D1 import complete.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
