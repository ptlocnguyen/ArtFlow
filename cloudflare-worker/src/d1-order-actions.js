import { requireSession } from "./d1-data.js";

const ACTIONS = new Set([
  "createOrder", "updateOrderStatus", "updateOrderFulfillment", "cancelOrder",
  "returnOrder", "refundOrder"
]);
const ORDER_COLUMNS = [
  "id", "code", "customer_id", "status", "payment_status", "payment_method",
  "subtotal", "discount", "shipping_fee", "total", "note", "created_by",
  "created_at", "updated_at", "channel", "shipping_status", "carrier",
  "tracking_code", "returned_amount", "refunded_amount", "discount_percent",
  "loyalty_points_used", "loyalty_discount", "cash_received", "change_amount",
  "rounding_amount", "receipt_pdf_url"
];
const ITEM_COLUMNS = [
  "id", "order_id", "product_id", "sku", "name", "quantity", "unit_price",
  "cost_price", "line_total", "created_at", "discount_percent"
];
const MOVEMENT_COLUMNS = [
  "id", "product_id", "sku", "product_name", "type", "quantity_delta",
  "stock_before", "stock_after", "reason", "reference_type", "reference_id",
  "created_by", "created_at"
];

function clean(value) { return String(value || "").trim(); }
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function nowIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).reduce((out, part) => (out[part.type] = part.value, out), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}
function insert(db, table, record, columns) {
  return db.prepare(
    `INSERT INTO ${table} (${columns.map(column => `"${column}"`).join(",")})
     VALUES (${columns.map(() => "?").join(",")})`
  ).bind(...columns.map(column => record[column] ?? ""));
}
function update(db, table, record, columns) {
  return db.prepare(
    `UPDATE ${table} SET ${columns.filter(column => column !== "id")
      .map(column => `"${column}" = ?`).join(",")} WHERE id = ?`
  ).bind(...columns.filter(column => column !== "id").map(column => record[column] ?? ""), record.id);
}
function publicItem(row) {
  return {
    id: row.id, orderId: row.order_id, productId: row.product_id, sku: row.sku,
    name: row.name, quantity: number(row.quantity), unitPrice: number(row.unit_price),
    costPrice: number(row.cost_price), discountPercent: number(row.discount_percent),
    lineTotal: number(row.line_total), createdAt: row.created_at || ""
  };
}
function publicOrder(row, items) {
  const total = number(row.total);
  const returnedAmount = number(row.returned_amount);
  return {
    id: row.id, code: row.code, customerId: row.customer_id,
    status: row.status || "pending", paymentStatus: row.payment_status || "unpaid",
    paymentMethod: row.payment_method || "cash", subtotal: number(row.subtotal),
    discount: number(row.discount), discountPercent: number(row.discount_percent),
    loyaltyPointsUsed: number(row.loyalty_points_used), loyaltyDiscount: number(row.loyalty_discount),
    cashReceived: number(row.cash_received), changeAmount: number(row.change_amount),
    roundingAmount: number(row.rounding_amount), shippingFee: number(row.shipping_fee),
    total, returnedAmount, refundedAmount: number(row.refunded_amount),
    netTotal: Math.max(0, total - returnedAmount), note: row.note || "",
    createdBy: row.created_by || "", createdAt: row.created_at || "",
    updatedAt: row.updated_at || "", channel: row.channel || "pos",
    shippingStatus: row.shipping_status || "none", carrier: row.carrier || "",
    trackingCode: row.tracking_code || "", receiptPdfUrl: row.receipt_pdf_url || "",
    items: (items || []).map(publicItem)
  };
}
function parseItems(body) {
  let values = body.items || [];
  if (typeof values === "string") values = JSON.parse(values);
  if (!Array.isArray(values) || !values.length) throw new Error("Order must include at least one item");
  const merged = new Map();
  values.forEach(value => {
    const productId = clean(value.productId ?? value.product_id);
    const quantity = number(value.quantity, NaN);
    const custom = Object.hasOwn(value, "unitPrice") || Object.hasOwn(value, "unit_price");
    const unitPrice = number(value.unitPrice ?? value.unit_price, 0);
    const discountPercent = Math.min(100, Math.max(0, number(value.discountPercent ?? value.discount_percent)));
    if (!productId || !Number.isFinite(quantity) || quantity < 1) throw new Error("Order item is invalid");
    if (custom && unitPrice < 0) throw new Error("Order item price is invalid");
    const key = `${productId}:${custom ? unitPrice : "default"}:${discountPercent}`;
    const existing = merged.get(key) || { productId, quantity: 0, unitPrice, discountPercent, custom };
    existing.quantity += quantity;
    merged.set(key, existing);
  });
  return [...merged.values()];
}
function normalizeOrder(body) {
  const statuses = ["pending", "confirmed", "packed", "shipping", "paid", "completed"];
  const shippingStatuses = ["none", "preparing", "shipping", "delivered", "returned"];
  const channels = ["pos", "website", "shopee", "lazada", "tiktok", "facebook"];
  const customerId = clean(body.customerId ?? body.customer_id);
  if (!customerId) throw new Error("Order customer is required");
  const status = statuses.includes(clean(body.status)) ? clean(body.status) : "pending";
  const rawPayment = clean(body.paymentStatus ?? body.payment_status);
  const discount = number(body.discount, 0);
  const shippingFee = number(body.shippingFee ?? body.shipping_fee, 0);
  const cashReceived = Math.max(0, number(body.cashReceived ?? body.cash_received));
  const roundingAmount = number(body.roundingAmount ?? body.rounding_amount);
  if (![discount, shippingFee, cashReceived, roundingAmount].every(Number.isFinite) || discount < 0 || shippingFee < 0) {
    throw new Error("Order discount or shipping fee is invalid");
  }
  return {
    customerId, items: parseItems(body), status,
    paymentStatus: ["unpaid", "paid"].includes(rawPayment) ? rawPayment : (status === "pending" ? "unpaid" : "paid"),
    paymentMethod: clean(body.paymentMethod ?? body.payment_method) || "cash",
    channel: channels.includes(clean(body.channel)) ? clean(body.channel) : "pos",
    shippingStatus: shippingStatuses.includes(clean(body.shippingStatus ?? body.shipping_status))
      ? clean(body.shippingStatus ?? body.shipping_status) : "none",
    carrier: clean(body.carrier), trackingCode: clean(body.trackingCode ?? body.tracking_code),
    discount, discountPercent: Math.min(100, Math.max(0, number(body.discountPercent ?? body.discount_percent))),
    loyaltyPointsUsed: Math.max(0, Math.floor(number(body.loyaltyPointsUsed ?? body.loyalty_points_used))),
    loyaltyDiscount: Math.max(0, number(body.loyaltyDiscount ?? body.loyalty_discount)),
    cashReceived, roundingAmount, shippingFee, note: clean(body.note)
  };
}
function channelPrefix(channel) {
  return { pos: "POS", website: "WEB", shopee: "SHP", lazada: "LZD", tiktok: "TTS", facebook: "FB" }[channel] || "AF";
}
async function nextCode(db, channel) {
  const date = nowIso().slice(0, 10).replaceAll("-", "");
  const prefix = `${channelPrefix(channel)}-${date}-`;
  const row = await db.prepare("SELECT COUNT(*) AS count FROM orders WHERE code LIKE ?").bind(`${prefix}%`).first();
  return `${prefix}${String(number(row?.count) + 1).padStart(4, "0")}`;
}
async function requireSales(db, token) {
  const user = await requireSession(db, token);
  if (!user) throw new Error("Invalid session");
  if (!["admin", "sales"].includes(user.role)) throw new Error("Order access required");
  return user;
}
async function createOrder(env, body, user) {
  const input = normalizeOrder(body);
  const customer = await env.DB.prepare(
    "SELECT * FROM customers WHERE id = ? AND status = 'active'"
  ).bind(input.customerId).first();
  if (!customer) return { ok: false, error: "Customer not found or inactive" };
  const prepared = [];
  for (const item of input.items) {
    const product = await env.DB.prepare(
      "SELECT * FROM products WHERE id = ? AND status = 'active'"
    ).bind(item.productId).first();
    if (!product) throw new Error("Product not found or inactive");
    if (number(product.stock) < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
    const unitPrice = item.custom ? item.unitPrice : number(product.sale_price);
    if (!item.custom && unitPrice <= 0) {
      throw new Error(`Product ${product.name} has no shop price. Enter a custom price before saving the order.`);
    }
    if (item.custom && unitPrice <= 0) {
      throw new Error(`Order item price must be greater than 0 for ${product.name}`);
    }
    const gross = unitPrice * item.quantity;
    prepared.push({
      ...item, product, unitPrice, costPrice: number(product.cost_price),
      lineTotal: Math.max(0, gross - Math.round(gross * item.discountPercent / 100))
    });
  }
  const subtotal = prepared.reduce((sum, item) => sum + item.lineTotal, 0);
  const percentDiscount = Math.round(subtotal * input.discountPercent / 100);
  const availablePoints = customer.loyalty_points === "" || customer.loyalty_points == null
    ? Math.floor(number(customer.total_spent) / 10000) : Math.max(0, number(customer.loyalty_points));
  const maxPointDiscount = Math.floor(Math.max(0, subtotal - percentDiscount - input.discount) * 0.2);
  const pointsUsed = Math.min(input.loyaltyPointsUsed, availablePoints, Math.floor(maxPointDiscount / 1000));
  const pointDiscount = Math.min(input.loyaltyDiscount || pointsUsed * 1000, pointsUsed * 1000);
  const total = Math.max(0, subtotal - percentDiscount - input.discount - pointDiscount + input.shippingFee + input.roundingAmount);
  const earned = Math.floor(total / 10000);
  const now = nowIso();
  const order = {
    id: crypto.randomUUID(), code: await nextCode(env.DB, input.channel),
    customer_id: customer.id, status: input.status, payment_status: input.paymentStatus,
    payment_method: input.paymentMethod, subtotal, discount: input.discount,
    shipping_fee: input.shippingFee, total, note: input.note, created_by: user.id,
    created_at: now, updated_at: now, channel: input.channel,
    shipping_status: input.shippingStatus, carrier: input.carrier,
    tracking_code: input.trackingCode, returned_amount: 0, refunded_amount: 0,
    discount_percent: input.discountPercent, loyalty_points_used: pointsUsed,
    loyalty_discount: pointDiscount, cash_received: input.cashReceived,
    change_amount: Math.max(0, input.cashReceived - total),
    rounding_amount: input.roundingAmount, receipt_pdf_url: ""
  };
  const statements = [insert(env.DB, "orders", order, ORDER_COLUMNS)];
  const savedItems = [];
  prepared.forEach(item => {
    const saved = {
      id: crypto.randomUUID(), order_id: order.id, product_id: item.product.id,
      sku: item.product.sku, name: item.product.name, quantity: item.quantity,
      unit_price: item.unitPrice, cost_price: item.costPrice, line_total: item.lineTotal,
      created_at: now, discount_percent: item.discountPercent
    };
    savedItems.push(saved);
    statements.push(insert(env.DB, "order_items", saved, ITEM_COLUMNS));
    statements.push(env.DB.prepare(
      "UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?"
    ).bind(item.quantity, now, item.product.id));
    statements.push(insert(env.DB, "stock_movements", {
      id: crypto.randomUUID(), product_id: item.product.id, sku: item.product.sku,
      product_name: item.product.name, type: "sale", quantity_delta: -item.quantity,
      stock_before: number(item.product.stock), stock_after: number(item.product.stock) - item.quantity,
      reason: `Tạo đơn ${order.code}`, reference_type: "order", reference_id: order.id,
      created_by: user.id, created_at: now
    }, MOVEMENT_COLUMNS));
  });
  statements.push(env.DB.prepare(
    `UPDATE customers SET total_spent = total_spent + ?, loyalty_points = ?,
     lifetime_points = lifetime_points + ?, last_order_at = ?, updated_at = ? WHERE id = ?`
  ).bind(total, Math.max(0, availablePoints - pointsUsed) + earned, earned, now, now, customer.id));
  await env.DB.batch(statements);
  return { ok: true, order: publicOrder(order, savedItems) };
}
async function loadOrder(db, id) {
  const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND status <> 'deleted'").bind(id).first();
  if (!order) return null;
  const items = (await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(id).all()).results;
  return { order, items };
}
async function updateOrderAction(env, body) {
  const loaded = await loadOrder(env.DB, clean(body.id));
  if (!loaded) return { ok: false, error: "Order not found" };
  if (loaded.order.status === "cancelled") return { ok: false, error: "Cannot update a cancelled order" };
  const statuses = ["pending", "confirmed", "packed", "shipping", "paid", "completed"];
  const paymentStatuses = ["unpaid", "paid"];
  const shippingStatuses = ["none", "preparing", "shipping", "delivered", "returned"];
  if (body.action === "updateOrderStatus") {
    const status = clean(body.status);
    if (!statuses.includes(status)) return { ok: false, error: "Order status is invalid" };
    loaded.order.status = status;
    loaded.order.payment_status = clean(body.paymentStatus ?? body.payment_status) || (status === "pending" ? "unpaid" : "paid");
  } else {
    const status = clean(body.status);
    const payment = clean(body.paymentStatus ?? body.payment_status);
    const shipping = clean(body.shippingStatus ?? body.shipping_status);
    if (status && !statuses.includes(status)) return { ok: false, error: "Order status is invalid" };
    if (payment && !paymentStatuses.includes(payment)) return { ok: false, error: "Payment status is invalid" };
    if (shipping && !shippingStatuses.includes(shipping)) return { ok: false, error: "Shipping status is invalid" };
    if (status) loaded.order.status = status;
    if (payment) loaded.order.payment_status = payment;
    if (shipping) loaded.order.shipping_status = shipping;
    if (Object.hasOwn(body, "carrier")) loaded.order.carrier = clean(body.carrier);
    if (Object.hasOwn(body, "trackingCode") || Object.hasOwn(body, "tracking_code")) {
      loaded.order.tracking_code = clean(body.trackingCode ?? body.tracking_code);
    }
  }
  loaded.order.updated_at = nowIso();
  await update(env.DB, "orders", loaded.order, ORDER_COLUMNS).run();
  return { ok: true, order: publicOrder(loaded.order, loaded.items) };
}
async function cancelOrder(env, body, user) {
  const loaded = await loadOrder(env.DB, clean(body.id));
  if (!loaded) return { ok: false, error: "Order not found" };
  const order = loaded.order;
  if (order.status === "cancelled") return { ok: true, order: publicOrder(order, loaded.items) };
  if (number(order.returned_amount) > 0 || number(order.refunded_amount) > 0) {
    return { ok: false, error: "Cannot cancel an order with returns or refunds" };
  }
  const collected = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS amount FROM cash_transactions
     WHERE status <> 'deleted' AND type = 'income' AND reference_type = 'order'
       AND reference_id IN (?, ?)`
  ).bind(order.id, order.code).first();
  if (number(collected?.amount) > 0) return { ok: false, error: "Refund collected payments before cancelling the order" };
  const now = nowIso();
  const statements = [];
  for (const item of loaded.items) {
    const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(item.product_id).first();
    if (!product) continue;
    statements.push(env.DB.prepare(
      "UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?"
    ).bind(number(item.quantity), now, product.id));
    statements.push(insert(env.DB, "stock_movements", {
      id: crypto.randomUUID(), product_id: product.id, sku: product.sku,
      product_name: product.name, type: "order_cancel", quantity_delta: number(item.quantity),
      stock_before: number(product.stock), stock_after: number(product.stock) + number(item.quantity),
      reason: `Hủy đơn ${order.code}`, reference_type: "order", reference_id: order.id,
      created_by: user.id, created_at: now
    }, MOVEMENT_COLUMNS));
  }
  order.status = "cancelled";
  order.payment_status = "unpaid";
  order.updated_at = now;
  statements.push(update(env.DB, "orders", order, ORDER_COLUMNS));
  statements.push(env.DB.prepare(
    `UPDATE customers SET total_spent = MAX(0, total_spent - ?),
     loyalty_points = MAX(0, loyalty_points - ?), updated_at = ? WHERE id = ?`
  ).bind(number(order.total), Math.floor(number(order.total) / 10000), now, order.customer_id));
  await env.DB.batch(statements);
  return { ok: true, order: publicOrder(order, loaded.items) };
}

async function collectedAmount(db, order) {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(amount),0) amount FROM cash_transactions
     WHERE status<>'deleted' AND type='income' AND reference_type='order'
       AND reference_id IN (?,?)`
  ).bind(order.id, order.code).first();
  return Math.max(number(row?.amount), number(order.cash_received));
}

