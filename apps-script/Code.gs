const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SESSION_DAYS = 14;
const USER_CACHE_SECONDS = 300;
const HASH_ROUNDS = 12000;

let databaseReady = false;
let spreadsheetCache = null;
const sheetCache = {};

const SHEETS = {
  users: [
    "id",
    "name",
    "email",
    "password_hash",
    "salt",
    "role",
    "status",
    "session_token",
    "session_expires_at",
    "created_at",
    "updated_at",
    "last_login_at"
  ]
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    setupDatabase();

    const body = parseBody(e);
    const action = body.action || "";

    switch (action) {
      case "bootstrapStatus":
        return json(bootstrapStatus());
      case "setupAdmin":
        return json(setupAdmin(body));
      case "login":
        return json(loginUser(body));
      case "me":
        return json(getCurrentUser(body));
      case "logout":
        return json(logoutUser(body));
      case "listUsers":
        return json(listUsers(body));
      case "createUser":
        return json(createUser(body));
      case "toggleUser":
        return json(toggleUser(body));
      case "deleteUser":
        return json(deleteUser(body));
      default:
        return json({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return json({ ok: false, error: err.message || String(err) });
  }
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return (e && e.parameter) ? e.parameter : {};
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
  if (databaseReady) return;

  const ss = getSpreadsheet();

  Object.keys(SHEETS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(SHEETS[name]);
      sheet.setFrozenRows(1);
    } else {
      ensureHeaders(sheet, SHEETS[name]);
    }
    sheetCache[name] = sheet;
  });

  databaseReady = true;
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("PASTE_") === 0) {
    throw new Error("Missing SPREADSHEET_ID in Apps Script");
  }

  if (!spreadsheetCache) {
    spreadsheetCache = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return spreadsheetCache;
}

function getSheet(name) {
  if (!sheetCache[name]) {
    sheetCache[name] = getSpreadsheet().getSheetByName(name);
  }

  return sheetCache[name];
}

function ensureHeaders(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  let changed = false;

  expectedHeaders.forEach(function (header, index) {
    if (currentHeaders[index] !== header) {
      currentHeaders[index] = header;
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }

  if (sheet.getFrozenRows() < 1) {
    sheet.setFrozenRows(1);
  }
}

function readRows(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];

  return values
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "";
      });
    })
    .map(function (row, index) {
      const obj = { _row: index + 2 };
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });
}

function appendRow(name, obj) {
  const sheet = getSheet(name);
  const headers = SHEETS[name];
  const values = headers.map(function (key) {
    return obj[key] === undefined ? "" : obj[key];
  });
  sheet.appendRow(values);
}

