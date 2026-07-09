import { publicProduct, requireSession } from "./d1-data.js";

const ACTIONS = new Set([
  "getContentWorkspaceData", "createContentItem", "updateContentItem", "archiveContentItem",
  "provisionContentItemAssets",
  "getTeamWorkspaceData", "createTeamItem", "updateTeamItem", "archiveTeamItem",
  "getIncenseData", "createIncenseWish", "getAppSettings", "updateAppSettings"
]);
const CONTENT_COLUMNS = [
  "id", "type", "title", "product_id", "channel", "status", "priority", "due_date",
  "publish_at", "template", "owner", "collaborators", "tags", "campaign", "brief",
  "checklist_json", "asset_checklist_json", "comment_log_json", "prompt_text",
  "target_metric", "result_json", "note", "publish_url", "content_doc_id",
  "content_doc_url", "media_folder_id", "media_folder_url", "created_by", "created_at", "updated_at"
];
const TEAM_COLUMNS = [
  "id", "item_type", "title", "status", "owner", "reference_type", "reference_id",
  "detail_json", "created_by", "created_at", "updated_at"
];

function clean(value) { return String(value || "").trim(); }
function nowIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).reduce((out, part) => (out[part.type] = part.value, out), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}
function jsonValue(value, fallback) {
  if (value == null || value === "") return JSON.stringify(fallback);
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value)); } catch { return JSON.stringify(fallback); }
  }
  return JSON.stringify(value);
}
function parse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function upsert(db, table, record, columns, key = "id") {
  return db.prepare(
    `INSERT INTO ${table} (${columns.map(column => `"${column}"`).join(",")})
     VALUES (${columns.map(() => "?").join(",")})
     ON CONFLICT(${key}) DO UPDATE SET ${columns.filter(column => column !== key)
       .map(column => `"${column}"=excluded."${column}"`).join(",")}`
  ).bind(...columns.map(column => record[column] ?? ""));
}
function publicContent(row) {
  return {
    id: row.id, type: row.type || "campaign", title: row.title || "",
    productId: row.product_id || "", channel: row.channel || "multi",
    status: row.status || "idea", priority: row.priority || "normal",
    dueDate: row.due_date || "", publishAt: row.publish_at || "",
    template: row.template || "", owner: row.owner || "",
    collaborators: row.collaborators || "", tags: row.tags || "",
    campaign: row.campaign || "", brief: row.brief || "",
    checklist: parse(row.checklist_json, []), assetChecklist: parse(row.asset_checklist_json, []),
    commentLog: parse(row.comment_log_json, []), promptText: row.prompt_text || "",
    targetMetric: row.target_metric || "", result: parse(row.result_json, {}),
    note: row.note || "", publishUrl: row.publish_url || "",
    contentDocId: row.content_doc_id || "", contentDocUrl: row.content_doc_url || "",
    mediaFolderId: row.media_folder_id || "", mediaFolderUrl: row.media_folder_url || "",
    createdBy: row.created_by || "", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}
function normalizeContent(body) {
  const types = ["product", "campaign", "idea", "post", "video", "short_video", "blog", "brief"];
  const statuses = ["idea", "briefing", "drafting", "review", "revision", "ready", "scheduled", "published", "archived"];
  const priorities = ["low", "normal", "high", "urgent"];
  const title = clean(body.title);
  if (!title || title.length > 180) throw new Error("Content title is invalid");
  return {
    type: types.includes(clean(body.type)) ? clean(body.type) : "campaign",
    title, product_id: clean(body.productId ?? body.product_id),
    channel: clean(body.channel) || "multi",
    status: statuses.includes(clean(body.status)) ? clean(body.status) : "idea",
    priority: priorities.includes(clean(body.priority)) ? clean(body.priority) : "normal",
    due_date: clean(body.dueDate ?? body.due_date).slice(0, 10),
    publish_at: clean(body.publishAt ?? body.publish_at).slice(0, 16),
    template: clean(body.template), owner: clean(body.owner),
    collaborators: clean(body.collaborators), tags: clean(body.tags),
    campaign: clean(body.campaign), brief: clean(body.brief),
    checklist_json: jsonValue(body.checklistJson ?? body.checklist_json ?? body.checklist, []),
    asset_checklist_json: jsonValue(body.assetChecklistJson ?? body.asset_checklist_json ?? body.assetChecklist, []),
    comment_log_json: jsonValue(body.commentLogJson ?? body.comment_log_json ?? body.commentLog, []),
    prompt_text: clean(body.promptText ?? body.prompt_text),
    target_metric: clean(body.targetMetric ?? body.target_metric),
    result_json: jsonValue(body.resultJson ?? body.result_json ?? body.result, {}),
    note: clean(body.note), publish_url: clean(body.publishUrl ?? body.publish_url)
  };
}
async function contentRead(db) {
  const [items, products, owners] = await Promise.all([
    db.prepare("SELECT * FROM content_items WHERE status <> 'deleted' ORDER BY COALESCE(updated_at,created_at) DESC").all(),
    db.prepare("SELECT * FROM products WHERE status <> 'deleted' ORDER BY name COLLATE NOCASE").all(),
    db.prepare("SELECT id,name,email FROM users WHERE status='active' ORDER BY name COLLATE NOCASE").all()
  ]);
  return {
    ok: true, contentItems: items.results.map(publicContent),
    products: products.results.map(publicProduct), contentOwners: owners.results
  };
}
async function contentMutation(db, body, user) {
  if (body.action === "archiveContentItem") {
    const result = await db.prepare(
      "UPDATE content_items SET status='deleted',updated_at=? WHERE id=? AND status<>'deleted'"
    ).bind(nowIso(), clean(body.id)).run();
    return result.meta.changes ? { ok: true } : { ok: false, error: "Content item not found" };
  }
  const input = normalizeContent(body);
  if (input.product_id) {
    const product = await db.prepare(
      "SELECT id FROM products WHERE id=? AND status<>'deleted'"
    ).bind(input.product_id).first();
    if (!product) return { ok: false, error: "Product not found" };
  }
  const existing = body.action === "updateContentItem"
    ? await db.prepare("SELECT * FROM content_items WHERE id=? AND status<>'deleted'").bind(clean(body.id)).first()
    : null;
  if (body.action === "updateContentItem" && !existing) return { ok: false, error: "Content item not found" };
  const now = nowIso();
  const item = {
    id: existing?.id || crypto.randomUUID(), ...input,
    content_doc_id: existing?.content_doc_id || "", content_doc_url: existing?.content_doc_url || "",
    media_folder_id: existing?.media_folder_id || "", media_folder_url: existing?.media_folder_url || "",
    created_by: existing?.created_by || user.id, created_at: existing?.created_at || now, updated_at: now
  };
  await upsert(db, "content_items", item, CONTENT_COLUMNS).run();
  let assetWarning = "";
  if (!existing && body.createAssets !== false && String(body.createAssets || "true") !== "false" && body.__env?.APPS_SCRIPT_URL) {
    try {
      const product = item.product_id
        ? await db.prepare("SELECT * FROM products WHERE id=?").bind(item.product_id).first()
        : null;
      const response = await fetch(body.__env.APPS_SCRIPT_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "provisionContentItemAssetsBridge", token: body.token,
          bridgeItem: item, bridgeProduct: product || {}
        }),
        redirect: "follow", signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Google asset provisioning failed");
      Object.assign(item, result.assetPatch || {});
      await upsert(db, "content_items", item, CONTENT_COLUMNS).run();
    } catch (error) {
      assetWarning = error?.message || String(error);
    }
  }
  return { ok: true, contentItem: publicContent(item), assetWarning };
}
function normalizeTeam(body) {
  const itemType = ["meeting", "plan", "pricing", "decision"].includes(clean(body.itemType ?? body.item_type ?? body.type))
    ? clean(body.itemType ?? body.item_type ?? body.type) : "meeting";
  let detail = body.itemJson ?? body.detailJson ?? body.detail_json ?? body.item ?? {};
  if (typeof detail === "string") detail = parse(detail, {});
  const title = clean(detail.title || body.title);
  if (!title || title.length > 200) throw new Error("Team Hub title is invalid");
  detail = { ...detail, title, status: clean(detail.status || body.status) || "draft", owner: clean(detail.owner || body.owner) };
  return {
    itemType, title, status: detail.status, owner: detail.owner,
    referenceType: clean(body.referenceType ?? body.reference_type ?? detail.sourceType),
    referenceId: clean(body.referenceId ?? body.reference_id ?? detail.sourceId ?? detail.productId),
    detail
  };
}
function publicTeam(row) {
  const detail = parse(row.detail_json, {});
  return {
    ...detail, id: row.id, title: detail.title || row.title || "",
    status: detail.status || row.status || "draft", owner: detail.owner || row.owner || "",
    createdAt: row.created_at || detail.createdAt || "", updatedAt: row.updated_at || detail.updatedAt || ""
  };
}
async function teamRead(db) {
  const [items, products, users, tasks, campaigns] = await Promise.all([
    db.prepare("SELECT * FROM team_items WHERE status<>'deleted' ORDER BY COALESCE(updated_at,created_at) DESC").all(),
    db.prepare("SELECT * FROM products WHERE status<>'deleted'").all(),
    db.prepare("SELECT id,name,email,role,status FROM users WHERE status='active'").all(),
    db.prepare("SELECT * FROM workspace_tasks WHERE status<>'deleted'").all(),
    db.prepare("SELECT * FROM campaigns WHERE status<>'deleted'").all()
  ]);
  const grouped = { meeting: [], plan: [], pricing: [], decision: [] };
  items.results.forEach(row => (grouped[row.item_type] || grouped.meeting).push(publicTeam(row)));
  const publicTask = row => ({
    id: row.id, title: row.title || "", status: row.status || "todo", priority: row.priority || "normal",
    owner: row.owner || "", sourceType: row.source_type || "", sourceId: row.source_id || "",
    productId: row.product_id || "", channelId: row.channel_id || "", campaignId: row.campaign_id || "",
    dueDate: row.due_date || "", description: row.description || "", createdBy: row.created_by || "",
    createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  });
  const publicCampaign = row => ({
    id: row.id, name: row.name || "", status: row.status || "idea", owner: row.owner || "",
    channels: row.channels || "", startDate: row.start_date || "", endDate: row.end_date || "",
    goal: row.goal || "", budget: Number(row.budget || 0), targetRevenue: Number(row.target_revenue || 0),
    targetProfit: Number(row.target_profit || 0), note: row.note || "", createdBy: row.created_by || "",
    createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  });
  return {
    ok: true, teamMeetings: grouped.meeting, teamPlans: grouped.plan,
    teamPricingModels: grouped.pricing, teamDecisions: grouped.decision,
    workspaceTasks: tasks.results.map(publicTask), campaigns: campaigns.results.map(publicCampaign),
    products: products.results.map(publicProduct),
    contentOwners: users.results.map(({ id, name, email }) => ({ id, name, email })),
    users: users.results
  };
}
async function teamMutation(db, body, user) {
  const input = normalizeTeam(body);
  const existing = body.action === "createTeamItem" ? null : await db.prepare(
    "SELECT * FROM team_items WHERE id=? AND item_type=? AND status<>'deleted'"
  ).bind(clean(body.id), input.itemType).first();
  if (body.action !== "createTeamItem" && !existing) return { ok: false, error: "Team Hub item not found" };
  if (body.action === "archiveTeamItem") {
    const detail = { ...parse(existing.detail_json, {}), status: "archived", updatedAt: nowIso() };
    await db.prepare("UPDATE team_items SET status='deleted',detail_json=?,updated_at=? WHERE id=?")
      .bind(JSON.stringify(detail), detail.updatedAt, existing.id).run();
    return { ok: true };
  }
  const now = nowIso();
  const id = existing?.id || crypto.randomUUID();
  input.detail.id = id;
  input.detail.createdAt = existing?.created_at || now;
  input.detail.updatedAt = now;
  const row = {
    id, item_type: input.itemType, title: input.title, status: input.status,
    owner: input.owner, reference_type: input.referenceType, reference_id: input.referenceId,
    detail_json: JSON.stringify(input.detail), created_by: existing?.created_by || user.id,
    created_at: existing?.created_at || now, updated_at: now
  };
  await upsert(db, "team_items", row, TEAM_COLUMNS).run();
  return { ok: true, teamItem: publicTeam(row) };
}
async function incenseRead(db) {
  const rows = (await db.prepare("SELECT * FROM incense_wishes ORDER BY created_at DESC LIMIT 30").all()).results;
  return { ok: true, incenseWishes: rows.map(publicWish) };
}
function publicWish(row) {
  const allowed = ["banana", "apple", "orange", "grapes", "watermelon", "coconut", "tea", "water", "rice", "sticky_rice", "vegetarian_cake", "flowers"];
  const offerings = String(row.offerings || "").split(",").map(clean).filter(value => allowed.includes(value));
  return {
    id: row.id, kind: row.kind || "sales", wish: row.wish || "",
    offerings: offerings.length ? offerings : ["banana"], actorId: row.actor_id || "",
    actorName: row.actor_name || "", actorEmail: row.actor_email || "", createdAt: row.created_at || ""
  };
}
async function settingsRead(db) {
  const rows = (await db.prepare("SELECT key,value_json FROM app_settings").all()).results;
  const settings = {};
  rows.forEach(row => { settings[row.key] = parse(row.value_json, row.value_json || null); });
  return { ok: true, settings };
}