async function createRefund(env, body, order, user, salesReturnId = "") {
  const maximum = Math.max(0, Math.min(
    number(order.returned_amount) - number(order.refunded_amount),
    await collectedAmount(env.DB, order) - number(order.refunded_amount)
  ));
  const amount = number(body.refundAmount ?? body.amount, NaN);
  if (!Number.isFinite(amount) || amount <= 0 || amount > maximum) throw new Error("Refund amount is invalid");
  const accountId = clean(body.accountId ?? body.account_id);
  const categoryId = clean(body.categoryId ?? body.category_id);
  const [account, category] = await Promise.all([
    env.DB.prepare("SELECT id FROM accounting_accounts WHERE id=? AND status='active'").bind(accountId).first(),
    env.DB.prepare("SELECT id FROM accounting_categories WHERE id=? AND type='expense' AND status='active'").bind(categoryId).first()
  ]);
  if (!account || !category) throw new Error("Refund account or expense category is invalid");
  const stamp = nowIso(), refundDate = clean(body.refundDate ?? body.refund_date) || stamp.slice(0, 10);
  const transaction = {
    id: crypto.randomUUID(), type: "expense", account_id: accountId, category_id: categoryId,
    amount, transaction_date: refundDate, description: clean(body.refundNote ?? body.note) || `Hoàn tiền đơn ${order.code}`,
    reference_type: "order_refund", reference_id: order.code, created_by: user.id,
    status: "active", created_at: stamp, updated_at: stamp
  };
  const refund = {
    id: crypto.randomUUID(), order_id: order.id, sales_return_id: salesReturnId,
    cash_transaction_id: transaction.id, account_id: accountId, category_id: categoryId,
    amount, refund_date: refundDate, note: clean(body.refundNote ?? body.note),
    created_by: user.id, created_at: stamp
  };
  order.refunded_amount = number(order.refunded_amount) + amount;
  order.payment_status = number(order.total) - number(order.returned_amount) <= 0 ? "refunded" : "unpaid";
  order.updated_at = stamp;
  await env.DB.batch([
    insert(env.DB, "cash_transactions", transaction, Object.keys(transaction)),
    insert(env.DB, "order_refunds", refund, Object.keys(refund)),
    update(env.DB, "orders", order, ORDER_COLUMNS)
  ]);
  return { refund, transaction };
}

