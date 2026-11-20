import assert from "node:assert/strict";
import fs from "node:fs";

const frontend = fs.readFileSync("assets/js/app.js", "utf8");
const d1Data = fs.readFileSync("cloudflare-worker/src/d1-data.js", "utf8");
const worker = fs.readFileSync("cloudflare-worker/src/index.js", "utf8");
const authWorker = fs.readFileSync("cloudflare-worker/src/d1-auth-actions.js", "utf8");
const authMigration = fs.readFileSync("cloudflare-worker/migrations/0008_d1_auth_credentials.sql", "utf8");

const scopesBlock = frontend.slice(
  frontend.indexOf("function dataScopesForPage"),
  frontend.indexOf("function applyPageData")
);
assert.match(scopesBlock, /products:\s*\["products"\]/, "Products must initially request only its catalog scope");
assert.doesNotMatch(scopesBlock, /products:\s*\[[^\]]*"purchasing"/, "Purchasing history must not block the initial products page");

const productDetailClick = frontend.slice(
  frontend.indexOf('if (target.dataset.viewProduct)'),
  frontend.indexOf('if (target.dataset.viewCustomer)')
);
assert.match(productDetailClick, /ensurePurchasingData\(\)/, "Product detail must request purchasing data on demand");
assert.match(frontend, /if \(purchasingDataPromise\) return purchasingDataPromise;/, "Concurrent detail opens must share one purchasing request");
assert.match(frontend, /Đang tải lịch sử nhập hàng/, "Product detail must expose its lazy loading state");
assert.match(frontend, /data-retry-product-purchasing/, "A failed lazy request must remain retryable");

assert.match(d1Data, /WHERE role = 'admin' AND status <> 'deleted'/, "D1 bootstrap must require a non-deleted admin");
assert.match(d1Data, /return admin \? \{ ok: true, hasAdmin: true/, "Only a positive D1 admin result may answer bootstrap directly");
assert.match(worker, /if \(payload.action === "bootstrapStatus"\)/, "Worker must route bootstrap through the guarded D1 read");
assert.match(worker, /handleD1AuthAction/, "Worker must attempt D1-native authentication before the legacy upstream");
assert.match(worker, /upgradeIdentityPassword/, "A successful legacy login must upgrade the D1 credential");
assert.match(authWorker, /if \(user && user\.status !== "active"\) return invalidCredentials\(\);/, "Disabled accounts must fail closed before legacy fallback");
assert.match(authWorker, /if \(!user \|\| !user\.password_hash_v2\) return null;/, "Only a missing account or active account without a v2 credential may fall back");
assert.match(authMigration, /ALTER TABLE users ADD COLUMN password_hash_v2 TEXT;/, "Auth migration must add a separate hash column");
assert.doesNotMatch(authMigration, /UPDATE\s+users\s+SET\s+password_hash\s*=/i, "Auth migration must never overwrite legacy password hashes");

console.log("Login performance guard QA passed.");
