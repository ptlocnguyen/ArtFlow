import { requireSession } from "./d1-data.js";

const AUTH_SCHEMA_VERSION = "2026-11-19-d1-auth-1";
// Workers Free has a 10 ms CPU budget. Keep the default within that budget;
// paid deployments can raise this through D1_AUTH_PBKDF2_ITERATIONS.
const DEFAULT_PBKDF2_ITERATIONS = 10000;
const SESSION_DAYS = 14;
const DIRECT_AUTH_ACTIONS = new Set([
  "login",
  "logout",
  "updateMyProfile",
  "changeMyPassword",
  "createUser",
  "toggleUser",
  "deleteUser"
]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    role: row.role || "viewer",
    status: row.status || "active",
    lastLoginAt: row.last_login_at || ""
  };
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function secureToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function configuredIterations(env) {
  const value = Number(env.D1_AUTH_PBKDF2_ITERATIONS || DEFAULT_PBKDF2_ITERATIONS);
  return Number.isInteger(value) && value >= 8000 && value <= 30000
    ? value
    : DEFAULT_PBKDF2_ITERATIONS;
}

async function derivePasswordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations
  }, key, 256);
  return new Uint8Array(bits);
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(left, right);
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function createPasswordCredential(env, password) {
  const iterations = configuredIterations(env);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, iterations);
  return {
    hash: bytesToBase64(hash),
    salt: bytesToBase64(salt),
    iterations
  };
}