async function returnOrder(env, body, user) {
  const id = clean(body.id ?? body.orderId ?? body.order_id);
  const loaded = await loadOrder(env.DB, id);
  if (!loaded || loaded.order.status === "cancelled") return { ok: false, error: "Order is not eligible for return" };
  let requested = body.items || [];
  if (typeof requested === "string") requested = JSON.parse(requested);
  if (!Array.isArray(requested) || !requested.length) return { ok: false, error: "Return must include items" };
  const previous = (await env.DB.prepare("SELECT * FROM sales_return_items").all()).results;
  const returnedByItem = {};
  previous.forEach(item => returnedByItem[item.order_item_id] = number(returnedByItem[item.order_item_id]) + number(item.quantity));
  const selected = [];
  for (const request of requested) {
    const itemId = clean(request.orderItemId ?? request.order_item_id ?? request.id);
    const quantity = number(request.quantity);
    if (!itemId || quantity <= 0) continue;
    const item = loaded.items.find(value => value.id === itemId);
    if (!item) throw new Error("Order item not found");
    if (quantity > number(item.quantity) - number(returnedByItem[itemId])) throw new Error("Return quantity exceeds the remaining sold quantity");
    selected.push({ item, quantity, lineTotal: quantity * number(item.unit_price) * (1 - number(item.discount_percent) / 100) });
  }
  if (!selected.length) return { ok: false, error: "Return quantity is required" };
  const amount = Math.min(selected.reduce((sum, value) => sum + value.lineTotal, 0), Math.max(0, number(loaded.order.total) - number(loaded.order.returned_amount)));
  if (amount <= 0) return { ok: false, error: "Order has no returnable value" };
  const stamp = nowIso();
  const prefix = `SRT-${stamp.slice(0,10).replaceAll("-","")}-`;
  const count = await env.DB.prepare("SELECT COUNT(*) count FROM sales_returns WHERE code LIKE ?").bind(prefix+"%").first();
  const salesReturn = {
    id: crypto.randomUUID(), code: prefix + String(number(count?.count)+1).padStart(4,"0"),
    order_id: id, customer_id: loaded.order.customer_id, amount,
    note: clean(body.note), created_by: user.id, created_at: stamp
  };
  const statements = [insert(env.DB, "sales_returns", salesReturn, Object.keys(salesReturn))], saved = [];
  for (const entry of selected) {
    const product = await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(entry.item.product_id).first();
    if (!product) throw new Error("Product not found for returned item");
    const row = {
      id: crypto.randomUUID(), return_id: salesReturn.id, order_item_id: entry.item.id,
      product_id: entry.item.product_id, sku: entry.item.sku, name: entry.item.name,
      quantity: entry.quantity, unit_price: number(entry.item.unit_price),
      cost_price: number(entry.item.cost_price), line_total: entry.lineTotal, created_at: stamp
    };
    saved.push(row);
    statements.push(insert(env.DB, "sales_return_items", row, Object.keys(row)));
    statements.push(env.DB.prepare("UPDATE products SET stock=stock+?,updated_at=? WHERE id=?").bind(entry.quantity,stamp,product.id));
    statements.push(insert(env.DB, "stock_movements", {
      id:crypto.randomUUID(),product_id:product.id,sku:product.sku,product_name:product.name,
      type:"sales_return",quantity_delta:entry.quantity,stock_before:number(product.stock),
      stock_after:number(product.stock)+entry.quantity,reason:`Khách trả hàng ${salesReturn.code}`,
      reference_type:"sales_return",reference_id:salesReturn.id,created_by:user.id,created_at:stamp
    },MOVEMENT_COLUMNS));
  }
  loaded.order.returned_amount = number(loaded.order.returned_amount) + amount;
  loaded.order.updated_at = stamp;
  statements.push(update(env.DB,"orders",loaded.order,ORDER_COLUMNS));
  statements.push(env.DB.prepare("UPDATE customers SET total_spent=MAX(0,total_spent-?),updated_at=? WHERE id=?").bind(amount,stamp,loaded.order.customer_id));
  await env.DB.batch(statements);
  let refundResult = null;
  if (number(body.refundAmount) > 0) {
    if (user.role !== "admin") throw new Error("Admin access required for customer refunds");
    refundResult = await createRefund(env, body, loaded.order, user, salesReturn.id);
  }
  return {
    ok:true,order:publicOrder(loaded.order,loaded.items),
    salesReturn:{id:salesReturn.id,code:salesReturn.code,orderId:id,customerId:salesReturn.customer_id,amount,note:salesReturn.note,createdBy:user.id,createdAt:stamp,items:saved.map(row=>({id:row.id,returnId:row.return_id,orderItemId:row.order_item_id,productId:row.product_id,sku:row.sku,name:row.name,quantity:row.quantity,unitPrice:row.unit_price,costPrice:row.cost_price,lineTotal:row.line_total,createdAt:row.created_at}))},
    refund:refundResult?{id:refundResult.refund.id,orderId:id,amount:refundResult.refund.amount,refundDate:refundResult.refund.refund_date}:null
  };
}

