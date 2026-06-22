(function () {
  const config = window.ARTFLOW_POS_CONFIG;
  const page = document.body.dataset.page || "auth";
  const root = document.body.dataset.root || ".";
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
  const tokenKey = `${config.storageKey}.authToken`;
  const purchaseEditId = new URLSearchParams(window.location.search).get("edit") || "";

  let state = window.ArtFlowPosStore.load();
  let currentUser = null;
  let staffUsers = [];
  let auditLogs = [];
  let searchTerm = "";
  let pageDataReady = false;
  const orderFilters = { channel: "all", status: "all", paymentStatus: "all", shippingStatus: "all" };
  const accountingFilters = { view: "receivables", type: "all", accountId: "all", range: "30", receivable: "all" };
  const purchasingFilters = { view: "orders", status: "all", paymentStatus: "all" };
  const reportFilters = { range: "30", channel: "all" };
  const auditFilters = { entityType: "all", range: "30" };

  const channels = {
    pos: "POS",
    website: "Website",
    shopee: "Shopee",
    lazada: "Lazada",
    tiktok: "TikTok Shop",
    facebook: "Facebook"
  };

  const shippingStatuses = {
    none: "Chưa giao",
    preparing: "Đang chuẩn bị",
    shipping: "Đang giao",
    delivered: "Đã giao",
    returned: "Hoàn hàng"
  };

  const paymentStatuses = {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền"
  };

  const carriers = {
    none: "Chưa chọn",
    ghn: "GHN",
    ghtk: "GHTK",
    viettel_post: "Viettel Post",
    jt: "J&T Express",
    shopee_express: "Shopee Express",
    other: "Khác"
  };

  const pages = {
    dashboard: { title: "Tổng quan", href: "./dashboard.html", icon: "▦" },
    orders: { title: "Đơn hàng", href: "./orders.html", icon: "□" },
    orderCreate: { title: "Tạo đơn", href: "./order-create.html", icon: "+", hidden: true },
    products: { title: "Sản phẩm", href: "./products.html", icon: "◇" },
    customers: { title: "Khách hàng", href: "./customers.html", icon: "○" },
    purchasing: { title: "Mua hàng", href: "./purchasing.html", icon: "⇣" },
    purchaseCreate: { title: "Tạo phiếu mua", href: "./purchase-create.html", icon: "+", hidden: true },
    inventory: { title: "Kho hàng", href: "./inventory.html", icon: "▤" },
    accounting: { title: "Kế toán", href: "./accounting.html", icon: "≋" },
    reports: { title: "Báo cáo", href: "./reports.html", icon: "↗" },
    users: { title: "Nhân viên", href: "./users.html", icon: "◎", adminOnly: true },
    activity: { title: "Lịch sử hoạt động", href: "./activity.html", icon: "◷", adminOnly: true }
  };

  const qs = selector => document.querySelector(selector);
  const els = {
    authScreen: qs("[data-auth-screen]"),
    appShell: qs("[data-app-shell]"),
    loginForm: qs("[data-login-form]"),
    currentUser: qs("[data-current-user]"),
    title: qs("[data-page-title]"),
    navList: qs("[data-nav-list]"),
    kpis: qs("[data-kpis]"),
    lowStock: qs("[data-low-stock]"),
    revenueChart: qs("[data-revenue-chart]"),
    recentOrders: qs("[data-recent-orders]"),
    ordersTable: qs("[data-orders-table]"),
    orderCreateForm: qs("[data-order-create-form]"),
    purchaseCreateForm: qs("[data-purchase-create-form]"),
    orderChannelFilter: qs("[data-order-channel-filter]"),
    orderStatusFilter: qs("[data-order-status-filter]"),
    orderPaymentFilter: qs("[data-order-payment-filter]"),
    orderShippingFilter: qs("[data-order-shipping-filter]"),
    productsTable: qs("[data-products-table]"),
    productCsvFile: qs("[data-product-csv-file]"),
    customersTable: qs("[data-customers-table]"),
    customerCsvFile: qs("[data-customer-csv-file]"),
    usersTable: qs("[data-users-table]"),
    auditKpis: qs("[data-audit-kpis]"),
    auditTable: qs("[data-audit-table]"),
    auditEntityFilter: qs("[data-audit-entity-filter]"),
    auditRangeFilter: qs("[data-audit-range-filter]"),
    inventoryCards: qs("[data-inventory-cards]"),
    stockMovementsTable: qs("[data-stock-movements-table]"),
    accountingKpis: qs("[data-accounting-kpis]"),
    accountingAccounts: qs("[data-accounting-accounts]"),
    accountingReconciliations: qs("[data-accounting-reconciliations]"),
    accountingCategories: qs("[data-accounting-categories]"),
    accountingTransactionsTable: qs("[data-accounting-transactions-table]"),
    accountingReceivables: qs("[data-accounting-receivables]"),
    accountingDebtSummary: qs("[data-accounting-debt-summary]"),
    accountingAccountFilter: qs("[data-accounting-account-filter]"),
    accountingRangeFilter: qs("[data-accounting-range-filter]"),
    purchasingKpis: qs("[data-purchasing-kpis]"),
    purchaseOrdersTable: qs("[data-purchase-orders-table]"),
    suppliersList: qs("[data-suppliers-list]"),
    purchaseAgingSummary: qs("[data-purchase-aging-summary]"),
    purchaseAgingTable: qs("[data-purchase-aging-table]"),
    purchaseStatusFilter: qs("[data-purchase-status-filter]"),
    purchasePaymentFilter: qs("[data-purchase-payment-filter]"),
    reportCards: qs("[data-report-cards]"),
    reportRange: qs("[data-report-range]"),
    reportChannel: qs("[data-report-channel]"),
    reportComparison: qs("[data-report-comparison]"),
    profitChart: qs("[data-profit-chart]"),
    expenseBreakdown: qs("[data-expense-breakdown]"),
    productProfitTable: qs("[data-product-profit-table]"),
    channelProfitTable: qs("[data-channel-profit-table]"),
    exportProfitReport: qs("[data-export-profit-report]"),
    toast: qs("[data-toast]"),
    loadingOverlay: qs("[data-loading-overlay]"),
    loadingText: qs("[data-loading-text]"),
    sharedUi: qs("[data-shared-ui]")
  };

  function injectSharedUi() {
    if (!els.sharedUi) return;
    els.sharedUi.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop hidden>
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal-header">
            <div>
              <p class="eyebrow" data-modal-eyebrow></p>
              <h2 id="modal-title" data-modal-title></h2>
            </div>
            <button class="icon-button" type="button" data-close-modal aria-label="Đóng">×</button>
          </header>
          <form class="form-grid" data-modal-form></form>
        </section>
      </div>
      <button class="menu-scrim" type="button" data-menu-close aria-label="Đóng menu"></button>
      <div class="toast" data-toast hidden></div>
      <div class="loading-overlay" data-loading-overlay hidden>
        <div class="loading-card" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <strong data-loading-text>Đang xử lý...</strong>
        </div>
      </div>
    `;
    els.toast = qs("[data-toast]");
    els.loadingOverlay = qs("[data-loading-overlay]");
    els.loadingText = qs("[data-loading-text]");
    els.modalBackdrop = qs("[data-modal-backdrop]");
    els.modalTitle = qs("[data-modal-title]");
    els.modalEyebrow = qs("[data-modal-eyebrow]");
    els.modalForm = qs("[data-modal-form]");
  }

  function getToken() {
    return localStorage.getItem(tokenKey) || "";
  }

  function setToken(token) {
    if (token) localStorage.setItem(tokenKey, token);
    else localStorage.removeItem(tokenKey);
  }

  function actionForPath(path) {
    return {
      "/auth/bootstrap-status": "bootstrapStatus",
      "/auth/setup-admin": "setupAdmin",
      "/auth/login": "login",
      "/auth/me": "me",
      "/auth/logout": "logout",
      "/users": "listUsers",
      "/users/create": "createUser",
      "/users/toggle": "toggleUser",
      "/users/delete": "deleteUser",
      "/audit-logs": "listAuditLogs",
      "/products": "listProducts",
      "/products/create": "createProduct",
      "/products/update": "updateProduct",
      "/products/archive": "archiveProduct",
      "/products/import": "importProducts",
      "/products/provision-content": "provisionProductContent",
      "/products/test-content-setup": "testProductContentConfiguration",
      "/customers": "listCustomers",
      "/customers/create": "createCustomer",
      "/customers/update": "updateCustomer",
      "/customers/archive": "archiveCustomer",
      "/customers/import": "importCustomers",
      "/orders": "listOrders",
      "/orders/create": "createOrder",
      "/orders/status": "updateOrderStatus",
      "/orders/fulfillment": "updateOrderFulfillment",
      "/orders/cancel": "cancelOrder",
      "/orders/return": "returnOrder",
      "/orders/refund": "refundOrder",
      "/stock-movements": "listStockMovements",
      "/stock/receive": "receiveStock",
      "/stock/adjust": "adjustStock",
      "/page-data": "getPageData",
      "/accounting": "getAccountingData",
      "/accounting/transactions/create": "createCashTransaction",
      "/accounting/transactions/archive": "archiveCashTransaction",
      "/accounting/accounts/create": "createAccountingAccount",
      "/accounting/accounts/update": "updateAccountingAccount",
      "/accounting/accounts/archive": "archiveAccountingAccount",
      "/accounting/reconciliations/create": "createAccountingReconciliation",
      "/accounting/categories/create": "createAccountingCategory",
      "/accounting/categories/update": "updateAccountingCategory",
      "/accounting/categories/archive": "archiveAccountingCategory",
      "/purchasing": "getPurchasingData",
      "/suppliers/create": "createSupplier",
      "/suppliers/update": "updateSupplier",
      "/suppliers/archive": "archiveSupplier",
      "/purchase-orders/create": "createPurchaseOrder",
      "/purchase-orders/update": "updatePurchaseOrder",
      "/purchase-orders/receive": "receivePurchaseOrder",
      "/purchase-orders/pay": "payPurchaseOrder",
      "/purchase-orders/cancel": "cancelPurchaseOrder",
      "/purchase-orders/return": "returnPurchaseOrder",
      "/purchase-orders/apply-credit": "applySupplierCredit"
    }[path] || "";
  }

  async function apiRequest(path, options = {}) {
    if (!config.apiUrl) throw new Error("Chưa cấu hình apiUrl trong assets/js/config.js.");
    const action = actionForPath(path);
    if (!action) throw new Error("Action API không hợp lệ.");

    const payload = options.body ? JSON.parse(options.body) : {};
    const token = getToken();
    if (token) payload.token = token;

    let response;
    try {
      response = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, action })
      });
    } catch {
      throw new Error("Không thể kết nối máy chủ. Hãy kiểm tra mạng hoặc Worker.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Yêu cầu API thất bại.");
    return data;
  }

  function showLoading(message = "Đang xử lý...") {
    if (!els.loadingOverlay) return;
    if (els.loadingText) els.loadingText.textContent = message;
    els.loadingOverlay.hidden = false;
  }

  function hideLoading() {
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
  }

  async function withLoading(message, task) {
    showLoading(message);
    try {
      return await task();
    } finally {
      hideLoading();
    }
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label || "Đang xử lý...";
      button.disabled = true;
      return;
    }
    button.disabled = false;
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
  }

  function showToast(message, type = "default") {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.dataset.type = type;
    els.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 3000);
  }

  function redirectToDashboard() {
    window.location.href = page === "auth" ? "./pages/dashboard.html" : "./dashboard.html";
  }

  function redirectToLogin() {
    window.location.href = `${root}/index.html`;
  }

  function navigateToOrderCreate() {
    window.location.href = "./order-create.html";
  }

  function navigateToPurchaseCreate() {
    window.location.href = "./purchase-create.html";
  }

  function byId(collection, id) {
    return (state[collection] || []).find(item => item.id === id);
  }

  function formatDate(value) {
    if (!value) return "Chưa có";
    return dateFormat.format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
  }

  function formatDateTime(value) {
    if (!value) return "Chưa có";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormat.format(date);
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function localDateValue(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
      .formatToParts(date)
      .reduce((result, part) => { result[part.type] = part.value; return result; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function shiftDateValue(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function isAdmin() {
    return currentUser && currentUser.role === "admin";
  }

  function canManageProducts() {
    return currentUser && ["admin", "inventory"].includes(currentUser.role);
  }

  function canManageInventory() {
    return canManageProducts();
  }

  function canManageCustomers() {
    return currentUser && ["admin", "sales"].includes(currentUser.role);
  }

  function canManageOrders() {
    return currentUser && ["admin", "sales"].includes(currentUser.role);
  }

  function canManageAccounting() {
    return currentUser && currentUser.role === "admin";
  }

  function canManagePurchasing() {
    return currentUser && ["admin", "inventory"].includes(currentUser.role);
  }

  function canPayPurchases() {
    return currentUser && currentUser.role === "admin";
  }

  function roleLabel(role) {
    return { admin: "Admin", sales: "Bán hàng", inventory: "Kho", viewer: "Chỉ xem" }[role] || role;
  }

  function statusLabel(status) {
    return {
      draft: "Nháp",
      pending: "Chờ xử lý",
      confirmed: "Đã xác nhận",
      packed: "Đã đóng gói",
      received: "Đã nhận hàng",
      partial: "Thanh toán một phần",
      shipping: "Đang giao",
      paid: "Đã thanh toán",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
      active: "Đang hoạt động",
      archived: "Ngừng bán",
      disabled: "Đã khóa",
      initial: "Tồn ban đầu",
      receive: "Nhập kho",
      adjustment: "Điều chỉnh",
      product_edit: "Sửa sản phẩm",
      sale: "Bán hàng",
      order_cancel: "Hủy đơn",
      purchase_receive: "Nhận hàng mua",
      purchase_cancel: "Hủy nhập hàng",
      purchase_return: "Trả hàng nhà cung cấp",
      credit: "Dư có nhà cung cấp",
      none: "Chưa giao",
      preparing: "Đang chuẩn bị",
      delivered: "Đã giao",
      returned: "Hoàn hàng",
      unpaid: "Chưa thanh toán",
      refunded: "Đã hoàn tiền"
    }[status] || status;
  }

  function channelLabel(channel) {
    return channels[channel] || channel || "POS";
  }

  function shippingLabel(status) {
    return shippingStatuses[status] || statusLabel(status);
  }

  function paymentLabel(status) {
    return paymentStatuses[status] || statusLabel(status);
  }

  function carrierLabel(carrier) {
    return carriers[carrier] || carrier || "Chưa chọn";
  }

  function accountingTypeLabel(type) {
    return type === "income" ? "Thu" : "Chi";
  }

  function accountTypeLabel(type) {
    return {
      cash: "Tiền mặt",
      bank: "Ngân hàng",
      wallet: "Ví / COD",
      other: "Khác"
    }[type] || type || "Khác";
  }

  function getAccountingAccount(id) {
    return byId("accountingAccounts", id) || { name: "Chưa chọn" };
  }

  function getAccountingCategory(id) {
    return byId("accountingCategories", id) || { name: "Chưa phân loại" };
  }

  function getCustomer(order) {
    return byId("customers", order.customerId) || { name: "Khách lẻ" };
  }

  function getSupplier(order) {
    return byId("suppliers", order.supplierId) || { name: "Nhà cung cấp không xác định", code: "" };
  }

  function purchaseItemSummary(order) {
    const items = order.items || [];
    if (!items.length) return "Chưa có hàng hóa";
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${items[0].name}${items.length > 1 ? ` +${items.length - 1} mặt hàng` : ""} · ${quantity} SP`;
  }

  function returnedPurchaseItemQuantity(itemId) {
    return (state.purchaseReturns || []).reduce((sum, purchaseReturn) => {
      return sum + (purchaseReturn.items || [])
        .filter(item => item.purchaseOrderItemId === itemId)
        .reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
  }

  function canReturnPurchaseOrder(order) {
    return canManagePurchasing() && order.status === "received" && (order.items || []).some(item => item.quantity > returnedPurchaseItemQuantity(item.id));
  }

  function purchaseDueDays(order, today = new Date()) {
    if (!order.dueDate) return null;
    const due = new Date(`${order.dueDate}T00:00:00`);
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!isFinite(due.getTime())) return null;
    return Math.floor((current.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
  }

  function purchaseAgingBucket(order) {
    const days = purchaseDueDays(order);
    if (days === null || days <= 0) return { key: "current", label: "Chưa đến hạn", tone: "active", days };
    if (days <= 30) return { key: "1-30", label: "Quá hạn 1–30 ngày", tone: "pending", days };
    if (days <= 60) return { key: "31-60", label: "Quá hạn 31–60 ngày", tone: "pending", days };
    return { key: "60+", label: "Quá hạn trên 60 ngày", tone: "cancelled", days };
  }

  function isPaid(order) {
    return order.paymentStatus === "paid" || ["paid", "completed"].includes(order.status);
  }

  function orderAgeDays(order) {
    const created = new Date(order.createdAt || Date.now()).getTime();
    if (!isFinite(created)) return 0;
    return Math.max(0, Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000)));
  }

  function collectedForOrder(order) {
    return (state.cashTransactions || [])
      .filter(transaction => {
        return transaction.status !== "deleted"
          && transaction.type === "income"
          && transaction.referenceType === "order"
          && [order.id, order.code].includes(transaction.referenceId);
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  function returnedOrderItemQuantity(itemId) {
    return (state.salesReturns || []).reduce((sum, salesReturn) => {
      return sum + (salesReturn.items || [])
        .filter(item => item.orderItemId === itemId)
        .reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
  }

  function canReturnOrder(order) {
    if (!canManageOrders() || !order || order.status === "cancelled") return false;
    const fulfilled = ["paid", "completed"].includes(order.status) || order.shippingStatus === "delivered" || order.paymentStatus === "paid";
    return fulfilled && (order.items || []).some(item => item.quantity > returnedOrderItemQuantity(item.id));
  }

  function refundableForOrder(order) {
    if (!order) return 0;
    const returnedNotRefunded = Math.max(0, Number(order.returnedAmount || 0) - Number(order.refundedAmount || 0));
    const collectedNotRefunded = Math.max(0, collectedForOrder(order) - Number(order.refundedAmount || 0));
    return Math.min(returnedNotRefunded, collectedNotRefunded);
  }

  function outstandingForOrder(order) {
    if (!order || order.status === "cancelled" || isPaid(order)) return 0;
    return Math.max(0, Number(order.netTotal === undefined ? order.total : order.netTotal) - Math.max(0, collectedForOrder(order) - Number(order.refundedAmount || 0)));
  }

  function orderCost(order) {
    return (order.items || []).reduce((sum, item) => sum + (item.costPrice * Math.max(0, item.quantity - returnedOrderItemQuantity(item.id))), 0);
  }

  function orderItemSummary(order) {
    const items = order.items || [];
    if (!items.length) return "Chưa có sản phẩm";
    const first = items[0];
    const suffix = items.length > 1 ? ` +${items.length - 1} sản phẩm` : "";
    return `${first.name} × ${first.quantity}${suffix}`;
  }

  function canCreateOrder() {
    return canManageOrders() && state.products.some(product => product.status === "active") && state.customers.some(customer => customer.status === "active");
  }

  function canCreatePurchase() {
    return canManagePurchasing()
      && state.products.some(product => product.status === "active")
      && state.suppliers.some(supplier => supplier.status === "active");
  }

  function normalizeProduct(product) {
    return {
      id: product.id,
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      brand: product.brand || "",
      barcode: product.barcode || "",
      unit: product.unit || "cái",
      weightGrams: Number(product.weightGrams || 0),
      dimensions: product.dimensions || "",
      origin: product.origin || "",
      material: product.material || "",
      costPrice: Number(product.costPrice || 0),
      salePrice: Number(product.salePrice || 0),
      stock: Number(product.stock || 0),
      lowStock: Number(product.lowStock || 0),
      imageUrl: product.imageUrl || "",
      shortDescription: product.shortDescription || "",
      keyFeatures: product.keyFeatures || "",
      targetAudience: product.targetAudience || "",
      seoKeywords: product.seoKeywords || "",
      contentStatus: product.contentStatus || "not_started",
      contentOwner: product.contentOwner || "",
      contentNote: product.contentNote || "",
      contentDocUrl: product.contentDocUrl || "",
      mediaFolderUrl: product.mediaFolderUrl || "",
      imageFolderUrl: product.imageFolderUrl || "",
      videoFolderUrl: product.videoFolderUrl || "",
      status: product.status || "active",
      createdAt: product.createdAt || "",
      updatedAt: product.updatedAt || ""
    };
  }

  async function loadProducts(options = {}) {
    try {
      const data = await apiRequest("/products");
      state.products = (data.products || []).map(normalizeProduct);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function normalizeCustomer(customer) {
    return {
      id: customer.id,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      group: customer.group || "Bán lẻ",
      status: customer.status || "active",
      totalSpent: Number(customer.totalSpent || 0),
      lastOrderAt: customer.lastOrderAt || "",
      note: customer.note || "",
      createdAt: customer.createdAt || "",
      updatedAt: customer.updatedAt || ""
    };
  }

  async function loadCustomers(options = {}) {
    try {
      const data = await apiRequest("/customers");
      state.customers = (data.customers || []).map(normalizeCustomer);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function normalizeOrderItem(item) {
    return {
      id: item.id,
      orderId: item.orderId || "",
      productId: item.productId || "",
      sku: item.sku || "",
      name: item.name || "",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      costPrice: Number(item.costPrice || 0),
      lineTotal: Number(item.lineTotal || 0),
      createdAt: item.createdAt || ""
    };
  }

  function normalizeOrder(order) {
    const items = (order.items || []).map(normalizeOrderItem);
    return {
      id: order.id,
      code: order.code || "",
      customerId: order.customerId || "",
      status: order.status || "pending",
      paymentStatus: order.paymentStatus || "unpaid",
      paymentMethod: order.paymentMethod || "cash",
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      shippingFee: Number(order.shippingFee || 0),
      total: Number(order.total || 0),
      returnedAmount: Number(order.returnedAmount || 0),
      refundedAmount: Number(order.refundedAmount || 0),
      netTotal: Number(order.netTotal === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0)) : order.netTotal),
      note: order.note || "",
      createdBy: order.createdBy || "",
      createdAt: order.createdAt || "",
      updatedAt: order.updatedAt || "",
      channel: order.channel || "pos",
      shippingStatus: order.shippingStatus || "none",
      carrier: order.carrier || "",
      trackingCode: order.trackingCode || "",
      productId: items[0] ? items[0].productId : "",
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items
    };
  }

  function normalizeSalesReturn(salesReturn) {
    return {
      id: salesReturn.id,
      code: salesReturn.code || "",
      orderId: salesReturn.orderId || "",
      customerId: salesReturn.customerId || "",
      amount: Number(salesReturn.amount || 0),
      note: salesReturn.note || "",
      createdBy: salesReturn.createdBy || "",
      createdAt: salesReturn.createdAt || "",
      items: (salesReturn.items || []).map(item => ({
        id: item.id,
        returnId: item.returnId || salesReturn.id,
        orderItemId: item.orderItemId || "",
        productId: item.productId || "",
        sku: item.sku || "",
        name: item.name || "",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        costPrice: Number(item.costPrice || 0),
        lineTotal: Number(item.lineTotal || 0),
        createdAt: item.createdAt || ""
      }))
    };
  }

  function normalizeOrderRefund(refund) {
    return {
      id: refund.id,
      orderId: refund.orderId || "",
      salesReturnId: refund.salesReturnId || "",
      cashTransactionId: refund.cashTransactionId || "",
      accountId: refund.accountId || "",
      categoryId: refund.categoryId || "",
      amount: Number(refund.amount || 0),
      refundDate: refund.refundDate || "",
      note: refund.note || "",
      createdBy: refund.createdBy || "",
      createdAt: refund.createdAt || ""
    };
  }

  async function loadOrders(options = {}) {
    try {
      const data = await apiRequest("/orders");
      state.orders = (data.orders || []).map(normalizeOrder);
      state.salesReturns = (data.salesReturns || []).map(normalizeSalesReturn);
      state.orderRefunds = (data.orderRefunds || []).map(normalizeOrderRefund);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function normalizeStockMovement(movement) {
    return {
      id: movement.id,
      productId: movement.productId || "",
      sku: movement.sku || "",
      productName: movement.productName || "",
      type: movement.type || "",
      quantityDelta: Number(movement.quantityDelta || 0),
      stockBefore: Number(movement.stockBefore || 0),
      stockAfter: Number(movement.stockAfter || 0),
      reason: movement.reason || "",
      referenceType: movement.referenceType || "",
      referenceId: movement.referenceId || "",
      createdBy: movement.createdBy || "",
      createdAt: movement.createdAt || ""
    };
  }

  async function loadStockMovements(options = {}) {
    try {
      const data = await apiRequest("/stock-movements");
      state.stockMovements = (data.movements || []).map(normalizeStockMovement);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      state.stockMovements = state.stockMovements || [];
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function normalizeAccountingAccount(account) {
    return {
      id: account.id,
      name: account.name || "",
      type: account.type || "cash",
      openingBalance: Number(account.openingBalance || 0),
      currentBalance: Number(account.currentBalance || 0),
      status: account.status || "active",
      createdAt: account.createdAt || "",
      updatedAt: account.updatedAt || ""
    };
  }

  function normalizeAccountingCategory(category) {
    return {
      id: category.id,
      name: category.name || "",
      type: category.type || "expense",
      status: category.status || "active",
      createdAt: category.createdAt || "",
      updatedAt: category.updatedAt || ""
    };
  }

  function normalizeAccountingReconciliation(reconciliation) {
    return {
      id: reconciliation.id,
      accountId: reconciliation.accountId || "",
      systemBalance: Number(reconciliation.systemBalance || 0),
      actualBalance: Number(reconciliation.actualBalance || 0),
      difference: Number(reconciliation.difference || 0),
      note: reconciliation.note || "",
      reconciledBy: reconciliation.reconciledBy || "",
      reconciledAt: reconciliation.reconciledAt || "",
      createdAt: reconciliation.createdAt || ""
    };
  }

  function normalizeCashTransaction(transaction) {
    return {
      id: transaction.id,
      type: transaction.type || "expense",
      accountId: transaction.accountId || "",
      categoryId: transaction.categoryId || "",
      amount: Number(transaction.amount || 0),
      transactionDate: transaction.transactionDate || "",
      description: transaction.description || "",
      referenceType: transaction.referenceType || "",
      referenceId: transaction.referenceId || "",
      createdBy: transaction.createdBy || "",
      status: transaction.status || "active",
      createdAt: transaction.createdAt || "",
      updatedAt: transaction.updatedAt || ""
    };
  }

  async function loadAccountingData(options = {}) {
    try {
      const data = await apiRequest("/accounting");
      state.accountingAccounts = (data.accounts || []).map(normalizeAccountingAccount);
      state.accountingCategories = (data.categories || []).map(normalizeAccountingCategory);
      state.accountingReconciliations = (data.reconciliations || []).map(normalizeAccountingReconciliation);
      state.cashTransactions = (data.transactions || []).map(normalizeCashTransaction);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      state.accountingAccounts = state.accountingAccounts || [];
      state.accountingCategories = state.accountingCategories || [];
      state.accountingReconciliations = state.accountingReconciliations || [];
      state.cashTransactions = state.cashTransactions || [];
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function normalizeSupplier(supplier) {
    return {
      id: supplier.id,
      code: supplier.code || "",
      name: supplier.name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      taxCode: supplier.taxCode || "",
      address: supplier.address || "",
      status: supplier.status || "active",
      totalPurchased: Number(supplier.totalPurchased || 0),
      outstanding: Number(supplier.outstanding || 0),
      creditBalance: Number(supplier.creditBalance || 0),
      lastPurchaseAt: supplier.lastPurchaseAt || "",
      note: supplier.note || "",
      createdAt: supplier.createdAt || "",
      updatedAt: supplier.updatedAt || ""
    };
  }

  function normalizePurchaseOrder(order) {
    return {
      id: order.id,
      code: order.code || "",
      supplierId: order.supplierId || "",
      status: order.status || "draft",
      paymentStatus: order.paymentStatus || "unpaid",
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      shippingFee: Number(order.shippingFee || 0),
      total: Number(order.total || 0),
      paidAmount: Number(order.paidAmount || 0),
      creditAppliedAmount: Number(order.creditAppliedAmount || 0),
      settledAmount: Number(order.settledAmount === undefined ? Number(order.paidAmount || 0) + Number(order.creditAppliedAmount || 0) : order.settledAmount),
      returnedAmount: Number(order.returnedAmount || 0),
      netTotal: Number(order.netTotal === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0)) : order.netTotal),
      outstanding: Number(order.outstanding === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0) - Number(order.paidAmount || 0) - Number(order.creditAppliedAmount || 0)) : order.outstanding),
      creditAmount: Number(order.creditAmount || 0),
      dueDate: order.dueDate || "",
      invoiceNumber: order.invoiceNumber || "",
      note: order.note || "",
      createdBy: order.createdBy || "",
      receivedAt: order.receivedAt || "",
      createdAt: order.createdAt || "",
      updatedAt: order.updatedAt || "",
      items: (order.items || []).map(item => ({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId || order.id,
        productId: item.productId || "",
        sku: item.sku || "",
        name: item.name || "",
        quantity: Number(item.quantity || 0),
        unitCost: Number(item.unitCost || 0),
        lineTotal: Number(item.lineTotal || 0),
        createdAt: item.createdAt || ""
      }))
    };
  }

  function normalizeSupplierPayment(payment) {
    return {
      id: payment.id,
      purchaseOrderId: payment.purchaseOrderId || "",
      supplierId: payment.supplierId || "",
      cashTransactionId: payment.cashTransactionId || "",
      amount: Number(payment.amount || 0),
      paymentDate: payment.paymentDate || "",
      note: payment.note || "",
      createdBy: payment.createdBy || "",
      createdAt: payment.createdAt || ""
    };
  }

  function normalizePurchaseReturn(purchaseReturn) {
    return {
      id: purchaseReturn.id,
      code: purchaseReturn.code || "",
      purchaseOrderId: purchaseReturn.purchaseOrderId || "",
      supplierId: purchaseReturn.supplierId || "",
      amount: Number(purchaseReturn.amount || 0),
      note: purchaseReturn.note || "",
      createdBy: purchaseReturn.createdBy || "",
      createdAt: purchaseReturn.createdAt || "",
      items: (purchaseReturn.items || []).map(item => ({
        id: item.id,
        returnId: item.returnId || purchaseReturn.id,
        purchaseOrderItemId: item.purchaseOrderItemId || "",
        productId: item.productId || "",
        sku: item.sku || "",
        name: item.name || "",
        quantity: Number(item.quantity || 0),
        unitCost: Number(item.unitCost || 0),
        lineTotal: Number(item.lineTotal || 0),
        createdAt: item.createdAt || ""
      }))
    };
  }

  function normalizeSupplierCreditApplication(application) {
    return {
      id: application.id,
      supplierId: application.supplierId || "",
      purchaseOrderId: application.purchaseOrderId || "",
      amount: Number(application.amount || 0),
      note: application.note || "",
      createdBy: application.createdBy || "",
      createdAt: application.createdAt || ""
    };
  }

  async function loadPurchasingData(options = {}) {
    try {
      const data = await apiRequest("/purchasing");
      state.suppliers = (data.suppliers || []).map(normalizeSupplier);
      state.purchaseOrders = (data.purchaseOrders || []).map(normalizePurchaseOrder);
      state.supplierPayments = (data.supplierPayments || []).map(normalizeSupplierPayment);
      state.purchaseReturns = (data.purchaseReturns || []).map(normalizePurchaseReturn);
      state.supplierCreditApplications = (data.supplierCreditApplications || []).map(normalizeSupplierCreditApplication);
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      state.suppliers = state.suppliers || [];
      state.purchaseOrders = state.purchaseOrders || [];
      state.supplierPayments = state.supplierPayments || [];
      state.purchaseReturns = state.purchaseReturns || [];
      state.supplierCreditApplications = state.supplierCreditApplications || [];
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function dataScopesForPage() {
    const scopesByPage = {
      dashboard: ["products", "customers", "orders", "accounting"],
      orders: ["customers", "orders", "accounting"],
      orderCreate: ["products", "customers"],
      products: ["products"],
      customers: ["customers"],
      inventory: ["products", "stockMovements"],
      accounting: ["customers", "orders", "accounting"],
      purchasing: ["purchasing"],
      purchaseCreate: ["products", "purchasing"],
      reports: ["products", "customers", "orders", "accounting"],
      users: [],
      activity: []
    };
    const scopes = [...(scopesByPage[page] || [])];
    if (page === "purchasing" && canPayPurchases()) scopes.push("accounting");
    return [...new Set(scopes)];
  }

  function applyPageData(data, scopes) {
    if (scopes.includes("products")) state.products = (data.products || []).map(normalizeProduct);
    if (scopes.includes("customers")) state.customers = (data.customers || []).map(normalizeCustomer);
    if (scopes.includes("orders")) {
      state.orders = (data.orders || []).map(normalizeOrder);
      state.salesReturns = (data.salesReturns || []).map(normalizeSalesReturn);
      state.orderRefunds = (data.orderRefunds || []).map(normalizeOrderRefund);
    }
    if (scopes.includes("stockMovements")) state.stockMovements = (data.movements || []).map(normalizeStockMovement);
    if (scopes.includes("accounting")) {
      state.accountingAccounts = (data.accounts || []).map(normalizeAccountingAccount);
      state.accountingCategories = (data.categories || []).map(normalizeAccountingCategory);
      state.accountingReconciliations = (data.reconciliations || []).map(normalizeAccountingReconciliation);
      state.cashTransactions = (data.transactions || []).map(normalizeCashTransaction);
    }
    if (scopes.includes("purchasing")) {
      state.suppliers = (data.suppliers || []).map(normalizeSupplier);
      state.purchaseOrders = (data.purchaseOrders || []).map(normalizePurchaseOrder);
      state.supplierPayments = (data.supplierPayments || []).map(normalizeSupplierPayment);
      state.purchaseReturns = (data.purchaseReturns || []).map(normalizePurchaseReturn);
      state.supplierCreditApplications = (data.supplierCreditApplications || []).map(normalizeSupplierCreditApplication);
    }
    window.ArtFlowPosStore.save(state);
  }

  async function loadPageData(scopes, options = {}) {
    if (!scopes.length) return true;
    try {
      const data = await apiRequest("/page-data", {
        method: "POST",
        body: JSON.stringify({ scopes })
      });
      applyPageData(data, scopes);
      pageDataReady = true;
      return true;
    } catch (error) {
      if (String(error.message || "").toLowerCase().includes("unknown action")) {
        const legacyLoaders = {
          products: loadProducts,
          customers: loadCustomers,
          orders: loadOrders,
          stockMovements: loadStockMovements,
          accounting: loadAccountingData,
          purchasing: loadPurchasingData
        };
        await Promise.all(scopes.map(scope => legacyLoaders[scope]({ quiet: true })));
        pageDataReady = true;
        return true;
      }
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
  }

  function filtered(items, fields) {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => fields.some(field => String(item[field] || "").toLowerCase().includes(term)));
  }

  function renderApiMissing(message) {
    if (!els.loginForm) return;
    els.loginForm.innerHTML = `
      <div>
        <p class="eyebrow">Cần cấu hình backend</p>
        <h2>Backend chưa sẵn sàng</h2>
        <p class="form-note">${message || "Hãy chạy Cloudflare Worker và điền Worker URL vào assets/js/config.js."}</p>
      </div>
    `;
  }

  function renderAuthForm(mode) {
    if (!els.loginForm) return;
    const setup = mode === "setup";
    els.loginForm.dataset.mode = mode;
    els.loginForm.innerHTML = `
      <div>
        <p class="eyebrow">${setup ? "Thiết lập lần đầu" : "Quyền truy cập nội bộ"}</p>
        <h2>${setup ? "Khởi tạo quản trị viên" : "Đăng nhập"}</h2>
        <p class="form-note">${setup ? "Tạo tài khoản admin đầu tiên trong Google Sheet." : "Tài khoản do admin cấp, không có đăng ký công khai."}</p>
      </div>
      ${setup ? `
        <label class="field">
          <span>Tên quản trị viên</span>
          <input type="text" name="name" autocomplete="name" placeholder="Tên của bạn" required />
        </label>
      ` : ""}
      <label class="field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="username" placeholder="name@artflow.vn" required />
      </label>
      <label class="field">
        <span>Mật khẩu</span>
        <input type="password" name="password" autocomplete="${setup ? "new-password" : "current-password"}" placeholder="${setup ? "Tạo mật khẩu" : "Nhập mật khẩu"}" minlength="${setup ? "8" : "1"}" required />
      </label>
      <p class="form-error" data-login-error hidden></p>
      <button class="button primary" type="submit">${setup ? "Tạo tài khoản admin" : "Đăng nhập"}</button>
    `;
  }

  async function submitAuth(form) {
    const mode = form.dataset.mode || "login";
    const payload = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button[type='submit']");
    const errorBox = form.querySelector("[data-login-error]");
    if (errorBox) errorBox.hidden = true;

    setBusy(button, true, mode === "setup" ? "Đang tạo..." : "Đang đăng nhập...");
    try {
      const path = mode === "setup" ? "/auth/setup-admin" : "/auth/login";
      const data = await withLoading(mode === "setup" ? "Đang khởi tạo admin..." : "Đang đăng nhập...", () => apiRequest(path, {
        method: "POST",
        body: JSON.stringify(payload)
      }));
      setToken(data.token);
      redirectToDashboard();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } else {
        showToast(error.message, "error");
      }
    } finally {
      setBusy(button, false);
    }
  }

  function renderNav() {
    if (!els.navList) return;
    els.navList.innerHTML = Object.entries(pages).map(([key, item]) => {
      if (item.hidden) return "";
      if (item.adminOnly && !isAdmin()) return "";
      return `
        <a class="nav-link ${key === page ? "active" : ""}" href="${item.href}" data-nav-page="${key}" ${key === page ? "aria-current=\"page\"" : ""}>
          <span class="nav-icon">${item.icon}</span>
          <span>${item.title}</span>
        </a>
      `;
    }).join("");
  }

  function applyPermissions() {
    document.querySelectorAll("[data-open-product]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-test-product-content]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-import-products]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-open-customer]").forEach(button => {
      button.hidden = !canManageCustomers();
    });
    document.querySelectorAll("[data-import-customers]").forEach(button => {
      button.hidden = !canManageCustomers();
    });
    document.querySelectorAll("[data-open-order]").forEach(button => {
      button.hidden = !canManageOrders();
    });
    document.querySelectorAll("[data-open-stock-receive], [data-open-stock-adjust]").forEach(button => {
      button.hidden = !canManageInventory();
    });
    document.querySelectorAll("[data-open-cash-transaction], [data-open-accounting-account], [data-open-accounting-category], [data-open-accounting-reconciliation]").forEach(button => {
      button.hidden = !canManageAccounting();
    });
    document.querySelectorAll("[data-open-supplier], [data-open-purchase], [data-receive-purchase], [data-return-purchase], [data-cancel-purchase]").forEach(button => {
      button.hidden = !canManagePurchasing();
    });
    document.querySelectorAll("[data-pay-purchase]").forEach(button => {
      button.hidden = !canPayPurchases();
    });
  }

  async function loadStaffUsers() {
    if (!isAdmin()) return;
    const data = await apiRequest("/users");
    staffUsers = data.users || [];
  }

  function normalizeAuditLog(log) {
    return {
      id: log.id,
      action: log.action || "",
      description: log.description || log.action || "Hoạt động hệ thống",
      entityType: log.entityType || "",
      entityId: log.entityId || "",
      actorId: log.actorId || "",
      actorName: log.actorName || "System",
      actorEmail: log.actorEmail || "",
      detail: log.detail && typeof log.detail === "object" ? log.detail : {},
      createdAt: log.createdAt || "",
      timezone: log.timezone || "Asia/Ho_Chi_Minh"
    };
  }

  async function loadAuditLogs() {
    if (!isAdmin()) return;
    const data = await apiRequest("/audit-logs", { method: "POST", body: JSON.stringify({ limit: 1000 }) });
    auditLogs = (data.logs || []).map(normalizeAuditLog);
  }

  async function showApp(user) {
    currentUser = user;
    if (["users", "activity"].includes(page) && !isAdmin()) {
      window.location.href = "./dashboard.html";
      return;
    }
    if (page === "purchaseCreate" && !canManagePurchasing()) {
      window.location.href = "./purchasing.html";
      return;
    }

    if (els.authScreen) els.authScreen.hidden = true;
    if (els.appShell) els.appShell.hidden = false;
    if (els.title && pages[page]) els.title.textContent = pages[page].title;
    if (els.currentUser) els.currentUser.innerHTML = `<strong>${user.name}</strong><span>${roleLabel(user.role)}</span>`;
    renderNav();
    applyPermissions();
    renderPage();

    await loadPageData(dataScopesForPage());
    if (page === "users") await withLoading("Đang tải danh sách nhân viên...", loadStaffUsers);
    if (page === "activity") await withLoading("Đang tải lịch sử hoạt động...", loadAuditLogs);
    renderPage();
  }

  async function bootstrapAuthPage() {
    if (!config.apiUrl) {
      renderApiMissing();
      return;
    }
    try {
      if (getToken()) {
        await withLoading("Đang kiểm tra phiên đăng nhập...", () => apiRequest("/auth/me"));
        redirectToDashboard();
        return;
      }
      const status = await withLoading("Đang kiểm tra thiết lập hệ thống...", () => apiRequest("/auth/bootstrap-status"));
      renderAuthForm(status.hasAdmin ? "login" : "setup");
      const email = els.loginForm && els.loginForm.email;
      if (email) email.focus();
    } catch (error) {
      setToken("");
      renderApiMissing(error.message);
    }
  }

  async function bootstrapAppPage() {
    if (!config.apiUrl || !getToken()) {
      redirectToLogin();
      return;
    }
    try {
      const session = await withLoading("Đang tải không gian làm việc...", () => apiRequest("/auth/me"));
      await showApp(session.user);
    } catch (error) {
      setToken("");
      redirectToLogin();
    }
  }

  async function logout() {
    await withLoading("Đang đăng xuất...", async () => {
      try {
        await apiRequest("/auth/logout", { method: "POST", body: JSON.stringify({}) });
      } catch {
        // Vẫn xóa token local nếu mạng hoặc backend tạm lỗi.
      }
      setToken("");
    });
    redirectToLogin();
  }

  function reportDayKey(value) {
    const raw = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return localDateValue(date);
  }

  function reportPeriod(range, previous = false) {
    if (range === "all") return null;
    const days = Number(range || 30);
    const end = shiftDateValue(localDateValue(), previous ? -days : 0);
    return { start: shiftDateValue(end, -days + 1), end: shiftDateValue(end, 1), days: days };
  }

  function inReportPeriod(value, period) {
    if (!period) return true;
    const day = reportDayKey(value);
    return day >= period.start && day < period.end;
  }

  function operatingTransactions(period) {
    return state.cashTransactions.filter(transaction => {
      return transaction.status !== "deleted" &&
        transaction.type === "expense" &&
        transaction.referenceType !== "purchase_order" &&
        transaction.referenceType !== "order_refund" &&
        inReportPeriod(transaction.transactionDate || transaction.createdAt, period);
    });
  }

  function profitSnapshot(range = "all", channel = "all", previous = false) {
    const period = reportPeriod(range, previous);
    const allOrders = state.orders.filter(order => order.status !== "cancelled" && isPaid(order) && inReportPeriod(order.createdAt, period));
    const orders = allOrders.filter(order => channel === "all" || order.channel === channel);
    const revenue = orders.reduce((sum, order) => sum + order.netTotal, 0);
    const cost = orders.reduce((sum, order) => sum + orderCost(order), 0);
    const grossProfit = revenue - cost;
    const transactions = operatingTransactions(period);
    const totalExpenses = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const allRevenue = allOrders.reduce((sum, order) => sum + order.netTotal, 0);
    const expenseRatio = channel === "all" ? 1 : (allRevenue > 0 ? revenue / allRevenue : 0);
    const operatingExpenses = totalExpenses * expenseRatio;
    return {
      period,
      orders,
      revenue,
      cost,
      grossProfit,
      grossMargin: revenue > 0 ? grossProfit / revenue : 0,
      operatingExpenses,
      netProfit: grossProfit - operatingExpenses,
      transactions,
      expenseRatio
    };
  }

  function comparisonText(current, previous, metric, label) {
    const value = current[metric];
    const oldValue = previous[metric];
    if (!oldValue) return `${label}: chưa có dữ liệu kỳ trước`;
    const change = ((value - oldValue) / Math.abs(oldValue)) * 100;
    return `${label}: ${change >= 0 ? "+" : ""}${change.toFixed(1)}% so với kỳ trước`;
  }

  function csvCell(value) {
    const text = String(value === undefined || value === null ? "" : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function requireXlsx() {
    if (!window.XLSX) throw new Error("Không thể tải bộ xử lý Excel. Hãy tải lại trang và thử lại.");
    return window.XLSX;
  }

  function createExcelSheet(title, subtitle, headers, rows, options = {}) {
    const XLSX = requireXlsx();
    const values = [[title], [subtitle], [], headers, ...rows];
    const sheet = XLSX.utils.aoa_to_sheet(values);
    const lastColumn = Math.max(0, headers.length - 1);
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } }];
    sheet["!autofilter"] = { ref: `A4:${XLSX.utils.encode_col(lastColumn)}${Math.max(4, rows.length + 4)}` };
    sheet["!cols"] = (options.widths || headers.map(() => 18)).map(width => ({ wch: width }));
    sheet["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 24 }];

    const border = { top: { style: "thin", color: { rgb: "D8E1EC" } }, bottom: { style: "thin", color: { rgb: "D8E1EC" } }, left: { style: "thin", color: { rgb: "D8E1EC" } }, right: { style: "thin", color: { rgb: "D8E1EC" } } };
    const titleCell = sheet.A1;
    titleCell.s = { fill: { fgColor: { rgb: "102033" } }, font: { color: { rgb: "FFFFFF" }, bold: true, sz: 16 }, alignment: { vertical: "center" } };
    sheet.A2.s = { font: { color: { rgb: "5B6B7F" }, italic: true, sz: 10 } };
    headers.forEach((header, column) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: 3, c: column })];
      cell.s = { fill: { fgColor: { rgb: "1677FF" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { vertical: "center", wrapText: true }, border };
    });
    rows.forEach((row, rowIndex) => {
      row.forEach((value, column) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 4, c: column })];
        if (!cell) return;
        cell.s = {
          fill: { fgColor: { rgb: rowIndex % 2 ? "F5F8FC" : "FFFFFF" } },
          font: { color: { rgb: "102033" } },
          alignment: { vertical: "center", wrapText: column === (options.wrapColumn ?? -1) },
          border
        };
        if ((options.moneyColumns || []).includes(column)) cell.z = '#,##0 "₫"';
        if ((options.numberColumns || []).includes(column)) cell.z = "#,##0";
        if ((options.percentColumns || []).includes(column)) cell.z = "0.00%";
        if ((options.textColumns || []).includes(column)) cell.z = "@";
      });
    });
    return sheet;
  }

  function createInstructionSheet(title, lines) {
    const XLSX = requireXlsx();
    const rows = [[title, ""], ["Quy tắc", "Chi tiết"], ...lines];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    sheet["!cols"] = [{ wch: 24 }, { wch: 82 }];
    sheet["!rows"] = [{ hpt: 30 }, { hpt: 24 }];
    sheet.A1.s = { fill: { fgColor: { rgb: "102033" } }, font: { color: { rgb: "FFFFFF" }, bold: true, sz: 16 } };
    [sheet.A2, sheet.B2].forEach(cell => { cell.s = { fill: { fgColor: { rgb: "16A36A" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { wrapText: true } }; });
    for (let row = 2; row < rows.length; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        cell.s = { fill: { fgColor: { rgb: row % 2 ? "F5F8FC" : "FFFFFF" } }, alignment: { vertical: "top", wrapText: true }, font: { color: { rgb: "102033" } } };
      }
      sheet["!rows"][row] = { hpt: 34 };
    }
    return sheet;
  }

  function saveExcelWorkbook(workbook, filename) {
    requireXlsx().writeFile(workbook, filename, { compression: true });
  }

  function downloadProductTemplate() {
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createInstructionSheet("HƯỚNG DẪN NHẬP SẢN PHẨM", [
      ["Cách dùng", "Điền dữ liệu tại sheet Sản phẩm, giữ nguyên tên cột ở dòng 4, sau đó bấm Nhập Excel trong ArtFlow."],
      ["SKU", "Bắt buộc, duy nhất. SKU đã tồn tại sẽ được cập nhật; SKU mới sẽ tạo sản phẩm mới."],
      ["Giá", "cost_price và sale_price là số không âm; sale_price không được thấp hơn cost_price."],
      ["Tồn kho", "stock và low_stock là số không âm. Thay đổi stock khi nhập sẽ được ghi lịch sử kho."],
      ["Trạng thái", "Chỉ dùng active hoặc archived. Để trống sẽ mặc định active."],
      ["Giới hạn", "Tối đa 500 dòng và 5 MB mỗi lần nhập. Không xóa sheet hoặc đổi tên cột." ]
    ]), "Hướng dẫn");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("MẪU NHẬP SẢN PHẨM", "Xóa dòng ví dụ trước khi nhập dữ liệu thật. Các cột content có thể để trống.", ["sku", "name", "category", "brand", "barcode", "unit", "weight_grams", "dimensions", "origin", "material", "cost_price", "sale_price", "stock", "low_stock", "image_url", "short_description", "key_features", "target_audience", "seo_keywords", "content_status", "content_owner", "content_note", "status"], [
      ["AF-001", "Sổ vẽ A5", "Sổ & giấy", "ArtFlow", "893000000001", "quyển", 350, "21 x 15 x 2 cm", "Việt Nam", "Giấy mỹ thuật", 45000, 79000, 20, 5, "https://example.com/af-001.jpg", "Sổ vẽ giấy dày cho màu chì và marker.", "Giấy dày 180gsm\nGáy mở phẳng", "Người học vẽ và sinh viên", "sổ vẽ a5, sketchbook", "drafting", "content@artflow.vn", "Cần chụp thêm ảnh cận giấy", "active"],
      ["AF-002", "Bộ màu 12 cây", "Màu vẽ", "ArtFlow", "", "bộ", 220, "18 x 9 x 2 cm", "", "", 80000, 135000, 10, 3, "", "", "", "", "", "not_started", "", "", "active"]
    ], { widths: [16, 30, 20, 18, 18, 12, 14, 18, 16, 20, 16, 16, 12, 14, 34, 38, 38, 28, 30, 18, 24, 36, 14], moneyColumns: [10, 11], numberColumns: [6, 12, 13], textColumns: [0, 4], wrapColumn: 15 }), "Sản phẩm");
    saveExcelWorkbook(workbook, "artflow-mau-nhap-san-pham.xlsx");
  }

  function downloadCustomerTemplate() {
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createInstructionSheet("HƯỚNG DẪN NHẬP KHÁCH HÀNG", [
      ["Cách dùng", "Điền dữ liệu tại sheet Khách hàng, giữ nguyên tên cột ở dòng 4, sau đó bấm Nhập Excel trong ArtFlow."],
      ["Số điện thoại", "Bắt buộc, duy nhất và nên nhập dạng văn bản để giữ số 0 đầu. Số đã tồn tại sẽ được cập nhật."],
      ["Email", "Không bắt buộc nhưng nếu có phải chứa @ và không được trùng khách khác."],
      ["Nhóm", "Không bắt buộc; để trống sẽ dùng Bán lẻ."],
      ["Trạng thái", "Chỉ dùng active hoặc archived. Để trống sẽ mặc định active."],
      ["Dữ liệu lịch sử", "Doanh số và lần mua cuối không nhập từ file; hệ thống luôn giữ dữ liệu giao dịch hiện có."],
      ["Giới hạn", "Tối đa 500 dòng và 5 MB mỗi lần nhập. Không xóa sheet hoặc đổi tên cột."]
    ]), "Hướng dẫn");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("MẪU NHẬP KHÁCH HÀNG", "Xóa dòng ví dụ trước khi nhập dữ liệu thật.", ["name", "phone", "email", "group", "status", "note"], [
      ["Nguyễn An", "0901234567", "an@example.com", "VIP", "active", "Ưu tiên liên hệ buổi sáng"],
      ["Trần Bình", "0912345678", "", "Bán lẻ", "active", ""]
    ], { widths: [28, 18, 28, 18, 14, 42], textColumns: [1], wrapColumn: 5 }), "Khách hàng");
    saveExcelWorkbook(workbook, "artflow-mau-nhap-khach-hang.xlsx");
  }

  async function spreadsheetFileToCsv(file, preferredSheetName) {
    if (/\.csv$/i.test(file.name)) return file.text();
    const XLSX = requireXlsx();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const preferred = workbook.SheetNames.find(name => name.toLowerCase() === preferredSheetName.toLowerCase());
    const sheetName = preferred || workbook.SheetNames.find(name => name.toLowerCase() !== "hướng dẫn" && name.toLowerCase() !== "huong dan");
    if (!sheetName) throw new Error(`Không tìm thấy sheet ${preferredSheetName} trong file Excel.`);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "", blankrows: false });
    return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  }

  function exportProductsCsv() {
    const products = filtered(state.products.filter(product => product.status !== "deleted"), ["sku", "name", "category"])
      .slice()
      .sort((a, b) => a.sku.localeCompare(b.sku));
    const rows = products.map(product => [
      product.sku,
      product.name,
      product.category,
      product.brand,
      product.barcode,
      product.unit,
      product.costPrice,
      product.salePrice,
      product.stock,
      product.lowStock,
      productContentStatuses[product.contentStatus],
      product.contentOwner,
      product.shortDescription,
      product.seoKeywords,
      product.contentDocUrl,
      product.mediaFolderUrl,
      formatDateTime(product.createdAt),
      formatDateTime(product.updatedAt),
      product.status === "archived" ? "Ngừng bán" : "Đang bán"
    ]);
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("DANH MỤC SẢN PHẨM", `Xuất lúc ${formatDateTime(new Date().toISOString())} · ${products.length} sản phẩm`, ["SKU", "Tên sản phẩm", "Danh mục", "Thương hiệu", "Barcode", "Đơn vị", "Giá vốn", "Giá bán", "Tồn kho", "Ngưỡng thấp", "Trạng thái content", "Người phụ trách", "Mô tả ngắn", "Từ khóa", "Google Docs", "Folder media", "Ngày tạo", "Cập nhật lần cuối", "Trạng thái bán"], rows, { widths: [16, 32, 22, 18, 18, 12, 18, 18, 14, 16, 20, 24, 40, 32, 38, 38, 22, 22, 16], moneyColumns: [6, 7], numberColumns: [8, 9], textColumns: [0, 4], wrapColumn: 12 }), "Sản phẩm");
    saveExcelWorkbook(workbook, `artflow-san-pham-${reportDayKey(new Date())}.xlsx`);
    showToast(`Đã xuất ${products.length} sản phẩm.`);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          value += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value.replace(/\r$/, ""));
        if (row.some(cell => cell !== "")) rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }
    if (quoted) throw new Error("File CSV có ô chưa đóng dấu ngoặc kép.");
    row.push(value.replace(/\r$/, ""));
    if (row.some(cell => cell !== "")) rows.push(row);
    return rows;
  }

  function productRowsFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("File chưa có dữ liệu sản phẩm.");
    const aliases = {
      sku: "sku", name: "name", category: "category",
      brand: "brand", barcode: "barcode", unit: "unit",
      weight_grams: "weightGrams", weightgrams: "weightGrams", dimensions: "dimensions", origin: "origin", material: "material",
      cost_price: "costPrice", costprice: "costPrice",
      sale_price: "salePrice", saleprice: "salePrice",
      stock: "stock", low_stock: "lowStock", lowstock: "lowStock",
      image_url: "imageUrl", imageurl: "imageUrl", short_description: "shortDescription", shortdescription: "shortDescription",
      key_features: "keyFeatures", keyfeatures: "keyFeatures", target_audience: "targetAudience", targetaudience: "targetAudience",
      seo_keywords: "seoKeywords", seokeywords: "seoKeywords", content_status: "contentStatus", contentstatus: "contentStatus",
      content_owner: "contentOwner", contentowner: "contentOwner", content_note: "contentNote", contentnote: "contentNote", status: "status"
    };
    const headerIndex = rows.findIndex(row => row.some(cell => String(cell || "").replace(/^\uFEFF/, "").trim().toLowerCase() === "sku"));
    if (headerIndex === -1) throw new Error("Không tìm thấy dòng tiêu đề có cột sku.");
    const headers = rows[headerIndex].map(header => aliases[String(header || "").replace(/^\uFEFF/, "").trim().toLowerCase()] || "");
    const required = ["sku", "name", "category", "costPrice", "salePrice", "stock", "lowStock"];
    const missing = required.filter(field => !headers.includes(field));
    if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}.`);
    const dataRows = rows.slice(headerIndex + 1).filter(row => row.some(cell => String(cell || "").trim() !== ""));
    if (dataRows.length > 500) throw new Error("Mỗi lần chỉ nhập tối đa 500 sản phẩm.");

    return dataRows.map((cells, rowIndex) => {
      const product = {};
      headers.forEach((header, index) => { if (header) product[header] = String(cells[index] || "").trim(); });
      ["costPrice", "salePrice", "stock", "lowStock", "weightGrams"].forEach(field => { product[field] = Number(product[field] || 0); });
      product.contentStatus = productContentStatuses[product.contentStatus] ? product.contentStatus : "not_started";
      product.status = product.status === "archived" ? "archived" : "active";
      if (!product.sku || !product.name || !product.category || [product.costPrice, product.salePrice, product.stock, product.lowStock].some(value => !Number.isFinite(value) || value < 0)) {
        throw new Error(`Dòng ${headerIndex + rowIndex + 2} có dữ liệu không hợp lệ.`);
      }
      if (product.salePrice < product.costPrice) throw new Error(`Dòng ${headerIndex + rowIndex + 2}: giá bán thấp hơn giá vốn.`);
      return product;
    });
  }

  async function importProductsCsv(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error("File nhập không được vượt quá 5 MB.");
    const products = productRowsFromCsv(await spreadsheetFileToCsv(file, "Sản phẩm"));
    if (!window.confirm(`Nhập ${products.length} sản phẩm? SKU đã tồn tại sẽ được cập nhật.`)) return;
    const result = await apiRequest("/products/import", {
      method: "POST",
      body: JSON.stringify({ products })
    });
    await loadProducts({ quiet: true });
    renderPage();
    closeModal();
    showToast(`Đã tạo ${result.created || 0}, cập nhật ${result.updated || 0} sản phẩm.`);
  }

  function exportCustomersCsv() {
    const customers = filtered(state.customers.filter(customer => customer.status !== "deleted"), ["name", "phone", "email", "group"])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const rows = customers.map(customer => [
      customer.name,
      customer.phone,
      customer.email,
      customer.group,
      customer.status === "archived" ? "Ngừng theo dõi" : "Đang theo dõi",
      customer.note,
      customer.totalSpent,
      customer.lastOrderAt ? formatDate(customer.lastOrderAt) : ""
    ]);
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("DANH SÁCH KHÁCH HÀNG", `Xuất lúc ${new Date().toLocaleString("vi-VN")} · ${customers.length} khách hàng`, ["Khách hàng", "Điện thoại", "Email", "Nhóm", "Trạng thái", "Ghi chú", "Đã mua", "Lần cuối"], rows, { widths: [28, 18, 28, 18, 18, 38, 18, 16], moneyColumns: [6], textColumns: [1], wrapColumn: 5 }), "Khách hàng");
    saveExcelWorkbook(workbook, `artflow-khach-hang-${reportDayKey(new Date())}.xlsx`);
    showToast(`Đã xuất ${customers.length} khách hàng.`);
  }

  function customerRowsFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("File chưa có dữ liệu khách hàng.");
    const aliases = {
      name: "name", phone: "phone", email: "email", group: "group",
      customer_group: "group", status: "status", note: "note"
    };
    const headerIndex = rows.findIndex(row => row.some(cell => String(cell || "").replace(/^\uFEFF/, "").trim().toLowerCase() === "phone"));
    if (headerIndex === -1) throw new Error("Không tìm thấy dòng tiêu đề có cột phone.");
    const headers = rows[headerIndex].map(header => aliases[String(header || "").replace(/^\uFEFF/, "").trim().toLowerCase()] || "");
    const missing = ["name", "phone"].filter(field => !headers.includes(field));
    if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}.`);
    const dataRows = rows.slice(headerIndex + 1).filter(row => row.some(cell => String(cell || "").trim() !== ""));
    if (dataRows.length > 500) throw new Error("Mỗi lần chỉ nhập tối đa 500 khách hàng.");

    return dataRows.map((cells, rowIndex) => {
      const customer = {};
      headers.forEach((header, index) => { if (header) customer[header] = String(cells[index] || "").trim(); });
      customer.phone = String(customer.phone || "").replace(/\s+/g, "");
      customer.email = String(customer.email || "").toLowerCase();
      customer.group = customer.group || "Bán lẻ";
      customer.note = customer.note || "";
      customer.status = customer.status === "archived" ? "archived" : "active";
      if (!customer.name || !customer.phone) throw new Error(`Dòng ${headerIndex + rowIndex + 2} thiếu tên hoặc số điện thoại.`);
      if (customer.email && !customer.email.includes("@")) throw new Error(`Dòng ${headerIndex + rowIndex + 2} có email không hợp lệ.`);
      return customer;
    });
  }

  async function importCustomersCsv(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error("File nhập không được vượt quá 5 MB.");
    const customers = customerRowsFromCsv(await spreadsheetFileToCsv(file, "Khách hàng"));
    if (!window.confirm(`Nhập ${customers.length} khách hàng? Số điện thoại đã tồn tại sẽ được cập nhật.`)) return;
    const result = await apiRequest("/customers/import", {
      method: "POST",
      body: JSON.stringify({ customers })
    });
    await loadCustomers({ quiet: true });
    renderPage();
    closeModal();
    showToast(`Đã tạo ${result.created || 0}, cập nhật ${result.updated || 0} khách hàng.`);
  }

  function exportProfitReport() {
    const snapshot = profitSnapshot(reportFilters.range, reportFilters.channel);
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    const filterText = `${reportFilters.range === "all" ? "Toàn bộ thời gian" : `${reportFilters.range} ngày`} · ${reportFilters.channel === "all" ? "Tất cả kênh" : channelLabel(reportFilters.channel)}`;
    const summaryRows = [
      ["Bộ lọc", filterText, ""],
      ["Doanh thu thuần", snapshot.revenue, "Đã trừ hàng khách trả"],
      ["Giá vốn thực", snapshot.cost, "Đã trừ giá vốn hàng trả"],
      ["Lãi gộp", snapshot.grossProfit, "Doanh thu thuần - Giá vốn"],
      ["Biên lãi gộp", snapshot.grossMargin, "Lãi gộp / Doanh thu thuần"],
      ["Chi phí vận hành", Math.round(snapshot.operatingExpenses), "Không gồm nhập hàng và hoàn tiền"],
      ["Lãi ròng", Math.round(snapshot.netProfit), "Lãi gộp - Chi phí vận hành"]
    ];
    const summarySheet = createExcelSheet("BÁO CÁO LỢI NHUẬN", `ArtFlow POS · Xuất lúc ${new Date().toLocaleString("vi-VN")}`, ["Chỉ tiêu", "Giá trị", "Ghi chú"], summaryRows, { widths: [24, 24, 48], wrapColumn: 2 });
    [1, 2, 3, 5, 6].forEach(rowIndex => { const cell = summarySheet[XLSX.utils.encode_cell({ r: rowIndex + 4, c: 1 })]; if (cell) cell.z = '#,##0 "₫"'; });
    const marginCell = summarySheet[XLSX.utils.encode_cell({ r: 8, c: 1 })];
    if (marginCell) marginCell.z = "0.00%";
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng quan");

    const orderRows = snapshot.orders
      .slice()
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map(order => {
        const cost = orderCost(order);
        const profit = order.netTotal - cost;
        return [
          order.code,
          reportDayKey(order.createdAt),
          channelLabel(order.channel),
          order.netTotal,
          cost,
          profit,
          order.netTotal > 0 ? profit / order.netTotal : 0
        ];
      });
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CHI TIẾT LỢI NHUẬN THEO ĐƠN", filterText, ["Mã đơn", "Ngày", "Kênh", "Doanh thu thuần", "Giá vốn", "Lãi gộp", "Biên lãi"], orderRows, { widths: [20, 14, 18, 20, 18, 18, 14], moneyColumns: [3, 4, 5], percentColumns: [6] }), "Theo đơn");

    const productMap = {};
    snapshot.orders.forEach(order => {
      const remaining = (order.items || []).map(item => ({ item, quantity: Math.max(0, item.quantity - returnedOrderItemQuantity(item.id)) })).filter(entry => entry.quantity > 0);
      const lineRevenue = remaining.reduce((sum, entry) => sum + entry.quantity * entry.item.unitPrice, 0);
      remaining.forEach(entry => {
        const row = productMap[entry.item.productId] || { sku: entry.item.sku, name: entry.item.name, quantity: 0, revenue: 0, cost: 0 };
        row.quantity += entry.quantity;
        row.revenue += lineRevenue > 0 ? entry.quantity * entry.item.unitPrice * order.netTotal / lineRevenue : 0;
        row.cost += entry.quantity * entry.item.costPrice;
        productMap[entry.item.productId] = row;
      });
    });
    const productRows = Object.values(productMap).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost)).map(row => [row.sku, row.name, row.quantity, Math.round(row.revenue), row.cost, Math.round(row.revenue - row.cost), row.revenue > 0 ? (row.revenue - row.cost) / row.revenue : 0]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("LỢI NHUẬN THEO SẢN PHẨM", filterText, ["SKU", "Sản phẩm", "Đã bán", "Doanh thu", "Giá vốn", "Lãi gộp", "Biên lãi"], productRows, { widths: [16, 32, 14, 18, 18, 18, 14], numberColumns: [2], moneyColumns: [3, 4, 5], percentColumns: [6], textColumns: [0] }), "Theo sản phẩm");

    const channelRows = Object.keys(channels).map(channel => {
      const orders = snapshot.orders.filter(order => order.channel === channel);
      const revenue = orders.reduce((sum, order) => sum + order.netTotal, 0);
      const cost = orders.reduce((sum, order) => sum + orderCost(order), 0);
      return [channelLabel(channel), orders.length, revenue, cost, revenue - cost, revenue > 0 ? (revenue - cost) / revenue : 0];
    }).filter(row => row[1] > 0).sort((a, b) => b[4] - a[4]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("HIỆU QUẢ THEO KÊNH", filterText, ["Kênh", "Số đơn", "Doanh thu", "Giá vốn", "Lãi gộp", "Biên lãi"], channelRows, { widths: [20, 14, 20, 18, 18, 14], numberColumns: [1], moneyColumns: [2, 3, 4], percentColumns: [5] }), "Theo kênh");

    const date = reportDayKey(new Date());
    saveExcelWorkbook(workbook, `artflow-loi-nhuan-${reportFilters.range}-${reportFilters.channel}-${date}.xlsx`);
    showToast(`Đã xuất ${snapshot.orders.length} đơn trong báo cáo.`);
  }

  function renderKpis() {
    if (!els.kpis) return;
    const snapshot = profitSnapshot();
    const cards = [
      ["Doanh thu thuần", money.format(snapshot.revenue), "Đã trừ hàng khách trả"],
      ["Lãi gộp", money.format(snapshot.grossProfit), "Doanh thu trừ giá vốn thực"],
      ["Lãi ròng", money.format(snapshot.netProfit), "Sau chi phí vận hành"],
      ["Biên lãi gộp", `${(snapshot.grossMargin * 100).toFixed(1)}%`, "Tỷ lệ lãi trên doanh thu thuần"]
    ];
    els.kpis.innerHTML = cards.map(([label, value, note]) => `
      <article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>
    `).join("");
  }

  function renderChart() {
    if (!els.revenueChart) return;
    const days = Array.from({ length: 7 }, (_, index) => shiftDateValue(localDateValue(), -(6 - index)));
    const values = days.map(day => state.orders.filter(order => reportDayKey(order.createdAt) === day && isPaid(order)).reduce((sum, order) => sum + order.netTotal, 0));
    const max = Math.max(...values, 1);
    els.revenueChart.innerHTML = days.map((day, index) => {
      const height = Math.max(18, Math.round((values[index] / max) * 140));
      const label = day.slice(5).replace("-", "/");
      const value = values[index] ? money.format(values[index]).replace(/\s?₫/, "") : "0";
      return `<div class="chart-bar" style="--bar-height: ${height}px"><strong>${value}</strong><span>${label}</span></div>`;
    }).join("");
  }

  function renderLowStock() {
    if (!els.lowStock) return;
    const products = filtered(state.products.filter(product => product.status === "active" && product.stock <= product.lowStock), ["sku", "name", "category"]).sort((a, b) => a.stock - b.stock);
    els.lowStock.innerHTML = products.length ? products.map(product => `
      <div class="mini-item"><div><strong>${product.name}</strong><small>${product.sku} · Ngưỡng ${product.lowStock}</small></div><span class="badge low">${product.stock} còn</span></div>
    `).join("") : `<div class="empty">${searchTerm ? "Không tìm thấy cảnh báo kho phù hợp." : "Chưa có cảnh báo tồn kho."}</div>`;
  }

  function renderOrdersRows(target, rows, limit) {
    if (!target) return;
    const selectedRows = limit ? rows.slice(0, limit) : rows;
    target.innerHTML = selectedRows.length ? selectedRows.map(order => {
      const customer = getCustomer(order);
      if (target !== els.ordersTable) {
        return `
          <tr>
            <td><strong>${order.code}</strong></td>
            <td>${customer.name}</td>
            <td>${orderItemSummary(order)}</td>
            <td><span class="badge ${order.status}">${statusLabel(order.status)}</span></td>
            <td><strong>${money.format(order.netTotal)}</strong>${order.returnedAmount > 0 ? `<br><small>Đã trả ${money.format(order.returnedAmount)}</small>` : ""}</td>
            <td>${formatDate(order.createdAt)}</td>
          </tr>
        `;
      }

      const actions = `<div class="row-actions compact-actions">${canManageOrders() && order.status !== "cancelled" ? `<button class="link-button" data-edit-order-fulfillment="${order.id}">Cập nhật</button>` : ""}${canReturnOrder(order) ? `<button class="link-button" data-return-order="${order.id}">Trả hàng</button>` : ""}${isAdmin() && refundableForOrder(order) > 0 ? `<button class="link-button" data-refund-order="${order.id}">Hoàn tiền</button>` : ""}${canManageOrders() && order.status !== "completed" && order.status !== "cancelled" ? `<button class="link-button" data-complete-order="${order.id}">Hoàn tất</button>` : ""}${canManageOrders() && order.status !== "cancelled" && order.returnedAmount <= 0 && order.refundedAmount <= 0 && collectedForOrder(order) <= 0 ? `<button class="link-button danger-link" data-cancel-order="${order.id}">Hủy</button>` : ""}</div>`;
      const shippingMeta = `${carrierLabel(order.carrier)}${order.trackingCode ? ` · ${order.trackingCode}` : ""}`;
      return `
        <tr>
          <td><div class="order-code-cell"><strong>${order.code}</strong><small>${formatDate(order.createdAt)}</small></div></td>
          <td><div class="customer-channel-cell"><strong>${customer.name}</strong><span class="badge">${channelLabel(order.channel)}</span></div></td>
          <td><span class="item-summary">${orderItemSummary(order)}</span></td>
          <td><span class="badge ${order.status}">${statusLabel(order.status)}</span></td>
          <td><span class="badge ${order.paymentStatus}">${paymentLabel(order.paymentStatus)}</span></td>
          <td><div class="fulfillment-cell">
            <span class="badge ${order.shippingStatus}">${shippingLabel(order.shippingStatus)}</span>
            <small>${shippingMeta}</small>
          </div></td>
          <td class="money-cell"><strong>${money.format(order.netTotal)}</strong>${order.returnedAmount > 0 ? `<small>Gốc ${money.format(order.total)} · Trả ${money.format(order.returnedAmount)}${order.refundedAmount > 0 ? ` · Hoàn ${money.format(order.refundedAmount)}` : ""}</small>` : ""}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="${target === els.ordersTable ? 8 : 6}" class="empty">Chưa có đơn hàng.</td></tr>`;
  }

  function renderInlineOrderSelect(field, orderId, value) {
    const optionMap = {
      status: {
        pending: "Chờ xử lý",
        confirmed: "Đã xác nhận",
        packed: "Đã đóng gói",
        shipping: "Đang giao",
        paid: "Đã thanh toán",
        completed: "Hoàn tất"
      },
      paymentStatus: paymentStatuses,
      shippingStatus: shippingStatuses
    }[field] || {};

    const options = Object.entries(optionMap).map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${label}</option>`).join("");
    return `<select class="inline-select" data-order-inline="${field}" data-order-id="${orderId}" aria-label="Cập nhật ${field}">${options}</select>`;
  }

  function renderProducts() {
    if (!els.productsTable) return;
    const rows = filtered(state.products, ["sku", "name", "category", "brand", "barcode", "contentOwner", "seoKeywords"]);
    els.productsTable.innerHTML = rows.length ? rows.map(product => `
      <tr>
        <td>${product.imageUrl ? `<img class="product-table-image" src="${escapeAttribute(productImageUrl(product.imageUrl))}" alt="" loading="lazy" />` : `<span class="product-table-image placeholder">◇</span>`}</td>
        <td><strong>${product.sku}</strong></td>
        <td><strong>${escapeHtml(product.name)}</strong><br><small>${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small></td>
        <td>${money.format(product.salePrice)}</td>
        <td><span class="badge ${product.stock <= product.lowStock ? "low" : "active"}">${product.stock}</span></td>
        <td><span class="badge content-${product.contentStatus}">${productContentStatuses[product.contentStatus]}</span></td>
        <td>
          <div class="row-actions">
            <button class="link-button" data-view-product="${product.id}">Chi tiết</button>
            ${canManageProducts() ? `<button class="link-button" data-edit-product="${product.id}">Sửa</button><button class="link-button" data-archive-product="${product.id}" data-next-status="${product.status === "active" ? "archived" : "active"}">${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7" class="empty">Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên.</td></tr>`;
  }

  function renderCustomers() {
    if (!els.customersTable) return;
    const rows = filtered(state.customers, ["name", "phone", "email", "group"]);
    els.customersTable.innerHTML = rows.length ? rows.map(customer => `
      <tr>
        <td><strong>${customer.name}</strong></td>
        <td>${customer.phone}</td>
        <td><span class="badge">${customer.group}</span></td>
        <td>${money.format(customer.totalSpent)}</td>
        <td>${formatDate(customer.lastOrderAt)}</td>
        <td><span class="badge ${customer.status}">${statusLabel(customer.status)}</span></td>
        <td>
          <div class="row-actions">
            ${canManageCustomers() ? `<button class="link-button" data-edit-customer="${customer.id}">Sửa</button><button class="link-button" data-archive-customer="${customer.id}" data-next-status="${customer.status === "active" ? "archived" : "active"}">${customer.status === "active" ? "Ngừng theo dõi" : "Kích hoạt"}</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7" class="empty">Chưa có khách hàng. Hãy thêm khách hàng đầu tiên.</td></tr>`;
  }

  function renderUsers() {
    if (!els.usersTable) return;
    const rows = filtered(staffUsers, ["name", "email", "role", "status"]);
    els.usersTable.innerHTML = rows.length ? rows.map(user => `
      <tr>
        <td><strong>${user.name}</strong></td>
        <td>${user.email}</td>
        <td><span class="badge">${roleLabel(user.role)}</span></td>
        <td><span class="badge ${user.status}">${statusLabel(user.status)}</span></td>
        <td>${formatDate(user.lastLoginAt)}</td>
        <td>
          <div class="row-actions">
            <button class="link-button" data-toggle-user="${user.id}" ${user.id === currentUser.id ? "disabled" : ""}>${user.status === "active" ? "Khóa" : "Mở"}</button>
            <button class="link-button" data-delete-user="${user.id}" ${user.id === currentUser.id ? "disabled" : ""}>Xóa</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">Chưa có nhân viên.</td></tr>`;
  }

  function auditEntityLabel(type) {
    return {
      user: "Nhân viên", session: "Phiên đăng nhập", product: "Sản phẩm", product_import: "Nhập sản phẩm",
      customer: "Khách hàng", customer_import: "Nhập khách hàng", order: "Đơn hàng", sales_return: "Khách trả hàng",
      order_refund: "Hoàn tiền", stock_movement: "Kho hàng", cash_transaction: "Thu chi",
      accounting_account: "Tài khoản tiền", accounting_category: "Danh mục thu chi", reconciliation: "Đối soát",
      supplier: "Nhà cung cấp", purchase_order: "Phiếu mua", supplier_payment: "Thanh toán NCC",
      purchase_return: "Trả hàng NCC", supplier_credit: "Bù trừ NCC"
    }[type] || type || "Hệ thống";
  }

  function renderAuditLogs() {
    if (!els.auditTable) return;
    const cutoff = auditFilters.range === "all" ? 0 : Date.now() - Number(auditFilters.range || 30) * 24 * 60 * 60 * 1000;
    const term = searchTerm.trim().toLowerCase();
    const rows = auditLogs.filter(log => {
      const matchesEntity = auditFilters.entityType === "all" || log.entityType === auditFilters.entityType;
      const matchesDate = !cutoff || new Date(log.createdAt).getTime() >= cutoff;
      const text = [log.description, log.action, log.actorName, log.actorEmail, log.entityType, log.entityId].join(" ").toLowerCase();
      return matchesEntity && matchesDate && (!term || text.includes(term));
    });

    if (els.auditKpis) {
      const today = reportDayKey(new Date());
      const todayCount = auditLogs.filter(log => reportDayKey(log.createdAt) === today).length;
      const actors = new Set(auditLogs.map(log => log.actorId || log.actorEmail || log.actorName).filter(Boolean)).size;
      const changes = auditLogs.filter(log => !["login", "logout"].includes(log.action)).length;
      els.auditKpis.innerHTML = [
        ["Hoạt động hôm nay", todayCount, "Theo giờ Việt Nam"],
        ["Người thực hiện", actors, "Trong dữ liệu đang lưu"],
        ["Thay đổi dữ liệu", changes, "Không gồm đăng nhập / đăng xuất"],
        ["Nhật ký đang xem", rows.length, auditFilters.range === "all" ? "Toàn bộ thời gian" : `${auditFilters.range} ngày gần nhất`]
      ].map(([label, value, note]) => `<article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>`).join("");
    }

    els.auditTable.innerHTML = rows.length ? rows.map(log => `
      <tr>
        <td><strong>${escapeHtml(formatDateTime(log.createdAt))}</strong><small>Giờ Việt Nam</small></td>
        <td><strong>${escapeHtml(log.description)}</strong><small>${escapeHtml(log.action)}</small></td>
        <td><span class="badge">${escapeHtml(auditEntityLabel(log.entityType))}</span></td>
        <td><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmail)}</small></td>
        <td><code class="audit-reference">${escapeHtml(log.entityId || "—")}</code></td>
        <td><button class="link-button" type="button" data-view-audit="${escapeAttribute(log.id)}">Xem chi tiết</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">Chưa có hoạt động phù hợp bộ lọc.</td></tr>`;
  }

  function renderAuditDetail(log) {
    return `
      <div class="audit-detail">
        <div class="audit-detail-summary">
          <div><span>Thời gian</span><strong>${escapeHtml(formatDateTime(log.createdAt))}</strong></div>
          <div><span>Người thực hiện</span><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmail)}</small></div>
          <div><span>Đối tượng</span><strong>${escapeHtml(auditEntityLabel(log.entityType))}</strong><small>${escapeHtml(log.entityId || "Không có ID")}</small></div>
        </div>
        <div><h3>Dữ liệu ghi nhận</h3><pre>${escapeHtml(JSON.stringify(log.detail || {}, null, 2))}</pre></div>
      </div>`;
  }

  function renderInventory() {
    if (!els.inventoryCards) return;
    const activeProducts = state.products.filter(product => product.status === "active");
    const totalUnits = activeProducts.reduce((sum, product) => sum + product.stock, 0);
    const inventoryValue = activeProducts.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
    const topStock = [...activeProducts].sort((a, b) => b.stock - a.stock)[0];
    const outOfStock = activeProducts.filter(product => product.stock <= 0).length;
    const suggestedRestock = activeProducts
      .filter(product => product.stock <= product.lowStock)
      .reduce((sum, product) => sum + Math.max(0, product.lowStock * 2 - product.stock), 0);
    const cards = [
      ["Tổng tồn kho", `${totalUnits} sản phẩm`, "Cộng tất cả SKU đang hoạt động."],
      ["Giá trị tồn", money.format(inventoryValue), "Tính theo giá vốn hiện tại."],
      ["SKU tồn nhiều nhất", topStock ? topStock.name : "Chưa có", topStock ? `${topStock.stock} sản phẩm trong kho.` : "Hãy thêm sản phẩm đầu tiên."],
      ["Hết hàng", outOfStock.toString(), "SKU đang về 0 và cần xử lý."],
      ["Gợi ý nhập thêm", `${suggestedRestock} sản phẩm`, "Ước tính để vượt ngưỡng an toàn."]
    ];
    els.inventoryCards.innerHTML = cards.map(([title, value, note]) => `
      <article class="inventory-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>
    `).join("");
  }

  function renderStockMovements() {
    if (!els.stockMovementsTable) return;
    const rows = filtered([...(state.stockMovements || [])], ["sku", "productName", "type", "reason"]).slice(0, 80);
    els.stockMovementsTable.innerHTML = rows.length ? rows.map(movement => {
      const delta = movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : String(movement.quantityDelta);
      const deltaClass = movement.quantityDelta < 0 ? "cancelled" : "active";
      return `
        <tr>
          <td><strong>${movement.sku}</strong><br><small>${movement.productName}</small></td>
          <td><span class="badge ${movement.type === "sale" ? "pending" : "active"}">${statusLabel(movement.type)}</span></td>
          <td><span class="badge ${deltaClass}">${delta}</span></td>
          <td>${movement.stockBefore} → ${movement.stockAfter}</td>
          <td>${movement.reason || "Không có ghi chú"}</td>
          <td>${formatDate(movement.createdAt)}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="6" class="empty">Chưa có biến động kho.</td></tr>`;
  }

  function syncAccountingView() {
    document.querySelectorAll("[data-accounting-view-filter]").forEach(button => {
      button.classList.toggle("active", button.dataset.accountingViewFilter === accountingFilters.view);
    });
    document.querySelectorAll("[data-accounting-section]").forEach(section => {
      section.hidden = section.dataset.accountingSection !== accountingFilters.view;
    });
  }

  function renderAccounting() {
    if (!els.accountingKpis && !els.accountingTransactionsTable) return;
    syncAccountingView();
    const term = searchTerm.trim().toLowerCase();
    if (els.accountingAccountFilter) {
      const current = accountingFilters.accountId;
      els.accountingAccountFilter.innerHTML = `<option value="all">Tất cả tài khoản</option>${(state.accountingAccounts || []).map(account => `<option value="${account.id}">${account.name}</option>`).join("")}`;
      els.accountingAccountFilter.value = current;
    }
    if (els.accountingRangeFilter) els.accountingRangeFilter.value = accountingFilters.range;

    const cutoff = accountingFilters.range === "all" ? null : (() => {
      return shiftDateValue(localDateValue(), -Number(accountingFilters.range));
    })();
    const transactions = [...(state.cashTransactions || [])]
      .filter(transaction => {
        if (accountingFilters.type !== "all" && transaction.type !== accountingFilters.type) return false;
        if (accountingFilters.accountId !== "all" && transaction.accountId !== accountingFilters.accountId) return false;
        if (cutoff && String(transaction.transactionDate || transaction.createdAt).slice(0, 10) < cutoff) return false;
        if (!term) return true;
        const account = getAccountingAccount(transaction.accountId);
        const category = getAccountingCategory(transaction.categoryId);
        return [
          transaction.type,
          accountingTypeLabel(transaction.type),
          transaction.description,
          transaction.referenceType,
          transaction.referenceId,
          account.name,
          category.name
        ].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => String(b.transactionDate || b.createdAt).localeCompare(String(a.transactionDate || a.createdAt)));
    const income = transactions.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const totalBalance = (state.accountingAccounts || []).reduce((sum, account) => sum + account.currentBalance, 0);
    const receivableOrders = state.orders
      .map(order => ({
        order,
        customer: getCustomer(order),
        collected: collectedForOrder(order),
        outstanding: outstandingForOrder(order),
        ageDays: orderAgeDays(order)
      }))
      .filter(item => item.outstanding > 0);
    const pendingReceivable = receivableOrders.reduce((sum, item) => sum + item.outstanding, 0);
    const overdueReceivable = receivableOrders.filter(item => item.ageDays > 7).reduce((sum, item) => sum + item.outstanding, 0);
    const dueSoonReceivable = receivableOrders.filter(item => item.ageDays > 3 && item.ageDays <= 7).reduce((sum, item) => sum + item.outstanding, 0);
    const netCash = income - expense;

    if (els.accountingKpis) {
      const cards = [
        ["Số dư quỹ", money.format(totalBalance), "Tổng số dư các tài khoản tiền."],
        ["Tổng thu", money.format(income), "Theo sổ quỹ đang lọc."],
        ["Dòng tiền ròng", money.format(netCash), "Tổng thu trừ tổng chi đang lọc."],
        ["Công nợ bán hàng", money.format(pendingReceivable), "Số còn phải thu sau các phiếu thu."]
      ];
      els.accountingKpis.innerHTML = cards.map(([label, value, note]) => `
        <article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>
      `).join("");
    }

    if (els.accountingAccounts) {
      els.accountingAccounts.innerHTML = (state.accountingAccounts || []).length ? state.accountingAccounts.map(account => {
        const accountTransactions = (state.cashTransactions || []).filter(transaction => transaction.accountId === account.id && transaction.status !== "deleted");
        const latestReconciliation = (state.accountingReconciliations || [])
          .filter(item => item.accountId === account.id)
          .sort((a, b) => String(b.reconciledAt || b.createdAt).localeCompare(String(a.reconciledAt || a.createdAt)))[0];
        const isArchived = account.status === "archived";
        const differenceClass = latestReconciliation && latestReconciliation.difference !== 0 ? "has-difference" : "is-balanced";
        return `
          <article class="account-card ${isArchived ? "archived" : ""}">
            <div class="account-card-head">
              <div><strong>${account.name}</strong><span>${accountTypeLabel(account.type)} · ${isArchived ? "Đang ẩn" : "Đang dùng"}</span></div>
              <b>${money.format(account.currentBalance)}</b>
            </div>
            <div class="account-card-meta">
              <span><small>Đầu kỳ</small><b>${money.format(account.openingBalance)}</b></span>
              <span><small>Giao dịch</small><b>${accountTransactions.length}</b></span>
              <span class="${differenceClass}"><small>Chênh lệch gần nhất</small><b>${latestReconciliation ? money.format(latestReconciliation.difference) : "Chưa đối soát"}</b></span>
            </div>
            <div class="account-card-actions">
              <button class="link-button" type="button" data-edit-accounting-account="${account.id}">Sửa</button>
              ${isArchived ? "" : `<button class="link-button" type="button" data-reconcile-account="${account.id}">Đối soát</button>`}
              <button class="link-button ${isArchived ? "" : "danger-link"}" type="button" data-archive-accounting-account="${account.id}" data-next-status="${isArchived ? "active" : "archived"}">${isArchived ? "Kích hoạt" : "Ẩn"}</button>
            </div>
          </article>
        `;
      }).join("") : `<div class="empty">Chưa có tài khoản tiền.</div>`;
      els.accountingAccounts.scrollTop = 0;
    }

    if (els.accountingReconciliations) {
      const recentReconciliations = [...(state.accountingReconciliations || [])]
        .sort((a, b) => String(b.reconciledAt || b.createdAt).localeCompare(String(a.reconciledAt || a.createdAt)))
        .slice(0, 6);
      els.accountingReconciliations.innerHTML = recentReconciliations.length ? recentReconciliations.map(item => {
        const account = getAccountingAccount(item.accountId);
        const differenceClass = item.difference === 0 ? "is-balanced" : "has-difference";
        return `
          <article class="reconciliation-item ${differenceClass}">
            <div><strong>${account.name}</strong><small>${formatDate(item.reconciledAt)} · Sổ ${money.format(item.systemBalance)} · Thực tế ${money.format(item.actualBalance)}</small></div>
            <div><b>${item.difference > 0 ? "+" : ""}${money.format(item.difference)}</b><small>${item.note || (item.difference === 0 ? "Đã khớp" : "Cần kiểm tra")}</small></div>
          </article>
        `;
      }).join("") : `<div class="empty compact-empty">Chưa có lần đối soát nào.</div>`;
    }

    if (els.accountingReceivables) {
      if (els.accountingDebtSummary) {
        els.accountingDebtSummary.innerHTML = `
          <article><span>Phải thu</span><strong>${money.format(pendingReceivable)}</strong></article>
          <article><span>4-7 ngày</span><strong>${money.format(dueSoonReceivable)}</strong></article>
          <article><span>Quá 7 ngày</span><strong>${money.format(overdueReceivable)}</strong></article>
        `;
      }
      const receivables = receivableOrders
        .filter(item => {
          if (accountingFilters.receivable === "overdue") return item.ageDays > 7;
          if (accountingFilters.receivable === "watch") return item.ageDays > 3;
          return true;
        })
        .sort((a, b) => b.ageDays - a.ageDays || String(a.order.createdAt).localeCompare(String(b.order.createdAt)))
        .slice(0, 8);
      els.accountingReceivables.innerHTML = receivables.length ? receivables.map(item => {
        const order = item.order;
        const ageLabel = item.ageDays === 0 ? "Hôm nay" : `${item.ageDays} ngày`;
        const ageClass = item.ageDays > 7 ? "danger" : item.ageDays > 3 ? "warning" : "";
        return `
          <article class="todo-item ${ageClass}">
            <div>
              <strong>${order.code}</strong>
              <small>${item.customer.name} · ${formatDate(order.createdAt)} · ${ageLabel}</small>
              <small>Đã thu ${money.format(item.collected)}</small>
            </div>
            <div>
              <b>${money.format(item.outstanding)}</b>
              ${canManageAccounting() ? `<button class="link-button" type="button" data-record-order-payment="${order.id}">Ghi thu</button>` : ""}
            </div>
          </article>
        `;
      }).join("") : `<div class="empty">Không còn khoản phải thu phù hợp bộ lọc.</div>`;
    }

    if (els.accountingCategories) {
      const categories = state.accountingCategories || [];
      const categoryTotalsByType = (state.cashTransactions || []).reduce((totals, transaction) => {
        if (transaction.status === "deleted") return totals;
        totals[transaction.type] = (totals[transaction.type] || 0) + transaction.amount;
        return totals;
      }, {});
      els.accountingCategories.innerHTML = categories.length ? categories.map(category => {
        const relatedTransactions = (state.cashTransactions || []).filter(transaction => transaction.categoryId === category.id && transaction.status !== "deleted");
        const totalAmount = relatedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        const categoryTotal = categoryTotalsByType[category.type] || 0;
        const share = categoryTotal > 0 ? Math.round((totalAmount / categoryTotal) * 1000) / 10 : 0;
        const lastUsed = relatedTransactions
          .map(transaction => transaction.transactionDate || transaction.createdAt)
          .filter(Boolean)
          .sort()
          .pop();
        const isArchived = category.status === "archived";
        return `
          <article class="category-chip ${category.type} ${isArchived ? "archived" : ""}">
            <div class="category-chip-main">
              <div>
                <strong>${category.name}</strong>
                <small>${accountingTypeLabel(category.type)} · ${isArchived ? "Đang ẩn" : "Đang dùng"}</small>
              </div>
              <span>${relatedTransactions.length} GD</span>
            </div>
            <div class="category-chip-stats">
              <span><small>Phát sinh</small><b>${money.format(totalAmount)}</b></span>
              <span><small>Tỷ trọng</small><b>${share}% ${accountingTypeLabel(category.type)}</b></span>
              <span><small>Gần nhất</small><b>${lastUsed ? formatDate(lastUsed) : "Chưa dùng"}</b></span>
            </div>
            <div class="category-share-bar" aria-label="Tỷ trọng ${share}%"><span style="width: ${Math.min(100, share)}%"></span></div>
            ${canManageAccounting() ? `
              <div class="category-chip-actions">
                <button class="link-button" type="button" data-edit-accounting-category="${category.id}">Sửa</button>
                <button class="link-button ${isArchived ? "" : "danger-link"}" type="button" data-archive-accounting-category="${category.id}" data-next-status="${isArchived ? "active" : "archived"}">${isArchived ? "Kích hoạt" : "Ẩn"}</button>
              </div>
            ` : ""}
          </article>
        `;
      }).join("") : `<div class="empty">Chưa có danh mục thu/chi.</div>`;
    }

    if (els.accountingTransactionsTable) {
      els.accountingTransactionsTable.innerHTML = transactions.length ? transactions.map(transaction => {
        const category = getAccountingCategory(transaction.categoryId);
        const account = getAccountingAccount(transaction.accountId);
        const signedAmount = transaction.type === "income" ? transaction.amount : -transaction.amount;
        return `
          <tr>
            <td><strong>${formatDate(transaction.transactionDate)}</strong><br><small>${transaction.referenceType || "manual"}</small></td>
            <td><span class="badge ${transaction.type === "income" ? "active" : "pending"}">${accountingTypeLabel(transaction.type)}</span></td>
            <td><strong>${category.name}</strong><br><small>${account.name}</small></td>
            <td>${transaction.description}</td>
            <td class="money-cell ${transaction.type === "income" ? "positive-money" : "negative-money"}"><strong>${money.format(signedAmount)}</strong></td>
            <td><div class="row-actions">${canManageAccounting() && (!transaction.referenceType || transaction.referenceType === "manual") ? `<button class="link-button danger-link" data-archive-cash-transaction="${transaction.id}">Xóa</button>` : `<small>Giao dịch liên kết</small>`}</div></td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="6" class="empty">Chưa có giao dịch thu/chi.</td></tr>`;
    }
  }

  function syncPurchasingView() {
    document.querySelectorAll("[data-purchasing-view-filter]").forEach(button => {
      button.classList.toggle("active", button.dataset.purchasingViewFilter === purchasingFilters.view);
    });
    document.querySelectorAll("[data-purchasing-section]").forEach(section => {
      section.hidden = section.dataset.purchasingSection !== purchasingFilters.view;
    });
  }

  function renderPurchasing() {
    if (!els.purchasingKpis && !els.purchaseOrdersTable && !els.suppliersList && !els.purchaseAgingTable) return;
    syncPurchasingView();
    const term = searchTerm.trim().toLowerCase();
    const today = localDateValue();
    const monthPrefix = today.slice(0, 7);
    const activeOrders = (state.purchaseOrders || []).filter(order => order.status !== "cancelled");
    const payableOrders = activeOrders.filter(order => order.status === "received");
    const outstanding = payableOrders.reduce((sum, order) => sum + order.outstanding, 0);
    const overdue = payableOrders.filter(order => order.outstanding > 0 && order.dueDate && order.dueDate < today).reduce((sum, order) => sum + order.outstanding, 0);
    const monthPurchases = activeOrders.filter(order => order.status === "received" && String(order.receivedAt || order.createdAt).slice(0, 7) === monthPrefix).reduce((sum, order) => sum + order.netTotal, 0);
    const activeSuppliers = (state.suppliers || []).filter(supplier => supplier.status === "active").length;

    if (els.purchasingKpis) {
      const cards = [
        ["Phải trả", money.format(outstanding), "Công nợ nhà cung cấp hiện tại."],
        ["Quá hạn", money.format(overdue), "Khoản đã vượt ngày thanh toán."],
        ["Mua trong tháng", money.format(monthPurchases), "Giá trị phiếu đã nhận hàng."],
        ["Nhà cung cấp", String(activeSuppliers), "Đang hoạt động."]
      ];
      els.purchasingKpis.innerHTML = cards.map(([label, value, note]) => `<article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>`).join("");
    }

    const orders = [...(state.purchaseOrders || [])]
      .filter(order => {
        if (purchasingFilters.status !== "all" && order.status !== purchasingFilters.status) return false;
        if (purchasingFilters.paymentStatus !== "all" && order.paymentStatus !== purchasingFilters.paymentStatus) return false;
        if (!term) return true;
        const supplier = getSupplier(order);
        return [order.code, order.invoiceNumber, supplier.name, supplier.code, ...(order.items || []).flatMap(item => [item.name, item.sku])].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (els.purchaseOrdersTable) {
      els.purchaseOrdersTable.innerHTML = orders.length ? orders.map(order => {
        const supplier = getSupplier(order);
        const isOverdue = order.outstanding > 0 && order.dueDate && order.dueDate < today;
        const actions = [];
        if (canManagePurchasing() && order.status === "draft") actions.push(`<a class="link-button" href="./purchase-create.html?edit=${order.id}">Sửa</a><button class="link-button" type="button" data-receive-purchase="${order.id}">Nhận hàng</button>`);
        if (canReturnPurchaseOrder(order)) actions.push(`<button class="link-button" type="button" data-return-purchase="${order.id}">Trả hàng</button>`);
        if (canPayPurchases() && order.status === "received" && order.outstanding > 0) actions.push(`<button class="link-button" type="button" data-pay-purchase="${order.id}">Thanh toán</button>`);
        if (canPayPurchases() && order.status === "received" && order.outstanding > 0 && supplier.creditBalance > 0) actions.push(`<button class="link-button" type="button" data-apply-supplier-credit="${order.id}">Bù trừ</button>`);
        if (canManagePurchasing() && ["draft", "received"].includes(order.status) && order.paidAmount <= 0 && order.creditAppliedAmount <= 0 && order.returnedAmount <= 0) actions.push(`<button class="link-button danger-link" type="button" data-cancel-purchase="${order.id}">Hủy</button>`);
        return `
          <tr class="${isOverdue ? "overdue-row" : ""}">
            <td><strong>${order.code}</strong><br><small>${order.invoiceNumber || "Chưa có số hóa đơn"}</small></td>
            <td><strong>${supplier.name}</strong><br><small>${supplier.code}</small></td>
            <td>${purchaseItemSummary(order)}${order.returnedAmount > 0 ? `<br><small>Đã trả ${money.format(order.returnedAmount)}</small>` : ""}</td>
            <td><span class="badge ${order.status === "received" ? "active" : order.status === "cancelled" ? "cancelled" : "pending"}">${statusLabel(order.status)}</span><br><small>${statusLabel(order.paymentStatus)}</small></td>
            <td><strong>${money.format(order.status === "draft" ? order.total : order.outstanding)}</strong><br><small>${order.status === "draft" ? "Dự kiến, chưa ghi công nợ" : order.creditAmount > 0 ? `Dư có ${money.format(order.creditAmount)}` : `Tiền ${money.format(order.paidAmount)} · Bù ${money.format(order.creditAppliedAmount)}`}</small></td>
            <td><span class="${isOverdue ? "danger-text" : ""}">${order.dueDate ? formatDate(order.dueDate) : "Chưa đặt hạn"}</span></td>
            <td><div class="row-actions">${actions.join("") || "—"}</div></td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="7" class="empty">Chưa có phiếu mua phù hợp.</td></tr>`;
    }

    if (els.suppliersList) {
      const suppliers = (state.suppliers || []).filter(supplier => {
        if (!term) return true;
        return [supplier.code, supplier.name, supplier.phone, supplier.email, supplier.taxCode].join(" ").toLowerCase().includes(term);
      });
      const totalPurchased = suppliers.reduce((sum, supplier) => sum + supplier.totalPurchased, 0);
      els.suppliersList.innerHTML = suppliers.length ? suppliers.map(supplier => {
        const share = totalPurchased > 0 ? Math.round((supplier.totalPurchased / totalPurchased) * 1000) / 10 : 0;
        const isArchived = supplier.status === "archived";
        return `
          <article class="supplier-card ${isArchived ? "archived" : ""}">
            <div class="supplier-card-head"><div><strong>${supplier.name}</strong><small>${supplier.code} · ${supplier.phone}</small></div><span class="badge ${supplier.outstanding > 0 ? "pending" : "active"}">${supplier.outstanding > 0 ? "Còn nợ" : supplier.creditBalance > 0 ? "Dư có" : "Đã cân"}</span></div>
            <div class="supplier-card-stats"><span><small>Đã mua</small><b>${money.format(supplier.totalPurchased)}</b></span><span><small>Phải trả</small><b>${money.format(supplier.outstanding)}</b></span><span><small>Tỷ trọng</small><b>${share}%</b></span></div>
            <div class="category-share-bar"><span style="width:${Math.min(100, share)}%"></span></div>
            <div class="supplier-card-foot"><small>${supplier.taxCode ? `MST ${supplier.taxCode}` : "Chưa có mã số thuế"} · ${supplier.creditBalance > 0 ? `Dư có ${money.format(supplier.creditBalance)}` : supplier.lastPurchaseAt ? `Mua gần nhất ${formatDate(supplier.lastPurchaseAt)}` : "Chưa phát sinh mua"}</small><div class="row-actions"><button class="link-button" type="button" data-supplier-statement="${supplier.id}">Lịch sử</button>${canManagePurchasing() ? `<button class="link-button" type="button" data-edit-supplier="${supplier.id}">Sửa</button><button class="link-button ${isArchived ? "" : "danger-link"}" type="button" data-archive-supplier="${supplier.id}" data-next-status="${isArchived ? "active" : "archived"}" ${!isArchived && (supplier.outstanding > 0 || supplier.creditBalance > 0) ? 'disabled title="Cần tất toán công nợ và dư có trước khi ẩn"' : ""}>${isArchived ? "Kích hoạt" : "Ẩn"}</button>` : ""}</div></div>
          </article>
        `;
      }).join("") : `<div class="empty">Chưa có nhà cung cấp phù hợp.</div>`;
    }

    const agingOrders = payableOrders
      .filter(order => order.outstanding > 0)
      .sort((a, b) => {
        const aDays = purchaseDueDays(a);
        const bDays = purchaseDueDays(b);
        return (bDays === null ? -Infinity : bDays) - (aDays === null ? -Infinity : aDays);
      });
    if (els.purchaseAgingSummary) {
      const buckets = [
        ["current", "Chưa đến hạn"],
        ["1-30", "Quá hạn 1–30"],
        ["31-60", "Quá hạn 31–60"],
        ["60+", "Quá hạn trên 60"]
      ];
      els.purchaseAgingSummary.innerHTML = buckets.map(([key, label]) => {
        const bucketOrders = agingOrders.filter(order => purchaseAgingBucket(order).key === key);
        const amount = bucketOrders.reduce((sum, order) => sum + order.outstanding, 0);
        return `<article><small>${label}</small><strong>${money.format(amount)}</strong><span>${bucketOrders.length} phiếu</span></article>`;
      }).join("");
    }
    if (els.purchaseAgingTable) {
      els.purchaseAgingTable.innerHTML = agingOrders.length ? agingOrders.map(order => {
        const supplier = getSupplier(order);
        const bucket = purchaseAgingBucket(order);
        const dueText = bucket.days === null ? "Chưa đặt hạn" : bucket.days > 0 ? `${bucket.days} ngày quá hạn` : bucket.days === 0 ? "Đến hạn hôm nay" : `Còn ${Math.abs(bucket.days)} ngày`;
        return `<tr class="${bucket.days > 0 ? "overdue-row" : ""}"><td><span class="badge ${bucket.tone}">${bucket.label}</span></td><td><strong>${order.code}</strong></td><td>${supplier.name}</td><td>${order.dueDate ? formatDate(order.dueDate) : "—"}</td><td class="${bucket.days > 0 ? "danger-text" : ""}">${dueText}</td><td><strong>${money.format(order.outstanding)}</strong></td><td><div class="row-actions">${canPayPurchases() ? `<button class="link-button" type="button" data-pay-purchase="${order.id}">Thanh toán</button>${supplier.creditBalance > 0 ? `<button class="link-button" type="button" data-apply-supplier-credit="${order.id}">Bù trừ</button>` : ""}` : "—"}</div></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="empty">Không có công nợ phải trả.</td></tr>`;
    }
  }

  function renderReports() {
    if (!els.reportCards) return;
    const snapshot = profitSnapshot(reportFilters.range, reportFilters.channel);
    const previous = profitSnapshot(reportFilters.range, reportFilters.channel, true);
    const cards = [
      ["Doanh thu thuần", money.format(snapshot.revenue), reportFilters.range === "all" ? "Toàn bộ dữ liệu" : comparisonText(snapshot, previous, "revenue", "Doanh thu")],
      ["Giá vốn thực", money.format(snapshot.cost), "Đã trừ giá vốn hàng trả"],
      ["Lãi gộp", money.format(snapshot.grossProfit), reportFilters.range === "all" ? "Doanh thu trừ giá vốn" : comparisonText(snapshot, previous, "grossProfit", "Lãi gộp")],
      ["Biên lãi gộp", `${(snapshot.grossMargin * 100).toFixed(1)}%`, "Lãi gộp / doanh thu thuần"],
      ["Chi phí vận hành", money.format(snapshot.operatingExpenses), reportFilters.channel === "all" ? "Không gồm nhập hàng và hoàn tiền" : "Phân bổ theo tỷ trọng doanh thu kênh"],
      ["Lãi ròng", money.format(snapshot.netProfit), reportFilters.range === "all" ? "Sau chi phí vận hành" : comparisonText(snapshot, previous, "netProfit", "Lãi ròng")]
    ];
    els.reportCards.innerHTML = cards.map(([title, value, note]) => `
      <article class="report-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>
    `).join("");

    if (els.reportComparison) {
      els.reportComparison.textContent = reportFilters.range === "all"
        ? `${snapshot.orders.length} đơn đã ghi nhận`
        : comparisonText(snapshot, previous, "netProfit", "Lãi ròng");
    }

    const productRows = {};
    snapshot.orders.forEach(order => {
      const remainingItems = (order.items || []).map(item => ({
        item,
        quantity: Math.max(0, item.quantity - returnedOrderItemQuantity(item.id))
      })).filter(entry => entry.quantity > 0);
      const lineRevenue = remainingItems.reduce((sum, entry) => sum + entry.quantity * entry.item.unitPrice, 0);
      remainingItems.forEach(entry => {
        const row = productRows[entry.item.productId] || { name: entry.item.name, sku: entry.item.sku, quantity: 0, revenue: 0, cost: 0 };
        const rawRevenue = entry.quantity * entry.item.unitPrice;
        row.quantity += entry.quantity;
        row.revenue += lineRevenue > 0 ? rawRevenue * order.netTotal / lineRevenue : 0;
        row.cost += entry.quantity * entry.item.costPrice;
        productRows[entry.item.productId] = row;
      });
    });
    const products = Object.values(productRows).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
    if (els.productProfitTable) {
      els.productProfitTable.innerHTML = products.length ? products.map(row => {
        const profit = row.revenue - row.cost;
        const margin = row.revenue > 0 ? profit / row.revenue : 0;
        return `<tr><td><strong>${row.name}</strong><small>${row.sku}</small></td><td>${row.quantity}</td><td>${money.format(row.revenue)}</td><td>${money.format(row.cost)}</td><td><strong>${money.format(profit)}</strong></td><td><span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span></td></tr>`;
      }).join("") : `<tr><td colspan="6" class="empty">Chưa có dữ liệu sản phẩm trong kỳ.</td></tr>`;
    }

    const channelRows = Object.keys(channels).map(channel => {
      const orders = snapshot.orders.filter(order => order.channel === channel);
      const revenue = orders.reduce((sum, order) => sum + order.netTotal, 0);
      const cost = orders.reduce((sum, order) => sum + orderCost(order), 0);
      return { channel, orders: orders.length, revenue, profit: revenue - cost };
    }).filter(row => row.orders > 0).sort((a, b) => b.profit - a.profit);
    if (els.channelProfitTable) {
      els.channelProfitTable.innerHTML = channelRows.length ? channelRows.map(row => {
        const margin = row.revenue > 0 ? row.profit / row.revenue : 0;
        return `<tr><td><span class="badge">${channelLabel(row.channel)}</span></td><td>${row.orders}</td><td>${money.format(row.revenue)}</td><td><strong>${money.format(row.profit)}</strong></td><td><span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span></td></tr>`;
      }).join("") : `<tr><td colspan="5" class="empty">Chưa có dữ liệu kênh trong kỳ.</td></tr>`;
    }

    if (els.expenseBreakdown) {
      const byCategory = snapshot.transactions.reduce((map, transaction) => {
        const category = byId("accountingCategories", transaction.categoryId);
        const label = category ? category.name : "Chưa phân loại";
        map[label] = (map[label] || 0) + transaction.amount * snapshot.expenseRatio;
        return map;
      }, {});
      const expenses = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const maxExpense = Math.max(...expenses.map(entry => entry[1]), 1);
      els.expenseBreakdown.innerHTML = expenses.length ? expenses.map(([label, amount]) => `
        <div class="expense-row"><div><strong>${label}</strong><span>${money.format(amount)}</span></div><i style="--expense-width:${Math.round(amount / maxExpense * 100)}%"></i></div>
      `).join("") : `<div class="empty">Chưa phát sinh chi phí vận hành trong kỳ.</div>`;
    }

    if (els.profitChart) {
      const dayMap = {};
      snapshot.orders.forEach(order => {
        const day = reportDayKey(order.createdAt);
        const row = dayMap[day] || { revenue: 0, profit: 0 };
        row.revenue += order.netTotal;
        row.profit += order.netTotal - orderCost(order);
        dayMap[day] = row;
      });
      const days = Object.keys(dayMap).sort();
      const maxValue = Math.max(...days.map(day => Math.max(dayMap[day].revenue, dayMap[day].profit)), 1);
      els.profitChart.innerHTML = days.length ? days.map(day => {
        const row = dayMap[day];
        return `<div class="profit-chart-day"><div class="profit-bars"><i class="revenue" style="--value:${Math.max(3, Math.round(row.revenue / maxValue * 100))}%" title="Doanh thu ${money.format(row.revenue)}"></i><i class="profit" style="--value:${Math.max(3, Math.round(Math.max(0, row.profit) / maxValue * 100))}%" title="Lãi gộp ${money.format(row.profit)}"></i></div><span>${day.slice(5).replace("-", "/")}</span></div>`;
      }).join("") : `<div class="empty">Chưa có doanh thu trong kỳ.</div>`;
    }
  }

  function enhanceResponsiveTables() {
    document.querySelectorAll(".table-wrap table").forEach(table => {
      const headers = [...table.querySelectorAll("thead th")].map(th => th.textContent.trim());
      table.querySelectorAll("tbody tr").forEach(row => {
        [...row.children].forEach((cell, index) => {
          if (headers[index]) cell.dataset.label = headers[index];
        });
      });
    });
  }

  function renderPage() {
    const sortedOrders = [...state.orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const orderMatches = order => {
      const term = searchTerm.trim().toLowerCase();
      const matchesFilters =
        (orderFilters.channel === "all" || order.channel === orderFilters.channel) &&
        (orderFilters.status === "all" || order.status === orderFilters.status) &&
        (orderFilters.paymentStatus === "all" || order.paymentStatus === orderFilters.paymentStatus) &&
        (orderFilters.shippingStatus === "all" || order.shippingStatus === orderFilters.shippingStatus);
      if (!matchesFilters) return false;
      if (!term) return true;
      const customer = getCustomer(order);
      const text = [
        order.code,
        channelLabel(order.channel),
        statusLabel(order.status),
        paymentLabel(order.paymentStatus),
        shippingLabel(order.shippingStatus),
        carrierLabel(order.carrier),
        order.trackingCode,
        order.status,
        customer.name,
        ...(order.items || []).flatMap(item => [item.name, item.sku])
      ].join(" ").toLowerCase();
      return text.includes(term);
    };
    const orders = sortedOrders.filter(orderMatches);
    const recentOrders = page === "dashboard" ? sortedOrders.filter(orderMatches) : sortedOrders;
    renderKpis();
    renderChart();
    renderLowStock();
    renderOrdersRows(els.recentOrders, recentOrders, 5);
    renderOrdersRows(els.ordersTable, orders);
    renderProducts();
    renderCustomers();
    renderUsers();
    renderAuditLogs();
    renderInventory();
    renderStockMovements();
    renderAccounting();
    renderPurchasing();
    renderReports();
    renderOrderCreatePage();
    renderPurchaseCreatePage();
    enhanceResponsiveTables();
  }

  function closeModal() {
    if (!els.modalBackdrop || !els.modalForm) return;
    els.modalBackdrop.hidden = true;
    els.modalForm.innerHTML = "";
  }

  function renderTextFields(fields) {
    return fields.map(([name, label, type, placeholder, extra = "", value = "", required = true]) => `
      <div class="field">
        <label for="${name}">${label}</label>
        <input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" value="${String(value).replace(/"/g, "&quot;")}" ${extra} ${required ? "required" : ""} />
      </div>
    `).join("");
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const productContentStatuses = {
    not_started: "Chưa bắt đầu",
    drafting: "Đang soạn",
    review: "Chờ duyệt",
    ready: "Sẵn sàng",
    published: "Đã đăng"
  };

  function renderProductForm(product) {
    const value = field => escapeAttribute(product ? product[field] : "");
    return `
      <div class="product-form-section full"><h3>Thông tin bán hàng</h3><p>Các trường dùng cho danh mục, kho và đơn hàng.</p></div>
      <div class="field"><label for="sku">SKU</label><input id="sku" name="sku" value="${value("sku")}" placeholder="AF-NEW-001" required /></div>
      <div class="field"><label for="name">Tên sản phẩm</label><input id="name" name="name" value="${value("name")}" placeholder="Bộ cọ vẽ chi tiết" required /></div>
      <div class="field"><label for="category">Danh mục</label><input id="category" name="category" value="${value("category")}" placeholder="Dụng cụ vẽ" required /></div>
      <div class="field"><label for="brand">Thương hiệu</label><input id="brand" name="brand" value="${value("brand")}" placeholder="ArtFlow" /></div>
      <div class="field"><label for="barcode">Barcode / Mã vạch</label><input id="barcode" name="barcode" value="${value("barcode")}" placeholder="893..." /></div>
      <div class="field"><label for="unit">Đơn vị tính</label><input id="unit" name="unit" value="${value("unit") || "cái"}" placeholder="cái, hộp, bộ..." /></div>
      <div class="field"><label for="costPrice">Giá vốn</label><input id="costPrice" name="costPrice" type="number" min="0" step="1000" value="${value("costPrice")}" required /></div>
      <div class="field"><label for="salePrice">Giá bán</label><input id="salePrice" name="salePrice" type="number" min="0" step="1000" value="${value("salePrice")}" required /></div>
      <div class="field"><label for="stock">Tồn kho</label><input id="stock" name="stock" type="number" min="0" step="1" value="${value("stock")}" required /></div>
      <div class="field"><label for="lowStock">Ngưỡng cảnh báo</label><input id="lowStock" name="lowStock" type="number" min="0" step="1" value="${value("lowStock")}" required /></div>
      <div class="product-form-section full"><h3>Thông số sản phẩm</h3><p>Hữu ích khi viết mô tả và đăng lên sàn.</p></div>
      <div class="field"><label for="weightGrams">Khối lượng (gram)</label><input id="weightGrams" name="weightGrams" type="number" min="0" step="1" value="${value("weightGrams") || 0}" /></div>
      <div class="field"><label for="dimensions">Kích thước</label><input id="dimensions" name="dimensions" value="${value("dimensions")}" placeholder="20 x 10 x 5 cm" /></div>
      <div class="field"><label for="origin">Xuất xứ</label><input id="origin" name="origin" value="${value("origin")}" placeholder="Việt Nam" /></div>
      <div class="field"><label for="material">Chất liệu</label><input id="material" name="material" value="${value("material")}" placeholder="Gỗ, cotton, nhựa ABS..." /></div>
      <div class="field full"><label for="imageUrl">Link ảnh đại diện</label><input id="imageUrl" name="imageUrl" type="url" value="${value("imageUrl")}" placeholder="https://... (ảnh được chia sẻ để người xem có quyền truy cập)" /></div>
      <div class="product-form-section full"><h3>Quản lý content</h3><p>Brief nhanh để team content tìm, viết và theo dõi tiến độ.</p></div>
      <div class="field full"><label for="shortDescription">Mô tả ngắn</label><textarea id="shortDescription" name="shortDescription" rows="3" placeholder="Sản phẩm là gì và giải quyết nhu cầu nào?">${escapeHtml(product ? product.shortDescription : "")}</textarea></div>
      <div class="field full"><label for="keyFeatures">Điểm nổi bật / USP</label><textarea id="keyFeatures" name="keyFeatures" rows="4" placeholder="Mỗi điểm nổi bật một dòng">${escapeHtml(product ? product.keyFeatures : "")}</textarea></div>
      <div class="field"><label for="targetAudience">Đối tượng khách hàng</label><input id="targetAudience" name="targetAudience" value="${value("targetAudience")}" placeholder="Người mới học vẽ, sinh viên..." /></div>
      <div class="field"><label for="seoKeywords">Từ khóa tìm kiếm</label><input id="seoKeywords" name="seoKeywords" value="${value("seoKeywords")}" placeholder="cọ vẽ, cọ chi tiết, dụng cụ mỹ thuật" /></div>
      <div class="field"><label for="contentOwner">Người phụ trách content</label><input id="contentOwner" name="contentOwner" value="${value("contentOwner")}" placeholder="Tên hoặc email" /></div>
      <div class="field"><label for="contentStatus">Trạng thái content</label><select id="contentStatus" name="contentStatus">${Object.entries(productContentStatuses).map(([key, label]) => `<option value="${key}" ${(product ? product.contentStatus : "not_started") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field full"><label for="contentNote">Ghi chú content</label><textarea id="contentNote" name="contentNote" rows="3" placeholder="Yêu cầu hình ảnh, video, deadline, kênh ưu tiên...">${escapeHtml(product ? product.contentNote : "")}</textarea></div>
      ${product ? `<div class="product-resource-note full">Link Google Docs và Drive được hệ thống quản lý riêng. Dùng nút <strong>Tạo tài nguyên</strong> trong màn hình chi tiết nếu sản phẩm chưa có link.</div>` : `<div class="product-resource-note full">Sau khi lưu, hệ thống sẽ tự tạo Google Docs và các folder ảnh/video nếu Script Properties đã được cấu hình.</div>`}
    `;
  }

  function productResourceLink(url, label) {
    return url ? `<a class="resource-link" href="${escapeAttribute(url)}" target="_blank" rel="noopener">${label} ↗</a>` : `<span class="resource-missing">Chưa tạo</span>`;
  }

  function productImageUrl(url) {
    const value = String(url || "").trim();
    const driveMatch = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/i);
    return driveMatch ? `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w600` : value;
  }

  function renderProductDetail(product) {
    const image = product.imageUrl
      ? `<img class="product-detail-image" src="${escapeAttribute(productImageUrl(product.imageUrl))}" alt="${escapeAttribute(product.name)}" />`
      : `<div class="product-detail-image placeholder">Không có ảnh</div>`;
    const info = (label, value) => `<div><span>${label}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
    return `
      <div class="product-detail-hero full">${image}<div><span class="badge ${product.status}">${statusLabel(product.status)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</p><b>${money.format(product.salePrice)}</b></div></div>
      <section class="product-detail-section full"><h3>Thông tin sản phẩm</h3><div class="product-detail-grid">
        ${info("Barcode", product.barcode)}${info("Đơn vị", product.unit)}${info("Giá vốn", money.format(product.costPrice))}${info("Tồn kho", `${product.stock} / cảnh báo ${product.lowStock}`)}
        ${info("Khối lượng", product.weightGrams ? `${product.weightGrams} g` : "")}${info("Kích thước", product.dimensions)}${info("Xuất xứ", product.origin)}${info("Chất liệu", product.material)}
        ${info("Tạo lúc", formatDateTime(product.createdAt))}${info("Cập nhật lúc", formatDateTime(product.updatedAt))}
      </div></section>
      <section class="product-detail-section full"><h3>Content</h3><div class="product-detail-grid">${info("Trạng thái", productContentStatuses[product.contentStatus])}${info("Phụ trách", product.contentOwner)}${info("Đối tượng", product.targetAudience)}${info("Từ khóa", product.seoKeywords)}</div>
        <div class="product-copy-block"><span>Mô tả ngắn</span><p>${escapeHtml(product.shortDescription || "Chưa có mô tả.")}</p></div>
        <div class="product-copy-block"><span>Điểm nổi bật / USP</span><p>${escapeHtml(product.keyFeatures || "Chưa có nội dung.").replace(/\n/g, "<br>")}</p></div>
        <div class="product-copy-block"><span>Ghi chú</span><p>${escapeHtml(product.contentNote || "Chưa có ghi chú.").replace(/\n/g, "<br>")}</p></div>
      </section>
      <section class="product-detail-section full"><h3>Tài nguyên Google</h3><div class="product-resource-grid">
        ${productResourceLink(product.contentDocUrl, "Google Docs mô tả")}${productResourceLink(product.mediaFolderUrl, "Folder sản phẩm")}${productResourceLink(product.imageFolderUrl, "Folder hình ảnh")}${productResourceLink(product.videoFolderUrl, "Folder video")}
      </div>${canManageProducts() && (!product.contentDocUrl || !product.mediaFolderUrl) ? `<button class="button ghost" type="button" data-provision-product="${product.id}">Tạo tài nguyên content</button>` : ""}</section>
    `;
  }

  function productSearchText(product) {
    return `${product.sku} ${product.name} ${product.category}`.toLowerCase();
  }

  function renderProductPicker() {
    const products = state.products
      .filter(product => product.status === "active")
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));

    return `
      <div class="product-picker">
        <div class="product-picker-toolbar">
          <label class="search-box product-picker-search">
            <span>⌕</span>
            <input type="search" placeholder="Tìm SKU, tên, danh mục..." data-product-picker-search />
          </label>
          <span class="pill" data-product-picker-count>${products.length} sản phẩm</span>
        </div>
        <div class="product-picker-list" data-product-picker-list>
          ${products.map(renderProductPickerCard).join("")}
        </div>
      </div>
    `;
  }

  function renderProductPickerCard(product) {
    const stockClass = product.stock <= 0 ? "draft" : (product.stock <= product.lowStock ? "low" : "active");
    const disabled = product.stock <= 0 ? "disabled" : "";
    return `
      <button class="product-card" type="button" data-add-product-to-order="${product.id}" data-product-search="${escapeAttribute(productSearchText(product))}" ${disabled}>
        <span>
          <strong>${product.name}</strong>
          <small>${product.sku} · ${product.category}</small>
        </span>
        <span>
          <strong>${money.format(product.salePrice)}</strong>
          <small class="badge ${stockClass}">${product.stock} còn</small>
        </span>
      </button>
    `;
  }

  function renderOrderItemRow(productId) {
    const product = byId("products", productId) || state.products.find(item => item.status === "active");
    if (!product) return "";

    return `
      <div class="order-item-row" data-order-item-row>
        <div class="cart-product-summary">
          <strong>${product.name}</strong>
          <small>${product.sku} · ${money.format(product.salePrice)} · tồn ${product.stock}</small>
          <input type="hidden" name="productId" value="${product.id}" data-order-product required />
        </div>
        <div class="field compact-field">
          <label>Số lượng</label>
          <input name="quantity" data-order-quantity type="number" min="1" value="1" required />
        </div>
        <button class="icon-button" type="button" data-remove-order-item aria-label="Xóa dòng">×</button>
      </div>
    `;
  }

  function filterProductPicker(input) {
    const panel = input && input.closest(".product-picker");
    if (!panel) return;
    const term = String(input.value || "").trim().toLowerCase();
    let visible = 0;
    panel.querySelectorAll("[data-add-product-to-order]").forEach(card => {
      const matched = !term || card.dataset.productSearch.indexOf(term) !== -1;
      card.hidden = !matched;
      if (matched) visible += 1;
    });
    const count = panel.querySelector("[data-product-picker-count]");
    if (count) count.textContent = `${visible} sản phẩm`;
  }

  function addProductToOrder(form, productId) {
    const product = byId("products", productId);
    const list = form && form.querySelector("[data-order-items]");
    if (!product || !list) return;

    const existing = [...list.querySelectorAll("[data-order-item-row]")].find(row => row.querySelector("[data-order-product]").value === product.id);
    if (existing) {
      const quantity = existing.querySelector("[data-order-quantity]");
      quantity.value = Number(quantity.value || 0) + 1;
    } else {
      list.insertAdjacentHTML("beforeend", renderOrderItemRow(product.id));
    }
    updateOrderTotalPreview(form);
  }

  function renderInventoryProductOptions() {
    return state.products
      .filter(product => product.status === "active")
      .map(product => `<option value="${product.id}">${product.sku} · ${product.name} (${product.stock} hiện có)</option>`)
      .join("");
  }

  function renderOptions(options, selected = "") {
    return Object.entries(options).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  }

  function renderAccountingAccountOptions() {
    return (state.accountingAccounts || [])
      .filter(account => account.status === "active")
      .map(account => `<option value="${account.id}">${account.name} · ${money.format(account.currentBalance)}</option>`)
      .join("");
  }

  function renderAccountingCategoryOptions(type) {
    return (state.accountingCategories || [])
      .filter(category => category.status === "active" && category.type === type)
      .map(category => `<option value="${category.id}">${category.name}</option>`)
      .join("");
  }

  function renderCashTransactionForm() {
    const today = localDateValue();
    return `
      <div class="field"><label for="type">Loại giao dịch</label><select id="type" name="type" required data-cash-type><option value="income">Thu tiền</option><option value="expense">Chi tiền</option></select></div>
      <div class="field"><label for="transactionDate">Ngày ghi nhận</label><input id="transactionDate" name="transactionDate" type="date" value="${today}" required /></div>
      <div class="field"><label for="accountId">Tài khoản tiền</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục</label><select id="categoryId" name="categoryId" required data-cash-category>${renderAccountingCategoryOptions("income")}</select></div>
      <div class="field"><label for="amount">Số tiền</label><input id="amount" name="amount" type="number" min="1" step="1" placeholder="500000" required /></div>
      <div class="field"><label for="referenceId">Mã tham chiếu</label><input id="referenceId" name="referenceId" type="text" placeholder="Mã đơn, phiếu chi..." /></div>
      <div class="field full"><label for="description">Nội dung</label><input id="description" name="description" type="text" placeholder="Thu tiền đơn hàng, chi nhập vật tư..." required /></div>
    `;
  }

  function renderOrderPaymentForm(order) {
    const today = localDateValue();
    const outstanding = outstandingForOrder(order);
    return `
      <div class="modal-summary full">
        <strong>${order.code}</strong>
        <span>Còn phải thu ${money.format(outstanding)} · Đã thu ${money.format(collectedForOrder(order))}</span>
      </div>
      <div class="field"><label for="transactionDate">Ngày thu</label><input id="transactionDate" name="transactionDate" type="date" value="${today}" required /></div>
      <div class="field"><label for="accountId">Tài khoản nhận tiền</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục thu</label><select id="categoryId" name="categoryId" required>${renderAccountingCategoryOptions("income")}</select></div>
      <div class="field"><label for="amount">Số tiền thu</label><input id="amount" name="amount" type="number" min="1" max="${Math.max(1, outstanding)}" step="1" value="${Math.max(0, outstanding)}" required /></div>
      <div class="field full"><label for="description">Nội dung</label><input id="description" name="description" type="text" value="Thu tiền đơn ${order.code}" required /></div>
    `;
  }

  function renderOrderReturnForm(order) {
    const rows = (order.items || []).map(item => {
      const returned = returnedOrderItemQuantity(item.id);
      const available = Math.max(0, item.quantity - returned);
      if (!available) return "";
      return `
        <div class="purchase-return-row">
          <div><strong>${item.name}</strong><small>${item.sku} · Có thể trả ${available}/${item.quantity} · ${money.format(item.unitPrice)}</small></div>
          <div class="field compact-field"><label>Số lượng trả</label><input type="number" min="0" max="${available}" step="1" value="0" data-order-return-quantity data-order-item-id="${item.id}" data-unit-price="${item.unitPrice}" /></div>
        </div>
      `;
    }).join("");
    const refundFields = isAdmin() ? `
      <div class="return-refund-fields full">
        <div class="field"><label for="refundAmount">Hoàn tiền ngay</label><input id="refundAmount" name="refundAmount" type="number" min="0" step="1" value="0" data-order-return-refund /></div>
        <div class="field"><label for="refundDate">Ngày hoàn</label><input id="refundDate" name="refundDate" type="date" value="${localDateValue()}" /></div>
        <div class="field"><label for="accountId">Tài khoản hoàn</label><select id="accountId" name="accountId">${renderAccountingAccountOptions()}</select></div>
        <div class="field"><label for="categoryId">Danh mục chi</label><select id="categoryId" name="categoryId">${renderAccountingCategoryOptions("expense")}</select></div>
      </div>
    ` : "";
    return `
      <input type="hidden" name="orderId" value="${order.id}" />
      <div class="modal-summary full"><strong>${order.code} · ${getCustomer(order).name}</strong><span>Giá trị còn lại ${money.format(order.netTotal)} · Đã hoàn ${money.format(order.refundedAmount)}</span></div>
      <div class="purchase-return-list full">${rows}</div>
      <div class="modal-summary full"><span>Giá trị hàng đang chọn</span><strong data-order-return-preview>${money.format(0)}</strong></div>
      ${refundFields}
      <div class="field full"><label for="note">Lý do trả hàng</label><input id="note" name="note" type="text" placeholder="Hàng lỗi, khách đổi ý, giao sai..." required /></div>
    `;
  }

  function updateOrderReturnPreview(form) {
    if (!form) return;
    const order = byId("orders", new FormData(form).get("orderId"));
    const returnAmount = [...form.querySelectorAll("[data-order-return-quantity]")].reduce((sum, input) => {
      return sum + Number(input.value || 0) * Number(input.dataset.unitPrice || 0);
    }, 0);
    const output = form.querySelector("[data-order-return-preview]");
    if (output) output.textContent = money.format(returnAmount);
    const refundInput = form.querySelector("[data-order-return-refund]");
    if (refundInput && order) {
      const unrefundedReturns = Math.max(0, order.returnedAmount - order.refundedAmount);
      const cashAvailable = Math.max(0, collectedForOrder(order) - order.refundedAmount);
      const maximum = Math.max(0, Math.min(unrefundedReturns + returnAmount, cashAvailable));
      refundInput.max = String(maximum);
      if (Number(refundInput.value || 0) > maximum) refundInput.value = maximum;
    }
  }

  function renderOrderRefundForm(order) {
    const maximum = refundableForOrder(order);
    return `
      <div class="modal-summary full"><strong>${order.code} · ${getCustomer(order).name}</strong><span>Chờ hoàn ${money.format(maximum)} · Đã hoàn ${money.format(order.refundedAmount)}</span></div>
      <div class="field"><label for="refundDate">Ngày hoàn</label><input id="refundDate" name="refundDate" type="date" value="${localDateValue()}" required /></div>
      <div class="field"><label for="amount">Số tiền hoàn</label><input id="amount" name="amount" type="number" min="1" max="${Math.max(1, maximum)}" step="1" value="${maximum}" required /></div>
      <div class="field"><label for="accountId">Tài khoản hoàn</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục chi</label><select id="categoryId" name="categoryId" required>${renderAccountingCategoryOptions("expense")}</select></div>
      <div class="field full"><label for="note">Nội dung</label><input id="note" name="note" value="Hoàn tiền đơn ${order.code}" required /></div>
    `;
  }

  function renderAccountingAccountForm(account) {
    return `
      <div class="field"><label for="name">Tên tài khoản</label><input id="name" name="name" type="text" placeholder="VCB công ty, tiền mặt cửa hàng..." value="${account ? account.name : ""}" required /></div>
      <div class="field"><label for="type">Loại tài khoản</label><select id="type" name="type" required><option value="cash" ${account && account.type === "cash" ? "selected" : ""}>Tiền mặt</option><option value="bank" ${account && account.type === "bank" ? "selected" : ""}>Ngân hàng</option><option value="wallet" ${account && account.type === "wallet" ? "selected" : ""}>Ví / COD</option><option value="other" ${account && account.type === "other" ? "selected" : ""}>Khác</option></select></div>
      <div class="field full"><label for="openingBalance">Số dư đầu kỳ</label><input id="openingBalance" name="openingBalance" type="number" step="1000" value="${account ? account.openingBalance : 0}" required /></div>
    `;
  }

  function renderAccountingReconciliationForm(account) {
    const activeAccounts = (state.accountingAccounts || []).filter(item => item.status === "active");
    const selectedAccount = account || activeAccounts[0];
    const today = localDateValue();
    return `
      <div class="field full"><label for="accountId">Tài khoản đối soát</label><select id="accountId" name="accountId" required data-reconciliation-account>${activeAccounts.map(item => `<option value="${item.id}" ${selectedAccount && item.id === selectedAccount.id ? "selected" : ""}>${item.name} · ${money.format(item.currentBalance)}</option>`).join("")}</select></div>
      <div class="field"><label for="reconciledAt">Ngày đối soát</label><input id="reconciledAt" name="reconciledAt" type="date" value="${today}" required /></div>
      <div class="field"><label for="actualBalance">Số dư thực tế</label><input id="actualBalance" name="actualBalance" type="number" step="1000" value="${selectedAccount ? selectedAccount.currentBalance : 0}" required data-reconciliation-actual /></div>
      <div class="reconciliation-preview full" data-reconciliation-preview>
        <span><small>Số dư sổ</small><b data-reconciliation-system>${money.format(selectedAccount ? selectedAccount.currentBalance : 0)}</b></span>
        <span><small>Số dư thực tế</small><b data-reconciliation-actual-output>${money.format(selectedAccount ? selectedAccount.currentBalance : 0)}</b></span>
        <span><small>Chênh lệch</small><b data-reconciliation-difference>${money.format(0)}</b></span>
      </div>
      <div class="field full"><label for="note">Ghi chú</label><input id="note" name="note" type="text" placeholder="Nguyên nhân chênh lệch, mã sao kê, người kiểm tra..." /></div>
    `;
  }

  function updateReconciliationPreview(form) {
    if (!form) return;
    const accountSelect = form.querySelector("[data-reconciliation-account]");
    const actualInput = form.querySelector("[data-reconciliation-actual]");
    if (!accountSelect || !actualInput) return;
    const account = byId("accountingAccounts", accountSelect.value);
    const systemBalance = account ? account.currentBalance : 0;
    const actualBalance = Number(actualInput.value || 0);
    const difference = actualBalance - systemBalance;
    const systemOutput = form.querySelector("[data-reconciliation-system]");
    const actualOutput = form.querySelector("[data-reconciliation-actual-output]");
    const differenceOutput = form.querySelector("[data-reconciliation-difference]");
    const preview = form.querySelector("[data-reconciliation-preview]");
    if (systemOutput) systemOutput.textContent = money.format(systemBalance);
    if (actualOutput) actualOutput.textContent = money.format(actualBalance);
    if (differenceOutput) differenceOutput.textContent = `${difference > 0 ? "+" : ""}${money.format(difference)}`;
    if (preview) preview.classList.toggle("has-difference", difference !== 0);
  }

  function renderAccountingCategoryForm(category) {
    return `
      <div class="field"><label for="name">Tên danh mục</label><input id="name" name="name" type="text" placeholder="Phí sàn, văn phòng phẩm, thu hoàn COD..." value="${category ? category.name : ""}" required /></div>
      <div class="field"><label for="type">Loại</label><select id="type" name="type" required><option value="expense" ${category && category.type === "expense" ? "selected" : ""}>Chi</option><option value="income" ${category && category.type === "income" ? "selected" : ""}>Thu</option></select></div>
    `;
  }

  function renderStockReceiveForm() {
    return `
      <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptions()}</select></div>
      <div class="field"><label for="quantity">Số lượng nhập thêm</label><input id="quantity" name="quantity" type="number" min="1" step="1" value="1" required /></div>
      <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" placeholder="Nhập hàng từ nhà cung cấp" /></div>
    `;
  }

  function renderStockAdjustForm() {
    return `
      <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptions()}</select></div>
      <div class="field"><label for="stock">Tồn thực tế sau kiểm</label><input id="stock" name="stock" type="number" min="0" step="1" value="0" required /></div>
      <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" placeholder="Kiểm kho định kỳ, hàng lỗi, thất lạc..." /></div>
    `;
  }

  function renderOrderFulfillmentForm(order) {
    order = order || {};
    return `
      <div class="field"><label for="shippingStatus">Vận chuyển</label><select id="shippingStatus" name="shippingStatus" required>${renderOptions(shippingStatuses, order.shippingStatus || "none")}</select></div>
      <div class="field"><label for="carrier">Đơn vị giao</label><select id="carrier" name="carrier">${renderOptions(carriers, order.carrier || "none")}</select></div>
      <div class="field full"><label for="trackingCode">Mã vận đơn</label><input id="trackingCode" name="trackingCode" type="text" placeholder="Mã từ sàn hoặc đơn vị vận chuyển" value="${String(order.trackingCode || "").replace(/"/g, "&quot;")}" /></div>
    `;
  }

  function renderOrderForm() {
    const customerOptions = state.customers.filter(customer => customer.status === "active").map(customer => `<option value="${customer.id}">${customer.name}</option>`).join("");
    return `
      <div class="field"><label for="customerId">Khách hàng</label><select id="customerId" name="customerId" required>${customerOptions}</select></div>
      <div class="field"><label for="channel">Kênh bán</label><select id="channel" name="channel" required>${renderOptions(channels, "pos")}</select></div>
      <div class="field"><label for="status">Trạng thái đơn</label><select id="status" name="status" required><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="packed">Đã đóng gói</option><option value="shipping">Đang giao</option><option value="completed">Hoàn tất</option></select></div>
      <div class="field"><label for="paymentStatus">Thanh toán</label><select id="paymentStatus" name="paymentStatus" required>${renderOptions(paymentStatuses, "unpaid")}</select></div>
      <div class="field"><label for="paymentMethod">Phương thức</label><select id="paymentMethod" name="paymentMethod" required><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="cod">COD</option><option value="ecommerce">Sàn TMĐT</option></select></div>
      <div class="field"><label for="shippingStatus">Vận chuyển</label><select id="shippingStatus" name="shippingStatus" required>${renderOptions(shippingStatuses, "none")}</select></div>
      <div class="field"><label for="carrier">Đơn vị giao</label><select id="carrier" name="carrier">${renderOptions(carriers, "none")}</select></div>
      <div class="field"><label for="discount">Giảm giá</label><input id="discount" name="discount" type="number" min="0" step="1000" value="0" data-order-money /></div>
      <div class="field"><label for="shippingFee">Phí giao hàng</label><input id="shippingFee" name="shippingFee" type="number" min="0" step="1000" value="0" data-order-money /></div>
      <div class="field full"><label for="trackingCode">Mã vận đơn</label><input id="trackingCode" name="trackingCode" type="text" placeholder="VD: SPXVN..., GHTK..., GHN..." /></div>
      <div class="field full">
        <div class="order-builder-header">
          <label>Sản phẩm trong đơn</label>
          <button class="link-button" type="button" data-add-order-item>Thêm dòng</button>
        </div>
        <div class="order-items" data-order-items>${renderOrderItemRow()}</div>
      </div>
      <div class="field full"><label for="note">Ghi chú</label><input id="note" name="note" type="text" placeholder="Ghi chú giao hàng, kênh bán, mã sàn..." /></div>
      <div class="order-total full" data-order-total>Tạm tính: ${money.format(0)}</div>
    `;
  }

  function updateOrderTotalPreview(form) {
    if (!form) return;
    const output = form.querySelector("[data-order-total]");
    const rows = [...form.querySelectorAll("[data-order-item-row]")];
    const subtotal = rows.reduce((sum, row) => {
      const product = byId("products", row.querySelector("[data-order-product]").value);
      const quantity = Number(row.querySelector("[data-order-quantity]").value || 0);
      return sum + (product ? product.salePrice * quantity : 0);
    }, 0);
    const discount = Number(form.discount && form.discount.value || 0);
    const shippingFee = Number(form.shippingFee && form.shippingFee.value || 0);
    const total = Math.max(0, subtotal - discount + shippingFee);
    if (output) output.textContent = `Tạm tính: ${money.format(subtotal)} · Tổng thanh toán: ${money.format(total)}`;
    const subtotalOutput = form.querySelector("[data-summary-subtotal]");
    const discountOutput = form.querySelector("[data-summary-discount]");
    const shippingOutput = form.querySelector("[data-summary-shipping]");
    const totalOutput = form.querySelector("[data-summary-total]");
    if (subtotalOutput) subtotalOutput.textContent = money.format(subtotal);
    if (discountOutput) discountOutput.textContent = money.format(discount);
    if (shippingOutput) shippingOutput.textContent = money.format(shippingFee);
    if (totalOutput) totalOutput.textContent = money.format(total);
    const emptyCart = form.querySelector("[data-order-empty-cart]");
    const cartCount = form.querySelector("[data-order-cart-count]");
    if (emptyCart) emptyCart.hidden = rows.length > 0;
    if (cartCount) cartCount.textContent = `${rows.length} dòng`;
  }

  async function submitOrderForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const customer = byId("customers", data.customerId);
    const items = [...form.querySelectorAll("[data-order-item-row]")].map(row => ({
      productId: row.querySelector("[data-order-product]").value,
      quantity: Number(row.querySelector("[data-order-quantity]").value)
    }));
    if (!customer || !items.length) throw new Error("Cần chọn khách hàng và ít nhất một sản phẩm.");
    items.forEach(item => {
      const product = byId("products", item.productId);
      if (!product || item.quantity < 1) throw new Error("Dòng sản phẩm trong đơn chưa hợp lệ.");
      if (product.stock < item.quantity) throw new Error(`Tồn kho không đủ cho ${product.name}.`);
    });
    const dataFromApi = await apiRequest("/orders/create", {
      method: "POST",
      body: JSON.stringify({
        customerId: data.customerId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        channel: data.channel,
        shippingStatus: data.shippingStatus,
        carrier: data.carrier === "none" ? "" : data.carrier,
        trackingCode: data.trackingCode || "",
        discount: Number(data.discount || 0),
        shippingFee: Number(data.shippingFee || 0),
        note: data.note || "",
        items
      })
    });
    state.orders.unshift(normalizeOrder(dataFromApi.order));
    await Promise.all([loadProducts({ quiet: true }), loadCustomers({ quiet: true })]);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã tạo đơn và trừ tồn kho.");
    return dataFromApi.order;
  }

  function renderOrderCreatePage() {
    if (!els.orderCreateForm) return;
    if (!canManageOrders()) {
      els.orderCreateForm.innerHTML = `<section class="panel empty-state"><h2>Bạn không có quyền tạo đơn</h2><p>Vui lòng dùng tài khoản admin hoặc bán hàng.</p></section>`;
      return;
    }
    if (!canCreateOrder()) {
      els.orderCreateForm.innerHTML = `<section class="panel empty-state"><h2>Cần dữ liệu bán hàng</h2><p>Hãy tạo ít nhất một khách hàng và một sản phẩm đang hoạt động trước khi tạo đơn.</p><div class="form-actions"><a class="button ghost" href="./customers.html">Khách hàng</a><a class="button primary" href="./products.html">Sản phẩm</a></div></section>`;
      return;
    }
    const customerOptions = state.customers.filter(customer => customer.status === "active").map(customer => `<option value="${customer.id}">${customer.name} · ${customer.phone}</option>`).join("");
    els.orderCreateForm.innerHTML = `
      <section class="order-compose-grid">
        <div class="order-compose-main">
          <section class="panel order-compose-section">
            <div class="panel-header"><div><h2>Sản phẩm trong đơn</h2><p>Tìm nhanh SKU, tên hoặc danh mục; bấm sản phẩm để thêm vào giỏ.</p></div></div>
            <div class="order-builder-layout">
              ${renderProductPicker()}
              <div class="order-cart-panel">
                <div class="order-cart-heading">
                  <strong>Giỏ hàng</strong>
                  <span data-order-cart-count>0 dòng</span>
                </div>
                <div class="order-empty-cart" data-order-empty-cart>Chọn sản phẩm từ danh sách để bắt đầu tạo đơn.</div>
                <div class="order-items order-items-large" data-order-items></div>
              </div>
            </div>
          </section>

          <section class="panel order-compose-section order-customer-section">
            <div class="panel-header"><div><h2>Khách hàng và kênh bán</h2><p>Chọn người mua, nguồn đơn và ghi chú xử lý.</p></div></div>
            <div class="form-grid compact-grid">
              <div class="field full"><label for="customerId">Khách hàng</label><select id="customerId" name="customerId" required>${customerOptions}</select></div>
              <div class="field"><label for="channel">Kênh bán</label><select id="channel" name="channel" required>${renderOptions(channels, "pos")}</select></div>
              <div class="field"><label for="paymentMethod">Phương thức</label><select id="paymentMethod" name="paymentMethod" required><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="cod">COD</option><option value="ecommerce">Sàn TMĐT</option></select></div>
              <div class="field full"><label for="note">Ghi chú nội bộ</label><input id="note" name="note" type="text" placeholder="Yêu cầu giao hàng, nguồn inbox, mã đơn sàn..." /></div>
            </div>
          </section>
        </div>

        <aside class="order-summary-panel">
          <section class="panel order-compose-section sticky-summary">
            <div class="panel-header"><div><h2>Thanh toán và giao hàng</h2><p>Hoàn tất trạng thái trước khi lưu đơn.</p></div></div>
            <div class="form-grid summary-grid">
              <div class="field"><label for="status">Trạng thái đơn</label><select id="status" name="status" required><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="packed">Đã đóng gói</option><option value="shipping">Đang giao</option><option value="completed">Hoàn tất</option></select></div>
              <div class="field"><label for="paymentStatus">Thanh toán</label><select id="paymentStatus" name="paymentStatus" required>${renderOptions(paymentStatuses, "unpaid")}</select></div>
              <div class="field"><label for="shippingStatus">Vận chuyển</label><select id="shippingStatus" name="shippingStatus" required>${renderOptions(shippingStatuses, "none")}</select></div>
              <div class="field"><label for="carrier">Đơn vị giao</label><select id="carrier" name="carrier">${renderOptions(carriers, "none")}</select></div>
              <div class="field full"><label for="trackingCode">Mã vận đơn</label><input id="trackingCode" name="trackingCode" type="text" placeholder="SPXVN..., GHTK..., GHN..." /></div>
              <div class="field"><label for="discount">Giảm giá</label><input id="discount" name="discount" type="number" min="0" step="1000" value="0" data-order-money /></div>
              <div class="field"><label for="shippingFee">Phí giao hàng</label><input id="shippingFee" name="shippingFee" type="number" min="0" step="1000" value="0" data-order-money /></div>
            </div>
            <div class="summary-lines">
              <div><span>Tạm tính</span><strong data-summary-subtotal>${money.format(0)}</strong></div>
              <div><span>Giảm giá</span><strong data-summary-discount>${money.format(0)}</strong></div>
              <div><span>Phí giao hàng</span><strong data-summary-shipping>${money.format(0)}</strong></div>
              <div class="summary-total"><span>Tổng thanh toán</span><strong data-summary-total>${money.format(0)}</strong></div>
            </div>
            <div class="form-actions order-submit-actions">
              <a class="button ghost" href="./orders.html">Hủy</a>
              <button class="button primary" type="submit">Tạo đơn hàng</button>
            </div>
          </section>
        </aside>
      </section>
    `;
    updateOrderTotalPreview(els.orderCreateForm);
  }

  function renderPurchaseProductPicker() {
    const products = state.products.filter(product => product.status === "active").sort((a, b) => a.name.localeCompare(b.name));
    return `
      <div class="product-picker purchase-product-picker">
        <div class="product-picker-toolbar"><label class="search-box product-picker-search"><span>⌕</span><input type="search" placeholder="Tìm SKU, tên, danh mục..." data-purchase-product-search /></label><span class="pill" data-purchase-product-count>${products.length} sản phẩm</span></div>
        <div class="product-picker-list" data-purchase-product-list>${products.map(product => `
          <button class="product-card" type="button" data-add-product-to-purchase="${product.id}" data-product-search="${escapeAttribute(productSearchText(product))}">
            <span><strong>${product.name}</strong><small>${product.sku} · ${product.category}</small></span>
            <span><strong>${money.format(product.costPrice)}</strong><small>Giá vốn · tồn ${product.stock}</small></span>
          </button>
        `).join("")}</div>
      </div>
    `;
  }

  function renderPurchaseItemRow(productId, values = {}) {
    const product = byId("products", productId);
    if (!product) return "";
    const quantity = Number(values.quantity || 1);
    const unitCost = Number(values.unitCost === undefined ? product.costPrice : values.unitCost);
    return `
      <div class="purchase-item-row" data-purchase-item-row>
        <div class="cart-product-summary"><strong>${product.name}</strong><small>${product.sku} · tồn ${product.stock}</small><input type="hidden" value="${product.id}" data-purchase-product required /></div>
        <div class="field compact-field purchase-quantity-field"><label>Số lượng</label><input type="number" min="1" step="1" value="${quantity}" data-purchase-quantity required /></div>
        <div class="field compact-field purchase-cost-field"><label>Đơn giá nhập</label><input type="number" min="0" step="1000" value="${unitCost}" data-purchase-cost required /></div>
        <strong class="purchase-line-total" data-purchase-line-total>${money.format(quantity * unitCost)}</strong>
        <button class="icon-button" type="button" data-remove-purchase-item aria-label="Xóa dòng">×</button>
      </div>
    `;
  }

  function filterPurchaseProductPicker(input) {
    const panel = input && input.closest(".product-picker");
    if (!panel) return;
    const term = String(input.value || "").trim().toLowerCase();
    let visible = 0;
    panel.querySelectorAll("[data-add-product-to-purchase]").forEach(card => {
      const matched = !term || card.dataset.productSearch.indexOf(term) !== -1;
      card.hidden = !matched;
      if (matched) visible += 1;
    });
    const count = panel.querySelector("[data-purchase-product-count]");
    if (count) count.textContent = `${visible} sản phẩm`;
  }

  function addProductToPurchase(form, productId) {
    const list = form && form.querySelector("[data-purchase-items]");
    const product = byId("products", productId);
    if (!list || !product) return;
    const existing = [...list.querySelectorAll("[data-purchase-item-row]")].find(row => row.querySelector("[data-purchase-product]").value === product.id);
    if (existing) {
      const quantity = existing.querySelector("[data-purchase-quantity]");
      quantity.value = Number(quantity.value || 0) + 1;
    } else {
      list.insertAdjacentHTML("beforeend", renderPurchaseItemRow(product.id));
    }
    updatePurchaseTotalPreview(form);
  }

  function updatePurchaseTotalPreview(form) {
    if (!form) return;
    const rows = [...form.querySelectorAll("[data-purchase-item-row]")];
    let subtotal = 0;
    rows.forEach(row => {
      const quantity = Number(row.querySelector("[data-purchase-quantity]").value || 0);
      const cost = Number(row.querySelector("[data-purchase-cost]").value || 0);
      const lineTotal = Math.max(0, quantity * cost);
      subtotal += lineTotal;
      const output = row.querySelector("[data-purchase-line-total]");
      if (output) output.textContent = money.format(lineTotal);
    });
    const discount = Number(form.discount && form.discount.value || 0);
    const shippingFee = Number(form.shippingFee && form.shippingFee.value || 0);
    const total = Math.max(0, subtotal - discount + shippingFee);
    const outputs = {
      "[data-purchase-summary-subtotal]": subtotal,
      "[data-purchase-summary-discount]": discount,
      "[data-purchase-summary-shipping]": shippingFee,
      "[data-purchase-summary-total]": total
    };
    Object.entries(outputs).forEach(([selector, value]) => { const output = form.querySelector(selector); if (output) output.textContent = money.format(value); });
    const empty = form.querySelector("[data-purchase-empty-cart]");
    const count = form.querySelector("[data-purchase-cart-count]");
    if (empty) empty.hidden = rows.length > 0;
    if (count) count.textContent = `${rows.length} dòng`;
  }

  async function submitPurchaseForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editingOrder = form.dataset.purchaseOrderId ? byId("purchaseOrders", form.dataset.purchaseOrderId) : null;
    const supplier = byId("suppliers", data.supplierId);
    const items = [...form.querySelectorAll("[data-purchase-item-row]")].map(row => ({
      productId: row.querySelector("[data-purchase-product]").value,
      quantity: Number(row.querySelector("[data-purchase-quantity]").value),
      unitCost: Number(row.querySelector("[data-purchase-cost]").value)
    }));
    if (!supplier || !items.length) throw new Error("Cần chọn nhà cung cấp và ít nhất một sản phẩm.");
    if (items.some(item => !item.productId || item.quantity < 1 || item.unitCost < 0)) throw new Error("Dòng hàng nhập chưa hợp lệ.");
    const response = await apiRequest(editingOrder ? "/purchase-orders/update" : "/purchase-orders/create", { method: "POST", body: JSON.stringify({
      id: editingOrder ? editingOrder.id : undefined,
      supplierId: data.supplierId,
      dueDate: data.dueDate || "",
      invoiceNumber: data.invoiceNumber || "",
      discount: Number(data.discount || 0),
      shippingFee: Number(data.shippingFee || 0),
      note: data.note || "",
      items
    }) });
    const savedOrder = normalizePurchaseOrder(response.purchaseOrder);
    if (editingOrder) state.purchaseOrders = state.purchaseOrders.map(order => order.id === savedOrder.id ? savedOrder : order);
    else state.purchaseOrders.unshift(savedOrder);
    await loadPurchasingData({ quiet: true });
    window.ArtFlowPosStore.save(state);
    return response.purchaseOrder;
  }

  function renderPurchaseCreatePage() {
    if (!els.purchaseCreateForm) return;
    const editingOrder = purchaseEditId ? byId("purchaseOrders", purchaseEditId) : null;
    if (purchaseEditId && pageDataReady && !editingOrder) {
      els.purchaseCreateForm.innerHTML = `<section class="panel empty-state"><h2>Không tìm thấy phiếu mua</h2><p>Phiếu có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><div class="form-actions"><a class="button primary" href="./purchasing.html">Về danh sách phiếu</a></div></section>`;
      return;
    }
    if (editingOrder && editingOrder.status !== "draft") {
      els.purchaseCreateForm.innerHTML = `<section class="panel empty-state"><h2>Phiếu mua không thể sửa</h2><p>Chỉ phiếu đang ở trạng thái nháp mới được chỉnh sửa.</p><div class="form-actions"><a class="button primary" href="./purchasing.html">Về danh sách phiếu</a></div></section>`;
      return;
    }
    if (!canCreatePurchase()) {
      els.purchaseCreateForm.innerHTML = `<section class="panel empty-state"><h2>Cần dữ liệu mua hàng</h2><p>Hãy tạo nhà cung cấp và sản phẩm đang hoạt động trước khi lập phiếu mua.</p><div class="form-actions"><a class="button ghost" href="./purchasing.html">Nhà cung cấp</a><a class="button primary" href="./products.html">Sản phẩm</a></div></section>`;
      return;
    }
    els.purchaseCreateForm.dataset.purchaseOrderId = editingOrder ? editingOrder.id : "";
    if (els.title) els.title.textContent = editingOrder ? `Sửa ${editingOrder.code}` : pages.purchaseCreate.title;
    const suppliers = state.suppliers.filter(supplier => supplier.status === "active").map(supplier => `<option value="${supplier.id}">${supplier.name} · ${supplier.phone}</option>`).join("");
    els.purchaseCreateForm.innerHTML = `
      <section class="order-compose-grid purchase-compose-grid">
        <div class="order-compose-main">
          <section class="panel order-compose-section"><div class="panel-header"><div><h2>Hàng hóa cần mua</h2><p>Tìm sản phẩm, nhập số lượng và đơn giá từ báo giá nhà cung cấp.</p></div></div><div class="order-builder-layout purchase-builder-layout">${renderPurchaseProductPicker()}<div class="order-cart-panel"><div class="order-cart-heading"><strong>Danh sách nhập</strong><span data-purchase-cart-count>0 dòng</span></div><div class="order-empty-cart" data-purchase-empty-cart>Chọn sản phẩm để thêm vào phiếu mua.</div><div class="order-items order-items-large purchase-items" data-purchase-items></div></div></div></section>
          <section class="panel order-compose-section order-customer-section"><div class="panel-header"><div><h2>Nhà cung cấp</h2><p>Thông tin đối tác và chứng từ mua hàng.</p></div></div><div class="form-grid compact-grid"><div class="field full"><label for="supplierId">Nhà cung cấp</label><select id="supplierId" name="supplierId" required>${suppliers}</select></div><div class="field"><label for="invoiceNumber">Số hóa đơn</label><input id="invoiceNumber" name="invoiceNumber" placeholder="Mẫu số / số hóa đơn" /></div><div class="field"><label for="dueDate">Hạn thanh toán</label><input id="dueDate" name="dueDate" type="date" /></div><div class="field full"><label for="note">Ghi chú</label><input id="note" name="note" placeholder="Điều khoản mua, người giao, số báo giá..." /></div></div></section>
        </div>
        <aside class="order-summary-panel"><section class="panel order-compose-section sticky-summary"><div class="panel-header"><div><h2>Tổng phiếu mua</h2><p>Phiếu được lưu ở trạng thái nháp trước khi nhận hàng.</p></div></div><div class="form-grid summary-grid"><div class="field"><label for="discount">Chiết khấu</label><input id="discount" name="discount" type="number" min="0" step="1000" value="0" data-purchase-money /></div><div class="field"><label for="shippingFee">Phí vận chuyển</label><input id="shippingFee" name="shippingFee" type="number" min="0" step="1000" value="0" data-purchase-money /></div></div><div class="summary-lines"><div><span>Tạm tính</span><strong data-purchase-summary-subtotal>${money.format(0)}</strong></div><div><span>Chiết khấu</span><strong data-purchase-summary-discount>${money.format(0)}</strong></div><div><span>Phí vận chuyển</span><strong data-purchase-summary-shipping>${money.format(0)}</strong></div><div class="summary-total"><span>Tổng phải trả</span><strong data-purchase-summary-total>${money.format(0)}</strong></div></div><div class="form-actions order-submit-actions"><a class="button ghost" href="./purchasing.html">Hủy</a><button class="button primary" type="submit">Lưu phiếu mua</button></div></section></aside>
      </section>
    `;
    if (editingOrder) {
      els.purchaseCreateForm.supplierId.value = editingOrder.supplierId;
      els.purchaseCreateForm.invoiceNumber.value = editingOrder.invoiceNumber;
      els.purchaseCreateForm.dueDate.value = editingOrder.dueDate;
      els.purchaseCreateForm.note.value = editingOrder.note;
      els.purchaseCreateForm.discount.value = editingOrder.discount;
      els.purchaseCreateForm.shippingFee.value = editingOrder.shippingFee;
      const itemList = els.purchaseCreateForm.querySelector("[data-purchase-items]");
      itemList.innerHTML = editingOrder.items.map(item => renderPurchaseItemRow(item.productId, item)).join("");
      const submitButton = els.purchaseCreateForm.querySelector("button[type='submit']");
      if (submitButton) submitButton.textContent = "Lưu thay đổi";
    }
    updatePurchaseTotalPreview(els.purchaseCreateForm);
  }

  function renderSupplierForm(supplier) {
    return renderTextFields([
      ["name", "Tên nhà cung cấp", "text", "Công ty / hộ kinh doanh", "", supplier ? supplier.name : ""],
      ["phone", "Số điện thoại", "text", "09xx xxx xxx", "", supplier ? supplier.phone : ""],
      ["email", "Email", "email", "ketoan@nhacungcap.vn", "", supplier ? supplier.email : "", false],
      ["taxCode", "Mã số thuế", "text", "010xxxxxxx", "", supplier ? supplier.taxCode : "", false],
      ["address", "Địa chỉ", "text", "Địa chỉ xuất hóa đơn", "", supplier ? supplier.address : "", false],
      ["note", "Ghi chú", "text", "Điều khoản thanh toán, người liên hệ...", "", supplier ? supplier.note : "", false]
    ]);
  }

  function renderPurchasePaymentForm(order) {
    const today = localDateValue();
    const supplier = getSupplier(order);
    return `
      <div class="modal-summary full"><strong>${order.code} · ${supplier.name}</strong><span>Còn phải trả ${money.format(order.outstanding)} · Đã trả ${money.format(order.paidAmount)}</span></div>
      <div class="field"><label for="paymentDate">Ngày thanh toán</label><input id="paymentDate" name="paymentDate" type="date" value="${today}" required /></div>
      <div class="field"><label for="amount">Số tiền</label><input id="amount" name="amount" type="number" min="1" max="${Math.max(1, order.outstanding)}" step="1" value="${order.outstanding}" required /></div>
      <div class="field"><label for="accountId">Tài khoản chi</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục chi</label><select id="categoryId" name="categoryId" required>${renderAccountingCategoryOptions("expense")}</select></div>
      <div class="field full"><label for="note">Nội dung</label><input id="note" name="note" value="Thanh toán ${order.code}" required /></div>
    `;
  }

  function renderSupplierCreditForm(order) {
    const supplier = getSupplier(order);
    const maximum = Math.min(order.outstanding, supplier.creditBalance);
    return `
      <div class="modal-summary full"><strong>${order.code} · ${supplier.name}</strong><span>Còn phải trả ${money.format(order.outstanding)} · Dư có khả dụng ${money.format(supplier.creditBalance)}</span></div>
      <div class="field"><label for="amount">Số tiền bù trừ</label><input id="amount" name="amount" type="number" min="1" max="${Math.max(1, maximum)}" step="1" value="${maximum}" required /></div>
      <div class="field full"><label for="note">Nội dung</label><input id="note" name="note" value="Bù trừ dư có cho ${order.code}" required /></div>
    `;
  }

  function renderSupplierStatement(supplier) {
    const entries = [];
    (state.purchaseOrders || []).filter(order => order.supplierId === supplier.id && order.status === "received").forEach(order => {
      entries.push({ date: order.receivedAt || order.createdAt, label: `Nhận hàng ${order.code}`, kind: "Tăng công nợ", amount: order.total });
    });
    (state.supplierPayments || []).filter(payment => payment.supplierId === supplier.id).forEach(payment => {
      const order = byId("purchaseOrders", payment.purchaseOrderId);
      entries.push({ date: payment.paymentDate || payment.createdAt, label: `Thanh toán ${order ? order.code : "phiếu mua"}`, kind: "Chi tiền", amount: -payment.amount });
    });
    (state.purchaseReturns || []).filter(item => item.supplierId === supplier.id).forEach(item => {
      entries.push({ date: item.createdAt, label: `Trả hàng ${item.code}`, kind: "Giảm công nợ", amount: -item.amount });
    });
    (state.supplierCreditApplications || []).filter(item => item.supplierId === supplier.id).forEach(item => {
      const order = byId("purchaseOrders", item.purchaseOrderId);
      entries.push({ date: item.createdAt, label: `Bù trừ ${order ? order.code : "phiếu mua"}`, kind: "Dùng dư có", amount: -item.amount });
    });
    entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return `
      <div class="supplier-statement-summary full"><span><small>Tổng đã mua</small><strong>${money.format(supplier.totalPurchased)}</strong></span><span><small>Còn phải trả</small><strong>${money.format(supplier.outstanding)}</strong></span><span><small>Dư có</small><strong>${money.format(supplier.creditBalance)}</strong></span></div>
      <div class="statement-list full">${entries.length ? entries.map(entry => `<article><div><strong>${entry.label}</strong><small>${entry.kind} · ${formatDate(entry.date)}</small></div><b class="${entry.amount < 0 ? "positive-text" : ""}">${entry.amount > 0 ? "+" : "−"}${money.format(Math.abs(entry.amount))}</b></article>`).join("") : `<div class="empty">Chưa có giao dịch với nhà cung cấp này.</div>`}</div>
    `;
  }

  function renderPurchaseReturnForm(order) {
    const supplier = getSupplier(order);
    const rows = (order.items || []).map(item => {
      const returned = returnedPurchaseItemQuantity(item.id);
      const available = Math.max(0, item.quantity - returned);
      if (!available) return "";
      return `
        <div class="purchase-return-row">
          <div><strong>${item.name}</strong><small>${item.sku} · Có thể trả ${available}/${item.quantity} · ${money.format(item.unitCost)}</small></div>
          <div class="field compact-field"><label>Số lượng trả</label><input type="number" min="0" max="${available}" step="1" value="0" data-return-quantity data-purchase-order-item-id="${item.id}" data-unit-cost="${item.unitCost}" /></div>
        </div>
      `;
    }).join("");
    return `
      <div class="modal-summary full"><strong>${order.code} · ${supplier.name}</strong><span>Chọn số lượng thực tế gửi trả nhà cung cấp.</span></div>
      <div class="purchase-return-list full">${rows}</div>
      <div class="return-preview full"><span>Giá trị dự kiến giảm</span><strong data-return-preview>${money.format(0)}</strong></div>
      <div class="field full"><label for="note">Lý do trả hàng</label><input id="note" name="note" placeholder="Sai mẫu, lỗi chất lượng, giao dư..." required /></div>
    `;
  }

  function updatePurchaseReturnPreview(form) {
    if (!form) return;
    const amount = [...form.querySelectorAll("[data-return-quantity]")].reduce((sum, input) => {
      return sum + Number(input.value || 0) * Number(input.dataset.unitCost || 0);
    }, 0);
    const output = form.querySelector("[data-return-preview]");
    if (output) output.textContent = money.format(amount);
  }

  function renderUserForm() {
    return `
      <div class="field"><label for="name">Tên nhân viên</label><input id="name" name="name" type="text" placeholder="Nguyễn Văn A" required /></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" placeholder="staff@artflow.vn" required /></div>
      <div class="field"><label for="password">Mật khẩu tạm</label><input id="password" name="password" type="password" placeholder="Ít nhất 8 ký tự" minlength="8" autocomplete="new-password" required /></div>
      <div class="field"><label for="role">Vai trò</label><select id="role" name="role" required><option value="sales">Bán hàng</option><option value="inventory">Kho</option><option value="viewer">Chỉ xem</option><option value="admin">Admin</option></select></div>
    `;
  }

  function renderSpreadsheetImportGuide(kind) {
    const product = kind === "product";
    const columns = product
      ? [["sku / name / category", "Bắt buộc"], ["cost_price / sale_price", "Số không âm, giá bán không thấp hơn giá vốn"], ["stock / low_stock", "Số không âm"], ["brand / barcode / unit", "Thông tin nhận diện, không bắt buộc"], ["weight_grams / dimensions / origin / material", "Thông số sản phẩm"], ["image_url", "Link ảnh người dùng có quyền xem"], ["short_description / key_features", "Nội dung brief"], ["target_audience / seo_keywords", "Thông tin marketing"], ["content_status", "not_started / drafting / review / ready / published"], ["content_owner / content_note", "Người phụ trách và ghi chú"], ["status", "active / archived"]]
      : [["name", "Bắt buộc"], ["phone", "Bắt buộc, duy nhất"], ["email", "Không bắt buộc, không trùng"], ["group", "Mặc định Bán lẻ"], ["status", "active / archived"], ["note", "Không bắt buộc"]];
    return `
      <div class="spreadsheet-guide">
        <div class="spreadsheet-guide-callout"><strong>Khuyên dùng file mẫu Excel</strong><p>File mẫu có sẵn sheet hướng dẫn, tên cột chuẩn, định dạng số điện thoại và hai dòng ví dụ.</p></div>
        <ol>
          <li>Tải file mẫu và mở bằng Excel hoặc Google Sheets.</li>
          <li>Điền dữ liệu tại sheet <strong>${product ? "Sản phẩm" : "Khách hàng"}</strong>, giữ nguyên dòng tiêu đề.</li>
          <li>Xóa các dòng ví dụ, lưu thành <strong>.xlsx</strong> rồi chọn file để nhập.</li>
        </ol>
        <div class="spreadsheet-column-list">${columns.map(([name, rule]) => `<div><code>${name}</code><span>${rule}</span></div>`).join("")}</div>
        <p class="spreadsheet-guide-note">Tối đa 500 dòng / 5 MB. Hệ thống kiểm tra toàn bộ file trước khi ghi. ${product ? "SKU cũ sẽ được cập nhật; thay đổi tồn kho được ghi lịch sử." : "Số điện thoại cũ sẽ được cập nhật; doanh số và lịch sử mua không bị ghi đè."}</p>
        <div class="spreadsheet-guide-actions">
          <button class="button ghost" type="button" data-download-${product ? "product" : "customer"}-template>⇩ Tải file mẫu</button>
          <button class="button primary" type="button" data-choose-${product ? "product" : "customer"}-file>Chọn file Excel</button>
        </div>
      </div>`;
  }

  function openModal(type, options = {}) {
    if (!els.modalBackdrop || !els.modalForm) return;
    if (type === "product" && !canManageProducts()) {
      showToast("Bạn không có quyền quản lý sản phẩm.", "error");
      return;
    }
    if (type === "customer" && !canManageCustomers()) {
      showToast("Bạn không có quyền quản lý khách hàng.", "error");
      return;
    }
    if (type === "order" && !canCreateOrder()) {
      showToast(canManageOrders() ? "Cần có ít nhất một sản phẩm và một khách hàng trước khi tạo đơn." : "Bạn không có quyền tạo đơn hàng.", "error");
      return;
    }
    if (type === "productImport" && !canManageProducts()) {
      showToast("Bạn không có quyền nhập sản phẩm.", "error");
      return;
    }
    if (type === "customerImport" && !canManageCustomers()) {
      showToast("Bạn không có quyền nhập khách hàng.", "error");
      return;
    }
    if ((type === "stockReceive" || type === "stockAdjust") && !canManageInventory()) {
      showToast("Bạn không có quyền quản lý kho.", "error");
      return;
    }
    if (["cashTransaction", "orderPayment", "orderRefund", "accountingAccount", "accountingCategory", "accountingReconciliation"].includes(type) && !canManageAccounting()) {
      showToast("Bạn không có quyền quản lý kế toán.", "error");
      return;
    }
    if (type === "supplier" && !canManagePurchasing()) {
      showToast("Bạn không có quyền quản lý nhà cung cấp.", "error");
      return;
    }
    if (type === "purchaseReturn" && (!options.purchaseOrder || !canReturnPurchaseOrder(options.purchaseOrder))) {
      showToast("Phiếu mua này không còn hàng đủ điều kiện để trả.", "error");
      return;
    }
    if (type === "purchasePayment" && !canPayPurchases()) {
      showToast("Chỉ admin có quyền thanh toán công nợ nhà cung cấp.", "error");
      return;
    }
    if (type === "supplierCredit" && !canPayPurchases()) {
      showToast("Chỉ admin có quyền bù trừ dư có nhà cung cấp.", "error");
      return;
    }
    if (type === "purchasePayment" && (!options.purchaseOrder || options.purchaseOrder.outstanding <= 0)) {
      showToast("Phiếu mua này không còn công nợ phải trả.", "error");
      return;
    }
    if (type === "supplierCredit") {
      const creditOrder = options.purchaseOrder;
      const creditSupplier = creditOrder ? getSupplier(creditOrder) : null;
      if (!creditOrder || creditOrder.outstanding <= 0 || !creditSupplier || creditSupplier.creditBalance <= 0) {
        showToast("Phiếu mua hoặc dư có nhà cung cấp không còn đủ điều kiện bù trừ.", "error");
        return;
      }
    }
    if (type === "purchasePayment" && (!state.accountingAccounts.some(account => account.status === "active") || !state.accountingCategories.some(category => category.status === "active" && category.type === "expense"))) {
      showToast("Cần có tài khoản tiền và danh mục chi trước khi thanh toán nhà cung cấp.", "error");
      return;
    }
    if ((type === "stockReceive" || type === "stockAdjust") && !state.products.some(product => product.status === "active")) {
      showToast("Cần có ít nhất một sản phẩm đang hoạt động để thao tác kho.", "error");
      return;
    }
    if (type === "cashTransaction" && (!state.accountingAccounts.length || !state.accountingCategories.length)) {
      showToast("Cần có tài khoản tiền và danh mục trước khi ghi thu/chi.", "error");
      return;
    }
    if (type === "orderPayment" && (!state.accountingAccounts.length || !state.accountingCategories.some(category => category.status === "active" && category.type === "income"))) {
      showToast("Cần có tài khoản tiền và danh mục thu trước khi ghi thu đơn hàng.", "error");
      return;
    }
    if (type === "orderPayment" && (!options.order || outstandingForOrder(options.order) <= 0)) {
      showToast("Đơn này không còn công nợ phải thu.", "error");
      return;
    }
    if (type === "orderReturn" && (!options.order || !canReturnOrder(options.order))) {
      showToast("Đơn này không còn sản phẩm đủ điều kiện trả.", "error");
      return;
    }
    if (type === "orderRefund" && (!options.order || refundableForOrder(options.order) <= 0)) {
      showToast("Đơn này không còn khoản tiền chờ hoàn.", "error");
      return;
    }
    if (type === "orderRefund" && (!(state.accountingAccounts || []).some(account => account.status === "active") || !(state.accountingCategories || []).some(category => category.status === "active" && category.type === "expense"))) {
      showToast("Cần có tài khoản tiền và danh mục chi trước khi hoàn tiền.", "error");
      return;
    }
    if (type === "accountingReconciliation" && !(state.accountingAccounts || []).some(account => account.status === "active")) {
      showToast("Cần có ít nhất một tài khoản tiền đang hoạt động để đối soát.", "error");
      return;
    }
    if (type === "orderFulfillment" && !options.order) {
      showToast("Không tìm thấy đơn hàng cần cập nhật.", "error");
      return;
    }

    const editingProduct = options.product || null;
    const editingCustomer = options.customer || null;
    const editingOrder = options.order || null;
    const editingAccountingAccount = options.account || null;
    const editingAccountingCategory = options.category || null;
    const editingSupplier = options.supplier || null;
    const editingPurchaseOrder = options.purchaseOrder || null;
    const viewingAuditLog = options.auditLog || null;
    const definitions = {
      productDetail: {
        eyebrow: "Hồ sơ sản phẩm",
        title: editingProduct ? editingProduct.name : "Chi tiết sản phẩm",
        body: editingProduct ? renderProductDetail(editingProduct) : "",
        readOnly: true
      },
      auditDetail: {
        eyebrow: "Nhật ký hệ thống",
        title: viewingAuditLog ? viewingAuditLog.description : "Chi tiết hoạt động",
        body: viewingAuditLog ? renderAuditDetail(viewingAuditLog) : "",
        readOnly: true
      },
      productImport: {
        eyebrow: "Nhập dữ liệu Excel",
        title: "Nhập danh mục sản phẩm",
        body: renderSpreadsheetImportGuide("product"),
        readOnly: true
      },
      customerImport: {
        eyebrow: "Nhập dữ liệu Excel",
        title: "Nhập danh sách khách hàng",
        body: renderSpreadsheetImportGuide("customer"),
        readOnly: true
      },
      product: {
        eyebrow: "Danh mục",
        title: editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm",
        body: renderProductForm(editingProduct),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const costPrice = Number(data.costPrice);
          const salePrice = Number(data.salePrice);
          const stock = Number(data.stock);
          const lowStock = Number(data.lowStock);
          const sku = String(data.sku || "").trim();
          const name = String(data.name || "").trim();
          const category = String(data.category || "").trim();
          if (!sku || !name || !category) throw new Error("Vui lòng nhập đầy đủ SKU, tên và danh mục.");
          if (state.products.some(product => product.id !== (editingProduct && editingProduct.id) && product.sku.toLowerCase() === sku.toLowerCase())) throw new Error("SKU này đã tồn tại.");
          if (salePrice < costPrice) throw new Error("Giá bán nên lớn hơn hoặc bằng giá vốn.");
          if (stock < 0 || lowStock < 0) throw new Error("Tồn kho và ngưỡng cảnh báo không được âm.");
          const payload = {
            ...data,
            id: editingProduct ? editingProduct.id : undefined,
            sku,
            name,
            category,
            costPrice,
            salePrice,
            stock,
            lowStock,
            status: editingProduct ? editingProduct.status : "active"
          };
          const dataFromApi = await apiRequest(editingProduct ? "/products/update" : "/products/create", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          const savedProduct = normalizeProduct(dataFromApi.product);
          if (editingProduct) {
            state.products = state.products.map(product => product.id === savedProduct.id ? savedProduct : product);
          } else {
            state.products.unshift(savedProduct);
          }
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast(dataFromApi.contentSetupWarning
            ? `Đã thêm sản phẩm. Chưa tạo được tài nguyên content: ${dataFromApi.contentSetupWarning}`
            : (editingProduct ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm và tạo tài nguyên content."),
          dataFromApi.contentSetupWarning ? "error" : "success");
        }
      },
      customer: {
        eyebrow: "Khách hàng",
        title: editingCustomer ? "Sửa khách hàng" : "Thêm khách hàng",
        body: renderTextFields([
          ["name", "Tên khách hàng", "text", "Khách hàng mới", "", editingCustomer ? editingCustomer.name : ""],
          ["phone", "Số điện thoại", "text", "09xx xxx xxx", "", editingCustomer ? editingCustomer.phone : ""],
          ["email", "Email", "email", "customer@example.com", "", editingCustomer ? editingCustomer.email : "", false],
          ["group", "Nhóm khách", "text", "Bán lẻ", "", editingCustomer ? editingCustomer.group : "Bán lẻ"],
          ["note", "Ghi chú", "text", "Nguồn khách, sở thích, lưu ý giao hàng...", "", editingCustomer ? editingCustomer.note : "", false]
        ]),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const name = String(data.name || "").trim();
          const phone = String(data.phone || "").trim().replace(/\s+/g, "");
          const email = String(data.email || "").trim();
          const group = String(data.group || "").trim();
          const note = String(data.note || "").trim();
          if (!name || !phone || !group) throw new Error("Vui lòng nhập tên, số điện thoại và nhóm khách.");
          if (state.customers.some(customer => customer.id !== (editingCustomer && editingCustomer.id) && customer.phone === phone)) throw new Error("Số điện thoại khách hàng đã tồn tại.");
          if (email && state.customers.some(customer => customer.id !== (editingCustomer && editingCustomer.id) && customer.email.toLowerCase() === email.toLowerCase())) throw new Error("Email khách hàng đã tồn tại.");
          const payload = {
            id: editingCustomer ? editingCustomer.id : undefined,
            name,
            phone,
            email,
            group,
            note,
            status: editingCustomer ? editingCustomer.status : "active"
          };
          const dataFromApi = await apiRequest(editingCustomer ? "/customers/update" : "/customers/create", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          const savedCustomer = normalizeCustomer(dataFromApi.customer);
          if (editingCustomer) {
            state.customers = state.customers.map(customer => customer.id === savedCustomer.id ? savedCustomer : customer);
          } else {
            state.customers.unshift(savedCustomer);
          }
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast(editingCustomer ? "Đã cập nhật khách hàng." : "Đã thêm khách hàng mới.");
        }
      },
      order: {
        eyebrow: "Bán hàng",
        title: "Tạo đơn hàng",
        body: renderOrderForm(),
        async submit(form) {
          await submitOrderForm(form);
        }
      },
      stockReceive: {
        eyebrow: "Kho hàng",
        title: "Nhập kho",
        body: renderStockReceiveForm(),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const product = byId("products", data.productId);
          const quantity = Number(data.quantity);
          if (!product || quantity < 1) throw new Error("Vui lòng chọn sản phẩm và số lượng nhập hợp lệ.");
          const dataFromApi = await apiRequest("/stock/receive", {
            method: "POST",
            body: JSON.stringify({
              productId: data.productId,
              quantity,
              reason: data.reason || ""
            })
          });
          const savedProduct = normalizeProduct(dataFromApi.product);
          state.products = state.products.map(item => item.id === savedProduct.id ? savedProduct : item);
          await loadStockMovements({ quiet: true });
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast("Đã nhập kho và ghi lịch sử.");
        }
      },
      stockAdjust: {
        eyebrow: "Kiểm kho",
        title: "Điều chỉnh tồn",
        body: renderStockAdjustForm(),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const product = byId("products", data.productId);
          const stock = Number(data.stock);
          if (!product || stock < 0) throw new Error("Vui lòng chọn sản phẩm và tồn thực tế hợp lệ.");
          const dataFromApi = await apiRequest("/stock/adjust", {
            method: "POST",
            body: JSON.stringify({
              productId: data.productId,
              stock,
              reason: data.reason || ""
            })
          });
          const savedProduct = normalizeProduct(dataFromApi.product);
          state.products = state.products.map(item => item.id === savedProduct.id ? savedProduct : item);
          await loadStockMovements({ quiet: true });
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast("Đã điều chỉnh tồn kho.");
        }
      },
      orderFulfillment: {
        eyebrow: "Vận chuyển",
        title: editingOrder ? `Cập nhật ${editingOrder.code}` : "Cập nhật vận đơn",
        body: editingOrder ? renderOrderFulfillmentForm(editingOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          await updateOrderFulfillment(editingOrder.id, {
            shippingStatus: data.shippingStatus,
            carrier: data.carrier === "none" ? "" : data.carrier,
            trackingCode: data.trackingCode || ""
          });
        }
      },
      cashTransaction: {
        eyebrow: "Kế toán",
        title: "Ghi thu / chi",
        body: renderCashTransactionForm(),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const amount = Number(data.amount);
          if (!data.accountId || !data.categoryId || amount <= 0 || !String(data.description || "").trim()) {
            throw new Error("Vui lòng nhập đủ tài khoản, danh mục, số tiền và nội dung.");
          }
          const dataFromApi = await apiRequest("/accounting/transactions/create", {
            method: "POST",
            body: JSON.stringify({
              type: data.type,
              accountId: data.accountId,
              categoryId: data.categoryId,
              amount,
              transactionDate: data.transactionDate,
              description: data.description,
              referenceType: "manual",
              referenceId: data.referenceId || ""
            })
          });
          state.cashTransactions.unshift(normalizeCashTransaction(dataFromApi.transaction));
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast("Đã ghi nhận giao dịch thu/chi.");
        }
      },
      orderPayment: {
        eyebrow: "Công nợ",
        title: editingOrder ? `Ghi thu ${editingOrder.code}` : "Ghi thu đơn hàng",
        body: editingOrder ? renderOrderPaymentForm(editingOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          await recordOrderPayment(editingOrder.id, {
            accountId: data.accountId,
            categoryId: data.categoryId,
            amount: Number(data.amount),
            transactionDate: data.transactionDate,
            description: data.description
          });
        }
      },
      orderReturn: {
        eyebrow: "Đổi trả bán hàng",
        title: editingOrder ? `Trả hàng ${editingOrder.code}` : "Trả hàng khách mua",
        body: editingOrder ? renderOrderReturnForm(editingOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const items = [...form.querySelectorAll("[data-order-return-quantity]")]
            .map(input => ({ orderItemId: input.dataset.orderItemId, quantity: Number(input.value || 0) }))
            .filter(item => item.quantity > 0);
          if (!items.length) throw new Error("Cần nhập số lượng cho ít nhất một sản phẩm trả lại.");
          const response = await apiRequest("/orders/return", {
            method: "POST",
            body: JSON.stringify({
              id: editingOrder.id,
              items,
              note: String(data.note || "").trim(),
              refundAmount: Number(data.refundAmount || 0),
              refundDate: data.refundDate || "",
              accountId: data.accountId || "",
              categoryId: data.categoryId || "",
              refundNote: data.note ? `Hoàn tiền: ${data.note}` : ""
            })
          });
          const savedOrder = normalizeOrder(response.order);
          state.orders = state.orders.map(item => item.id === savedOrder.id ? savedOrder : item);
          if (response.salesReturn) state.salesReturns.unshift(normalizeSalesReturn(response.salesReturn));
          if (response.refund) state.orderRefunds.unshift(normalizeOrderRefund(response.refund));
          if (response.transaction) state.cashTransactions.unshift(normalizeCashTransaction(response.transaction));
          if (response.customer) {
            const savedCustomer = normalizeCustomer(response.customer);
            state.customers = state.customers.map(item => item.id === savedCustomer.id ? savedCustomer : item);
          }
          await Promise.all([loadOrders({ quiet: true }), loadAccountingData({ quiet: true }), loadCustomers({ quiet: true }), loadProducts({ quiet: true }), loadStockMovements({ quiet: true })]);
          renderPage();
          showToast(response.refund ? "Đã nhận hàng trả, hoàn kho và hoàn tiền." : "Đã nhận hàng trả và hoàn lại tồn kho.");
        }
      },
      orderRefund: {
        eyebrow: "Hoàn tiền khách hàng",
        title: editingOrder ? `Hoàn tiền ${editingOrder.code}` : "Hoàn tiền đơn hàng",
        body: editingOrder ? renderOrderRefundForm(editingOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const response = await apiRequest("/orders/refund", {
            method: "POST",
            body: JSON.stringify({ id: editingOrder.id, amount: Number(data.amount), refundDate: data.refundDate, accountId: data.accountId, categoryId: data.categoryId, note: data.note || "" })
          });
          const savedOrder = normalizeOrder(response.order);
          state.orders = state.orders.map(item => item.id === savedOrder.id ? savedOrder : item);
          if (response.refund) state.orderRefunds.unshift(normalizeOrderRefund(response.refund));
          if (response.transaction) state.cashTransactions.unshift(normalizeCashTransaction(response.transaction));
          await Promise.all([loadOrders({ quiet: true }), loadAccountingData({ quiet: true })]);
          renderPage();
          showToast(refundableForOrder(savedOrder) > 0 ? "Đã hoàn một phần tiền cho khách." : "Đã hoàn đủ số tiền cần trả khách.");
        }
      },
      accountingAccount: {
        eyebrow: "Tài khoản tiền",
        title: editingAccountingAccount ? "Sửa tài khoản" : "Thêm tài khoản",
        body: renderAccountingAccountForm(editingAccountingAccount),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const openingBalance = Number(data.openingBalance || 0);
          if (!String(data.name || "").trim() || !isFinite(openingBalance)) throw new Error("Tài khoản tiền chưa hợp lệ.");
          const dataFromApi = await apiRequest(editingAccountingAccount ? "/accounting/accounts/update" : "/accounting/accounts/create", {
            method: "POST",
            body: JSON.stringify({
              id: editingAccountingAccount ? editingAccountingAccount.id : undefined,
              name: data.name,
              type: data.type,
              openingBalance
            })
          });
          const savedAccount = normalizeAccountingAccount(dataFromApi.account);
          if (editingAccountingAccount) {
            state.accountingAccounts = state.accountingAccounts.map(account => account.id === savedAccount.id ? savedAccount : account);
          } else {
            state.accountingAccounts.unshift(savedAccount);
          }
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast(editingAccountingAccount ? "Đã cập nhật tài khoản tiền." : "Đã thêm tài khoản tiền.");
        }
      },
      accountingReconciliation: {
        eyebrow: "Đối soát",
        title: editingAccountingAccount ? `Đối soát ${editingAccountingAccount.name}` : "Đối soát tài khoản",
        body: renderAccountingReconciliationForm(editingAccountingAccount),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const actualBalance = Number(data.actualBalance);
          if (!data.accountId || !isFinite(actualBalance)) throw new Error("Số dư đối soát chưa hợp lệ.");
          const dataFromApi = await apiRequest("/accounting/reconciliations/create", {
            method: "POST",
            body: JSON.stringify({
              accountId: data.accountId,
              actualBalance,
              reconciledAt: data.reconciledAt,
              note: data.note || ""
            })
          });
          state.accountingReconciliations.unshift(normalizeAccountingReconciliation(dataFromApi.reconciliation));
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast(dataFromApi.reconciliation.difference === 0 ? "Đối soát hoàn tất, số dư đã khớp." : "Đã lưu đối soát và ghi nhận chênh lệch.");
        }
      },
      accountingCategory: {
        eyebrow: "Danh mục kế toán",
        title: editingAccountingCategory ? "Sửa danh mục" : "Thêm danh mục",
        body: renderAccountingCategoryForm(editingAccountingCategory),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const name = String(data.name || "").trim();
          if (!name) throw new Error("Tên danh mục chưa hợp lệ.");
          const dataFromApi = await apiRequest(editingAccountingCategory ? "/accounting/categories/update" : "/accounting/categories/create", {
            method: "POST",
            body: JSON.stringify({
              id: editingAccountingCategory ? editingAccountingCategory.id : undefined,
              name,
              type: data.type
            })
          });
          const savedCategory = normalizeAccountingCategory(dataFromApi.category);
          if (editingAccountingCategory) {
            state.accountingCategories = state.accountingCategories.map(category => category.id === savedCategory.id ? savedCategory : category);
          } else {
            state.accountingCategories.unshift(savedCategory);
          }
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast(editingAccountingCategory ? "Đã cập nhật danh mục kế toán." : "Đã thêm danh mục kế toán.");
        }
      },
      supplier: {
        eyebrow: "Nhà cung cấp",
        title: editingSupplier ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp",
        body: renderSupplierForm(editingSupplier),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const path = editingSupplier ? "/suppliers/update" : "/suppliers/create";
          const response = await apiRequest(path, { method: "POST", body: JSON.stringify({ ...data, id: editingSupplier ? editingSupplier.id : undefined }) });
          const saved = normalizeSupplier(response.supplier);
          state.suppliers = editingSupplier ? state.suppliers.map(item => item.id === saved.id ? saved : item) : [saved, ...state.suppliers];
          await loadPurchasingData({ quiet: true });
          renderPage();
          showToast(editingSupplier ? "Đã cập nhật nhà cung cấp." : "Đã thêm nhà cung cấp.");
        }
      },
      purchasePayment: {
        eyebrow: "Công nợ phải trả",
        title: editingPurchaseOrder ? `Thanh toán ${editingPurchaseOrder.code}` : "Thanh toán phiếu mua",
        body: editingPurchaseOrder ? renderPurchasePaymentForm(editingPurchaseOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const response = await apiRequest("/purchase-orders/pay", { method: "POST", body: JSON.stringify({ id: editingPurchaseOrder.id, amount: Number(data.amount), accountId: data.accountId, categoryId: data.categoryId, paymentDate: data.paymentDate, note: data.note || "" }) });
          const saved = normalizePurchaseOrder(response.purchaseOrder);
          state.purchaseOrders = state.purchaseOrders.map(item => item.id === saved.id ? saved : item);
          await Promise.all([loadPurchasingData({ quiet: true }), loadAccountingData({ quiet: true })]);
          renderPage();
          showToast(saved.outstanding <= 0 ? "Đã thanh toán đủ công nợ phiếu mua." : "Đã ghi nhận thanh toán một phần.");
        }
      },
      supplierCredit: {
        eyebrow: "Dư có nhà cung cấp",
        title: editingPurchaseOrder ? `Bù trừ ${editingPurchaseOrder.code}` : "Bù trừ công nợ",
        body: editingPurchaseOrder ? renderSupplierCreditForm(editingPurchaseOrder) : "",
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const response = await apiRequest("/purchase-orders/apply-credit", {
            method: "POST",
            body: JSON.stringify({ id: editingPurchaseOrder.id, amount: Number(data.amount), note: data.note || "" })
          });
          const savedOrder = normalizePurchaseOrder(response.purchaseOrder);
          state.purchaseOrders = state.purchaseOrders.map(item => item.id === savedOrder.id ? savedOrder : item);
          if (response.supplier) {
            const savedSupplier = normalizeSupplier(response.supplier);
            state.suppliers = state.suppliers.map(item => item.id === savedSupplier.id ? savedSupplier : item);
          }
          if (response.creditApplication) state.supplierCreditApplications.unshift(normalizeSupplierCreditApplication(response.creditApplication));
          await loadPurchasingData({ quiet: true });
          renderPage();
          showToast(savedOrder.outstanding <= 0 ? "Đã bù trừ đủ công nợ phiếu mua." : "Đã bù trừ một phần công nợ.");
        }
      },
      supplierStatement: {
        eyebrow: "Sổ công nợ nhà cung cấp",
        title: editingSupplier ? editingSupplier.name : "Lịch sử giao dịch",
        body: editingSupplier ? renderSupplierStatement(editingSupplier) : "",
        readOnly: true
      },
      purchaseReturn: {
        eyebrow: "Trả hàng nhà cung cấp",
        title: editingPurchaseOrder ? `Trả hàng ${editingPurchaseOrder.code}` : "Trả hàng mua",
        body: editingPurchaseOrder ? renderPurchaseReturnForm(editingPurchaseOrder) : "",
        async submit(form) {
          const items = [...form.querySelectorAll("[data-return-quantity]")]
            .map(input => ({ purchaseOrderItemId: input.dataset.purchaseOrderItemId, quantity: Number(input.value || 0) }))
            .filter(item => item.quantity > 0);
          const note = String(new FormData(form).get("note") || "").trim();
          if (!items.length) throw new Error("Cần nhập số lượng cho ít nhất một sản phẩm trả lại.");
          if (!note) throw new Error("Vui lòng nhập lý do trả hàng.");
          const response = await apiRequest("/purchase-orders/return", {
            method: "POST",
            body: JSON.stringify({ id: editingPurchaseOrder.id, items, note })
          });
          const savedOrder = normalizePurchaseOrder(response.purchaseOrder);
          state.purchaseOrders = state.purchaseOrders.map(item => item.id === savedOrder.id ? savedOrder : item);
          if (response.supplier) {
            const savedSupplier = normalizeSupplier(response.supplier);
            state.suppliers = state.suppliers.map(item => item.id === savedSupplier.id ? savedSupplier : item);
          }
          if (response.purchaseReturn) state.purchaseReturns.unshift(normalizePurchaseReturn(response.purchaseReturn));
          await loadPurchasingData({ quiet: true });
          renderPage();
          showToast(savedOrder.creditAmount > 0 ? "Đã trả hàng và ghi nhận dư có nhà cung cấp." : "Đã trả hàng, giảm tồn kho và công nợ.");
        }
      },
      user: {
        eyebrow: "Phân quyền",
        title: "Thêm nhân viên",
        body: renderUserForm(),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          await apiRequest("/users/create", { method: "POST", body: JSON.stringify(data) });
          await loadStaffUsers();
          renderUsers();
          showToast("Đã cấp tài khoản nhân viên.");
        }
      }
    };

    const definition = definitions[type];
    if (!definition) return;
    els.modalEyebrow.textContent = definition.eyebrow;
    els.modalTitle.textContent = definition.title;
    els.modalForm.innerHTML = definition.body;
    els.modalForm.insertAdjacentHTML("beforeend", definition.readOnly ? `
      <div class="form-actions"><button class="button primary" type="button" data-close-modal>Đóng</button></div>
    ` : `
      <div class="form-actions"><button class="button ghost" type="button" data-close-modal>Hủy</button><button class="button primary" type="submit">Lưu</button></div>
    `);
    els.modalForm.onsubmit = definition.readOnly ? null : async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button[type='submit']");
      setBusy(button, true, "Đang lưu...");
      try {
        await withLoading("Đang lưu dữ liệu...", () => definition.submit(event.currentTarget));
        closeModal();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setBusy(button, false);
      }
    };
    els.modalBackdrop.hidden = false;
    if (type === "order") updateOrderTotalPreview(els.modalForm);
    if (type === "orderReturn") updateOrderReturnPreview(els.modalForm);
    const firstInput = els.modalForm.querySelector("input, select");
    if (firstInput) firstInput.focus();
  }

  async function archiveProduct(productId, status) {
    const product = byId("products", productId);
    if (!product) return;
    const data = await apiRequest("/products/archive", {
      method: "POST",
      body: JSON.stringify({ id: productId, status })
    });
    const savedProduct = normalizeProduct(data.product);
    state.products = state.products.map(item => item.id === savedProduct.id ? savedProduct : item);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast(savedProduct.status === "active" ? "Đã kích hoạt sản phẩm." : "Đã ngừng bán sản phẩm.");
  }

  async function archiveCustomer(customerId, status) {
    const customer = byId("customers", customerId);
    if (!customer) return;
    const data = await apiRequest("/customers/archive", {
      method: "POST",
      body: JSON.stringify({ id: customerId, status })
    });
    const savedCustomer = normalizeCustomer(data.customer);
    state.customers = state.customers.map(item => item.id === savedCustomer.id ? savedCustomer : item);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast(savedCustomer.status === "active" ? "Đã kích hoạt khách hàng." : "Đã ngừng theo dõi khách hàng.");
  }

  async function updateOrderStatus(orderId, status) {
    const data = await apiRequest("/orders/status", {
      method: "POST",
      body: JSON.stringify({ id: orderId, status })
    });
    const savedOrder = normalizeOrder(data.order);
    state.orders = state.orders.map(order => order.id === savedOrder.id ? savedOrder : order);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã cập nhật trạng thái đơn hàng.");
  }

  async function updateOrderFulfillment(orderId, patch) {
    const data = await apiRequest("/orders/fulfillment", {
      method: "POST",
      body: JSON.stringify({ id: orderId, ...patch })
    });
    const savedOrder = normalizeOrder(data.order);
    state.orders = state.orders.map(order => order.id === savedOrder.id ? savedOrder : order);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã cập nhật đơn hàng.");
  }

  async function cancelOrder(orderId) {
    const data = await apiRequest("/orders/cancel", {
      method: "POST",
      body: JSON.stringify({ id: orderId })
    });
    const savedOrder = normalizeOrder(data.order);
    state.orders = state.orders.map(order => order.id === savedOrder.id ? savedOrder : order);
    await Promise.all([loadProducts({ quiet: true }), loadCustomers({ quiet: true })]);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã hủy đơn và hoàn lại tồn kho.");
  }

  async function recordOrderPayment(orderId, payment = {}) {
    const order = byId("orders", orderId);
    if (!order) throw new Error("Không tìm thấy đơn cần ghi thu.");
    const account = byId("accountingAccounts", payment.accountId) || (state.accountingAccounts || []).find(item => item.status === "active");
    const category = byId("accountingCategories", payment.categoryId) || (state.accountingCategories || []).find(item => item.status === "active" && item.type === "income");
    const outstanding = outstandingForOrder(order);
    const amount = Number(payment.amount || outstanding);
    if (!account || !category) throw new Error("Cần có tài khoản tiền và danh mục thu trước khi ghi thu.");
    if (!isFinite(amount) || amount <= 0 || amount > outstanding) throw new Error("Số tiền thu chưa hợp lệ.");

    await apiRequest("/accounting/transactions/create", {
      method: "POST",
      body: JSON.stringify({
        type: "income",
        accountId: account.id,
        categoryId: category.id,
        amount,
        transactionDate: payment.transactionDate || localDateValue(),
        description: payment.description || "Thu tiền đơn " + order.code,
        referenceType: "order",
        referenceId: order.code
      })
    });
    if (amount >= outstanding) {
      await updateOrderFulfillment(order.id, { paymentStatus: "paid", status: order.status === "pending" ? "paid" : order.status });
    }
    await loadAccountingData({ quiet: true });
    renderPage();
    showToast(amount >= outstanding ? "Đã ghi thu và cập nhật thanh toán đơn hàng." : "Đã ghi nhận khoản thu một phần.");
  }

  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener("submit", event => {
        event.preventDefault();
        submitAuth(event.currentTarget);
      });
    }

    const search = qs("[data-global-search]");
    if (search) {
      search.addEventListener("input", event => {
        searchTerm = event.target.value;
        renderPage();
      });
    }

    [
      [els.orderChannelFilter, "channel"],
      [els.orderStatusFilter, "status"],
      [els.orderPaymentFilter, "paymentStatus"],
      [els.orderShippingFilter, "shippingStatus"]
    ].forEach(([select, key]) => {
      if (!select) return;
      select.addEventListener("change", event => {
        orderFilters[key] = event.target.value;
        renderPage();
      });
    });

    if (els.accountingAccountFilter) {
      els.accountingAccountFilter.addEventListener("change", event => {
        accountingFilters.accountId = event.target.value;
        renderPage();
      });
    }

    if (els.accountingRangeFilter) {
      els.accountingRangeFilter.addEventListener("change", event => {
        accountingFilters.range = event.target.value;
        renderPage();
      });
    }

    if (els.purchaseStatusFilter) {
      els.purchaseStatusFilter.addEventListener("change", event => {
        purchasingFilters.status = event.target.value;
        renderPage();
      });
    }
    if (els.purchasePaymentFilter) {
      els.purchasePaymentFilter.addEventListener("change", event => {
        purchasingFilters.paymentStatus = event.target.value;
        renderPage();
      });
    }
    if (els.auditEntityFilter) {
      els.auditEntityFilter.addEventListener("change", event => {
        auditFilters.entityType = event.target.value;
        renderPage();
      });
    }
    if (els.auditRangeFilter) {
      els.auditRangeFilter.addEventListener("change", event => {
        auditFilters.range = event.target.value;
        renderPage();
      });
    }

    if (els.orderCreateForm) {
      els.orderCreateForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type='submit']");
        setBusy(button, true, "Đang tạo...");
        try {
          await withLoading("Đang tạo đơn hàng...", () => submitOrderForm(event.currentTarget));
          window.location.href = "./orders.html";
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          setBusy(button, false);
        }
      });
    }

    if (els.purchaseCreateForm) {
      els.purchaseCreateForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type='submit']");
        setBusy(button, true, "Đang lưu...");
        try {
          await withLoading(purchaseEditId ? "Đang cập nhật phiếu mua..." : "Đang tạo phiếu mua...", () => submitPurchaseForm(event.currentTarget));
          window.location.href = "./purchasing.html";
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          setBusy(button, false);
        }
      });
    }

    document.addEventListener("click", async event => {
      const target = event.target.closest("button, a");
      if (!target || target.disabled) return;

      if (target.matches("[data-menu-toggle]")) document.body.classList.toggle("menu-open");
      if (target.matches("[data-menu-close]")) document.body.classList.remove("menu-open");
      if (target.matches(".nav-link")) document.body.classList.remove("menu-open");
      if (target.matches("[data-close-modal]")) closeModal();
      if (target.matches("[data-refresh-audit]")) {
        await withLoading("Đang tải lại lịch sử...", loadAuditLogs);
        renderPage();
        showToast("Đã cập nhật lịch sử hoạt động.");
      }
      if (target.dataset.viewAudit) {
        const auditLog = auditLogs.find(log => log.id === target.dataset.viewAudit);
        if (auditLog) openModal("auditDetail", { auditLog });
      }
      if (target.matches("[data-export-profit-report]")) exportProfitReport();
      if (target.matches("[data-export-products]")) exportProductsCsv();
      if (target.matches("[data-import-products]")) openModal("productImport");
      if (target.matches("[data-export-customers]")) exportCustomersCsv();
      if (target.matches("[data-import-customers]")) openModal("customerImport");
      if (target.matches("[data-download-product-template]")) downloadProductTemplate();
      if (target.matches("[data-download-customer-template]")) downloadCustomerTemplate();
      if (target.matches("[data-choose-product-file]")) els.productCsvFile?.click();
      if (target.matches("[data-choose-customer-file]")) els.customerCsvFile?.click();
      if (target.matches("[data-open-product]")) openModal("product");
      if (target.matches("[data-open-customer]")) openModal("customer");
      if (target.matches("[data-open-order]")) {
        event.preventDefault();
        navigateToOrderCreate();
      }
      if (target.matches("[data-open-purchase]")) {
        event.preventDefault();
        navigateToPurchaseCreate();
      }
      if (target.matches("[data-open-supplier]")) openModal("supplier");
      if (target.matches("[data-open-stock-receive]")) openModal("stockReceive");
      if (target.matches("[data-open-stock-adjust]")) openModal("stockAdjust");
      if (target.matches("[data-open-cash-transaction]")) openModal("cashTransaction");
      if (target.matches("[data-open-accounting-account]")) openModal("accountingAccount");
      if (target.matches("[data-open-accounting-reconciliation]")) openModal("accountingReconciliation");
      if (target.matches("[data-open-accounting-category]")) openModal("accountingCategory");
      if (target.dataset.editAccountingAccount) {
        const account = byId("accountingAccounts", target.dataset.editAccountingAccount);
        if (account) openModal("accountingAccount", { account });
      }
      if (target.dataset.reconcileAccount) {
        const account = byId("accountingAccounts", target.dataset.reconcileAccount);
        if (account) openModal("accountingReconciliation", { account });
      }
      if (target.dataset.editAccountingCategory) {
        const category = byId("accountingCategories", target.dataset.editAccountingCategory);
        if (category) openModal("accountingCategory", { category });
      }
      if (target.dataset.accountingViewFilter) {
        accountingFilters.view = target.dataset.accountingViewFilter;
        renderPage();
      }
      if (target.dataset.accountingTypeFilter) {
        accountingFilters.type = target.dataset.accountingTypeFilter;
        document.querySelectorAll("[data-accounting-type-filter]").forEach(button => {
          button.classList.toggle("active", button.dataset.accountingTypeFilter === accountingFilters.type);
        });
        renderPage();
      }
      if (target.dataset.accountingReceivableFilter) {
        accountingFilters.receivable = target.dataset.accountingReceivableFilter;
        document.querySelectorAll("[data-accounting-receivable-filter]").forEach(button => {
          button.classList.toggle("active", button.dataset.accountingReceivableFilter === accountingFilters.receivable);
        });
        renderPage();
      }
      if (target.dataset.purchasingViewFilter) {
        purchasingFilters.view = target.dataset.purchasingViewFilter;
        renderPage();
      }
      if (target.matches("[data-open-user]") && isAdmin()) openModal("user");
      if (target.matches("[data-logout]")) await logout();
      if (target.dataset.addProductToOrder) {
        const form = target.closest("form") || els.orderCreateForm || els.modalForm;
        addProductToOrder(form, target.dataset.addProductToOrder);
      }
      if (target.dataset.addProductToPurchase) {
        addProductToPurchase(target.closest("form") || els.purchaseCreateForm, target.dataset.addProductToPurchase);
      }
      if (target.matches("[data-remove-purchase-item]")) {
        const form = target.closest("form") || els.purchaseCreateForm;
        target.closest("[data-purchase-item-row]").remove();
        updatePurchaseTotalPreview(form);
      }
      if (target.dataset.editSupplier) {
        const supplier = byId("suppliers", target.dataset.editSupplier);
        if (supplier) openModal("supplier", { supplier });
      }
      if (target.dataset.supplierStatement) {
        const supplier = byId("suppliers", target.dataset.supplierStatement);
        if (supplier) openModal("supplierStatement", { supplier });
      }
      if (target.dataset.archiveSupplier && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại nhà cung cấp này?" : "Ẩn nhà cung cấp này khỏi phiếu mua mới?")) {
        await withLoading("Đang cập nhật nhà cung cấp...", async () => {
          await apiRequest("/suppliers/archive", { method: "POST", body: JSON.stringify({ id: target.dataset.archiveSupplier, status: target.dataset.nextStatus }) });
          await loadPurchasingData({ quiet: true });
        });
        renderPage();
        showToast(target.dataset.nextStatus === "active" ? "Đã kích hoạt nhà cung cấp." : "Đã ẩn nhà cung cấp.");
      }
      if (target.dataset.receivePurchase && window.confirm("Xác nhận đã nhận đủ hàng và cộng tồn kho?")) {
        await withLoading("Đang nhận hàng vào kho...", async () => {
          await apiRequest("/purchase-orders/receive", { method: "POST", body: JSON.stringify({ id: target.dataset.receivePurchase }) });
          await Promise.all([loadPurchasingData({ quiet: true }), loadProducts({ quiet: true }), loadStockMovements({ quiet: true })]);
        });
        renderPage();
        showToast("Đã nhận hàng, cập nhật tồn kho và công nợ.");
      }
      if (target.dataset.payPurchase) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.payPurchase);
        if (purchaseOrder) openModal("purchasePayment", { purchaseOrder });
      }
      if (target.dataset.applySupplierCredit) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.applySupplierCredit);
        if (purchaseOrder) openModal("supplierCredit", { purchaseOrder });
      }
      if (target.dataset.returnPurchase) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.returnPurchase);
        if (purchaseOrder) openModal("purchaseReturn", { purchaseOrder });
      }
      if (target.dataset.cancelPurchase && window.confirm("Hủy phiếu mua này? Phiếu đã nhận sẽ hoàn lại tồn kho nếu hàng chưa được sử dụng.")) {
        await withLoading("Đang hủy phiếu mua...", async () => {
          await apiRequest("/purchase-orders/cancel", { method: "POST", body: JSON.stringify({ id: target.dataset.cancelPurchase }) });
          await Promise.all([loadPurchasingData({ quiet: true }), loadProducts({ quiet: true }), loadStockMovements({ quiet: true })]);
        });
        renderPage();
        showToast("Đã hủy phiếu mua.");
      }

      if (target.dataset.editProduct) {
        const product = byId("products", target.dataset.editProduct);
        if (product) openModal("product", { product });
      }
      if (target.dataset.viewProduct) {
        const product = byId("products", target.dataset.viewProduct);
        if (product) openModal("productDetail", { product });
      }
      if (target.dataset.provisionProduct) {
        try {
          await withLoading("Đang tạo Google Docs và folder content...", async () => {
            const response = await apiRequest("/products/provision-content", {
              method: "POST",
              body: JSON.stringify({ id: target.dataset.provisionProduct })
            });
            const saved = normalizeProduct(response.product);
            state.products = state.products.map(item => item.id === saved.id ? saved : item);
            window.ArtFlowPosStore.save(state);
            renderPage();
            openModal("productDetail", { product: saved });
          });
          showToast("Đã tạo Google Docs và các folder content cho sản phẩm.");
        } catch (error) {
          showToast(`Không thể tạo tài nguyên: ${error.message}`, "error");
        }
      }
      if (target.matches("[data-test-product-content]")) {
        try {
          const result = await withLoading("Đang kiểm tra quyền Google Drive và Docs...", () => apiRequest("/products/test-content-setup", { method: "POST", body: "{}" }));
          showToast(`Kết nối thành công: Docs → ${result.docsParentName}, Media → ${result.mediaParentName}.`);
        } catch (error) {
          showToast(`Kiểm tra Drive thất bại: ${error.message}`, "error");
        }
      }
      if (target.dataset.archiveProduct && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại sản phẩm này?" : "Ngừng bán sản phẩm này?")) {
        await withLoading("Đang cập nhật sản phẩm...", () => archiveProduct(target.dataset.archiveProduct, target.dataset.nextStatus));
      }
      if (target.dataset.editCustomer) {
        const customer = byId("customers", target.dataset.editCustomer);
        if (customer) openModal("customer", { customer });
      }
      if (target.dataset.archiveCustomer && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại khách hàng này?" : "Ngừng theo dõi khách hàng này?")) {
        await withLoading("Đang cập nhật khách hàng...", () => archiveCustomer(target.dataset.archiveCustomer, target.dataset.nextStatus));
      }
      if (target.matches("[data-add-order-item]")) {
        const form = target.closest("form") || els.modalForm;
        const list = form && form.querySelector("[data-order-items]");
        if (list) {
          list.insertAdjacentHTML("beforeend", renderOrderItemRow());
          updateOrderTotalPreview(form);
        }
      }
      if (target.matches("[data-remove-order-item]")) {
        const form = target.closest("form") || els.modalForm;
        const rows = form ? form.querySelectorAll("[data-order-item-row]") : [];
        if (rows.length <= 1) {
          showToast("Đơn hàng cần ít nhất một dòng sản phẩm.", "error");
          return;
        }
        target.closest("[data-order-item-row]").remove();
        updateOrderTotalPreview(form);
      }
      if (target.dataset.cancelOrder && window.confirm("Hủy đơn hàng này và hoàn lại tồn kho?")) {
        await withLoading("Đang hủy đơn hàng...", () => cancelOrder(target.dataset.cancelOrder));
      }
      if (target.dataset.archiveCashTransaction && window.confirm("Xóa giao dịch thu/chi này khỏi sổ?")) {
        await withLoading("Đang xóa giao dịch...", async () => {
          await apiRequest("/accounting/transactions/archive", {
            method: "POST",
            body: JSON.stringify({ id: target.dataset.archiveCashTransaction })
          });
          await loadAccountingData({ quiet: true });
        });
        renderPage();
        showToast("Đã xóa giao dịch thu/chi.");
      }
      if (target.dataset.archiveAccountingCategory && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại danh mục này?" : "Ẩn danh mục này khỏi form ghi thu/chi mới?")) {
        await withLoading("Đang cập nhật danh mục...", async () => {
          const dataFromApi = await apiRequest("/accounting/categories/archive", {
            method: "POST",
            body: JSON.stringify({
              id: target.dataset.archiveAccountingCategory,
              status: target.dataset.nextStatus
            })
          });
          const savedCategory = normalizeAccountingCategory(dataFromApi.category);
          state.accountingCategories = state.accountingCategories.map(category => category.id === savedCategory.id ? savedCategory : category);
          await loadAccountingData({ quiet: true });
        });
        renderPage();
        showToast(target.dataset.nextStatus === "active" ? "Đã kích hoạt lại danh mục." : "Đã ẩn danh mục khỏi form mới.");
      }
      if (target.dataset.archiveAccountingAccount && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại tài khoản tiền này?" : "Ẩn tài khoản này khỏi các giao dịch mới?")) {
        await withLoading("Đang cập nhật tài khoản...", async () => {
          const dataFromApi = await apiRequest("/accounting/accounts/archive", {
            method: "POST",
            body: JSON.stringify({
              id: target.dataset.archiveAccountingAccount,
              status: target.dataset.nextStatus
            })
          });
          const savedAccount = normalizeAccountingAccount(dataFromApi.account);
          state.accountingAccounts = state.accountingAccounts.map(account => account.id === savedAccount.id ? savedAccount : account);
          await loadAccountingData({ quiet: true });
        });
        renderPage();
        showToast(target.dataset.nextStatus === "active" ? "Đã kích hoạt lại tài khoản." : "Đã ẩn tài khoản khỏi giao dịch mới.");
      }
      if (target.dataset.recordOrderPayment) {
        const order = byId("orders", target.dataset.recordOrderPayment);
        if (order) openModal("orderPayment", { order });
      }
      if (target.dataset.returnOrder) {
        const order = byId("orders", target.dataset.returnOrder);
        if (order) openModal("orderReturn", { order });
      }
      if (target.dataset.refundOrder) {
        const order = byId("orders", target.dataset.refundOrder);
        if (order) openModal("orderRefund", { order });
      }
      if (target.dataset.editOrderFulfillment) {
        const order = byId("orders", target.dataset.editOrderFulfillment);
        if (order) openModal("orderFulfillment", { order });
      }

      const completeOrderId = target.dataset.completeOrder;
      if (completeOrderId) {
        const order = byId("orders", completeOrderId);
        if (order) {
          if (order.status === "completed") {
            showToast("Đơn này đã hoàn tất.");
            return;
          }
          await withLoading("Đang cập nhật đơn hàng...", () => updateOrderStatus(order.id, "completed"));
        }
      }

      const userId = target.dataset.deleteUser;
      if (userId && isAdmin() && userId !== currentUser.id && window.confirm("Xóa tài khoản nhân viên này?")) {
        await withLoading("Đang xóa nhân viên...", async () => {
          await apiRequest("/users/delete", { method: "POST", body: JSON.stringify({ id: userId }) });
          await loadStaffUsers();
        });
        renderUsers();
        showToast("Đã xóa nhân viên.");
      }

      const toggleUserId = target.dataset.toggleUser;
      if (toggleUserId && isAdmin() && toggleUserId !== currentUser.id) {
        await withLoading("Đang cập nhật tài khoản...", async () => {
          await apiRequest("/users/toggle", { method: "POST", body: JSON.stringify({ id: toggleUserId }) });
          await loadStaffUsers();
        });
        renderUsers();
        showToast("Đã cập nhật trạng thái tài khoản.");
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeModal();
    });

    document.addEventListener("input", event => {
      if (event.target.matches("[data-product-picker-search]")) filterProductPicker(event.target);
      if (event.target.matches("[data-purchase-product-search]")) filterPurchaseProductPicker(event.target);
      if (event.target.matches("[data-order-quantity], [data-order-money]")) updateOrderTotalPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-purchase-quantity], [data-purchase-cost], [data-purchase-money]")) updatePurchaseTotalPreview(event.target.closest("form") || els.purchaseCreateForm);
      if (event.target.matches("[data-return-quantity]")) updatePurchaseReturnPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-order-return-quantity]")) updateOrderReturnPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-reconciliation-actual]")) updateReconciliationPreview(event.target.closest("form") || els.modalForm);
    });

    document.addEventListener("change", async event => {
      if (event.target.matches("[data-product-csv-file]")) {
        const file = event.target.files && event.target.files[0];
        try {
          await withLoading("Đang nhập danh mục sản phẩm...", () => importProductsCsv(file));
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          event.target.value = "";
        }
        return;
      }
      if (event.target.matches("[data-customer-csv-file]")) {
        const file = event.target.files && event.target.files[0];
        try {
          await withLoading("Đang nhập danh sách khách hàng...", () => importCustomersCsv(file));
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          event.target.value = "";
        }
        return;
      }
      if (event.target.matches("[data-report-range]")) {
        reportFilters.range = event.target.value;
        renderPage();
        return;
      }
      if (event.target.matches("[data-report-channel]")) {
        reportFilters.channel = event.target.value;
        renderPage();
        return;
      }
      if (event.target.matches("[data-order-product]")) updateOrderTotalPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-cash-type]")) {
        const category = (event.target.closest("form") || els.modalForm).querySelector("[data-cash-category]");
        if (category) category.innerHTML = renderAccountingCategoryOptions(event.target.value);
      }
      if (event.target.matches("[data-reconciliation-account]")) {
        const form = event.target.closest("form") || els.modalForm;
        const account = byId("accountingAccounts", event.target.value);
        const actualInput = form && form.querySelector("[data-reconciliation-actual]");
        if (actualInput && account) actualInput.value = account.currentBalance;
        updateReconciliationPreview(form);
      }
      if (event.target.matches("[data-order-inline]")) {
        const field = event.target.dataset.orderInline;
        const orderId = event.target.dataset.orderId;
        const value = event.target.value;
        if (field && orderId) {
          try {
            await withLoading("Đang cập nhật đơn hàng...", () => updateOrderFulfillment(orderId, { [field]: value }));
          } catch (error) {
            showToast(error.message, "error");
            renderPage();
          }
        }
      }
    });

    document.addEventListener("click", event => {
      if (els.modalBackdrop && event.target === els.modalBackdrop) closeModal();
    });
  }

  injectSharedUi();
  bindEvents();
  if (page === "auth") bootstrapAuthPage();
  else bootstrapAppPage();
})();