export async function handleWorkspaceAction(env, body) {
  if (!env.DB || !ACTIONS.has(body.action)) return null;
  try {
    const user = await requireSession(env.DB, body.token);
    if (!user) throw new Error("Invalid session");
    if (body.action === "getContentWorkspaceData") return contentRead(env.DB);
    if (["createContentItem", "updateContentItem", "archiveContentItem"].includes(body.action)) {
      if (!["admin", "inventory", "sales"].includes(user.role)) throw new Error("Content access required");
      return contentMutation(env.DB, { ...body, __env: env }, user);
    }
    if (body.action === "provisionContentItemAssets") {
      if (!["admin", "inventory", "sales"].includes(user.role)) throw new Error("Content access required");
      const item = await env.DB.prepare("SELECT * FROM content_items WHERE id=? AND status<>'deleted'").bind(clean(body.id)).first();
      if (!item) return { ok: false, error: "Content item not found" };
      const product = item.product_id ? await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(item.product_id).first() : null;
      const response = await fetch(env.APPS_SCRIPT_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "provisionContentItemAssetsBridge", token: body.token, bridgeItem: item, bridgeProduct: product || {} }),
        redirect: "follow", signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!result.ok) return result;
      Object.assign(item, result.assetPatch || {}, { updated_at: nowIso() });
      await upsert(env.DB, "content_items", item, CONTENT_COLUMNS).run();
      return { ok: true, contentItem: publicContent(item) };
    }
    if (body.action === "getTeamWorkspaceData") return teamRead(env.DB);
    if (["createTeamItem", "updateTeamItem", "archiveTeamItem"].includes(body.action)) return teamMutation(env.DB, body, user);
    if (body.action === "getIncenseData") return incenseRead(env.DB);
    if (body.action === "createIncenseWish") {
      const wishText = clean(body.wish);
      if (!wishText || wishText.length > 160) return { ok: false, error: "Lời xin vía tối đa 160 ký tự" };
      const row = {
        id: crypto.randomUUID(), kind: clean(body.kind) || "sales", wish: wishText,
        actor_id: user.id, actor_name: user.name, actor_email: user.email,
        created_at: nowIso(),
        offerings: Array.isArray(body.offerings) ? body.offerings.join(",") : clean(body.offerings) || "banana"
      };
      await upsert(env.DB, "incense_wishes", row, [
        "id", "kind", "wish", "actor_id", "actor_name", "actor_email", "created_at", "offerings"
      ]).run();
      const latest = await incenseRead(env.DB);
      return { ok: true, incenseWish: publicWish(row), incenseWishes: latest.incenseWishes };
    }
    if (body.action === "getAppSettings") return settingsRead(env.DB);
    const key = clean(body.key);
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) return { ok: false, error: "Setting key is invalid" };
    const valueJson = JSON.stringify(Object.hasOwn(body, "value") ? body.value : {});
    if (valueJson.length > 45000) return { ok: false, error: "Setting value is too large" };
    await env.DB.prepare(
      `INSERT INTO app_settings(key,value_json,updated_by,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
    ).bind(key, valueJson, user.id, nowIso()).run();
    return { ok: true, settings: (await settingsRead(env.DB)).settings };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