export async function handleOrderAction(env, body) {
  if (!env.DB || !ACTIONS.has(body.action)) return null;
  try {
    const user = await requireSales(env.DB, body.token);
    if (body.action === "createOrder") return await createOrder(env, body, user);
    if (body.action === "cancelOrder") return await cancelOrder(env, body, user);
    if (body.action === "returnOrder") return await returnOrder(env, body, user);
    if (body.action === "refundOrder") {
      if (user.role !== "admin") throw new Error("Accounting access required");
      const loaded = await loadOrder(env.DB, clean(body.id ?? body.orderId ?? body.order_id));
      if (!loaded) return { ok:false,error:"Order is not eligible for refund" };
      const result = await createRefund(env, body, loaded.order, user);
      return { ok:true,order:publicOrder(loaded.order,loaded.items),refund:{
        id:result.refund.id,orderId:result.refund.order_id,salesReturnId:result.refund.sales_return_id,
        cashTransactionId:result.refund.cash_transaction_id,accountId:result.refund.account_id,
        categoryId:result.refund.category_id,amount:result.refund.amount,refundDate:result.refund.refund_date,
        note:result.refund.note,createdBy:result.refund.created_by,createdAt:result.refund.created_at
      }};
    }
    return await updateOrderAction(env, body);
  } catch (error) {
    const message = error?.message || String(error);
    return { ok: false, error: /Insufficient stock/i.test(message) ? "Not enough stock" : message };
  }
}