function updateRow(name, rowNumber, patch) {
  const sheet = getSheet(name);
  const headers = SHEETS[name];
  const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  headers.forEach(function (key, i) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      existing[i] = patch[key];
    }
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([existing]);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function makeToken() {
  return Utilities.getUuid() + "-" + Utilities.getUuid();
}

function digestHex(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value));

  return bytes.map(function (byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    const hex = normalized.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function hashPassword(password, salt) {
  let hash = String(password) + ":" + String(salt);
  for (let i = 0; i < HASH_ROUNDS; i += 1) {
    hash = digestHex(hash + ":" + salt + ":" + i);
  }
  return hash;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at || ""
  };
}

function getUserCache() {
  return CacheService.getScriptCache();
}

function cacheSessionUser(user) {
  if (!user || !user.session_token) return;
  getUserCache().put(
    "session:" + user.session_token,
    JSON.stringify(user),
    USER_CACHE_SECONDS
  );
}

function removeCachedSession(token) {
  if (token) {
    getUserCache().remove("session:" + token);
  }
}

function requireUser(token) {
  const sessionToken = String(token || "");
  if (!sessionToken) {
    throw new Error("Unauthenticated");
  }

  const cached = getUserCache().get("session:" + sessionToken);
  if (cached) {
    const cachedUser = JSON.parse(cached);
    if (new Date(cachedUser.session_expires_at).getTime() >= Date.now()) {
      return cachedUser;
    }
    removeCachedSession(sessionToken);
  }

  const user = readRows("users").find(function (item) {
    return item.session_token === sessionToken && item.status === "active";
  });

  if (!user) {
    throw new Error("Invalid session");
  }

  if (!user.session_expires_at || new Date(user.session_expires_at).getTime() < Date.now()) {
    throw new Error("Session expired");
  }

  cacheSessionUser(user);
  return user;
}

function requireAdmin(token) {
  const user = requireUser(token);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

function activeAdminCount() {
  return readRows("users").filter(function (user) {
    return user.role === "admin" && user.status === "active";
  }).length;
}

function assertNotLastActiveAdmin(user) {
  if (user.role === "admin" && user.status === "active" && activeAdminCount() <= 1) {
    throw new Error("Cannot disable or delete the last active admin");
  }
}

function bootstrapStatus() {
  const users = readRows("users");
  return {
    ok: true,
    hasAdmin: users.some(function (user) {
      return user.role === "admin" && user.status !== "deleted";
    })
  };
}

function setupAdmin(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const users = readRows("users");
    if (users.some(function (user) { return user.role === "admin" && user.status !== "deleted"; })) {
      return { ok: false, error: "Admin account already exists" };
    }

    return createUserInternal({
      name: body.name,
      email: body.email,
      password: body.password,
      role: "admin",
      loginAfterCreate: true
    });
  } finally {
    lock.releaseLock();
  }
}

function loginUser(body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = readRows("users").find(function (item) {
    return item.email === email && item.status === "active";
  });

  if (!user || user.password_hash !== hashPassword(password, user.salt)) {
    return { ok: false, error: "Email hoặc mật khẩu không đúng" };
  }

  const token = makeToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  updateRow("users", user._row, {
    session_token: token,
    session_expires_at: expires,
    last_login_at: nowIso(),
    updated_at: nowIso()
  });

  user.session_token = token;
  user.session_expires_at = expires;
  user.last_login_at = nowIso();
  cacheSessionUser(user);

  return { ok: true, token: token, user: publicUser(user) };
}

function getCurrentUser(body) {
  const user = requireUser(body.token);
  return { ok: true, user: publicUser(user) };
}

function logoutUser(body) {
  const user = requireUser(body.token);
  removeCachedSession(body.token);
  updateRow("users", user._row, {
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });
  return { ok: true };
}

function listUsers(body) {
  requireAdmin(body.token);
  const users = readRows("users")
    .filter(function (user) {
      return user.status !== "deleted";
    })
    .map(publicUser);

  return { ok: true, users: users };
}

function createUser(body) {
  requireAdmin(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    return createUserInternal({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role || "sales",
      loginAfterCreate: false
    });
  } finally {
    lock.releaseLock();
  }
}

function createUserInternal(options) {
  const name = String(options.name || "").trim();
  const email = normalizeEmail(options.email);
  const password = String(options.password || "");
  const role = String(options.role || "sales");
  const allowedRoles = ["admin", "sales", "inventory", "viewer"];

  if (!name || !email || password.length < 8 || allowedRoles.indexOf(role) === -1) {
    return { ok: false, error: "Dữ liệu tài khoản không hợp lệ" };
  }

  const users = readRows("users");
  if (users.some(function (user) { return user.email === email && user.status !== "deleted"; })) {
    return { ok: false, error: "Email đã tồn tại" };
  }

  const salt = makeToken();
  const now = nowIso();
  const token = options.loginAfterCreate ? makeToken() : "";
  const expires = options.loginAfterCreate
    ? new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : "";
  const user = {
    id: Utilities.getUuid(),
    name: name,
    email: email,
    password_hash: hashPassword(password, salt),
    salt: salt,
    role: role,
    status: "active",
    session_token: token,
    session_expires_at: expires,
    created_at: now,
    updated_at: now,
    last_login_at: options.loginAfterCreate ? now : ""
  };

  appendRow("users", user);
  if (token) cacheSessionUser(user);

  return {
    ok: true,
    token: token,
    user: publicUser(user)
  };
}

function toggleUser(body) {
  const admin = requireAdmin(body.token);
  const id = String(body.id || "");
  if (!id || id === admin.id) {
    return { ok: false, error: "Không thể cập nhật tài khoản này" };
  }

  const user = readRows("users").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!user) {
    return { ok: false, error: "Không tìm thấy nhân viên" };
  }

  const nextStatus = user.status === "active" ? "disabled" : "active";
  if (nextStatus === "disabled") {
    assertNotLastActiveAdmin(user);
  }
  removeCachedSession(user.session_token);
  updateRow("users", user._row, {
    status: nextStatus,
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });

  user.status = nextStatus;
  return { ok: true, user: publicUser(user) };
}

function deleteUser(body) {
  const admin = requireAdmin(body.token);
  const id = String(body.id || "");
  if (!id || id === admin.id) {
    return { ok: false, error: "Không thể xóa tài khoản này" };
  }

  const user = readRows("users").find(function (item) {
    return item.id === id && item.status !== "deleted";
  });

  if (!user) {
    return { ok: false, error: "Không tìm thấy nhân viên" };
  }

  assertNotLastActiveAdmin(user);
  removeCachedSession(user.session_token);
  updateRow("users", user._row, {
    status: "deleted",
    session_token: "",
    session_expires_at: "",
    updated_at: nowIso()
  });

  return { ok: true };
}
