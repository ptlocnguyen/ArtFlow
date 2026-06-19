(function () {
  const config = window.ARTFLOW_POS_CONFIG;
  const page = document.body.dataset.page || "auth";
  const root = document.body.dataset.root || ".";
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const tokenKey = `${config.storageKey}.authToken`;

  let state = window.ArtFlowPosStore.load();
  let currentUser = null;
  let staffUsers = [];
  let searchTerm = "";
  const orderFilters = { channel: "all", status: "all", paymentStatus: "all", shippingStatus: "all" };

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
    products: { title: "Sản phẩm", href: "./products.html", icon: "◇" },
    customers: { title: "Khách hàng", href: "./customers.html", icon: "○" },
    inventory: { title: "Kho hàng", href: "./inventory.html", icon: "▤" },
    reports: { title: "Báo cáo", href: "./reports.html", icon: "↗" },
    users: { title: "Nhân viên", href: "./users.html", icon: "◎", adminOnly: true }
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
    orderChannelFilter: qs("[data-order-channel-filter]"),
    orderStatusFilter: qs("[data-order-status-filter]"),
    orderPaymentFilter: qs("[data-order-payment-filter]"),
    orderShippingFilter: qs("[data-order-shipping-filter]"),
    productsTable: qs("[data-products-table]"),
    customersTable: qs("[data-customers-table]"),
    usersTable: qs("[data-users-table]"),
    inventoryCards: qs("[data-inventory-cards]"),
    stockMovementsTable: qs("[data-stock-movements-table]"),
    reportCards: qs("[data-report-cards]"),
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
      "/products": "listProducts",
      "/products/create": "createProduct",
      "/products/update": "updateProduct",
      "/products/archive": "archiveProduct",
      "/customers": "listCustomers",
      "/customers/create": "createCustomer",
      "/customers/update": "updateCustomer",
      "/customers/archive": "archiveCustomer",
      "/orders": "listOrders",
      "/orders/create": "createOrder",
      "/orders/status": "updateOrderStatus",
      "/orders/fulfillment": "updateOrderFulfillment",
      "/orders/cancel": "cancelOrder",
      "/stock-movements": "listStockMovements",
      "/stock/receive": "receiveStock",
      "/stock/adjust": "adjustStock"
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

  function byId(collection, id) {
    return (state[collection] || []).find(item => item.id === id);
  }

  function formatDate(value) {
    if (!value) return "Chưa có";
    return dateFormat.format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
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

  function roleLabel(role) {
    return { admin: "Admin", sales: "Bán hàng", inventory: "Kho", viewer: "Chỉ xem" }[role] || role;
  }

  function statusLabel(status) {
    return {
      draft: "Nháp",
      pending: "Chờ xử lý",
      confirmed: "Đã xác nhận",
      packed: "Đã đóng gói",
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

  function getCustomer(order) {
    return byId("customers", order.customerId) || { name: "Khách lẻ" };
  }

  function isPaid(order) {
    return order.paymentStatus === "paid" || ["paid", "completed"].includes(order.status);
  }

  function orderCost(order) {
    return (order.items || []).reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
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

  function normalizeProduct(product) {
    return {
      id: product.id,
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      costPrice: Number(product.costPrice || 0),
      salePrice: Number(product.salePrice || 0),
      stock: Number(product.stock || 0),
      lowStock: Number(product.lowStock || 0),
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

  async function loadOrders(options = {}) {
    try {
      const data = await apiRequest("/orders");
      state.orders = (data.orders || []).map(normalizeOrder);
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
    document.querySelectorAll("[data-open-customer]").forEach(button => {
      button.hidden = !canManageCustomers();
    });
    document.querySelectorAll("[data-open-order]").forEach(button => {
      button.hidden = !canManageOrders();
    });
    document.querySelectorAll("[data-open-stock-receive], [data-open-stock-adjust]").forEach(button => {
      button.hidden = !canManageInventory();
    });
  }

  async function loadStaffUsers() {
    if (!isAdmin()) return;
    const data = await apiRequest("/users");
    staffUsers = data.users || [];
  }

  async function showApp(user) {
    currentUser = user;
    if (page === "users" && !isAdmin()) {
      window.location.href = "./dashboard.html";
      return;
    }

    if (els.authScreen) els.authScreen.hidden = true;
    if (els.appShell) els.appShell.hidden = false;
    if (els.title && pages[page]) els.title.textContent = pages[page].title;
    if (els.currentUser) els.currentUser.innerHTML = `<strong>${user.name}</strong><span>${roleLabel(user.role)}</span>`;
    renderNav();
    applyPermissions();

    await withLoading("Đang tải dữ liệu bán hàng...", () => Promise.all([
      loadProducts({ quiet: true }),
      loadCustomers({ quiet: true }),
      loadOrders({ quiet: true }),
      loadStockMovements({ quiet: true })
    ]));
    if (page === "users") await withLoading("Đang tải danh sách nhân viên...", loadStaffUsers);
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

  function renderKpis() {
    if (!els.kpis) return;
    const paidOrders = state.orders.filter(isPaid);
    const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
    const cost = paidOrders.reduce((sum, order) => sum + orderCost(order), 0);
    const lowStockCount = state.products.filter(product => product.status === "active" && product.stock <= product.lowStock).length;
    const pendingOrders = state.orders.filter(order => order.status === "pending").length;
    const cards = [
      ["Doanh thu", money.format(revenue), "Từ đơn đã thanh toán"],
      ["Lợi nhuận ước tính", money.format(revenue - cost), "Dựa trên giá vốn"],
      ["Đơn cần xử lý", pendingOrders.toString(), "Đang chờ xác nhận"],
      ["Cảnh báo kho", lowStockCount.toString(), "Sản phẩm sắp hết"]
    ];
    els.kpis.innerHTML = cards.map(([label, value, note]) => `
      <article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>
    `).join("");
  }

  function renderChart() {
    if (!els.revenueChart) return;
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
    const values = days.map(day => state.orders.filter(order => String(order.createdAt).slice(0, 10) === day && isPaid(order)).reduce((sum, order) => sum + order.total, 0));
    const max = Math.max(...values, 1);
    els.revenueChart.innerHTML = days.map((day, index) => {
      const height = Math.max(18, Math.round((values[index] / max) * 200));
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
            <td><strong>${money.format(order.total)}</strong></td>
            <td>${formatDate(order.createdAt)}</td>
          </tr>
        `;
      }

      const actions = `<div class="row-actions">${canManageOrders() && order.status !== "cancelled" ? `<button class="link-button" data-edit-order-fulfillment="${order.id}">Vận đơn</button>` : ""}${canManageOrders() && order.status !== "completed" && order.status !== "cancelled" ? `<button class="link-button" data-complete-order="${order.id}">Hoàn tất</button>` : ""}${canManageOrders() && order.status !== "cancelled" ? `<button class="link-button" data-cancel-order="${order.id}">Hủy đơn</button>` : ""}</div>`;
      return `
        <tr>
          <td><strong>${order.code}</strong><br><span class="badge">${channelLabel(order.channel)}</span></td>
          <td>${customer.name}<br><small>${formatDate(order.createdAt)}</small></td>
          <td>${orderItemSummary(order)}</td>
          <td>${target === els.ordersTable && canManageOrders() && order.status !== "cancelled" ? renderInlineOrderSelect("status", order.id, order.status) : `<span class="badge ${order.status}">${statusLabel(order.status)}</span>`}</td>
          <td>${target === els.ordersTable && canManageOrders() && order.status !== "cancelled" ? renderInlineOrderSelect("paymentStatus", order.id, order.paymentStatus) : `<span class="badge ${order.paymentStatus}">${paymentLabel(order.paymentStatus)}</span>`}</td>
          <td>
            ${target === els.ordersTable && canManageOrders() && order.status !== "cancelled" ? renderInlineOrderSelect("shippingStatus", order.id, order.shippingStatus) : `<span class="badge ${order.shippingStatus}">${shippingLabel(order.shippingStatus)}</span>`}
            <small>${carrierLabel(order.carrier)}${order.trackingCode ? ` · ${order.trackingCode}` : ""}</small>
          </td>
          <td><strong>${money.format(order.total)}</strong></td>
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
    const rows = filtered(state.products, ["sku", "name", "category"]);
    els.productsTable.innerHTML = rows.length ? rows.map(product => `
      <tr>
        <td><strong>${product.sku}</strong></td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>${money.format(product.salePrice)}</td>
        <td><span class="badge ${product.stock <= product.lowStock ? "low" : "active"}">${product.stock}</span></td>
        <td><span class="badge ${product.status}">${statusLabel(product.status)}</span></td>
        <td>
          <div class="row-actions">
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

  function renderReports() {
    if (!els.reportCards) return;
    const paidOrders = state.orders.filter(isPaid);
    const averageOrder = paidOrders.length ? paidOrders.reduce((sum, order) => sum + order.total, 0) / paidOrders.length : 0;
    const soldByProduct = paidOrders.reduce((map, order) => {
      (order.items || []).forEach(item => {
        map[item.productId] = (map[item.productId] || 0) + item.quantity;
      });
      return map;
    }, {});
    const bestProduct = [...state.products].filter(product => product.status === "active").sort((a, b) => {
      return (soldByProduct[b.id] || 0) - (soldByProduct[a.id] || 0);
    })[0];
    const vipCustomer = [...state.customers].sort((a, b) => b.totalSpent - a.totalSpent)[0];
    const cards = [
      ["Giá trị đơn TB", money.format(averageOrder), "Chỉ tính đơn đã thanh toán."],
      ["Sản phẩm nổi bật", bestProduct ? bestProduct.name : "Chưa có", "Dựa trên số lượng đã bán."],
      ["Khách hàng giá trị cao", vipCustomer ? vipCustomer.name : "Chưa có", vipCustomer ? money.format(vipCustomer.totalSpent) : "Chưa có giao dịch."]
    ];
    els.reportCards.innerHTML = cards.map(([title, value, note]) => `
      <article class="report-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>
    `).join("");
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
    renderInventory();
    renderStockMovements();
    renderReports();
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

  function renderOrderItemRow() {
    const productOptions = state.products
      .filter(product => product.status === "active")
      .map(product => `<option value="${product.id}">${product.name} - ${money.format(product.salePrice)} (${product.stock} còn)</option>`)
      .join("");

    return `
      <div class="order-item-row" data-order-item-row>
        <div class="field">
          <label>Sản phẩm</label>
          <select name="productId" data-order-product required>${productOptions}</select>
        </div>
        <div class="field compact-field">
          <label>Số lượng</label>
          <input name="quantity" data-order-quantity type="number" min="1" value="1" required />
        </div>
        <button class="icon-button" type="button" data-remove-order-item aria-label="Xóa dòng">×</button>
      </div>
    `;
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
    if (!output) return;
    const subtotal = [...form.querySelectorAll("[data-order-item-row]")].reduce((sum, row) => {
      const product = byId("products", row.querySelector("[data-order-product]").value);
      const quantity = Number(row.querySelector("[data-order-quantity]").value || 0);
      return sum + (product ? product.salePrice * quantity : 0);
    }, 0);
    const discount = Number(form.discount && form.discount.value || 0);
    const shippingFee = Number(form.shippingFee && form.shippingFee.value || 0);
    output.textContent = `Tạm tính: ${money.format(subtotal)} · Tổng thanh toán: ${money.format(Math.max(0, subtotal - discount + shippingFee))}`;
  }

  function renderUserForm() {
    return `
      <div class="field"><label for="name">Tên nhân viên</label><input id="name" name="name" type="text" placeholder="Nguyễn Văn A" required /></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" placeholder="staff@artflow.vn" required /></div>
      <div class="field"><label for="password">Mật khẩu tạm</label><input id="password" name="password" type="password" placeholder="Ít nhất 8 ký tự" minlength="8" autocomplete="new-password" required /></div>
      <div class="field"><label for="role">Vai trò</label><select id="role" name="role" required><option value="sales">Bán hàng</option><option value="inventory">Kho</option><option value="viewer">Chỉ xem</option><option value="admin">Admin</option></select></div>
    `;
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
    if ((type === "stockReceive" || type === "stockAdjust") && !canManageInventory()) {
      showToast("Bạn không có quyền quản lý kho.", "error");
      return;
    }
    if ((type === "stockReceive" || type === "stockAdjust") && !state.products.some(product => product.status === "active")) {
      showToast("Cần có ít nhất một sản phẩm đang hoạt động để thao tác kho.", "error");
      return;
    }
    if (type === "orderFulfillment" && !options.order) {
      showToast("Không tìm thấy đơn hàng cần cập nhật.", "error");
      return;
    }

    const editingProduct = options.product || null;
    const editingCustomer = options.customer || null;
    const editingOrder = options.order || null;
    const definitions = {
      product: {
        eyebrow: "Danh mục",
        title: editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm",
        body: renderTextFields([
          ["sku", "SKU", "text", "AF-NEW-001", "", editingProduct ? editingProduct.sku : ""],
          ["name", "Tên sản phẩm", "text", "Bộ cọ vẽ chi tiết", "", editingProduct ? editingProduct.name : ""],
          ["category", "Danh mục", "text", "Dụng cụ vẽ", "", editingProduct ? editingProduct.category : ""],
          ["costPrice", "Giá vốn", "number", "65000", "min=\"0\" step=\"1000\"", editingProduct ? editingProduct.costPrice : ""],
          ["salePrice", "Giá bán", "number", "119000", "min=\"0\" step=\"1000\"", editingProduct ? editingProduct.salePrice : ""],
          ["stock", "Tồn kho", "number", "12", "min=\"0\" step=\"1\"", editingProduct ? editingProduct.stock : ""],
          ["lowStock", "Ngưỡng cảnh báo", "number", "5", "min=\"0\" step=\"1\"", editingProduct ? editingProduct.lowStock : ""]
        ]),
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
          showToast(editingProduct ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.");
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
        body: renderOrderFulfillmentForm(editingOrder),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          await updateOrderFulfillment(editingOrder.id, {
            shippingStatus: data.shippingStatus,
            carrier: data.carrier === "none" ? "" : data.carrier,
            trackingCode: data.trackingCode || ""
          });
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
    els.modalForm.insertAdjacentHTML("beforeend", `
      <div class="form-actions">
        <button class="button ghost" type="button" data-close-modal>Hủy</button>
        <button class="button primary" type="submit">Lưu</button>
      </div>
    `);
    els.modalForm.onsubmit = async event => {
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

    document.addEventListener("click", async event => {
      const target = event.target.closest("button, a");
      if (!target || target.disabled) return;

      if (target.matches("[data-menu-toggle]")) document.body.classList.toggle("menu-open");
      if (target.matches("[data-menu-close]")) document.body.classList.remove("menu-open");
      if (target.matches(".nav-link")) document.body.classList.remove("menu-open");
      if (target.matches("[data-close-modal]")) closeModal();
      if (target.matches("[data-open-product]")) openModal("product");
      if (target.matches("[data-open-customer]")) openModal("customer");
      if (target.matches("[data-open-order]")) openModal("order");
      if (target.matches("[data-open-stock-receive]")) openModal("stockReceive");
      if (target.matches("[data-open-stock-adjust]")) openModal("stockAdjust");
      if (target.matches("[data-open-user]") && isAdmin()) openModal("user");
      if (target.matches("[data-logout]")) await logout();

      if (target.dataset.editProduct) {
        const product = byId("products", target.dataset.editProduct);
        if (product) openModal("product", { product });
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
        const list = els.modalForm && els.modalForm.querySelector("[data-order-items]");
        if (list) {
          list.insertAdjacentHTML("beforeend", renderOrderItemRow());
          updateOrderTotalPreview(els.modalForm);
        }
      }
      if (target.matches("[data-remove-order-item]")) {
        const rows = els.modalForm ? els.modalForm.querySelectorAll("[data-order-item-row]") : [];
        if (rows.length <= 1) {
          showToast("Đơn hàng cần ít nhất một dòng sản phẩm.", "error");
          return;
        }
        target.closest("[data-order-item-row]").remove();
        updateOrderTotalPreview(els.modalForm);
      }
      if (target.dataset.cancelOrder && window.confirm("Hủy đơn hàng này và hoàn lại tồn kho?")) {
        await withLoading("Đang hủy đơn hàng...", () => cancelOrder(target.dataset.cancelOrder));
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
      if (event.target.matches("[data-order-quantity], [data-order-money]")) updateOrderTotalPreview(els.modalForm);
    });

    document.addEventListener("change", async event => {
      if (event.target.matches("[data-order-product]")) updateOrderTotalPreview(els.modalForm);
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