export async function verifyPasswordCredential(password, row) {
  if (!row?.password_hash_v2 || !row?.password_salt_v2 || !row?.password_iterations_v2) return false;
  try {
    const expected = base64ToBytes(row.password_hash_v2);
    const actual = await derivePasswordHash(
      password,
      base64ToBytes(row.password_salt_v2),
      Number(row.password_iterations_v2)
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function authSchemaReady(db) {
  const row = await db.prepare(
    "SELECT value_json FROM d1_meta WHERE key = 'auth_schema_version' LIMIT 1"
  ).first();
  if (!row?.value_json) return false;
  try {
    return JSON.parse(row.value_json) === AUTH_SCHEMA_VERSION;
  } catch {
    return row.value_json === AUTH_SCHEMA_VERSION;
  }
}

function unavailable() {
  return {
    ok: false,
    error: "D1 authentication database unavailable",
    code: "d1_auth_unavailable",
    transient: true,
    dataSource: "d1"
  };
}

function invalidCredentials() {
  return { ok: false, error: "Email hoặc mật khẩu không đúng", code: "invalid_credentials" };
}

async function login(env, payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  if (!email || !password) return invalidCredentials();
  const user = await env.DB.prepare(
    `SELECT id,name,email,role,status,last_login_at,password_hash_v2,password_salt_v2,password_iterations_v2
     FROM users WHERE email = ? LIMIT 1`
  ).bind(email).first();

  // A missing v2 credential is the only case allowed to use the legacy owner.
  // A disabled/deleted or already-migrated account must never fall back to a
  // possibly stale Apps Script identity row.
  if (user && user.status !== "active") return invalidCredentials();
  if (!user || !user.password_hash_v2) return null;
  if (!await verifyPasswordCredential(password, user)) return invalidCredentials();

  const token = secureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  await env.DB.prepare(
    `UPDATE users SET session_token=?,session_expires_at=?,last_login_at=?,updated_at=?,d1_verified_at=?
     WHERE id=? AND status='active'`
  ).bind(token, expiresAt, nowIso, nowIso, nowIso, user.id).run();
  user.last_login_at = nowIso;
  return { ok: true, token, user: publicUser(user), authMode: "d1" };
}

async function requireActiveSession(env, payload) {
  const user = await requireSession(env.DB, payload.token);
  return user || null;
}

async function logout(env, payload) {
  const user = await requireActiveSession(env, payload);
  if (!user) return { ok: false, error: "Invalid session", code: "invalid_session" };
  await env.DB.prepare(
    "UPDATE users SET session_token='',session_expires_at='',d1_verified_at=NULL,updated_at=? WHERE id=?"
  ).bind(new Date().toISOString(), user.id).run();
  return { ok: true };
}

async function updateMyProfile(env, payload) {
  const user = await requireActiveSession(env, payload);
  if (!user) return { ok: false, error: "Invalid session", code: "invalid_session" };
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  if (!name || !email.includes("@")) return { ok: false, error: "Thông tin tài khoản không hợp lệ" };
  const duplicate = await env.DB.prepare(
    "SELECT id FROM users WHERE email=? AND id<>? LIMIT 1"
  ).bind(email, user.id).first();
  if (duplicate) return { ok: false, error: "Email đã thuộc về tài khoản khác" };
  await env.DB.prepare("UPDATE users SET name=?,email=?,updated_at=? WHERE id=?")
    .bind(name, email, new Date().toISOString(), user.id).run();
  return { ok: true, user: publicUser({ ...user, name, email }) };
}

async function changeMyPassword(env, payload) {
  const user = await requireActiveSession(env, payload);
  if (!user) return { ok: false, error: "Invalid session", code: "invalid_session" };
  const currentPassword = String(payload.currentPassword || payload.current_password || "");
  const newPassword = String(payload.newPassword || payload.new_password || "");
  if (!currentPassword || newPassword.length < 8) return { ok: false, error: "Mật khẩu không hợp lệ" };
  const credentialRow = await env.DB.prepare(
    "SELECT password_hash_v2,password_salt_v2,password_iterations_v2 FROM users WHERE id=? LIMIT 1"
  ).bind(user.id).first();
  if (!await verifyPasswordCredential(currentPassword, credentialRow)) {
    return { ok: false, error: "Mật khẩu hiện tại không đúng" };
  }
  const credential = await createPasswordCredential(env, newPassword);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE users SET password_hash_v2=?,password_salt_v2=?,password_iterations_v2=?,
       auth_migrated_at=?,updated_at=? WHERE id=?`
  ).bind(credential.hash, credential.salt, credential.iterations, now, now, user.id).run();
  return { ok: true, user: publicUser(user) };
}

async function requireAdmin(env, payload) {
  const user = await requireActiveSession(env, payload);
  return user?.role === "admin" ? user : null;
}

async function createUser(env, payload) {
  const admin = await requireAdmin(env, payload);
  if (!admin) return { ok: false, error: "Admin access required" };
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const role = String(payload.role || "sales");
  if (!name || !email.includes("@") || password.length < 8 || !["admin", "sales", "inventory", "viewer"].includes(role)) {
    return { ok: false, error: "Dữ liệu tài khoản không hợp lệ" };
  }
  const existing = await env.DB.prepare("SELECT id,status FROM users WHERE email=? LIMIT 1").bind(email).first();
  if (existing && existing.status !== "deleted") return { ok: false, error: "Email đã tồn tại" };
  const credential = await createPasswordCredential(env, password);
  const now = new Date().toISOString();
  const id = existing?.id || crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users(id,name,email,role,status,password_hash_v2,password_salt_v2,password_iterations_v2,
       auth_migrated_at,session_token,session_expires_at,created_at,updated_at,last_login_at)
     VALUES(?,?,?,?,?,?,?,?,?,'','',?,?,'')
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,role=excluded.role,status='active',
       password_hash_v2=excluded.password_hash_v2,password_salt_v2=excluded.password_salt_v2,
       password_iterations_v2=excluded.password_iterations_v2,auth_migrated_at=excluded.auth_migrated_at,
       session_token='',session_expires_at='',updated_at=excluded.updated_at`
  ).bind(id, name, email, role, "active", credential.hash, credential.salt, credential.iterations, now, now, now).run();
  return { ok: true, user: publicUser({ id, name, email, role, status: "active", last_login_at: "" }) };
}

async function changeUserStatus(env, payload, deleting) {
  const admin = await requireAdmin(env, payload);
  if (!admin) return { ok: false, error: "Admin access required" };
  const id = String(payload.id || "");
  if (!id || id === admin.id) return { ok: false, error: deleting ? "Không thể xóa tài khoản này" : "Không thể cập nhật tài khoản này" };
  const user = await env.DB.prepare(
    "SELECT id,name,email,role,status,last_login_at FROM users WHERE id=? AND status<>'deleted' LIMIT 1"
  ).bind(id).first();
  if (!user) return { ok: false, error: "Không tìm thấy nhân viên" };
  const nextStatus = deleting ? "deleted" : (user.status === "active" ? "disabled" : "active");
  if (user.role === "admin" && user.status === "active" && nextStatus !== "active") {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM users WHERE role='admin' AND status='active'"
    ).first();
    if (Number(count?.total || 0) <= 1) return { ok: false, error: "Cannot disable or delete the last active admin" };
  }
  await env.DB.prepare(
    "UPDATE users SET status=?,session_token='',session_expires_at='',d1_verified_at=NULL,updated_at=? WHERE id=?"
  ).bind(nextStatus, new Date().toISOString(), id).run();
  if (deleting) return { ok: true };
  return { ok: true, user: publicUser({ ...user, status: nextStatus }) };
}

export async function handleD1AuthAction(env, payload) {
  if (String(env.D1_AUTH_MODE || "shadow").toLowerCase() !== "direct") return null;
  if (!DIRECT_AUTH_ACTIONS.has(payload.action)) return null;
  if (!env.DB) return unavailable();
  if (!await authSchemaReady(env.DB)) return null;

  if (payload.action === "login") return login(env, payload);
  if (payload.action === "logout") return logout(env, payload);
  if (payload.action === "updateMyProfile") return updateMyProfile(env, payload);
  if (payload.action === "changeMyPassword") return changeMyPassword(env, payload);
  if (payload.action === "createUser") return createUser(env, payload);
  if (payload.action === "toggleUser") return changeUserStatus(env, payload, false);
  if (payload.action === "deleteUser") return changeUserStatus(env, payload, true);
  return null;
}

export async function upgradeIdentityPassword(env, payload, response) {
  if (!env.DB || !response?.ok || !response.user?.id) return false;
  const password = payload.action === "changeMyPassword"
    ? String(payload.newPassword || payload.new_password || "")
    : String(payload.password || "");
  if (password.length < 8 || !await authSchemaReady(env.DB)) return false;
  const credential = await createPasswordCredential(env, password);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE users SET password_hash_v2=?,password_salt_v2=?,password_iterations_v2=?,auth_migrated_at=?,updated_at=?
     WHERE id=?`
  ).bind(credential.hash, credential.salt, credential.iterations, now, now, response.user.id).run();
  return true;
}

export const D1_AUTH_SCHEMA_VERSION = AUTH_SCHEMA_VERSION;
