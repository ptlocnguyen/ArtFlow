import { requireSession } from "./d1-data.js";

const ACTIONS = new Set([
  "getAccountingData", "createCashTransaction", "archiveCashTransaction",
  "createAccountingAccount", "updateAccountingAccount", "archiveAccountingAccount",
  "createAccountingReconciliation", "createAccountingCategory",
  "updateAccountingCategory", "archiveAccountingCategory"
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
  return { id: row.id, name: row.name, type: row.type || "expense", status: row.status || "active", createdAt: row.created_at || "", updatedAt: row.updated_at || "" };
}
function publicTransaction(row) {
  return {
    id: row.id, type: row.type || "expense", accountId: row.account_id,
    categoryId: row.category_id, amount: number(row.amount), transactionDate: row.transaction_date || "",
    description: row.description || "", referenceType: row.reference_type || "",
    referenceId: row.reference_id || "", createdBy: row.created_by || "",
    status: row.status || "active", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
  };
}
async function accountingRead(db) {
  const [accounts, categories, transactions, reconciliations] = await Promise.all([
    db.prepare("SELECT * FROM accounting_accounts WHERE status<>'deleted' ORDER BY name COLLATE NOCASE").all(),
    db.prepare("SELECT * FROM accounting_categories WHERE status<>'deleted' ORDER BY type,name COLLATE NOCASE").all(),
    db.prepare("SELECT * FROM cash_transactions WHERE status<>'deleted' ORDER BY COALESCE(transaction_date,created_at) DESC").all(),
    db.prepare("SELECT * FROM accounting_reconciliations ORDER BY COALESCE(reconciled_at,created_at) DESC").all()
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
    }))
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
  if (!name) return { ok: false, error: "Accounting category is invalid" };
  const duplicate = await db.prepare(
    "SELECT id FROM accounting_categories WHERE lower(name)=lower(?) AND type=? AND id<>? AND status<>'deleted'"
  ).bind(name,type,id).first();
  if (duplicate) return { ok: false, error: "Category already exists" };
  const existing = id ? await db.prepare("SELECT * FROM accounting_categories WHERE id=? AND status<>'deleted'").bind(id).first() : null;
  if (id && !existing) return { ok: false, error: "Category not found" };
  const now=nowIso();
  const row={id:existing?.id||crypto.randomUUID(),name,type,status:existing?.status||"active",created_at:existing?.created_at||now,updated_at:now};
  await db.prepare(
    `INSERT INTO accounting_categories(id,name,type,status,created_at,updated_at) VALUES(?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,status=excluded.status,updated_at=excluded.updated_at`
  ).bind(row.id,row.name,row.type,row.status,row.created_at,row.updated_at).run();
  return {ok:true,category:publicCategory(row)};
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
      const row={id:crypto.randomUUID(),type,account_id:accountId,category_id:categoryId,amount,transaction_date:clean(body.transactionDate??body.transaction_date)||today(),description,reference_type:clean(body.referenceType??body.reference_type)||"manual",reference_id:clean(body.referenceId??body.reference_id),created_by:user.id,status:"active",created_at:now,updated_at:now};
      await env.DB.prepare(
        `INSERT INTO cash_transactions(id,type,account_id,category_id,amount,transaction_date,description,reference_type,reference_id,created_by,status,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(...Object.values(row)).run();
      return {ok:true,transaction:publicTransaction(row)};
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
