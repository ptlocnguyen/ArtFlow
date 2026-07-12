import { requireSession } from "./d1-data.js";

const ACTIONS = new Set([
  "getAccountingData", "createCashTransaction", "updateCashTransaction", "archiveCashTransaction",
  "createAccountingAccount", "updateAccountingAccount", "archiveAccountingAccount",
  "createAccountingReconciliation", "createAccountingCategory",
  "updateAccountingCategory", "archiveAccountingCategory",
  "createPlatformPayout", "updatePlatformPayout", "addPlatformPayoutItem",
  "autoMatchPlatformPayout", "postPlatformPayout", "resolvePlatformPayoutMismatch",
  "updateAccountingSettings"
]);
function clean(value) { return String(value || "").trim(); }
function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()); }
function nowIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).reduce((out, part) => (out[part.type] = part.value, out), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}
async function requireAdmin(db, token) {
  const user = await requireSession(db, token);
  if (!user) throw new Error("Invalid session");
  if (user.role !== "admin") throw new Error("Accounting access required");
  return user;
}
function publicCategory(row) {
  return { id: row.id, name: row.name, type: row.type || "expense", group: row.group || "other", status: row.status || "active", createdAt: row.created_at || "", updatedAt: row.updated_at || "" };
}
function publicTransaction(row) {
  return {
    id: row.id, type: row.type || "expense", accountId: row.account_id,
    categoryId: row.category_id, amount: number(row.amount), transactionDate: row.transaction_date || "",
    description: row.description || "", referenceType: row.reference_type || "",
    referenceId: row.reference_id || "", createdBy: row.created_by || "",
    channelId: row.channel_id || "", documentUrl: row.document_url || "",
    status: row.status || "active", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}
function publicPayoutItem(row) {
  return {
    id: row.id, payoutId: row.payout_id, orderId: row.order_id || "", orderCode: row.order_code || "",
    platformOrderCode: row.platform_order_code || "", productTotal: number(row.product_total), shippingFee: number(row.shipping_fee),
    sellerDiscount: number(row.seller_discount), platformDiscount: number(row.platform_discount), commissionFee: number(row.commission_fee),
    paymentFee: number(row.payment_fee), affiliateFee: number(row.affiliate_fee), adsFee: number(row.ads_fee),
    shippingSubsidy: number(row.shipping_subsidy), refundAmount: number(row.refund_amount), penaltyFee: number(row.penalty_fee),
    expectedNetAmount: number(row.expected_net_amount), platformNetAmount: number(row.platform_net_amount), difference: number(row.difference),
    status: row.status || "pending", note: row.note || "", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}
function publicPayout(row, items = []) {
  return {
    id: row.id, channelId: row.channel_id || "", channelCode: row.channel_code || "", payoutCode: row.payout_code || "",
    periodStart: row.period_start || "", periodEnd: row.period_end || "", payoutDate: row.payout_date || "", accountId: row.account_id || "",
    grossAmount: number(row.gross_amount), totalFees: number(row.total_fees), totalRefunds: number(row.total_refunds),
    expectedAmount: number(row.expected_amount), actualAmount: number(row.actual_amount), difference: number(row.difference),
    status: row.status || "draft", sourceFileName: row.source_file_name || "", sourceFileUrl: row.source_file_url || "",
    sourceFileNote: row.source_file_note || "", note: row.note || "", postedTransactionId: row.posted_transaction_id || "",
    createdBy: row.created_by || "", createdAt: row.created_at || "", updatedAt: row.updated_at || "", items
  };
}
async function accountingRead(db) {
  const [accounts, categories, transactions, reconciliations, payouts, payoutItems, settings] = await Promise.all([
    db.prepare("SELECT * FROM accounting_accounts WHERE status<>'deleted' ORDER BY name COLLATE NOCASE").all(),
    db.prepare("SELECT * FROM accounting_categories WHERE status<>'deleted' ORDER BY type,name COLLATE NOCASE").all(),
    db.prepare("SELECT * FROM cash_transactions WHERE status<>'deleted' ORDER BY COALESCE(transaction_date,created_at) DESC").all(),
    db.prepare("SELECT * FROM accounting_reconciliations ORDER BY COALESCE(reconciled_at,created_at) DESC").all(),
    db.prepare("SELECT * FROM platform_payouts WHERE status<>'archived' ORDER BY COALESCE(payout_date,created_at) DESC").all(),
    db.prepare("SELECT * FROM platform_payout_items ORDER BY created_at DESC").all(),
    db.prepare("SELECT value_json FROM app_settings WHERE key='accounting_operations'").first()
  ]);
  const balances = Object.fromEntries(accounts.results.map(row => [row.id, number(row.opening_balance)]));
  transactions.results.forEach(row => {
    balances[row.account_id] = number(balances[row.account_id]) + (row.type === "income" ? number(row.amount) : -number(row.amount));
  });
  return {
    ok: true,
    accounts: accounts.results.map(row => ({
      id: row.id, name: row.name, type: row.type || "cash",
      openingBalance: number(row.opening_balance), currentBalance: number(balances[row.id]),
      status: row.status || "active", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
    })),
    categories: categories.results.map(publicCategory),
    transactions: transactions.results.map(publicTransaction),
    reconciliations: reconciliations.results.map(row => ({
      id: row.id, accountId: row.account_id, systemBalance: number(row.system_balance),
      actualBalance: number(row.actual_balance), difference: number(row.difference),
      note: row.note || "", reconciledBy: row.reconciled_by || "",
      reconciledAt: row.reconciled_at || "", createdAt: row.created_at || ""
    })),
    platformPayouts: payouts.results.map(row => publicPayout(row, payoutItems.results.filter(item => item.payout_id === row.id).map(publicPayoutItem))),
    accountingSettings: (() => { try { return JSON.parse(settings?.value_json || "{}"); } catch { return {}; } })()
  };
}
async function saveAccount(db, body) {
  const id = clean(body.id);
  const name = clean(body.name);
  const type = ["cash", "bank", "wallet", "other"].includes(clean(body.type)) ? clean(body.type) : "cash";
  const opening = number(body.openingBalance ?? body.opening_balance, NaN);
  if (!name || !Number.isFinite(opening)) return { ok: false, error: "Accounting account is invalid" };
  const duplicate = await db.prepare(
    "SELECT id FROM accounting_accounts WHERE lower(name)=lower(?) AND id<>? AND status<>'deleted'"
  ).bind(name, id).first();
  if (duplicate) return { ok: false, error: "Account already exists" };
  const existing = id ? await db.prepare("SELECT * FROM accounting_accounts WHERE id=? AND status<>'deleted'").bind(id).first() : null;
  if (id && !existing) return { ok: false, error: "Account not found" };
  const now = nowIso();
  const row = { id: existing?.id || crypto.randomUUID(), name, type, opening_balance: opening, status: existing?.status || "active", created_at: existing?.created_at || now, updated_at: now };
  await db.prepare(
    `INSERT INTO accounting_accounts(id,name,type,opening_balance,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,opening_balance=excluded.opening_balance,status=excluded.status,updated_at=excluded.updated_at`
  ).bind(row.id,row.name,row.type,row.opening_balance,row.status,row.created_at,row.updated_at).run();
  const data = await accountingRead(db);
  return { ok: true, account: data.accounts.find(account => account.id === row.id) };
}
async function saveCategory(db, body) {
  const id = clean(body.id);
  const name = clean(body.name);
  const type = clean(body.type) === "expense" ? "expense" : "income";
  const group = ["platform_fee","marketing","packaging","payroll","operation","inventory_loss","other"].includes(clean(body.group)) ? clean(body.group) : "other";
  if (!name) return { ok: false, error: "Accounting category is invalid" };
  const duplicate = await db.prepare(
    "SELECT id FROM accounting_categories WHERE lower(name)=lower(?) AND type=? AND id<>? AND status<>'deleted'"
  ).bind(name,type,id).first();
  if (duplicate) return { ok: false, error: "Category already exists" };
  const existing = id ? await db.prepare("SELECT * FROM accounting_categories WHERE id=? AND status<>'deleted'").bind(id).first() : null;
  if (id && !existing) return { ok: false, error: "Category not found" };
  if (existing && existing.type !== type) {
    const used = await db.prepare("SELECT COUNT(*) count FROM cash_transactions WHERE category_id=? AND status<>'deleted'").bind(id).first();
    if (number(used?.count) > 0) return { ok: false, error: "Không thể đổi loại danh mục đã có giao dịch" };
  }
  const now=nowIso();
  const row={id:existing?.id||crypto.randomUUID(),name,type,group,status:existing?.status||"active",created_at:existing?.created_at||now,updated_at:now};
  await db.prepare(
    `INSERT INTO accounting_categories(id,name,type,"group",status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,"group"=excluded."group",status=excluded.status,updated_at=excluded.updated_at`
  ).bind(row.id,row.name,row.type,row.group,row.status,row.created_at,row.updated_at).run();
  return {ok:true,category:publicCategory(row)};
}

async function savePayout(db, body, user) {
  const id = clean(body.id), channelId = clean(body.channelId), channelCode = clean(body.channelCode).toLowerCase();
  const payoutCode = clean(body.payoutCode), status = ["draft","matched","mismatch"].includes(clean(body.status)) ? clean(body.status) : "draft";
  if (!payoutCode || (!channelId && !channelCode)) return { ok: false, error: "Cần chọn sàn và nhập mã payout" };
  const existing = id ? await db.prepare("SELECT * FROM platform_payouts WHERE id=? AND status<>'archived'").bind(id).first() : null;
  if (id && !existing) return { ok: false, error: "Không tìm thấy phiếu đối soát" };
  const duplicate = await db.prepare("SELECT id FROM platform_payouts WHERE channel_code=? AND payout_code=? AND id<>? AND status<>'archived'")
    .bind(channelCode, payoutCode, id).first();
  if (duplicate) return { ok: false, error: "Mã payout này đã tồn tại trên cùng sàn" };
  const expected = number(body.expectedAmount), actual = number(body.actualAmount);
  const now = nowIso();
  const row = {
    id: existing?.id || crypto.randomUUID(), channel_id: channelId, channel_code: channelCode,
    payout_code: payoutCode, period_start: clean(body.periodStart), period_end: clean(body.periodEnd),
    payout_date: clean(body.payoutDate) || today(), account_id: clean(body.accountId), gross_amount: number(body.grossAmount),
    total_fees: number(body.totalFees), total_refunds: number(body.totalRefunds), expected_amount: expected,
    actual_amount: actual, difference: actual - expected, status, source_file_name: clean(body.sourceFileName),
    source_file_url: clean(body.sourceFileUrl), source_file_note: clean(body.sourceFileNote), note: clean(body.note),
    posted_transaction_id: existing?.posted_transaction_id || "", created_by: existing?.created_by || user.id,
    created_at: existing?.created_at || now, updated_at: now
  };
  await db.prepare(`INSERT INTO platform_payouts
    (id,channel_id,channel_code,payout_code,period_start,period_end,payout_date,account_id,gross_amount,total_fees,total_refunds,expected_amount,actual_amount,difference,status,source_file_name,source_file_url,source_file_note,note,posted_transaction_id,created_by,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    channel_id=excluded.channel_id,channel_code=excluded.channel_code,payout_code=excluded.payout_code,period_start=excluded.period_start,
    period_end=excluded.period_end,payout_date=excluded.payout_date,account_id=excluded.account_id,gross_amount=excluded.gross_amount,
    total_fees=excluded.total_fees,total_refunds=excluded.total_refunds,expected_amount=excluded.expected_amount,actual_amount=excluded.actual_amount,
    difference=excluded.difference,status=excluded.status,source_file_name=excluded.source_file_name,source_file_url=excluded.source_file_url,
    source_file_note=excluded.source_file_note,note=excluded.note,updated_at=excluded.updated_at`)
    .bind(...Object.values(row)).run();
  return { ok: true, platformPayout: publicPayout(row) };
}

async function ensurePayoutIncomeCategory(db) {
  let row = await db.prepare("SELECT * FROM accounting_categories WHERE type='income' AND lower(name)=lower('Tiền sàn chuyển về') AND status='active'").first();
  if (row) return row;
  const now = nowIso();
  row = { id: crypto.randomUUID(), name: "Tiền sàn chuyển về", type: "income", group: "other", status: "active", created_at: now, updated_at: now };
  await db.prepare("INSERT INTO accounting_categories(id,name,type,\"group\",status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
    .bind(row.id,row.name,row.type,row.group,row.status,row.created_at,row.updated_at).run();
  return row;
}

export async function handleAccountingAction(env, body) {
  if (!env.DB || !ACTIONS.has(body.action)) return null;
  try {
    if (body.action === "getAccountingData") {
      if (!await requireSession(env.DB, body.token)) throw new Error("Invalid session");
      return accountingRead(env.DB);
    }
    const user = await requireAdmin(env.DB, body.token);
    if (body.action === "createAccountingAccount" || body.action === "updateAccountingAccount") return saveAccount(env.DB, body);
    if (body.action === "createAccountingCategory" || body.action === "updateAccountingCategory") return saveCategory(env.DB, body);
    if (body.action === "createPlatformPayout" || body.action === "updatePlatformPayout") return savePayout(env.DB, body, user);
    if (body.action === "updateAccountingSettings") {
      const value = body.settings && typeof body.settings === "object" ? body.settings : {};
      await env.DB.prepare(`INSERT INTO app_settings(key,value_json,updated_by,updated_at) VALUES('accounting_operations',?,?,?)
        ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(JSON.stringify(value), user.id, nowIso()).run();
      return { ok: true, accountingSettings: value };
    }
    if (body.action === "addPlatformPayoutItem") {
      const payout = await env.DB.prepare("SELECT * FROM platform_payouts WHERE id=? AND status NOT IN ('posted','archived')").bind(clean(body.payoutId)).first();
      if (!payout) return { ok: false, error: "Phiếu đối soát không còn được chỉnh sửa" };
      const orderId = clean(body.orderId), orderCode = clean(body.orderCode);
      const duplicate = await env.DB.prepare("SELECT id FROM platform_payout_items WHERE payout_id=? AND (order_id=? OR (?<>'' AND order_code=?))")
        .bind(payout.id, orderId, orderCode, orderCode).first();
      if (duplicate) return { ok: false, error: "Đơn đã có trong phiếu đối soát" };
      const now = nowIso(), expected = number(body.expectedNetAmount), platform = number(body.platformNetAmount);
      const row = { id: crypto.randomUUID(), payout_id: payout.id, order_id: orderId, order_code: orderCode,
        platform_order_code: clean(body.platformOrderCode), product_total: number(body.productTotal), shipping_fee: number(body.shippingFee),
        seller_discount: number(body.sellerDiscount), platform_discount: number(body.platformDiscount), commission_fee: number(body.commissionFee),
        payment_fee: number(body.paymentFee), affiliate_fee: number(body.affiliateFee), ads_fee: number(body.adsFee),
        shipping_subsidy: number(body.shippingSubsidy), refund_amount: number(body.refundAmount), penalty_fee: number(body.penaltyFee),
        expected_net_amount: expected, platform_net_amount: platform, difference: platform - expected,
        status: Math.abs(platform - expected) <= number(body.tolerance, 1000) ? "matched" : "mismatch", note: clean(body.note), created_at: now, updated_at: now };
      await env.DB.prepare(`INSERT INTO platform_payout_items
        (id,payout_id,order_id,order_code,platform_order_code,product_total,shipping_fee,seller_discount,platform_discount,commission_fee,payment_fee,affiliate_fee,ads_fee,shipping_subsidy,refund_amount,penalty_fee,expected_net_amount,platform_net_amount,difference,status,note,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...Object.values(row)).run();
      return { ok: true, payoutItem: publicPayoutItem(row) };
    }
    if (body.action === "autoMatchPlatformPayout") {
      const payoutId = clean(body.id), payout = await env.DB.prepare("SELECT * FROM platform_payouts WHERE id=? AND status NOT IN ('posted','archived')").bind(payoutId).first();
      if (!payout) return { ok: false, error: "Không tìm thấy payout có thể ghép" };
      const items = await env.DB.prepare("SELECT * FROM platform_payout_items WHERE payout_id=?").bind(payoutId).all();
      let matched = 0;
      for (const item of items.results) {
        const order = await env.DB.prepare("SELECT id,code FROM orders WHERE id=? OR code=? LIMIT 1").bind(item.order_id || "", item.order_code || "").first();
        if (order) { await env.DB.prepare("UPDATE platform_payout_items SET order_id=?,order_code=?,status=?,updated_at=? WHERE id=?")
          .bind(order.id,order.code,Math.abs(number(item.difference))<=1000?"matched":"mismatch",nowIso(),item.id).run(); matched += 1; }
      }
      const mismatch = await env.DB.prepare("SELECT COUNT(*) count FROM platform_payout_items WHERE payout_id=? AND status='mismatch'").bind(payoutId).first();
      const status = number(mismatch?.count) ? "mismatch" : "matched";
      await env.DB.prepare("UPDATE platform_payouts SET status=?,updated_at=? WHERE id=?").bind(status,nowIso(),payoutId).run();
      return { ok: true, matched, status };
    }
    if (body.action === "resolvePlatformPayoutMismatch") {
      const id = clean(body.id), note = clean(body.note);
      if (!note) return { ok: false, error: "Cần nhập cách xử lý chênh lệch" };
      const payout = await env.DB.prepare("SELECT * FROM platform_payouts WHERE id=? AND status='mismatch'").bind(id).first();
      if (!payout) return { ok: false, error: "Payout không ở trạng thái chênh lệch" };
      await env.DB.prepare("UPDATE platform_payouts SET status='matched',note=?,updated_at=? WHERE id=?").bind(note,nowIso(),id).run();
      return { ok: true, status: "matched" };
    }
    if (body.action === "postPlatformPayout") {
      const id = clean(body.id), payout = await env.DB.prepare("SELECT * FROM platform_payouts WHERE id=? AND status<>'archived'").bind(id).first();
      if (!payout) return { ok: false, error: "Không tìm thấy payout" };
      if (payout.status === "posted" || payout.posted_transaction_id) return { ok: false, error: "Payout đã được ghi nhận tiền về" };
      if (!payout.account_id) return { ok: false, error: "Cần chọn tài khoản nhận tiền" };
      if (!await env.DB.prepare("SELECT id FROM accounting_accounts WHERE id=? AND status='active'").bind(payout.account_id).first()) return { ok: false, error: "Tài khoản nhận tiền không hợp lệ" };
      const category = await ensurePayoutIncomeCategory(env.DB), transactionId = crypto.randomUUID(), now = nowIso();
      const description = `Sàn ${payout.channel_code || payout.channel_id} chuyển tiền kỳ ${payout.period_start || "?"} - ${payout.period_end || "?"}`;
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO cash_transactions(id,type,account_id,category_id,amount,transaction_date,description,reference_type,reference_id,created_by,status,created_at,updated_at,channel_id,document_url)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(transactionId,"income",payout.account_id,category.id,number(payout.actual_amount),payout.payout_date||today(),description,"platform_payout",payout.id,user.id,"active",now,now,payout.channel_id,payout.source_file_url||""),
        env.DB.prepare("UPDATE platform_payouts SET status='posted',posted_transaction_id=?,updated_at=? WHERE id=? AND posted_transaction_id=''").bind(transactionId,now,payout.id)
      ]);
      return { ok: true, transaction: publicTransaction({ id:transactionId,type:"income",account_id:payout.account_id,category_id:category.id,amount:payout.actual_amount,transaction_date:payout.payout_date||today(),description,reference_type:"platform_payout",reference_id:payout.id,created_by:user.id,status:"active",created_at:now,updated_at:now,channel_id:payout.channel_id,document_url:payout.source_file_url||"" }), platformPayout: publicPayout({ ...payout, status:"posted", posted_transaction_id:transactionId, updated_at:now }) };
    }
    if (body.action === "archiveAccountingAccount") {
      const id=clean(body.id), status=clean(body.status)==="active"?"active":"archived";
      const row=await env.DB.prepare("SELECT * FROM accounting_accounts WHERE id=? AND status<>'deleted'").bind(id).first();
      if(!row)return {ok:false,error:"Account not found"};
      if(status==="archived"){
        const count=await env.DB.prepare("SELECT COUNT(*) count FROM accounting_accounts WHERE status='active'").first();
        if(number(count?.count)<=1)return {ok:false,error:"Cannot archive the last active account"};
      }
      await env.DB.prepare("UPDATE accounting_accounts SET status=?,updated_at=? WHERE id=?").bind(status,nowIso(),id).run();
      const data=await accountingRead(env.DB);
      return {ok:true,account:data.accounts.find(account=>account.id===id)};
    }
    if (body.action === "archiveAccountingCategory") {
      const id=clean(body.id),status=clean(body.status)==="active"?"active":"archived";
      const row=await env.DB.prepare("SELECT * FROM accounting_categories WHERE id=? AND status<>'deleted'").bind(id).first();
      if(!row)return {ok:false,error:"Category not found"};
      await env.DB.prepare("UPDATE accounting_categories SET status=?,updated_at=? WHERE id=?").bind(status,nowIso(),id).run();
      return {ok:true,category:publicCategory({...row,status,updated_at:nowIso()})};
    }
    if (body.action === "createCashTransaction") {
      const type=clean(body.type)==="expense"?"expense":"income";
      const accountId=clean(body.accountId??body.account_id),categoryId=clean(body.categoryId??body.category_id);
      const amount=number(body.amount,NaN),description=clean(body.description);
      if(!accountId||!categoryId||!Number.isFinite(amount)||amount<=0||!description)return {ok:false,error:"Cash transaction is invalid"};
      const [account,category]=await Promise.all([
        env.DB.prepare("SELECT id FROM accounting_accounts WHERE id=? AND status='active'").bind(accountId).first(),
        env.DB.prepare("SELECT id FROM accounting_categories WHERE id=? AND type=? AND status='active'").bind(categoryId,type).first()
      ]);
      if(!account)return {ok:false,error:"Account not found"};
      if(!category)return {ok:false,error:"Category not found"};
      const now=nowIso();
      const row={id:crypto.randomUUID(),type,account_id:accountId,category_id:categoryId,amount,transaction_date:clean(body.transactionDate??body.transaction_date)||today(),description,reference_type:clean(body.referenceType??body.reference_type)||"manual",reference_id:clean(body.referenceId??body.reference_id),created_by:user.id,status:"active",created_at:now,updated_at:now,channel_id:clean(body.channelId??body.channel_id),document_url:clean(body.documentUrl??body.document_url)};
      await env.DB.prepare(
        `INSERT INTO cash_transactions(id,type,account_id,category_id,amount,transaction_date,description,reference_type,reference_id,created_by,status,created_at,updated_at,channel_id,document_url)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(...Object.values(row)).run();
      return {ok:true,transaction:publicTransaction(row)};
    }
    if(body.action==="updateCashTransaction"){
      const id=clean(body.id),existing=await env.DB.prepare("SELECT * FROM cash_transactions WHERE id=? AND status<>'deleted'").bind(id).first();
      if(!existing)return {ok:false,error:"Transaction not found"};
      const documentUrl=clean(body.documentUrl??body.document_url);
      if(existing.reference_type&&existing.reference_type!=="manual"){
        await env.DB.prepare("UPDATE cash_transactions SET document_url=?,updated_at=? WHERE id=?").bind(documentUrl,nowIso(),id).run();
        return {ok:true,transaction:publicTransaction({...existing,document_url:documentUrl,updated_at:nowIso()})};
      }
      const type=clean(body.type)==="expense"?"expense":"income",accountId=clean(body.accountId??body.account_id),categoryId=clean(body.categoryId??body.category_id);
      const amount=number(body.amount,NaN),description=clean(body.description);
      if(!accountId||!categoryId||!Number.isFinite(amount)||amount<=0||!description)return {ok:false,error:"Cash transaction is invalid"};
      const [account,category]=await Promise.all([env.DB.prepare("SELECT id FROM accounting_accounts WHERE id=? AND status='active'").bind(accountId).first(),env.DB.prepare("SELECT id FROM accounting_categories WHERE id=? AND type=? AND status='active'").bind(categoryId,type).first()]);
      if(!account||!category)return {ok:false,error:"Account or category is invalid"};
      const updated=nowIso();
      await env.DB.prepare("UPDATE cash_transactions SET type=?,account_id=?,category_id=?,amount=?,transaction_date=?,description=?,reference_id=?,channel_id=?,document_url=?,updated_at=? WHERE id=?")
        .bind(type,accountId,categoryId,amount,clean(body.transactionDate??body.transaction_date)||today(),description,clean(body.referenceId??body.reference_id),clean(body.channelId??body.channel_id),documentUrl,updated,id).run();
      return {ok:true,transaction:publicTransaction({...existing,type,account_id:accountId,category_id:categoryId,amount,transaction_date:clean(body.transactionDate??body.transaction_date)||today(),description,reference_id:clean(body.referenceId??body.reference_id),channel_id:clean(body.channelId??body.channel_id),document_url:documentUrl,updated_at:updated})};
    }
    if(body.action==="archiveCashTransaction"){
      const row=await env.DB.prepare("SELECT * FROM cash_transactions WHERE id=? AND status<>'deleted'").bind(clean(body.id)).first();
      if(!row)return {ok:false,error:"Transaction not found"};
      if(row.reference_type&&row.reference_type!=="manual")return {ok:false,error:"Linked transactions must be reversed from their source document"};
      await env.DB.prepare("UPDATE cash_transactions SET status='deleted',updated_at=? WHERE id=?").bind(nowIso(),row.id).run();
      return {ok:true};
    }
    const accountId=clean(body.accountId??body.account_id);
    const actual=number(body.actualBalance??body.actual_balance,NaN);
    if(!accountId||!Number.isFinite(actual))return {ok:false,error:"Reconciliation is invalid"};
    const data=await accountingRead(env.DB);
    const account=data.accounts.find(item=>item.id===accountId&&item.status==="active");
    if(!account)return {ok:false,error:"Account not found or inactive"};
    const now=nowIso();
    const row={id:crypto.randomUUID(),account_id:accountId,system_balance:account.currentBalance,actual_balance:actual,difference:actual-account.currentBalance,note:clean(body.note),reconciled_by:user.id,reconciled_at:clean(body.reconciledAt??body.reconciled_at)||today(),created_at:now};
    await env.DB.prepare(
      "INSERT INTO accounting_reconciliations(id,account_id,system_balance,actual_balance,difference,note,reconciled_by,reconciled_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(...Object.values(row)).run();
    return {ok:true,reconciliation:{id:row.id,accountId:row.account_id,systemBalance:row.system_balance,actualBalance:row.actual_balance,difference:row.difference,note:row.note,reconciledBy:row.reconciled_by,reconciledAt:row.reconciled_at,createdAt:row.created_at}};
  } catch(error) {
    return {ok:false,error:error?.message||String(error)};
  }
}
