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
    productsTable: qs("[data-products-table]"),
    customersTable: qs("[data-customers-table]"),
    usersTable: qs("[data-users-table]"),
    inventoryCards: qs("[data-inventory-cards]"),
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
      "/products/archive": "archiveProduct"
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

  function hasOrdersForProduct(productId) {
    return state.orders.some(order => order.productId === productId);
  }

  function hasOrdersForCustomer(customerId) {
    return state.orders.some(order => order.customerId === customerId);
  }

  function applyOrderRollback(order) {
    const product = byId("products", order.productId);
    const customer = byId("customers", order.customerId);
    if (product) product.stock += Number(order.quantity || 0);
    if (customer) {
      customer.totalSpent = Math.max(0, Number(customer.totalSpent || 0) - Number(order.total || 0));
      const remainingOrders = state.orders
        .filter(item => item.id !== order.id && item.customerId === customer.id)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      customer.lastOrderAt = remainingOrders[0] ? remainingOrders[0].createdAt : "";
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
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

  function roleLabel(role) {
    return { admin: "Admin", sales: "Bán hàng", inventory: "Kho", viewer: "Chỉ xem" }[role] || role;
  }

  function statusLabel(status) {
    return {
      draft: "Nháp",
      pending: "Chờ xử lý",
      paid: "Đã thanh toán",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
      active: "Đang hoạt động",
      archived: "Ngừng bán",
      disabled: "Đã khóa"
    }[status] || status;
  }

  function getProduct(order) {
    return byId("products", order.productId) || { name: "Sản phẩm đã xóa", sku: "N/A", salePrice: 0, costPrice: 0 };
  }

  function getCustomer(order) {
    return byId("customers", order.customerId) || { name: "Khách lẻ" };
  }

  function isPaid(order) {
    return ["paid", "completed"].includes(order.status);
  }

  function canCreateOrder() {
    return state.products.some(product => product.status === "active") && state.customers.length > 0;
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

  function filtered(items, fields) {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => fields.some(field => String(item[field] || "").toLowerCase().includes(term)));
  }

  function saveAndRender(message) {
    window.ArtFlowPosStore.save(state);
    renderPage();
    if (message) showToast(message);
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

    await withLoading("Đang tải danh mục sản phẩm...", () => loadProducts({ quiet: true }));
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
    const cost = paidOrders.reduce((sum, order) => sum + (getProduct(order).costPrice * order.quantity), 0);
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
    const values = days.map(day => state.orders.filter(order => order.createdAt === day && isPaid(order)).reduce((sum, order) => sum + order.total, 0));
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
      const product = getProduct(order);
      const actions = target === els.ordersTable
        ? `<div class="row-actions"><button class="link-button" data-complete-order="${order.id}">Hoàn tất</button><button class="link-button" data-delete-order="${order.id}">Xóa</button></div>`
        : formatDate(order.createdAt);
      return `
        <tr>
          <td><strong>${order.code}</strong></td>
          <td>${customer.name}</td>
          <td>${product.name} × ${order.quantity}</td>
          <td><span class="badge ${order.status}">${statusLabel(order.status)}</span></td>
          <td><strong>${money.format(order.total)}</strong></td>
          <td>${actions}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="6" class="empty">Chưa có đơn hàng.</td></tr>`;
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
        <td><div class="row-actions"><button class="link-button" data-delete-customer="${customer.id}">Xóa</button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">Chưa có khách hàng. Hãy thêm khách hàng đầu tiên.</td></tr>`;
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
    const cards = [
      ["Tổng tồn kho", `${totalUnits} sản phẩm`, "Cộng tất cả SKU đang hoạt động."],
      ["Giá trị tồn", money.format(inventoryValue), "Tính theo giá vốn hiện tại."],
      ["SKU tồn nhiều nhất", topStock ? topStock.name : "Chưa có", topStock ? `${topStock.stock} sản phẩm trong kho.` : "Hãy thêm sản phẩm đầu tiên."]
    ];
    els.inventoryCards.innerHTML = cards.map(([title, value, note]) => `
      <article class="inventory-card"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>
    `).join("");
  }

  function renderReports() {
    if (!els.reportCards) return;
    const paidOrders = state.orders.filter(isPaid);
    const averageOrder = paidOrders.length ? paidOrders.reduce((sum, order) => sum + order.total, 0) / paidOrders.length : 0;
    const bestProduct = [...state.products].filter(product => product.status === "active").sort((a, b) => {
      const soldA = paidOrders.filter(order => order.productId === a.id).reduce((sum, order) => sum + order.quantity, 0);
      const soldB = paidOrders.filter(order => order.productId === b.id).reduce((sum, order) => sum + order.quantity, 0);
      return soldB - soldA;
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
    const orders = filtered(sortedOrders, ["code", "status"]);
    const recentOrders = page === "dashboard" ? filtered(sortedOrders, ["code", "status"]) : sortedOrders;
    renderKpis();
    renderChart();
    renderLowStock();
    renderOrdersRows(els.recentOrders, recentOrders, 5);
    renderOrdersRows(els.ordersTable, orders);
    renderProducts();
    renderCustomers();
    renderUsers();
    renderInventory();
    renderReports();
  }

  function closeModal() {
    if (!els.modalBackdrop || !els.modalForm) return;
    els.modalBackdrop.hidden = true;
    els.modalForm.innerHTML = "";
  }

  function renderTextFields(fields) {
    return fields.map(([name, label, type, placeholder, extra = "", value = ""]) => `
      <div class="field">
        <label for="${name}">${label}</label>
        <input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" value="${String(value).replace(/"/g, "&quot;")}" ${extra} required />
      </div>
    `).join("");
  }

  function renderOrderForm() {
    const productOptions = state.products.filter(product => product.status === "active").map(product => `<option value="${product.id}">${product.name} - ${money.format(product.salePrice)} (${product.stock} còn)</option>`).join("");
    const customerOptions = state.customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`).join("");
    return `
      <div class="field"><label for="customerId">Khách hàng</label><select id="customerId" name="customerId" required>${customerOptions}</select></div>
      <div class="field"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${productOptions}</select></div>
      <div class="field"><label for="quantity">Số lượng</label><input id="quantity" name="quantity" type="number" min="1" value="1" required /></div>
      <div class="field"><label for="status">Trạng thái</label><select id="status" name="status" required><option value="pending">Chờ xử lý</option><option value="paid">Đã thanh toán</option><option value="completed">Hoàn tất</option></select></div>
    `;
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
    if (type === "order" && !canCreateOrder()) {
      showToast("Cần có ít nhất một sản phẩm và một khách hàng trước khi tạo đơn.", "error");
      return;
    }

    const editingProduct = options.product || null;
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
        title: "Thêm khách hàng",
        body: renderTextFields([
          ["name", "Tên khách hàng", "text", "Khách hàng mới"],
          ["phone", "Số điện thoại", "text", "09xx xxx xxx"],
          ["email", "Email", "email", "customer@example.com"],
          ["group", "Nhóm khách", "text", "Bán lẻ"]
        ]),
        submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const name = String(data.name || "").trim();
          const phone = String(data.phone || "").trim();
          const email = String(data.email || "").trim();
          const group = String(data.group || "").trim();
          if (!name || !phone || !group) throw new Error("Vui lòng nhập tên, số điện thoại và nhóm khách.");
          if (state.customers.some(customer => customer.phone === phone)) throw new Error("Số điện thoại khách hàng đã tồn tại.");
          state.customers.unshift({ id: uid("cus"), name, phone, email, group, totalSpent: 0, lastOrderAt: "" });
          saveAndRender("Đã thêm khách hàng mới.");
        }
      },
      order: {
        eyebrow: "Bán hàng",
        title: "Tạo đơn hàng",
        body: renderOrderForm(),
        submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const product = byId("products", data.productId);
          const customer = byId("customers", data.customerId);
          const quantity = Number(data.quantity);
          if (!product || !customer || quantity < 1) throw new Error("Cần có ít nhất một sản phẩm và một khách hàng để tạo đơn.");
          if (product.stock < quantity) throw new Error("Tồn kho không đủ để tạo đơn.");
          const total = product.salePrice * quantity;
          product.stock -= quantity;
          customer.totalSpent += total;
          customer.lastOrderAt = new Date().toISOString().slice(0, 10);
          state.orders.unshift({
            id: uid("ord"),
            code: `AF-${String(1001 + state.orders.length).padStart(4, "0")}`,
            customerId: customer.id,
            status: data.status,
            productId: product.id,
            quantity,
            total,
            createdAt: new Date().toISOString().slice(0, 10)
          });
          saveAndRender("Đã tạo đơn và trừ tồn kho.");
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
    const firstInput = els.modalForm.querySelector("input, select");
    if (firstInput) firstInput.focus();
  }

  function deleteEntity(collection, id, message) {
    state[collection] = state[collection].filter(item => item.id !== id);
    saveAndRender(message);
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

  function deleteCustomer(customerId) {
    if (hasOrdersForCustomer(customerId)) {
      showToast("Không thể xóa khách hàng đã có đơn hàng. Hãy xóa đơn liên quan trước.", "error");
      return;
    }
    deleteEntity("customers", customerId, "Đã xóa khách hàng.");
  }

  function deleteOrder(orderId) {
    const order = byId("orders", orderId);
    if (!order) return;
    applyOrderRollback(order);
    deleteEntity("orders", orderId, "Đã xóa đơn hàng và hoàn lại tồn kho.");
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
      if (target.matches("[data-open-user]") && isAdmin()) openModal("user");
      if (target.matches("[data-logout]")) await logout();

      if (target.dataset.editProduct) {
        const product = byId("products", target.dataset.editProduct);
        if (product) openModal("product", { product });
      }
      if (target.dataset.archiveProduct && window.confirm(target.dataset.nextStatus === "active" ? "Kích hoạt lại sản phẩm này?" : "Ngừng bán sản phẩm này?")) {
        await withLoading("Đang cập nhật sản phẩm...", () => archiveProduct(target.dataset.archiveProduct, target.dataset.nextStatus));
      }
      if (target.dataset.deleteCustomer && window.confirm("Xóa khách hàng này?")) deleteCustomer(target.dataset.deleteCustomer);
      if (target.dataset.deleteOrder && window.confirm("Xóa đơn hàng này?")) deleteOrder(target.dataset.deleteOrder);

      const completeOrderId = target.dataset.completeOrder;
      if (completeOrderId) {
        const order = byId("orders", completeOrderId);
        if (order) {
          if (order.status === "completed") {
            showToast("Đơn này đã hoàn tất.");
            return;
          }
          order.status = "completed";
          saveAndRender("Đã chuyển đơn sang hoàn tất.");
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

    document.addEventListener("click", event => {
      if (els.modalBackdrop && event.target === els.modalBackdrop) closeModal();
    });
  }

  injectSharedUi();
  bindEvents();
  if (page === "auth") bootstrapAuthPage();
  else bootstrapAppPage();
})();
