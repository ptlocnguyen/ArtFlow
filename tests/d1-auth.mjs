import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  D1_AUTH_SCHEMA_VERSION,
  createPasswordCredential,
  handleD1AuthAction,
  upgradeIdentityPassword,
  verifyPasswordCredential
} from "../cloudflare-worker/src/d1-auth-actions.js";

class AuthDatabase {
  constructor(user = null, schemaReady = true) {
    this.user = user;
    this.schemaReady = schemaReady;
    this.writes = [];
  }

  prepare(sql) {
    const database = this;
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (sql.includes("auth_schema_version")) {
          return database.schemaReady ? { value_json: JSON.stringify(D1_AUTH_SCHEMA_VERSION) } : null;
        }
        if (sql.includes("FROM users WHERE email = ?")) {
          return database.user && database.user.email === this.values[0] ? { ...database.user } : null;
        }
        if (sql.includes("FROM users") && sql.includes("session_token = ?")) {
          const token = this.values[0];
          return database.user && database.user.session_token === token && database.user.status === "active"
            ? { ...database.user }
            : null;
        }
        return null;
      },
      async run() {
        database.writes.push({ sql, values: this.values });
        if (sql.includes("password_hash_v2=?")) {
          const [hash, salt, iterations, migratedAt, updatedAt] = this.values;
          Object.assign(database.user, {
            password_hash_v2: hash,
            password_salt_v2: salt,
            password_iterations_v2: iterations,
            auth_migrated_at: migratedAt,
            updated_at: updatedAt
          });
        } else if (sql.includes("session_token=?")) {
          const [token, expiresAt, lastLoginAt, updatedAt, verifiedAt] = this.values;
          Object.assign(database.user, {
            session_token: token,
            session_expires_at: expiresAt,
            last_login_at: lastLoginAt,
            updated_at: updatedAt,
            d1_verified_at: verifiedAt
          });
        } else if (sql.includes("session_token=''")) {
          Object.assign(database.user, { session_token: "", session_expires_at: "", d1_verified_at: null });
        }
        return { success: true, meta: { changes: 1 } };
      }
    };
  }
}

const envConfig = { D1_AUTH_MODE: "direct", D1_AUTH_PBKDF2_ITERATIONS: "10000" };
const password = "correct-password-123";
const credentialStartedAt = performance.now();
const credential = await createPasswordCredential(envConfig, password);
const credentialDuration = performance.now() - credentialStartedAt;
assert.equal(credential.iterations, 10000);
assert.ok(credential.hash.length > 20 && credential.salt.length > 10);
assert.equal(await verifyPasswordCredential(password, {
  password_hash_v2: credential.hash,
  password_salt_v2: credential.salt,
  password_iterations_v2: credential.iterations
}), true);
assert.equal(await verifyPasswordCredential("wrong-password", {
  password_hash_v2: credential.hash,
  password_salt_v2: credential.salt,
  password_iterations_v2: credential.iterations
}), false);

const user = {
  id: "user-1",
  name: "QA Admin",
  email: "qa@example.invalid",
  role: "admin",
  status: "active",
  last_login_at: "",
  session_token: "",
  session_expires_at: "",
  ...{
    password_hash_v2: credential.hash,
    password_salt_v2: credential.salt,
    password_iterations_v2: credential.iterations
  }
};
const database = new AuthDatabase(user);
const env = { ...envConfig, DB: database };
const loginStartedAt = performance.now();
const login = await handleD1AuthAction(env, { action: "login", email: "QA@EXAMPLE.INVALID", password });
const loginDuration = performance.now() - loginStartedAt;
assert.equal(login.ok, true);
assert.equal(login.authMode, "d1");
assert.equal(login.user.id, user.id);
assert.equal(typeof login.token, "string");
assert.equal(login.token.length, 64);
assert.equal(user.session_token, login.token);

const wrong = await handleD1AuthAction(env, { action: "login", email: user.email, password: "wrong-password" });
assert.equal(wrong.ok, false);
assert.equal(wrong.code, "invalid_credentials");

const logout = await handleD1AuthAction(env, { action: "logout", token: login.token });
assert.equal(logout.ok, true);
assert.equal(user.session_token, "");

const legacyUser = { ...user, password_hash_v2: "", password_salt_v2: "", password_iterations_v2: null };
const legacyDatabase = new AuthDatabase(legacyUser);
const legacyEnv = { ...envConfig, DB: legacyDatabase };
const legacyResult = await handleD1AuthAction(legacyEnv, { action: "login", email: legacyUser.email, password });
assert.equal(legacyResult, null, "A legacy account must fall back for one successful password verification");
legacyUser.status = "disabled";
const disabledLegacy = await handleD1AuthAction(legacyEnv, { action: "login", email: legacyUser.email, password });
assert.equal(disabledLegacy.code, "invalid_credentials", "A disabled legacy row must never fall back to stale identity data");
legacyUser.status = "active";
const upgraded = await upgradeIdentityPassword(legacyEnv, { action: "login", password }, {
  ok: true,
  user: { id: legacyUser.id }
});
assert.equal(upgraded, true);
assert.ok(legacyUser.password_hash_v2);
const upgradedLogin = await handleD1AuthAction(legacyEnv, { action: "login", email: legacyUser.email, password });
assert.equal(upgradedLogin.ok, true, "The next login must use D1 after a successful legacy upgrade");

const notMigrated = await handleD1AuthAction(
  { ...envConfig, DB: new AuthDatabase(user, false) },
  { action: "login", email: user.email, password }
);
assert.equal(notMigrated, null, "Code deployed before migration must preserve the legacy login path");
const unavailable = await handleD1AuthAction(envConfig, { action: "login", email: user.email, password });
assert.equal(unavailable.code, "d1_auth_unavailable");

console.log(`D1 auth QA passed (credential ${credentialDuration.toFixed(1)}ms, direct login ${loginDuration.toFixed(1)}ms).`);
