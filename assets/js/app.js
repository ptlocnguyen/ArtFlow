(function () {
  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  const config = window.ARTFLOW_POS_CONFIG;
  const page = document.body.dataset.page || "auth";
  const root = document.body.dataset.root || ".";
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
  const tokenKey = `${config.storageKey}.authToken`;
  const sessionUserKey = `${config.storageKey}.sessionUser`;
  const UX_MODE = ["simple", "standard", "advanced"].includes(config.uxMode) ? config.uxMode : "standard";
  const navStateKey = `${config.storageKey}.navGroups`;
  const API_TIMEOUT_MS = 40000;
  const API_RETRY_DELAYS = [650, 1500, 3200];
  const purchaseEditId = new URLSearchParams(window.location.search).get("edit") || "";
  const routeParams = new URLSearchParams(window.location.search);
  const accountingTransactionTarget = routeParams.get("transactionId") || "";
  const purchasingOrderTarget = new URLSearchParams(window.location.search).get("purchaseOrderId") || "";
  const supplierTarget = routeParams.get("supplierId") || "";
  let deepLinkFocusHandled = false;
  const receiptSettingsKey = `${config.storageKey}.receiptSettings`;
  const loyaltyRules = { earnPerVnd: 10000, pointValue: 1000, maxRedeemRate: 0.2 };
  const readOnlyActions = new Set([
    "bootstrapStatus",
    "me",
    "listUsers",
    "listAuditLogs",
    "listProducts",
    "getContentWorkspaceData",
    "getTeamWorkspaceData",
    "getOmniWorkspaceData",
    "getIncenseData",
    "listCustomers",
    "listOrders",
    "listStockMovements",
    "getPageData",
    "getAccountingData",
    "getPurchasingData",
    "getAppSettings"
  ]);

  let state = window.ArtFlowPosStore.load();
  let currentUser = null;
  let staffUsers = [];
  let auditLogs = [];
  let auditHealth = { pending: 0, failed: 0, lastCompletedAt: "" };
  let lastCreatedOrder = null;
  let searchTerm = "";
  let pageDataReady = false;
  const orderFilters = { channel: "all", status: "all", paymentStatus: "all", shippingStatus: "all" };
  const accountingFilters = {
    view: accountingTransactionTarget ? "ledger" : (["ledger", "receivables", "payouts", "payroll", "tax"].includes(routeParams.get("view")) ? routeParams.get("view") : "ledger"),
    type: "all",
    accountId: "all",
    range: "30",
    receivable: "all",
    payrollRange: "30",
    payrollSearch: "",
    categoryType: "all",
    payoutChannel: "all",
    payoutStatus: "all",
    payoutRange: "90",
    debtView: routeParams.get("debt") || "platform"
  };
  let accountingExportScope = "receivables";
  const purchasingFilters = { status: "all", paymentStatus: "all", savedView: "all" };
  const supplierFilters = { status: "all", balance: "all", search: "" };
  if (page === "accounting" && accountingTransactionTarget) {
    accountingFilters.view = "ledger";
    accountingFilters.range = "all";
  }
  if (page === "accounting" && !accountingTransactionTarget && ["ledger", "receivables", "payouts", "payroll", "tax"].includes(routeParams.get("view"))) {
    accountingFilters.view = routeParams.get("view");
  }
  const reportFilters = { range: "30", channel: "all" };
  const auditFilters = { entityType: "all", range: "30" };
  const userFilters = { role: "all", status: "all" };
  const productFilters = { category: "all", status: "all", stock: "all", margin: "all", content: "all", assets: "all", sort: "name", preset: "all" };
  const inventoryFilters = { category: "all", stock: "all", sort: "risk" };
  const contentFilters = { status: "all", type: "all", owner: "all", channel: "all", product: "all", schedule: "all" };
  const teamFilters = { view: "tasks", status: "all", owner: "all", range: "30" };
  const omniFilters = { channel: "all", stock: "all", issue: "all" };
  const channelSettingsFilters = { status: "all", search: "" };

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

  const iconPaths = {
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
    calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 11h8M8 16h5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9Z"/><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9Z"/>',
    briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect width="20" height="14" x="2" y="6" rx="2"/><path d="M2 13h20"/><path d="M12 12v2"/>',
    folderPlus: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 4A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    package: '<path d="m7.5 4.3 9 5.2"/><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 12h8M8 17h5"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.4 5.6L21 8"/><path d="M21 3v5h-5"/>',
    rotateCcw: '<path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-6.7L3 8"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 1.7l-.1.8a2 2 0 0 1-3 1.7l-.7-.4a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.7.4a2 2 0 0 1 0 3.4l-.7.4a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.7-.4a2 2 0 0 1 3 1.7l.1.8a2 2 0 0 0 2 1.7h.4a2 2 0 0 0 2-1.7l.1-.8a2 2 0 0 1 3-1.7l.7.4a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.7-.4a2 2 0 0 1 0-3.4l.7-.4a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.7.4a2 2 0 0 1-3-1.7l-.1-.8a2 2 0 0 0-2-1.7Z"/><circle cx="12" cy="12" r="3"/>',
    shoppingCart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.1 2.1h2l2.7 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H5.1"/>',
    spreadsheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M10 9v12M14 13v8"/>',
    test: '<path d="M10 2v7.5L4.2 19a2 2 0 0 0 1.7 3h12.2a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 17h1"/><path d="M19 17h3v-6l-3-4h-5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 13h.01"/>',
    warehouse: '<path d="M22 8.4 12 2 2 8.4"/><path d="M20 10v10H4V10"/><path d="M8 20v-6h8v6"/><path d="M8 14h8"/><path d="M8 17h8"/>'
  };

  function icon(name, className) {
    const path = iconPaths[name] || iconPaths.file;
    const classAttr = className ? ` app-icon ${className}` : "app-icon";
    return `<svg class="${classAttr}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function hydrateIcons(rootNode) {
    (rootNode || document).querySelectorAll("[data-icon]").forEach(function (node) {
      node.innerHTML = icon(node.dataset.icon || "file");
    });
  }

  function makeLocalId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  const pages = {
    orderCreate: { title: "Tạo đơn", href: "./order-create.html", icon: "shoppingCart", roles: ["admin", "sales"], modes: ["simple", "standard", "advanced"], hidden: true },
    orders: { title: "Đơn hàng", href: "./orders.html", icon: "clipboard", roles: ["admin", "sales", "viewer"], modes: ["simple", "standard", "advanced"] },
    customers: { title: "Khách hàng", href: "./customers.html", icon: "users", roles: ["admin", "sales", "viewer"], modes: ["simple", "standard", "advanced"] },
    products: { title: "Sản phẩm", href: "./products.html", icon: "package", roles: ["admin", "sales", "inventory", "viewer"], modes: ["simple", "standard", "advanced"] },
    inventory: { title: "Kho hàng", href: "./inventory.html", icon: "warehouse", roles: ["admin", "inventory", "viewer"], modes: ["simple", "standard", "advanced"] },
    purchasing: { title: "Mua hàng", href: "./purchasing.html", icon: "truck", roles: ["admin", "inventory"], modes: ["standard", "advanced"] },
    suppliers: { title: "Nhà cung cấp", href: "./suppliers.html", icon: "users", roles: ["admin", "inventory"], modes: ["standard", "advanced"] },
    purchaseCreate: { title: "Tạo phiếu mua", href: "./purchase-create.html", icon: "plus", roles: ["admin", "inventory"], modes: ["standard", "advanced"], hidden: true },
    accounting: { title: "Kế toán", href: "./accounting.html", icon: "calculator", roles: ["admin"], modes: ["standard", "advanced"] },
    accountingSettings: { title: "Thiết lập kế toán", href: "./accounting-settings.html", icon: "settings", roles: ["admin"], modes: ["standard", "advanced"], hidden: true, parent: "accounting" },
    reports: { title: "Báo cáo", href: "./reports.html", icon: "chart", roles: ["admin", "sales", "inventory", "viewer"], modes: ["simple", "standard", "advanced"] },
    content: { title: "Content", href: "./content.html", icon: "sparkles", roles: ["admin"], modes: ["advanced"] },
    channels: { title: "Kênh bán", href: "./channels.html", icon: "truck", roles: ["admin"], modes: ["advanced"] },
    channelSettings: { title: "Thiết lập kênh", href: "./channel-settings.html", icon: "settings", roles: ["admin"], modes: ["advanced"], hidden: true, parent: "channels" },
    team: { title: "Team Hub", href: "./team.html", icon: "briefcase", roles: ["admin", "inventory"], modes: ["standard", "advanced"] },
    teamPricing: { title: "Tính giá", href: "./team-pricing.html", icon: "calculator", roles: ["admin", "inventory"], modes: ["standard", "advanced"], hidden: true },
    meetingMinutes: { title: "Biên bản họp", href: "./meeting-minutes.html", icon: "clipboard", roles: ["admin"], modes: ["advanced"], hidden: true },
    incense: { title: "Xin vía", href: "./incense.html", icon: "sparkles", roles: ["admin", "sales", "inventory"], modes: ["advanced"], hidden: true },
    users: { title: "Nhân viên", href: "./users.html", icon: "userPlus", roles: ["admin"], modes: ["standard", "advanced"], adminOnly: true },
    settings: { title: "Cài đặt", href: "./settings.html", icon: "settings", roles: ["admin"], modes: ["standard", "advanced"], adminOnly: true },
    activity: { title: "Lịch sử hoạt động", href: "./activity.html", icon: "history", roles: ["admin"], modes: ["advanced"], adminOnly: true }
  };

  const navGroups = [
    { id: "sales", title: "Bán hàng", defaultOpen: true, items: ["orderCreate", "orders", "customers"] },
    { id: "catalog", title: "Hàng hóa & cung ứng", defaultOpen: true, items: ["products", "teamPricing", "inventory", "purchasing", "suppliers"] },
    { id: "growth", title: "Kênh bán & tăng trưởng", defaultOpen: false, items: ["channels", "content"] },
    { id: "finance", title: "Tài chính", defaultOpen: false, items: ["accounting", "reports"] },
    { id: "internal", title: "Làm việc nội bộ", defaultOpen: false, items: ["team", "meetingMinutes", "incense"] },
    { id: "admin", title: "Quản trị", defaultOpen: false, items: ["users", "settings", "activity"] }
  ];

  const qs = selector => document.querySelector(selector);
  const moneyFieldNames = new Set([
    "amount", "refundAmount", "openingBalance", "actualBalance", "costPrice", "salePrice", "unitPrice", "unitCost",
    "shippingFee", "discount", "paidAmount", "cashReceived", "baseCost"
  ]);

  function cleanMoneyText(value) {
    const text = String(value || "").replace(/[^\d-]/g, "");
    if (!text || text === "-") return "";
    return text.indexOf("-") === 0 ? "-" + text.slice(1).replace(/-/g, "") : text.replace(/-/g, "");
  }

  function formatMoneyText(value) {
    const raw = cleanMoneyText(value);
    if (!raw) return "";
    const sign = raw.indexOf("-") === 0 ? "-" : "";
    const digits = sign ? raw.slice(1) : raw;
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function isMoneyInput(input) {
    if (!input || input.tagName !== "INPUT") return false;
    if (input.dataset.moneyInput === "true") return true;
    if (input.dataset.moneyInput === "false") return false;
    const key = input.name || input.id || "";
    if (!key || /percent|quantity|stock|weight|margin|points|roundingstep/i.test(key)) return false;
    if (input.matches("[data-order-price], [data-purchase-cost], [data-reconciliation-actual]")) return true;
    if (input.matches("[data-order-money], [data-purchase-money]") && !/percent/i.test(key)) return true;
    return moneyFieldNames.has(key) || /(Price|Cost|Fee|Amount|Balance)$/i.test(key);
  }

  function unformatMoneyInput(input) {
    if (!isMoneyInput(input)) return;
    const raw = cleanMoneyText(input.value);
    if (input.value !== raw) input.value = raw;
  }

  function formatMoneyInput(input) {
    if (!isMoneyInput(input) || document.activeElement === input) return;
    const formatted = formatMoneyText(input.value);
    if (input.value !== formatted) input.value = formatted;
  }

  function normalizeMoneyInputs(rootNode) {
    (rootNode || document).querySelectorAll("input").forEach(unformatMoneyInput);
  }

  function enhanceMoneyInputs(rootNode) {
    (rootNode || document).querySelectorAll("input").forEach(input => {
      if (!isMoneyInput(input)) return;
      input.dataset.moneyInput = "true";
      if (input.type === "number") input.type = "text";
      input.inputMode = "numeric";
      input.autocomplete = input.autocomplete || "off";
      formatMoneyInput(input);
    });
  }

  const els = {
    authScreen: qs("[data-auth-screen]"),
    appShell: qs("[data-app-shell]"),
    loginForm: qs("[data-login-form]"),
    currentUser: qs("[data-current-user]"),
    title: qs("[data-page-title]"),
    spaceNav: qs("[data-space-nav]"),
    contextTitle: qs("[data-context-title]"),
    navList: qs("[data-nav-list]"),
    ordersTable: qs("[data-orders-table]"),
    orderCreateForm: qs("[data-order-create-form]"),
    purchaseCreateForm: qs("[data-purchase-create-form]"),
    orderChannelFilter: qs("[data-order-channel-filter]"),
    orderStatusFilter: qs("[data-order-status-filter]"),
    orderPaymentFilter: qs("[data-order-payment-filter]"),
    orderShippingFilter: qs("[data-order-shipping-filter]"),
    productsTable: qs("[data-products-table]"),
    productCsvFile: qs("[data-product-csv-file]"),
    productCategoryFilter: qs("[data-product-category-filter]"),
    productStatusFilter: qs("[data-product-status-filter]"),
    productStockFilter: qs("[data-product-stock-filter]"),
    productMarginFilter: qs("[data-product-margin-filter]"),
    productContentFilter: qs("[data-product-content-filter]"),
    productAssetsFilter: qs("[data-product-assets-filter]"),
    productSort: qs("[data-product-sort]"),
    contentTable: qs("[data-content-table]"),
    contentStatusFilter: qs("[data-content-status-filter]"),
    contentTypeFilter: qs("[data-content-type-filter]"),
    contentOwnerFilter: qs("[data-content-owner-filter]"),
    contentChannelFilter: qs("[data-content-channel-filter]"),
    contentProductFilter: qs("[data-content-product-filter]"),
    contentScheduleFilter: qs("[data-content-schedule-filter]"),
    contentResultCount: qs("[data-content-result-count]"),
    contentAdvancedFilterButton: qs("[data-content-advanced-filter-button]"),
    contentAdvancedFilterLabel: qs("[data-content-advanced-filter-label]"),
    teamContent: qs("[data-team-content]"),
    teamStatusFilter: qs("[data-team-status-filter]"),
    teamOwnerFilter: qs("[data-team-owner-filter]"),
    teamRangeFilter: qs("[data-team-range-filter]"),
    teamPanelTitle: qs("[data-team-panel-title]"),
    teamPanelNote: qs("[data-team-panel-note]"),
    minutesList: qs("[data-minutes-list]"),
    minutesForm: qs("[data-meeting-minutes-form]"),
    minutesTitle: qs("[data-minutes-title]"),
    minutesSubtitle: qs("[data-minutes-subtitle]"),
    minutesAgendaList: qs("[data-minutes-agenda-list]"),
    minutesDecisionsList: qs("[data-minutes-decisions-list]"),
    minutesActionsList: qs("[data-minutes-actions-list]"),
    minutesLinksList: qs("[data-minutes-links-list]"),
    minutesQuickNote: qs("[data-minutes-quick-note]"),
    minutesHiddenAgenda: qs("[data-minutes-hidden-agenda]"),
    minutesHiddenDecisions: qs("[data-minutes-hidden-decisions]"),
    minutesHiddenActions: qs("[data-minutes-hidden-actions]"),
    minutesHiddenLinks: qs("[data-minutes-hidden-links]"),
    minutesEmpty: qs("[data-minutes-empty]"),
    incenseForm: qs("[data-incense-form]"),
    incenseKind: qs("[data-incense-kind]"),
    incenseOfferings: qs("[data-incense-offerings]"),
    offeringTray: qs("[data-offering-tray]"),
    incenseWish: qs("[data-incense-wish]"),
    incenseHistory: qs("[data-incense-history]"),
    incenseResult: qs("[data-incense-result]"),
    customersTable: qs("[data-customers-table]"),
    customerCsvFile: qs("[data-customer-csv-file]"),
    usersTable: qs("[data-users-table]"),
    userRoleFilter: qs("[data-user-role-filter]"),
    userStatusFilter: qs("[data-user-status-filter]"),
    userResultCount: qs("[data-user-result-count]"),
    settingsForm: qs("[data-settings-form]"),
    settingsPreview: qs("[data-settings-preview]"),
    auditTable: qs("[data-audit-table]"),
    auditHealth: qs("[data-audit-health]"),
    auditResultCount: qs("[data-audit-result-count]"),
    auditEntityFilter: qs("[data-audit-entity-filter]"),
    auditRangeFilter: qs("[data-audit-range-filter]"),
    inventoryProductsTable: qs("[data-inventory-products-table]"),
    stockMovementsTable: qs("[data-stock-movements-table]"),
    inventoryResultCount: qs("[data-inventory-result-count]"),
    inventoryMovementsOverlay: qs("[data-inventory-movements-overlay]"),
    accountingAccounts: qs("[data-accounting-accounts]"),
    accountingReconciliations: qs("[data-accounting-reconciliations]"),
    accountingCategories: qs("[data-accounting-categories]"),
    accountingCategoriesIncome: qs("[data-accounting-categories-income]"),
    accountingCategoriesExpense: qs("[data-accounting-categories-expense]"),
    accountingTransactionsTable: qs("[data-accounting-transactions-table]"),
    accountingReceivables: qs("[data-accounting-receivables]"),
    accountingTypeSelect: qs("[data-accounting-type-select]"),
    accountingAccountFilter: qs("[data-accounting-account-filter]"),
    accountingRangeFilter: qs("[data-accounting-range-filter]"),
    accountingLedgerCount: qs("[data-accounting-ledger-count]"),
    accountingProfitRange: qs("[data-accounting-profit-range]"),
    accountingProfitChart: qs("[data-accounting-profit-chart]"),
    accountingExpenseBreakdown: qs("[data-accounting-expense-breakdown]"),
    accountingProductProfitTable: qs("[data-accounting-product-profit-table]"),
    accountingProfitCount: qs("[data-accounting-profit-count]"),
    accountingProfitInsights: qs("[data-accounting-profit-insights]"),
    accountingPayrollRange: qs("[data-accounting-payroll-range]"),
    accountingPayrollSearch: qs("[data-accounting-payroll-search]"),
    accountingPayrollTable: qs("[data-accounting-payroll-table]"),
    purchaseOrdersTable: qs("[data-purchase-orders-table]"),
    suppliersList: qs("[data-suppliers-list]"),
    purchaseStatusFilter: qs("[data-purchase-status-filter]"),
    purchasePaymentFilter: qs("[data-purchase-payment-filter]"),
    reportRange: qs("[data-report-range]"),
    reportChannel: qs("[data-report-channel]"),
    reportComparison: qs("[data-report-comparison]"),
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
            <button class="icon-button" type="button" data-close-modal aria-label="Đóng">${icon("close")}</button>
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

  function getCachedSessionUser() {
    try {
      return JSON.parse(localStorage.getItem(sessionUserKey) || "null");
    } catch {
      return null;
    }
  }

  function setCachedSessionUser(user) {
    if (user && user.id) localStorage.setItem(sessionUserKey, JSON.stringify(user));
    else localStorage.removeItem(sessionUserKey);
  }

  class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "ApiError";
      this.code = options.code || "api_error";
      this.status = options.status || 0;
      this.transient = Boolean(options.transient);
      this.auth = Boolean(options.auth);
      this.requestId = options.requestId || "";
    }
  }

  function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function makeRequestId(action) {
    return `${action || "api"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function isAuthError(message, status) {
    const text = String(message || "").toLowerCase();
    return status === 401 ||
      text.includes("unauthenticated") ||
      text.includes("invalid session") ||
      text.includes("session expired");
  }

  function isTransientStatus(status) {
    return [0, 408, 425, 429, 500, 502, 503, 504].includes(Number(status || 0));
  }

  function userMessageForApiError(error) {
    if (error.auth) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.transient) return "Kết nối đang chập chờn. Web vẫn giữ dữ liệu hiện có và sẽ thử lại khi bạn thao tác tiếp.";
    return error.message || "Yêu cầu API thất bại.";
  }

  function setConnectionStatus(status, title, message) {
    document.querySelectorAll(".context-connection").forEach(indicator => {
      indicator.dataset.connectionStatus = status || "online";
      const label = indicator.querySelector("span:last-child");
      if (label) label.textContent = `${title || "Đã kết nối"}${message || " qua Worker"}`;
    });
  }

  function actionForPath(path) {
    return {
      "/auth/bootstrap-status": "bootstrapStatus",
      "/auth/setup-admin": "setupAdmin",
      "/auth/login": "login",
      "/auth/me": "me",
      "/auth/logout": "logout",
      "/auth/profile": "updateMyProfile",
      "/auth/password": "changeMyPassword",
      "/users": "listUsers",
      "/users/create": "createUser",
      "/users/toggle": "toggleUser",
      "/users/delete": "deleteUser",
      "/audit-logs": "listAuditLogs",
      "/products": "listProducts",
      "/products/create": "createProduct",
      "/products/update": "updateProduct",
      "/products/archive": "archiveProduct",
      "/products/options/create": "createProductOption",
      "/products/options/update": "updateProductOption",
      "/products/options/toggle": "toggleProductOption",
      "/content": "getContentWorkspaceData",
      "/content/create": "createContentItem",
      "/content/update": "updateContentItem",
      "/content/archive": "archiveContentItem",
      "/content/provision-assets": "provisionContentItemAssets",
      "/team": "getTeamWorkspaceData",
      "/team/create": "createTeamItem",
      "/team/update": "updateTeamItem",
      "/team/archive": "archiveTeamItem",
      "/omni": "getOmniWorkspaceData",
      "/omni/channels/upsert": "upsertSalesChannel",
      "/omni/channels/archive": "archiveSalesChannel",
      "/omni/mappings/upsert": "upsertChannelProduct",
      "/omni/mappings/archive": "archiveChannelProduct",
      "/omni/campaigns/upsert": "upsertCampaign",
      "/omni/campaigns/archive": "archiveCampaign",
      "/omni/tasks/upsert": "upsertWorkspaceTask",
      "/omni/tasks/archive": "archiveWorkspaceTask",
      "/incense": "getIncenseData",
      "/incense/create": "createIncenseWish",
      "/products/import": "importProducts",
      "/products/provision-content": "provisionProductContent",
      "/products/provision-missing-content": "provisionMissingProductContent",
      "/products/test-content-setup": "testProductContentConfiguration",
      "/customers": "listCustomers",
      "/customers/create": "createCustomer",
      "/customers/update": "updateCustomer",
      "/customers/archive": "archiveCustomer",
      "/customers/import": "importCustomers",
      "/orders": "listOrders",
      "/orders/create": "createOrder",
      "/orders/receipt-pdf": "createOrderReceiptPdf",
      "/settings": "getAppSettings",
      "/settings/update": "updateAppSettings",
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
      "/accounting/transactions/update": "updateCashTransaction",
      "/accounting/transactions/archive": "archiveCashTransaction",
      "/accounting/accounts/create": "createAccountingAccount",
      "/accounting/accounts/update": "updateAccountingAccount",
      "/accounting/accounts/archive": "archiveAccountingAccount",
      "/accounting/reconciliations/create": "createAccountingReconciliation",
      "/accounting/categories/create": "createAccountingCategory",
      "/accounting/categories/update": "updateAccountingCategory",
      "/accounting/categories/archive": "archiveAccountingCategory",
      "/accounting/payouts/create": "createPlatformPayout",
      "/accounting/payouts/update": "updatePlatformPayout",
      "/accounting/payouts/items/create": "addPlatformPayoutItem",
      "/accounting/payouts/match": "autoMatchPlatformPayout",
      "/accounting/payouts/post": "postPlatformPayout",
      "/accounting/payouts/resolve": "resolvePlatformPayoutMismatch",
      "/accounting/settings/update": "updateAccountingSettings",
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
    if (!config.apiUrl) throw new ApiError("Ch\u01b0a c\u1ea5u h\u00ecnh apiUrl trong assets/js/config.js.", { code: "missing_api_url" });
    const action = actionForPath(path);
    if (!action) throw new ApiError("Action API kh\u00f4ng h\u1ee3p l\u1ec7.", { code: "invalid_action" });

    const payload = options.body ? JSON.parse(options.body) : {};
    const token = getToken();
    if (token) payload.token = token;
    const requestBody = JSON.stringify({ ...payload, action });
    const defaultRetries = readOnlyActions.has(action) ? 2 : 0;
    const maxRetries = options.retries === undefined ? defaultRetries : Math.max(0, Number(options.retries || 0));
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const requestId = makeRequestId(action);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT_MS);

      try {
        const response = await fetch(config.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
            "X-Client-Request-Id": requestId
          },
          body: requestBody,
          signal: controller.signal
        });
        window.clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));
        const message = data.error || data.message || "Y\u00eau c\u1ea7u API th\u1ea5t b\u1ea1i.";
        if (!response.ok || data.ok === false) {
          const status = response.status || Number(data.status || 0);
          const auth = isAuthError(message, status);
          throw new ApiError(message, {
            code: auth ? "auth" : (data.code || "api_error"),
            status,
            auth,
            transient: !auth && isTransientStatus(status),
            requestId: data.requestId || response.headers.get("X-Request-Id") || requestId
          });
        }

        setConnectionStatus("online", "\u0110\u00e3 k\u1ebft n\u1ed1i", " Phi\u00ean l\u00e0m vi\u1ec7c \u0111\u01b0\u1ee3c x\u00e1c th\u1ef1c qua Worker.");
        return data;
      } catch (error) {
        window.clearTimeout(timeoutId);
        if (error instanceof ApiError) {
          lastError = error;
        } else {
          const aborted = error && error.name === "AbortError";
          lastError = new ApiError(
            aborted ? "K\u1ebft n\u1ed1i t\u1edbi m\u00e1y ch\u1ee7 qu\u00e1 l\u00e2u, web s\u1ebd th\u1eed l\u1ea1i." : "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7. H\u00e3y ki\u1ec3m tra m\u1ea1ng ho\u1eb7c Worker.",
            { code: aborted ? "timeout" : "network", transient: true, requestId }
          );
        }

        if (lastError.auth || !lastError.transient || attempt >= maxRetries) break;
        setConnectionStatus("unstable", "K\u1ebft n\u1ed1i ch\u1eadp ch\u1eddn", " \u0110ang th\u1eed l\u1ea1i, d\u1eef li\u1ec7u tr\u00ean m\u00e0n h\u00ecnh v\u1eabn \u0111\u01b0\u1ee3c gi\u1eef.");
        await sleep(API_RETRY_DELAYS[Math.min(attempt, API_RETRY_DELAYS.length - 1)]);
      }
    }

    if (lastError && lastError.transient) {
      setConnectionStatus("offline", "M\u1ea5t k\u1ebft n\u1ed1i t\u1ea1m th\u1eddi", " Web \u0111ang d\u00f9ng d\u1eef li\u1ec7u \u0111\u00e3 l\u01b0u, kh\u00f4ng \u0111\u0103ng xu\u1ea5t b\u1ea1n.");
    }
    throw lastError || new ApiError("Y\u00eau c\u1ea7u API th\u1ea5t b\u1ea1i.", { code: "api_error" });
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
      button.dataset.originalHtml = button.innerHTML;
      button.dataset.originalTitle = button.getAttribute("title") || "";
      button.dataset.originalAriaLabel = button.getAttribute("aria-label") || "";
      button.setAttribute("aria-busy", "true");
      if (button.classList.contains("icon-only")) {
        const busyLabel = label || "Đang xử lý...";
        button.setAttribute("title", busyLabel);
        button.setAttribute("aria-label", busyLabel);
      } else {
        button.textContent = label || "Đang xử lý...";
      }
      button.disabled = true;
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    if (Object.prototype.hasOwnProperty.call(button.dataset, "originalTitle")) {
      if (button.dataset.originalTitle) button.setAttribute("title", button.dataset.originalTitle);
      else button.removeAttribute("title");
    }
    if (Object.prototype.hasOwnProperty.call(button.dataset, "originalAriaLabel")) {
      if (button.dataset.originalAriaLabel) button.setAttribute("aria-label", button.dataset.originalAriaLabel);
      else button.removeAttribute("aria-label");
    }
    delete button.dataset.originalHtml;
    delete button.dataset.originalTitle;
    delete button.dataset.originalAriaLabel;
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

  function redirectToHome() {
    window.location.href = page === "auth" ? "./pages/products.html" : "./products.html";
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

  function formatDateTimeShort(value) {
    if (!value) return "Chưa có";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(date);
  }

  function compactMoney(value) {
    const amount = Math.round(Number(value || 0));
    if (!amount) return "0";
    if (Math.abs(amount) >= 1000000000) return `${(amount / 1000000000).toFixed(Math.abs(amount) >= 10000000000 ? 1 : 2).replace(/\.0+$/, "")} tỷ`;
    if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(Math.abs(amount) >= 10000000 ? 1 : 2).replace(/\.0+$/, "")} tr`;
    if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)}k`;
    return String(amount);
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

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function getReceiptSettings() {
    const defaults = {
      storeName: "ArtFlow",
      legalName: "",
      storeInfo: "Họa cụ và phụ kiện mỹ thuật",
      phone: "",
      email: "",
      website: "",
      address: "",
      bankName: "",
      bankAccount: "",
      bankOwner: "",
      representative: "",
      businessRegistration: "",
      invoiceSeries: "",
      invoiceTemplate: "",
      invoiceLegalNotice: "Phiếu bán hàng nội bộ/POS. Không thay thế hóa đơn điện tử hợp lệ nếu người mua yêu cầu hóa đơn theo quy định.",
      footer: "Cảm ơn quý khách. Hàng đã mua vui lòng đổi trả theo chính sách của cửa hàng.",
      taxCode: "",
      paperSize: "thermal80",
      paperWidth: "80",
      receiptStyle: "pro",
      showSku: true,
      showCustomer: true,
      showPoints: true,
      showUnitPrice: true
    };
    try {
      const stateSettings = state.appSettings && state.appSettings.receiptSettings;
      const localSettings = JSON.parse(localStorage.getItem(receiptSettingsKey) || "{}");
      const saved = stateSettings && typeof stateSettings === "object" ? stateSettings : localSettings;
      const merged = { ...defaults, ...saved };
      if (!merged.legalName) merged.legalName = merged.storeName;
      if (saved.paperWidth && !saved.paperSize) merged.paperSize = `thermal${saved.paperWidth}`;
      return merged;
    } catch (error) {
      return defaults;
    }
  }

  async function saveReceiptSettings(settings) {
    const saved = { ...getReceiptSettings(), ...settings };
    try {
      const response = await apiRequest("/settings/update", {
        method: "POST",
        body: JSON.stringify({ key: "receiptSettings", value: saved })
      });
      state.appSettings = response.settings || { ...(state.appSettings || {}), receiptSettings: saved };
      window.ArtFlowPosStore.save(state);
    } catch (error) {
      showToast(`Chưa lưu được cài đặt lên hệ thống: ${error.message}`, "error");
      throw error;
    }
    localStorage.setItem(receiptSettingsKey, JSON.stringify(saved));
  }

  function receiptPaperProfile(settings = getReceiptSettings()) {
    const key = String(settings.paperSize || settings.paperWidth || "thermal80").toLowerCase();
    const profiles = {
      "58": { width: 58, margin: 3, font: 10.5, title: 15, compact: true },
      thermal58: { width: 58, margin: 3, font: 10.5, title: 15, compact: true },
      "76": { width: 76, margin: 4, font: 11, title: 17, compact: false },
      thermal76: { width: 76, margin: 4, font: 11, title: 17, compact: false },
      "80": { width: 80, margin: 4, font: 11, title: 17, compact: false },
      thermal80: { width: 80, margin: 4, font: 11, title: 17, compact: false },
      "112": { width: 112, margin: 6, font: 12, title: 19, compact: false },
      thermal112: { width: 112, margin: 6, font: 12, title: 19, compact: false },
      a5: { width: 148, margin: 10, font: 12, title: 20, compact: false },
      a4: { width: 210, margin: 14, font: 12, title: 22, compact: false }
    };
    return profiles[key] || profiles.thermal80;
  }

  function loyaltyPointsForCustomer(customer) {
    if (!customer) return 0;
    if (customer.loyaltyPoints !== undefined) return Math.max(0, Number(customer.loyaltyPoints || 0));
    return Math.floor(Number(customer.totalSpent || 0) / loyaltyRules.earnPerVnd);
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

  function canManageContent() {
    return currentUser && ["admin", "inventory", "sales"].includes(currentUser.role);
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
      low_stock_audit: "Kiểm kho",
      product_edit: "Sửa sản phẩm",
      sale: "Bán hàng",
      sales_return: "Khách trả hàng",
      csv_import: "Nhập từ file",
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
    return `${escapeHtml(items[0].name)}${items.length > 1 ? ` +${items.length - 1} mặt hàng` : ""} · ${quantity} SP`;
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

  function isPaid(order) {
    return order.paymentStatus === "paid" || order.status === "paid";
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

















  const { normalizeProduct, normalizeProductOption, normalizeContentItem, normalizeIncenseWish, normalizeTeamAction, normalizeTeamMeeting, normalizeTeamPlan, normalizePricingLine, normalizePricingScenario, normalizePricingModel, normalizeTeamDecision, normalizeSalesChannel, normalizeChannelProduct, normalizeInventoryReservation, normalizeCampaign, normalizeWorkspaceTask, normalizeCustomer, normalizeOrderItem, normalizeOrder, normalizeSalesReturn, normalizeOrderRefund, normalizeStockMovement, normalizeAccountingAccount, normalizeAccountingCategory, normalizeAccountingReconciliation, normalizeCashTransaction, normalizePlatformPayout, normalizeSupplier, normalizePurchaseOrder, normalizeSupplierPayment, normalizePurchaseReturn, normalizeSupplierCreditApplication } = window.ArtFlowDomain.create({ makeLocalId, channels });

  function showToastLink(message, href, label) {
    showToast(message);
    if (!els.toast || !href) return;
    els.toast.innerHTML = `<span>${escapeHtml(message)}</span><a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`;
  }

















  async function loadProducts(options = {}) {
    try {
      const data = await apiRequest("/products");
      state.products = (data.products || []).map(normalizeProduct);
      state.productOptions = (data.productOptions || []).map(normalizeProductOption);
      state.contentOwners = data.contentOwners || [];
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
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











  async function loadAccountingData(options = {}) {
    try {
      const data = await apiRequest("/accounting");
      state.accountingAccounts = (data.accounts || []).map(normalizeAccountingAccount);
      state.accountingCategories = (data.categories || []).map(normalizeAccountingCategory);
      state.accountingReconciliations = (data.reconciliations || []).map(normalizeAccountingReconciliation);
      state.cashTransactions = (data.transactions || []).map(normalizeCashTransaction);
      state.platformPayouts = (data.platformPayouts || []).map(normalizePlatformPayout);
      state.accountingSettings = data.accountingSettings || {};
      window.ArtFlowPosStore.save(state);
      return true;
    } catch (error) {
      state.accountingAccounts = state.accountingAccounts || [];
      state.accountingCategories = state.accountingCategories || [];
      state.accountingReconciliations = state.accountingReconciliations || [];
      state.cashTransactions = state.cashTransactions || [];
      state.platformPayouts = state.platformPayouts || [];
      state.accountingSettings = state.accountingSettings || {};
      if (!options.quiet) showToast(error.message, "error");
      return false;
    }
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
      orders: ["customers", "orders", "accounting", "settings"],
      orderCreate: ["products", "customers", "settings"],
      products: ["products"],
      channels: ["omni"],
      channelSettings: ["omni"],
      content: ["content"],
      team: ["team"],
      teamPricing: ["products", "team", "omni"],
      meetingMinutes: ["team"],
      incense: ["incense"],
      customers: ["customers"],
      inventory: ["products", "stockMovements"],
      accounting: ["customers", "orders", "accounting", "purchasing", "omni"],
      accountingSettings: ["accounting", "omni"],
      purchasing: ["purchasing"],
      suppliers: ["purchasing"],
      purchaseCreate: ["products", "purchasing"],
      reports: ["products", "customers", "orders", "accounting"],
      settings: ["settings"],
      users: [],
      activity: []
    };
    const scopes = [...(scopesByPage[page] || [])];
    if (["purchasing", "suppliers"].includes(page) && canPayPurchases()) scopes.push("accounting");
    return [...new Set(scopes)];
  }

  function applyPageData(data, scopes) {
    if (scopes.includes("products")) {
      state.products = (data.products || []).map(normalizeProduct);
      state.productOptions = (data.productOptions || []).map(normalizeProductOption);
      state.contentOwners = data.contentOwners || [];
    }
    if (scopes.includes("content")) {
      state.contentItems = (data.contentItems || []).map(normalizeContentItem);
      state.products = (data.products || []).map(normalizeProduct);
      state.contentOwners = data.contentOwners || [];
    }
    if (scopes.includes("team")) {
      state.teamMeetings = (data.teamMeetings || []).map(normalizeTeamMeeting);
      state.teamPlans = (data.teamPlans || []).map(normalizeTeamPlan);
      state.teamPricingModels = (data.teamPricingModels || []).map(normalizePricingModel);
      state.teamDecisions = (data.teamDecisions || []).map(normalizeTeamDecision);
      state.workspaceTasks = (data.workspaceTasks || state.workspaceTasks || []).map(normalizeWorkspaceTask);
      state.campaigns = (data.campaigns || state.campaigns || []).map(normalizeCampaign);
      state.products = (data.products || state.products || []).map(normalizeProduct);
      state.contentOwners = data.contentOwners || state.contentOwners || [];
      if (Array.isArray(data.users)) state.users = data.users;
    }
    if (scopes.includes("omni")) {
      state.salesChannels = (data.salesChannels || []).map(normalizeSalesChannel);
      state.channelProducts = (data.channelProducts || []).map(normalizeChannelProduct);
      state.inventoryReservations = (data.inventoryReservations || []).map(normalizeInventoryReservation);
      state.campaigns = (data.campaigns || []).map(normalizeCampaign);
      state.workspaceTasks = (data.workspaceTasks || []).map(normalizeWorkspaceTask);
      state.products = (data.products || state.products || []).map(normalizeProduct);
      state.orders = (data.orders || state.orders || []).map(normalizeOrder);
      if (Array.isArray(data.users)) state.users = data.users;
    }
    if (scopes.includes("incense")) {
      state.incenseWishes = (data.incenseWishes || []).map(normalizeIncenseWish);
    }
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
      state.platformPayouts = (data.platformPayouts || []).map(normalizePlatformPayout);
      state.accountingSettings = data.accountingSettings || {};
    }
    if (scopes.includes("purchasing")) {
      state.suppliers = (data.suppliers || []).map(normalizeSupplier);
      state.purchaseOrders = (data.purchaseOrders || []).map(normalizePurchaseOrder);
      state.supplierPayments = (data.supplierPayments || []).map(normalizeSupplierPayment);
      state.purchaseReturns = (data.purchaseReturns || []).map(normalizePurchaseReturn);
      state.supplierCreditApplications = (data.supplierCreditApplications || []).map(normalizeSupplierCreditApplication);
    }
    if (scopes.includes("settings")) {
      state.appSettings = data.settings && typeof data.settings === "object" ? data.settings : (state.appSettings || {});
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
          purchasing: loadPurchasingData,
          content: async () => {
            const data = await apiRequest("/content");
            state.contentItems = (data.contentItems || []).map(normalizeContentItem);
            state.products = (data.products || []).map(normalizeProduct);
            state.contentOwners = data.contentOwners || [];
            window.ArtFlowPosStore.save(state);
          },
          team: async () => {
            const data = await apiRequest("/team");
            state.teamMeetings = (data.teamMeetings || []).map(normalizeTeamMeeting);
            state.teamPlans = (data.teamPlans || []).map(normalizeTeamPlan);
            state.teamPricingModels = (data.teamPricingModels || []).map(normalizePricingModel);
            state.teamDecisions = (data.teamDecisions || []).map(normalizeTeamDecision);
            state.products = (data.products || state.products || []).map(normalizeProduct);
            state.contentOwners = data.contentOwners || state.contentOwners || [];
            if (Array.isArray(data.users)) state.users = data.users;
            window.ArtFlowPosStore.save(state);
          },
          omni: async () => {
            const data = await apiRequest("/omni");
            applyPageData(data, ["omni"]);
          },
          settings: async () => {
            const data = await apiRequest("/settings");
            state.appSettings = data.settings || {};
            window.ArtFlowPosStore.save(state);
          }
        };
        await Promise.all(scopes.filter(scope => legacyLoaders[scope]).map(scope => legacyLoaders[scope]({ quiet: true })));
        pageDataReady = true;
        return true;
      }
      if (error.auth) {
        setToken("");
        setCachedSessionUser(null);
        showToast(userMessageForApiError(error), "error");
        redirectToLogin();
        return false;
      }
      if (!options.quiet) showToast(userMessageForApiError(error), error.transient ? "warning" : "error");
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
        <div class="connection-actions">
          <button class="button primary" type="button" data-retry-backend>${icon("refresh")} Thử kết nối lại</button>
        </div>
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
      <button class="button primary" type="submit">${icon(setup ? "userPlus" : "check")} ${setup ? "Tạo tài khoản admin" : "Đăng nhập"}</button>
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
        body: JSON.stringify(payload),
        retries: 1
      }));
      setToken(data.token);
      setCachedSessionUser(data.user);
      redirectToHome();
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
    const role = currentUser?.role || "viewer";
    const activeNavPage = pages[page]?.parent || page;
    const canShow = ([key, item]) => {
      if (!item || item.hidden) return false;
      if (item.adminOnly && !isAdmin()) return false;
      if (item.roles && item.roles.indexOf(role) === -1) return false;
      return true;
    };
    const visibleGroups = navGroups.map(group => ({
      ...group,
      items: group.items
        .map(key => [key, pages[key]])
        .filter(canShow),
      hasActive: group.items.indexOf(activeNavPage) !== -1
    })).filter(group => group.items.length);
    if (els.spaceNav) els.spaceNav.innerHTML = "";
    if (els.contextTitle) els.contextTitle.textContent = "ArtFlow POS";
    const financeViews = page === "accounting" ? [
      ["ledger", "wallet", "Dòng tiền", "Thu, chi và chứng từ"],
      ["receivables", "receipt", "Công nợ", "Các khoản cần thu, trả"],
      ["payouts", "refresh", "Đối soát sàn", "Tiền về và chênh lệch"],
      ["payroll", "users", "Tiền lương", "Chi phí nhân sự"],
      ["tax", "file", "Thuế & chứng từ", "Hồ sơ cuối kỳ"]
    ] : [];
    const financeViewMarkup = financeViews.length ? `<div class="context-view-list">${financeViews.map(([view, viewIcon, label, note]) => `
      <button class="nav-link ${accountingFilters.view === view ? "active" : ""}" type="button" data-accounting-view-filter="${view}">
        <span class="nav-icon">${icon(viewIcon)}</span><span><strong>${label}</strong><small>${note}</small></span><b data-accounting-nav-badge="${view}"></b>
      </button>`).join("")}<a class="nav-link" href="./reports.html"><span class="nav-icon">${icon("chart")}</span><span><strong>Báo cáo</strong><small>Doanh thu và lợi nhuận</small></span></a><a class="nav-link" href="./accounting-settings.html"><span class="nav-icon">${icon("settings")}</span><span><strong>Thiết lập</strong><small>Tài khoản và quy tắc</small></span></a></div>` : "";
    els.navList.innerHTML = visibleGroups.map(group => `
      <section class="nav-group open ${group.hasActive ? "active" : ""}" data-nav-group="${group.id}">
        <p class="context-section-label">${escapeHtml(group.title)}</p>
        <div class="nav-group-items">
          ${group.id === "finance" && financeViews.length ? financeViewMarkup : group.items.map(([key, item]) => `
            <a class="nav-link ${key === activeNavPage ? "active" : ""}" href="${item.href}" data-nav-page="${key}" ${key === activeNavPage ? "aria-current=\"page\"" : ""}>
              <span class="nav-icon">${icon(item.icon)}</span><span>${escapeHtml(item.title)}</span>
            </a>`).join("")}
        </div>
      </section>`).join("");
    hydrateIcons(els.navList || document);
  }

  function applyPermissions() {
    document.querySelectorAll("[data-open-product]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-test-product-content]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-provision-missing-products]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-import-products]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-open-product-options]").forEach(button => {
      button.hidden = !canManageProducts();
    });
    document.querySelectorAll("[data-open-content-item]").forEach(button => {
      button.hidden = !canManageContent();
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
    document.querySelectorAll("[data-open-cash-transaction], [data-open-payroll-expense], [data-open-accounting-account], [data-open-accounting-category], [data-open-accounting-reconciliation], [data-open-accounting-export]").forEach(button => {
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
    const action = log.action || "";
    const rawDescription = log.description || "";
    return {
      id: log.id,
      action,
      description: !rawDescription || rawDescription === action
        ? auditActionLabel(action)
        : rawDescription,
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
    auditHealth = data.auditHealth || auditHealth;
  }

  function renderCurrentUserChip() {
    if (!els.currentUser || !currentUser) return;
    els.currentUser.innerHTML = `
      <button class="user-chip-button" type="button" data-open-profile title="Hồ sơ cá nhân">
        <span class="user-chip-icon">${icon("users")}</span>
        <span class="user-chip-text"><strong>${escapeHtml(currentUser.name)}</strong><span>${roleLabel(currentUser.role)}</span></span>
      </button>
    `;
  }

  async function showApp(user, options = {}) {
    currentUser = user;
    if (user && user.id !== "offline") setCachedSessionUser(user);
    if (["users", "activity"].includes(page) && !isAdmin()) {
      window.location.href = "./products.html";
      return;
    }
    if (page === "purchaseCreate" && !canManagePurchasing()) {
      window.location.href = "./purchasing.html";
      return;
    }

    if (els.authScreen) els.authScreen.hidden = true;
    if (els.appShell) els.appShell.hidden = false;
    if (els.title && pages[page]) els.title.textContent = pages[page].title;
    renderCurrentUserChip();
    renderNav();
    applyPermissions();
    renderPage();

    if (options.offline) {
      setConnectionStatus("offline", "Mất kết nối tạm thời", " Đang dùng dữ liệu đã lưu, không đăng xuất bạn.");
      if (!options.quiet) {
        showToast(options.message || "Không kết nối được backend, đang dùng dữ liệu đã lưu.", "warning");
      }
      return;
    }

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
        await withLoading("Đang kiểm tra phiên đăng nhập...", () => apiRequest("/auth/me", { retries: 1 }));
        redirectToHome();
        return;
      }
      const status = await withLoading("Đang kiểm tra thiết lập hệ thống...", () => apiRequest("/auth/bootstrap-status", { retries: 1 }));
      renderAuthForm(status.hasAdmin ? "login" : "setup");
      const email = els.loginForm && els.loginForm.email;
      if (email) email.focus();
    } catch (error) {
      if (error.auth) {
        setToken("");
        setCachedSessionUser(null);
        renderAuthForm("login");
        showToast(userMessageForApiError(error), "error");
        return;
      }
      renderApiMissing(userMessageForApiError(error));
    }
  }

  async function bootstrapAppPage() {
    if (!config.apiUrl || !getToken()) {
      redirectToLogin();
      return;
    }
    const cachedUser = getCachedSessionUser();
    if (cachedUser) {
      await showApp(cachedUser, { offline: true, quiet: true });
    }
    try {
      const loadingMessage = cachedUser ? "Đang đồng bộ dữ liệu mới..." : "Đang tải không gian làm việc...";
      const session = await withLoading(loadingMessage, () => apiRequest("/auth/me", { retries: 1 }));
      await showApp(session.user);
    } catch (error) {
      if (error.auth) {
        setToken("");
        setCachedSessionUser(null);
        redirectToLogin();
        return;
      }
      const fallbackUser = cachedUser || { id: "offline", name: "Đang kết nối", email: "", role: "viewer", status: "active" };
      await showApp(fallbackUser, { offline: true, message: userMessageForApiError(error) });
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
      setCachedSessionUser(null);
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

  function safeFilePart(value) {
    return String(value || "artflow")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artflow";
  }

  function downloadProductTemplate() {
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createInstructionSheet("HƯỚNG DẪN NHẬP SẢN PHẨM", [
      ["Cách dùng", "Điền dữ liệu tại sheet Sản phẩm, giữ nguyên tên cột ở dòng 4, sau đó bấm Nhập Excel trong ArtFlow."],
      ["SKU", "Bắt buộc, duy nhất. SKU đã tồn tại sẽ được cập nhật; SKU mới sẽ tạo sản phẩm mới."],
      ["Giá", "cost_price là bắt buộc; sale_price là giá shop/offline và có thể để trống hoặc bằng 0 để tính sau. Nếu nhập sale_price thì không được thấp hơn cost_price."],
      ["Tồn kho", "stock và low_stock là số không âm. Thay đổi stock khi nhập sẽ được ghi lịch sử kho."],
      ["Trạng thái", "Chỉ dùng active hoặc archived. Để trống sẽ mặc định active."],
      ["Giới hạn", "Tối đa 500 dòng và 5 MB mỗi lần nhập. Không xóa sheet hoặc đổi tên cột."]
    ]), "Hướng dẫn");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("MẪU NHẬP SẢN PHẨM", "Xóa dòng ví dụ trước khi nhập dữ liệu thật. Các cột content và link có thể để trống.", ["sku", "name", "category", "brand", "barcode", "unit", "weight_grams", "dimensions", "origin", "material", "cost_price", "sale_price", "stock", "low_stock", "image_url", "short_description", "key_features", "target_audience", "seo_keywords", "content_status", "content_owner", "content_note", "website_product_url", "shopee_product_url", "tiktok_product_url", "facebook_product_url", "content_post_links", "status"], [
      ["AF-001", "Sổ vẽ A5", "Sổ & giấy", "ArtFlow", "893000000001", "quyển", 350, "21 x 15 x 2 cm", "Việt Nam", "Giấy mỹ thuật", 45000, 79000, 20, 5, "https://example.com/af-001.jpg", "Sổ vẽ giấy dày cho màu chì và marker.", "Giấy dày 180gsm\nGáy mở phẳng", "Người học vẽ và sinh viên", "sổ vẽ a5, sketchbook", "drafting", "content@artflow.vn", "Cần chụp thêm ảnh cận giấy", "https://artflow.vn/so-ve-a5", "https://shopee.vn/...", "https://shop.tiktok.com/...", "https://facebook.com/...", "TikTok hướng dẫn | https://tiktok.com/...\nVideo review | https://youtube.com/...", "active"],
      ["AF-002", "Bộ màu 12 cây", "Màu vẽ", "ArtFlow", "", "bộ", 220, "18 x 9 x 2 cm", "", "", 80000, 135000, 10, 3, "", "", "", "", "", "not_started", "", "", "", "", "", "", "", "active"]
    ], { widths: [16, 30, 20, 18, 18, 12, 14, 18, 16, 20, 16, 16, 12, 14, 34, 38, 38, 28, 30, 18, 24, 36, 36, 36, 36, 36, 48, 14], moneyColumns: [10, 11], numberColumns: [6, 12, 13], textColumns: [0, 4], wrapColumn: 26 }), "Sản phẩm");
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
      productChannelPriceByCode(product.id, "shopee"),
      productChannelPriceByCode(product.id, "tiktok"),
      productChannelPriceByCode(product.id, "lazada"),
      productChannelPriceByCode(product.id, "website"),
      productChannelPriceByCode(product.id, "facebook"),
      product.stock,
      product.lowStock,
      productContentStatuses[product.contentStatus],
      product.contentOwner,
      product.shortDescription,
      product.seoKeywords,
      product.contentDocUrl,
      product.mediaFolderUrl,
      product.websiteProductUrl,
      product.shopeeProductUrl,
      product.tiktokProductUrl,
      product.facebookProductUrl,
      product.contentPostLinks,
      formatDateTime(product.createdAt),
      formatDateTime(product.updatedAt),
      product.status === "archived" ? "Ngừng bán" : "Đang bán"
    ]);
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("DANH MỤC SẢN PHẨM", `Xuất lúc ${formatDateTime(new Date().toISOString())} · ${products.length} sản phẩm`, ["SKU", "Tên sản phẩm", "Danh mục", "Thương hiệu", "Barcode", "Đơn vị", "Giá vốn", "Giá shop/offline", "Giá Shopee", "Giá TikTok", "Giá Lazada", "Giá Website", "Giá Facebook", "Tồn kho", "Ngưỡng thấp", "Trạng thái content", "Người phụ trách", "Mô tả ngắn", "Từ khóa", "Google Docs", "Folder media", "Website", "Shopee", "TikTok Shop", "Facebook", "Bài đăng / video", "Ngày tạo", "Cập nhật lần cuối", "Trạng thái bán"], rows, { widths: [16, 32, 22, 18, 18, 12, 18, 18, 18, 18, 18, 18, 18, 14, 16, 20, 24, 40, 32, 38, 38, 36, 36, 36, 36, 48, 22, 22, 16], moneyColumns: [6, 7, 8, 9, 10, 11, 12], numberColumns: [13, 14], textColumns: [0, 4], wrapColumn: 25 }), "Sản phẩm");
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
      content_owner: "contentOwner", contentowner: "contentOwner", content_note: "contentNote", contentnote: "contentNote",
      website_product_url: "websiteProductUrl", websiteproducturl: "websiteProductUrl",
      shopee_product_url: "shopeeProductUrl", shopeeproducturl: "shopeeProductUrl",
      tiktok_product_url: "tiktokProductUrl", tiktokproducturl: "tiktokProductUrl",
      facebook_product_url: "facebookProductUrl", facebookproducturl: "facebookProductUrl",
      content_post_links: "contentPostLinks", contentpostlinks: "contentPostLinks", status: "status"
    };
    const headerIndex = rows.findIndex(row => row.some(cell => String(cell || "").replace(/^\uFEFF/, "").trim().toLowerCase() === "sku"));
    if (headerIndex === -1) throw new Error("Không tìm thấy dòng tiêu đề có cột sku.");
    const headers = rows[headerIndex].map(header => aliases[String(header || "").replace(/^\uFEFF/, "").trim().toLowerCase()] || "");
    const required = ["sku", "name", "category", "costPrice", "stock", "lowStock"];
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
      if (!product.sku || !product.name || !product.category || [product.costPrice, product.stock, product.lowStock].some(value => !Number.isFinite(value) || value < 0) || !Number.isFinite(product.salePrice) || product.salePrice < 0) {
        throw new Error(`Dòng ${headerIndex + rowIndex + 2} có dữ liệu không hợp lệ.`);
      }
      if (product.salePrice > 0 && product.salePrice < product.costPrice) throw new Error(`Dòng ${headerIndex + rowIndex + 2}: giá shop/offline thấp hơn giá vốn.`);
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

  function exportContentReport() {
    const items = filteredContentItems();
    const rows = items.map(item => {
      const product = getContentProduct(item);
      const checklist = Array.isArray(item.checklist) ? item.checklist : [];
      const assetChecklist = Array.isArray(item.assetChecklist) ? item.assetChecklist : [];
      return [
        item.title,
        contentItemTypes[item.type] || item.type,
        contentItemStatuses[item.status] || item.status,
        contentChannels[item.channel] || item.channel,
        contentPriorities[item.priority] || item.priority,
        item.owner || "",
        item.collaborators || "",
        product ? product.sku : "",
        product ? product.name : "",
        item.dueDate || "",
        item.publishAt || "",
        `${checklist.filter(entry => entry.done).length}/${checklist.length || 0}`,
        `${assetChecklist.filter(entry => entry.done).length}/${assetChecklist.length || 0}`,
        item.contentDocUrl || "",
        item.mediaFolderUrl || "",
        item.publishUrl || "",
        item.tags || "",
        item.note || "",
        item.updatedAt || item.createdAt || ""
      ];
    });
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("BÁO CÁO CONTENT", `Xuất lúc ${new Date().toLocaleString("vi-VN")} · ${items.length} chủ đề`, ["Chủ đề", "Loại", "Trạng thái", "Kênh", "Ưu tiên", "Phụ trách", "Phối hợp", "SKU", "Sản phẩm", "Deadline", "Lịch đăng", "Checklist", "Asset", "Docs", "Drive", "Link đã đăng", "Tag", "Ghi chú", "Cập nhật"], rows, { widths: [34, 18, 18, 16, 14, 22, 28, 16, 32, 14, 20, 12, 12, 38, 38, 38, 28, 40, 22], textColumns: [7], wrapColumn: 17 }), "Content");
    saveExcelWorkbook(workbook, `artflow-content-${reportDayKey(new Date())}.xlsx`);
    showToast(`Đã xuất ${items.length} chủ đề content.`);
  }

  function exportTeamReport() {
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    const meetings = (state.teamMeetings || []).map(normalizeTeamMeeting);
    const plans = (state.teamPlans || []).map(normalizeTeamPlan);
    const pricing = (state.teamPricingModels || []).map(normalizePricingModel);
    const decisions = (state.teamDecisions || []).map(normalizeTeamDecision);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("TEAM HUB - BIÊN BẢN", `Xuất lúc ${new Date().toLocaleString("vi-VN")} · ${meetings.length} cuộc họp`, ["Cuộc họp", "Loại", "Trạng thái", "Thời gian", "Chủ trì", "Thành viên", "Agenda", "Biên bản", "Quyết định", "Việc cần làm"], meetings.map(item => [item.title, item.type, teamStatuses[item.status] || item.status, item.meetingAt, item.owner, item.attendees, item.agenda, item.notes, (item.decisions || []).join("\n"), textFromActionRows(item.actions)]), { widths: [32, 14, 16, 20, 22, 32, 42, 52, 44, 44], wrapColumn: 7 }), "Biên bản");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("TEAM HUB - KẾ HOẠCH", `${plans.length} kế hoạch`, ["Kế hoạch", "Kỳ", "Trạng thái", "Phụ trách", "Doanh thu mục tiêu", "Lợi nhuận mục tiêu", "Ngân sách", "Kênh", "Sản phẩm trọng tâm", "Milestone", "Rủi ro", "Ghi chú"], plans.map(item => [item.title, item.period, teamStatuses[item.status] || item.status, item.owner, item.goalRevenue, item.goalProfit, item.budget, item.channels, item.focusProducts, (item.milestones || []).map(m => [m.title, m.dueDate, m.owner].filter(Boolean).join(" | ")).join("\n"), item.risks, item.note]), { widths: [32, 14, 16, 22, 18, 18, 16, 26, 32, 42, 36, 42], moneyColumns: [4, 5, 6], wrapColumn: 9 }), "Kế hoạch");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("TEAM HUB - TÍNH GIÁ", `${pricing.length} bảng tính giá`, ["Bảng tính", "Sản phẩm", "Trạng thái", "Phụ trách", "Giá vốn", "Chi phí thêm", "Kịch bản", "Giá gợi ý", "Biên lãi", "Ghi chú"], pricing.map(item => {
      const product = item.productId ? byId("products", item.productId) : null;
      const scenario = (item.scenarios || []).find(entry => entry.id === item.selectedScenarioId) || (item.scenarios || [])[0] || { targetMargin: 35, manualPrice: 0 };
      const totals = pricingTotals(item, scenario);
      return [item.title, product ? `${product.sku} · ${product.name}` : "", teamStatuses[item.status] || item.status, item.owner, item.baseCost, (item.lines || []).map(line => `${line.label}: ${line.type === "fixed" ? money.format(line.value) : line.value + "%"}`).join("\n"), (item.scenarios || []).map(s => `${s.label}: ${s.targetMargin}%`).join("\n"), totals.suggested, totals.margin / 100, item.note];
    }), { widths: [32, 34, 16, 22, 16, 34, 30, 16, 12, 38], moneyColumns: [4, 7], percentColumns: [8], wrapColumn: 5 }), "Tính giá");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("TEAM HUB - QUYẾT ĐỊNH", `${decisions.length} quyết định`, ["Quyết định", "Trạng thái", "Phụ trách", "Ngày chốt", "Tag", "Nội dung", "Ngày xem lại"], decisions.map(item => [item.title, teamStatuses[item.status] || item.status, item.owner, item.decidedAt, item.tags, item.detail, item.nextReviewAt]), { widths: [38, 16, 22, 14, 28, 56, 14], wrapColumn: 5 }), "Quyết định");
    saveExcelWorkbook(workbook, `artflow-team-hub-${reportDayKey(new Date())}.xlsx`);
    showToast("Đã xuất báo cáo Team Hub.");
  }

  function exportOmniReport() {
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    const rows = filteredChannelProductRows().map(row => [
      row.product.sku,
      row.product.name,
      row.product.category,
      row.product.stock,
      row.reserved,
      row.available,
      row.mappedCount,
      row.mismatch ? "Lệch tồn" : row.mappedCount ? "Đã map" : "Chưa map",
      row.mappings.map(item => {
        const channel = channelByIdOrCode(item.channelId);
        return `${channel ? channel.name : item.channelId}: ${item.channelSku || row.product.sku} / tồn ${item.channelStock} / giá ${item.channelPrice}`;
      }).join("\n")
    ]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("ĐỐI SOÁT KÊNH BÁN", `Xuất lúc ${new Date().toLocaleString("vi-VN")} · ${rows.length} SKU`, ["SKU", "Sản phẩm", "Danh mục", "Tồn nội bộ", "Đang giữ", "Khả dụng", "Số kênh map", "Tình trạng", "Chi tiết kênh"], rows, { widths: [16, 34, 18, 14, 14, 14, 14, 18, 56], numberColumns: [3, 4, 5, 6], wrapColumn: 8 }), "Đối soát SKU");
    saveExcelWorkbook(workbook, `artflow-kenh-ban-${reportDayKey(new Date())}.xlsx`);
    showToast("Đã xuất báo cáo kênh bán.");
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

  function accountingExportRange() {
    if (accountingExportScope === "payroll") return accountingFilters.payrollRange || "30";
    return (els.accountingProfitRange && els.accountingProfitRange.value) || accountingFilters.range || "30";
  }

  function accountingRangeLabel(range) {
    return range === "all" ? "Toàn bộ thời gian" : `${range} ngày gần nhất`;
  }

  function accountingRangeSuffix(range) {
    return range === "all" ? "all" : `${range}d`;
  }

  function accountingPeriodSubtitle(range) {
    return `ArtFlow POS · ${accountingRangeLabel(range)} · Xuất lúc ${new Date().toLocaleString("vi-VN")}`;
  }

  function accountingTransactionsForRange(range) {
    const period = reportPeriod(range);
    return state.cashTransactions
      .filter(transaction => transaction.status !== "deleted" && inReportPeriod(transaction.transactionDate || transaction.createdAt, period))
      .slice()
      .sort((a, b) => String(b.transactionDate || b.createdAt).localeCompare(String(a.transactionDate || a.createdAt)));
  }

  function isPayrollTransaction(transaction) {
    if (!transaction || transaction.type !== "expense" || transaction.status === "deleted") return false;
    const category = getAccountingCategory(transaction.categoryId);
    return /lương|luong|cộng tác viên|cong tac vien|nhân sự|nhan su|payroll/i.test(
      `${category.name || ""} ${transaction.description || ""}`
    );
  }

  function accountingPayrollRows(range = accountingFilters.payrollRange) {
    const period = reportPeriod(range);
    const term = String(accountingFilters.payrollSearch || "").trim().toLowerCase();
    return (state.cashTransactions || [])
      .filter(transaction => isPayrollTransaction(transaction) && inReportPeriod(transaction.transactionDate || transaction.createdAt, period))
      .filter(transaction => !term || [
        transaction.description,
        transaction.referenceId,
        getAccountingAccount(transaction.accountId).name
      ].join(" ").toLowerCase().includes(term))
      .sort((a, b) => String(b.transactionDate || b.createdAt).localeCompare(String(a.transactionDate || a.createdAt)));
  }

  function accountingReceivableRows() {
    return state.orders
      .filter(order => order.status !== "cancelled")
      .map(order => ({
        order,
        customer: getCustomer(order),
        collected: collectedForOrder(order),
        outstanding: outstandingForOrder(order),
        ageDays: orderAgeDays(order)
      }))
      .filter(row => row.outstanding > 0)
      .sort((a, b) => b.ageDays - a.ageDays || b.outstanding - a.outstanding);
  }

  function appendAccountingSummarySheet(workbook, XLSX, range) {
    const snapshot = profitSnapshot(range, "all");
    const transactions = accountingTransactionsForRange(range);
    const accounts = state.accountingAccounts.filter(account => account.status !== "deleted");
    const balances = accounts.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
    const income = transactions.filter(transaction => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = transactions.filter(transaction => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
    const receivable = accountingReceivableRows().reduce((sum, row) => sum + row.outstanding, 0);
    const rows = [
      ["Kỳ báo cáo", accountingRangeLabel(range), ""],
      ["Số dư quỹ", balances, "Tổng số dư tài khoản tiền hiện tại"],
      ["Tổng thu", income, "Theo sổ quỹ trong kỳ"],
      ["Tổng chi", expense, "Theo sổ quỹ trong kỳ"],
      ["Dòng tiền ròng", income - expense, "Tổng thu - tổng chi"],
      ["Công nợ phải thu", receivable, "Tổng tiền còn phải thu"],
      ["Doanh thu thuần", snapshot.revenue, "Đơn đã thanh toán, đã trừ hàng trả"],
      ["Giá vốn", snapshot.cost, "Giá vốn thực tế của hàng đã bán"],
      ["Lãi gộp", snapshot.grossProfit, "Doanh thu thuần - giá vốn"],
      ["Chi phí vận hành", Math.round(snapshot.operatingExpenses), "Không gồm nhập hàng và hoàn tiền khách"],
      ["Lãi ròng", Math.round(snapshot.netProfit), "Lãi gộp - chi phí vận hành"],
      ["Biên lãi gộp", snapshot.grossMargin, "Lãi gộp / doanh thu thuần"]
    ];
    const sheet = createExcelSheet("BÁO CÁO KẾ TOÁN TỔNG HỢP", accountingPeriodSubtitle(range), ["Chỉ tiêu", "Giá trị", "Ghi chú"], rows, { widths: [26, 24, 54], wrapColumn: 2 });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(rowIndex => {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 4, c: 1 })];
      if (cell) cell.z = '#,##0 "₫"';
    });
    const marginCell = sheet[XLSX.utils.encode_cell({ r: 15, c: 1 })];
    if (marginCell) marginCell.z = "0.00%";
    XLSX.utils.book_append_sheet(workbook, sheet, "Tổng quan");
  }

  function appendCashLedgerSheet(workbook, XLSX, range) {
    const rows = accountingTransactionsForRange(range).map(transaction => {
      const account = getAccountingAccount(transaction.accountId);
      const category = getAccountingCategory(transaction.categoryId);
      return [
        transaction.transactionDate || reportDayKey(transaction.createdAt),
        accountingTypeLabel(transaction.type),
        account.name,
        category.name,
        transaction.description,
        transaction.referenceType || "manual",
        transaction.referenceId || "",
        transaction.type === "income" ? transaction.amount : 0,
        transaction.type === "expense" ? transaction.amount : 0,
        transaction.type === "income" ? transaction.amount : -transaction.amount,
        formatDateTime(transaction.createdAt)
      ];
    });
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("SỔ QUỸ THU CHI", accountingPeriodSubtitle(range), ["Ngày", "Loại", "Tài khoản", "Danh mục", "Nội dung", "Loại tham chiếu", "Mã tham chiếu", "Thu", "Chi", "Ròng", "Ghi lúc"], rows, { widths: [14, 12, 22, 24, 42, 18, 20, 16, 16, 16, 22], moneyColumns: [7, 8, 9], textColumns: [6], wrapColumn: 4 }), "Sổ quỹ");
  }

  function appendPlatformPayoutSheets(workbook, XLSX) {
    const payouts = state.platformPayouts || [];
    const rows = payouts.map(item => [commerceChannelLabel(item.channelId || item.channelCode),item.payoutCode,item.periodStart,item.periodEnd,item.payoutDate,item.grossAmount,item.totalFees,item.totalRefunds,item.expectedAmount,item.actualAmount,item.difference,payoutStatusMeta(item.status)[0],item.sourceFileName,item.sourceFileUrl,item.note]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("ĐỐI SOÁT SÀN", `ArtFlow POS · Cập nhật ${new Date().toLocaleString("vi-VN")}`, ["Sàn","Mã payout","Từ ngày","Đến ngày","Ngày tiền về","Doanh thu gộp","Phí sàn","Hoàn trả","Dự kiến","Thực nhận","Chênh lệch","Trạng thái","File nguồn","Link file","Ghi chú"], rows, { widths:[18,22,14,14,14,18,16,16,18,18,16,16,24,38,34], moneyColumns:[5,6,7,8,9,10], wrapColumn:14 }), "Đối soát sàn");
    const details = payouts.flatMap(payout => payout.items.map(item => [payout.payoutCode,commerceChannelLabel(payout.channelId || payout.channelCode),item.orderCode,item.platformOrderCode,item.productTotal,item.shippingFee,item.sellerDiscount,item.platformDiscount,item.commissionFee,item.paymentFee,item.affiliateFee,item.adsFee,item.refundAmount,item.penaltyFee,item.expectedNetAmount,item.platformNetAmount,item.difference,item.status,item.note]));
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CHI TIẾT PAYOUT", "Chi tiết phí và đơn thuộc từng payout", ["Payout","Sàn","Mã đơn","Mã đơn sàn","Tiền hàng","Vận chuyển","Voucher shop","Voucher sàn","Hoa hồng","Thanh toán","Affiliate","Ads","Hoàn trả","Phạt","Dự kiến","Sàn trả","Chênh lệch","Trạng thái","Ghi chú"], details, { widths:[20,16,20,20,16,16,16,16,16,16,16,16,16,16,16,16,16,14,30], moneyColumns:[4,5,6,7,8,9,10,11,12,13,14,15,16] }), "Chi tiết payout");
  }

  function appendReceivablesSheet(workbook, XLSX) {
    const rows = accountingReceivableRows().map(row => [
      row.order.code,
      row.customer.name,
      row.customer.phone || "",
      channelLabel(row.order.channel),
      reportDayKey(row.order.createdAt),
      row.ageDays,
      row.order.total,
      row.collected,
      row.outstanding,
      row.ageDays >= 14 ? "Quá hạn" : row.ageDays >= 7 ? "Cần chú ý" : "Đang theo dõi"
    ]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CÔNG NỢ PHẢI THU", `ArtFlow POS · Cập nhật lúc ${new Date().toLocaleString("vi-VN")}`, ["Mã đơn", "Khách hàng", "Điện thoại", "Kênh", "Ngày tạo", "Tuổi nợ", "Tổng đơn", "Đã thu", "Còn phải thu", "Trạng thái"], rows, { widths: [20, 28, 18, 16, 14, 12, 16, 16, 18, 16], moneyColumns: [6, 7, 8], numberColumns: [5], textColumns: [2] }), "Công nợ");
  }

  function appendProductProfitSheet(workbook, XLSX, range) {
    const snapshot = profitSnapshot(range, "all");
    const rows = productProfitRowsFromSnapshot(snapshot).map(row => {
      const profit = row.revenue - row.cost;
      return [
        row.sku,
        row.name,
        row.quantity,
        Math.round(row.revenue),
        Math.round(row.cost),
        Math.round(profit),
        row.revenue > 0 ? profit / row.revenue : 0
      ];
    });
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("LỢI NHUẬN THEO SẢN PHẨM", accountingPeriodSubtitle(range), ["SKU", "Sản phẩm", "SL bán", "Doanh thu", "Giá vốn", "Lãi gộp", "Biên lãi"], rows, { widths: [16, 34, 12, 18, 18, 18, 14], numberColumns: [2], moneyColumns: [3, 4, 5], percentColumns: [6], textColumns: [0] }), "Lợi nhuận SP");
  }

  function appendOperatingExpenseSheet(workbook, XLSX, range) {
    const snapshot = profitSnapshot(range, "all");
    const byCategory = snapshot.transactions.reduce((map, transaction) => {
      const category = getAccountingCategory(transaction.categoryId);
      const label = category.name || "Chưa phân loại";
      map[label] = (map[label] || 0) + transaction.amount * snapshot.expenseRatio;
      return map;
    }, {});
    const rows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => [
        label,
        Math.round(amount),
        snapshot.operatingExpenses > 0 ? amount / snapshot.operatingExpenses : 0
      ]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CHI PHÍ VẬN HÀNH", accountingPeriodSubtitle(range), ["Danh mục", "Số tiền", "Tỷ trọng"], rows, { widths: [30, 18, 14], moneyColumns: [1], percentColumns: [2] }), "Chi phí");
  }

  function appendAccountsAndReconciliationSheets(workbook, XLSX) {
    const accountRows = state.accountingAccounts
      .filter(account => account.status !== "deleted")
      .map(account => [
        account.name,
        account.type,
        account.openingBalance,
        account.currentBalance,
        account.status === "archived" ? "Ngừng dùng" : "Hoạt động",
        formatDateTime(account.updatedAt || account.createdAt)
      ]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("TÀI KHOẢN TIỀN", `ArtFlow POS · Cập nhật lúc ${new Date().toLocaleString("vi-VN")}`, ["Tài khoản", "Loại", "Số dư đầu", "Số dư hiện tại", "Trạng thái", "Cập nhật"], accountRows, { widths: [28, 14, 18, 18, 16, 22], moneyColumns: [2, 3] }), "Tài khoản");

    const reconciliationRows = (state.accountingReconciliations || [])
      .slice()
      .sort((a, b) => String(b.reconciledAt || b.createdAt).localeCompare(String(a.reconciledAt || a.createdAt)))
      .map(reconciliation => {
        const account = getAccountingAccount(reconciliation.accountId);
        return [
          reconciliation.reconciledAt || reportDayKey(reconciliation.createdAt),
          account.name,
          reconciliation.systemBalance,
          reconciliation.actualBalance,
          reconciliation.difference,
          reconciliation.note || ""
        ];
      });
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("LỊCH SỬ ĐỐI SOÁT", `ArtFlow POS · Cập nhật lúc ${new Date().toLocaleString("vi-VN")}`, ["Ngày", "Tài khoản", "Số dư sổ", "Số dư thực", "Chênh lệch", "Ghi chú"], reconciliationRows, { widths: [14, 28, 18, 18, 18, 40], moneyColumns: [2, 3, 4], wrapColumn: 5 }), "Đối soát");
  }

  function appendPayrollSheet(workbook, XLSX, range) {
    const rows = accountingPayrollRows(range).map(transaction => [
      transaction.transactionDate || reportDayKey(transaction.createdAt),
      transaction.description,
      getAccountingAccount(transaction.accountId).name,
      getAccountingCategory(transaction.categoryId).name,
      transaction.referenceId || "",
      transaction.amount,
      formatDateTime(transaction.createdAt)
    ]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CHI PHÍ TIỀN LƯƠNG", accountingPeriodSubtitle(range), ["Ngày trả", "Người nhận / nội dung", "Tài khoản chi", "Danh mục", "Tham chiếu", "Số tiền", "Ghi lúc"], rows, { widths: [14, 38, 24, 24, 20, 18, 22], moneyColumns: [5], textColumns: [4], wrapColumn: 1 }), "Tiền lương");
  }

  function appendAccountingCategoriesSheet(workbook, XLSX) {
    const rows = (state.accountingCategories || []).map(category => {
      const related = (state.cashTransactions || []).filter(transaction => transaction.status !== "deleted" && transaction.categoryId === category.id);
      return [
        category.name,
        accountingTypeLabel(category.type),
        category.status === "archived" ? "Ngừng dùng" : "Đang dùng",
        related.length,
        related.reduce((sum, transaction) => sum + transaction.amount, 0),
        formatDateTime(category.updatedAt || category.createdAt)
      ];
    });
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("DANH MỤC THU CHI", `ArtFlow POS · Cập nhật lúc ${new Date().toLocaleString("vi-VN")}`, ["Danh mục", "Loại", "Trạng thái", "Số giao dịch", "Tổng phát sinh", "Cập nhật"], rows, { widths: [32, 14, 16, 16, 20, 22], moneyColumns: [4], numberColumns: [3] }), "Danh mục");
  }

  function exportAccountingReport(type = "full") {
    const range = accountingExportRange();
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    const include = {
      full: ["summary", "ledger", "receivables", "profit", "expenses", "accounts"],
      ledger: ["summary", "ledger"],
      receivables: ["receivables"],
      profit: ["summary", "profit", "expenses"],
      productProfit: ["productProfit"],
      expenses: ["expenses"],
      accounts: ["accounts"],
      payroll: ["payroll"],
      categories: ["categories"],
      payouts: ["payouts"],
      tax: ["summary", "payouts", "ledger", "expenses"]
    }[type] || ["summary", "ledger"];

    if (include.includes("summary")) appendAccountingSummarySheet(workbook, XLSX, range);
    if (include.includes("ledger")) appendCashLedgerSheet(workbook, XLSX, range);
    if (include.includes("receivables")) appendReceivablesSheet(workbook, XLSX);
    if (include.includes("profit")) appendProductProfitSheet(workbook, XLSX, range);
    if (include.includes("productProfit")) appendProductProfitSheet(workbook, XLSX, range);
    if (include.includes("expenses")) appendOperatingExpenseSheet(workbook, XLSX, range);
    if (include.includes("accounts")) appendAccountsAndReconciliationSheets(workbook, XLSX);
    if (include.includes("payroll")) appendPayrollSheet(workbook, XLSX, range);
    if (include.includes("categories")) appendAccountingCategoriesSheet(workbook, XLSX);
    if (include.includes("payouts")) appendPlatformPayoutSheets(workbook, XLSX);

    const names = {
      full: "tong-hop-ke-toan",
      ledger: "so-quy",
      receivables: "cong-no-phai-thu",
      profit: "lai-lo",
      productProfit: "loi-nhuan-san-pham",
      expenses: "chi-phi-van-hanh",
      accounts: "tai-khoan-doi-soat",
      payroll: "chi-phi-tien-luong",
      categories: "danh-muc-thu-chi"
    };
    saveExcelWorkbook(workbook, `artflow-${names[type] || "ke-toan"}-${accountingRangeSuffix(range)}-${reportDayKey(new Date())}.xlsx`);
    showToast("Đã xuất file báo cáo kế toán.");
  }

  function exportProfitReport(options = {}) {
    const range = options.range || reportFilters.range;
    const channel = options.channel || reportFilters.channel;
    const snapshot = profitSnapshot(range, channel);
    const XLSX = requireXlsx();
    const workbook = XLSX.utils.book_new();
    const filterText = `${range === "all" ? "Toàn bộ thời gian" : `${range} ngày`} · ${channel === "all" ? "Tất cả kênh" : channelLabel(channel)}`;
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
    saveExcelWorkbook(workbook, `artflow-loi-nhuan-${range}-${channel}-${date}.xlsx`);
    showToast(`Đã xuất ${snapshot.orders.length} đơn trong báo cáo.`);
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
            <td>${formatDateTimeShort(order.createdAt)}</td>
          </tr>
        `;
      }

      const actions = `<div class="row-actions compact-actions"><button class="link-button icon-only" data-view-order="${order.id}" aria-label="Xem chi tiết" title="Xem chi tiết">${icon("eye")}</button><button class="link-button icon-only" data-order-receipt-pdf="${order.id}" aria-label="${order.receiptPdfUrl ? "Mở hóa đơn PDF" : "Tạo hóa đơn PDF"}" title="${order.receiptPdfUrl ? "Mở hóa đơn PDF" : "Tạo hóa đơn PDF"}">${icon(order.receiptPdfUrl ? "external" : "printer")}</button>${canManageOrders() && order.status !== "cancelled" ? `<button class="link-button icon-only" data-edit-order-fulfillment="${order.id}" aria-label="Cập nhật" title="Cập nhật">${icon("edit")}</button>` : ""}${canReturnOrder(order) ? `<button class="link-button icon-only" data-return-order="${order.id}" aria-label="Trả hàng" title="Trả hàng">${icon("rotateCcw")}</button>` : ""}${isAdmin() && refundableForOrder(order) > 0 ? `<button class="link-button icon-only" data-refund-order="${order.id}" aria-label="Hoàn tiền" title="Hoàn tiền">${icon("receipt")}</button>` : ""}${canManageOrders() && order.status !== "completed" && order.status !== "cancelled" ? `<button class="link-button icon-only" data-complete-order="${order.id}" aria-label="Hoàn tất" title="Hoàn tất">${icon("check")}</button>` : ""}${canManageOrders() && order.status !== "cancelled" && order.returnedAmount <= 0 && order.refundedAmount <= 0 && collectedForOrder(order) <= 0 ? `<button class="link-button danger-link icon-only" data-cancel-order="${order.id}" aria-label="Hủy" title="Hủy">${icon("close")}</button>` : ""}</div>`;
      const shippingMeta = `${carrierLabel(order.carrier)}${order.trackingCode ? ` · ${order.trackingCode}` : ""}`;
      return `
        <tr class="data-row-clickable" data-view-order="${order.id}" tabindex="0" aria-label="Xem chi tiết đơn ${escapeAttribute(order.code)}">
          <td><div class="order-code-cell"><strong>${order.code}</strong><small>${formatDateTimeShort(order.createdAt)}</small></div></td>
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

  function renderOrderDetail(order) {
    const customer = getCustomer(order);
    const collected = collectedForOrder(order);
    const outstanding = outstandingForOrder(order);
    const lineDiscount = (order.items || []).reduce((sum, item) => {
      const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      return sum + Math.max(0, gross - Number(item.lineTotal || 0));
    }, 0);
    const itemRows = (order.items || []).map(item => {
      const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      const lineDiscountAmount = Math.max(0, gross - Number(item.lineTotal || 0));
      return `
        <tr>
          <td><div class="order-detail-product"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></div></td>
          <td>${item.quantity}</td>
          <td>${money.format(item.unitPrice)}</td>
          <td>${Number(item.discountPercent || 0) ? `${Number(item.discountPercent).toFixed(1)}%` : "0%"}</td>
          <td>${lineDiscountAmount ? money.format(lineDiscountAmount) : "—"}</td>
          <td><strong>${money.format(item.lineTotal)}</strong></td>
        </tr>
      `;
    }).join("");
    return `
      <div class="order-detail">
        <div class="order-detail-head">
          <div>
            <span class="eyebrow">Đơn hàng</span>
            <h3>${escapeHtml(order.code)}</h3>
            <p>Tạo lúc ${escapeHtml(formatDateTime(order.createdAt))} · Cập nhật ${escapeHtml(formatDateTime(order.updatedAt))}</p>
          </div>
          <div class="order-detail-actions">
            ${order.receiptPdfUrl ? `<a class="button ghost" href="${escapeAttribute(order.receiptPdfUrl)}" target="_blank" rel="noopener">${icon("external")} Mở PDF</a>` : ""}
            <button class="button ghost" type="button" data-order-receipt-pdf="${order.id}">${icon(order.receiptPdfUrl ? "printer" : "download")} ${order.receiptPdfUrl ? "In lại PDF" : "Tạo PDF"}</button>
            <button class="button ghost" type="button" data-order-receipt-regenerate="${order.id}">${icon("refresh")} Tạo lại PDF</button>
          </div>
        </div>
        <div class="order-detail-grid">
          <article><span>Khách hàng</span><strong>${escapeHtml(customer.name || "Khách lẻ")}</strong><small>${escapeHtml(customer.phone || customer.email || "")}</small></article>
          <article><span>Kênh bán</span><strong>${escapeHtml(channelLabel(order.channel))}</strong><small>${escapeHtml(order.paymentMethod || "cash")}</small></article>
          <article><span>Trạng thái</span><strong>${escapeHtml(statusLabel(order.status))}</strong><small>${escapeHtml(paymentLabel(order.paymentStatus))}</small></article>
          <article><span>Vận chuyển</span><strong>${escapeHtml(shippingLabel(order.shippingStatus))}</strong><small>${escapeHtml([carrierLabel(order.carrier), order.trackingCode].filter(Boolean).join(" · "))}</small></article>
        </div>
        <div class="table-wrap order-detail-table"><table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Giá bán</th><th>Giảm %</th><th>Giảm tiền</th><th>Thành tiền</th></tr></thead><tbody>${itemRows || `<tr><td colspan="6" class="empty">Không có sản phẩm.</td></tr>`}</tbody></table></div>
        <div class="order-detail-bottom">
          <div class="order-detail-note">
            <strong>Ghi chú</strong>
            <p>${escapeHtml(order.note || "Không có ghi chú.")}</p>
            <span>PDF: ${order.receiptPdfUrl ? "Đã lưu trên Drive" : "Chưa tạo"}</span>
          </div>
          <div class="order-detail-totals">
            <div><span>Tạm tính</span><strong>${money.format(order.subtotal)}</strong></div>
            <div><span>Giảm từng dòng</span><strong>${money.format(lineDiscount)}</strong></div>
            <div><span>Giảm đơn</span><strong>${money.format(Number(order.discount || 0) + Number(order.loyaltyDiscount || 0))}</strong></div>
            <div><span>Phí giao hàng</span><strong>${money.format(order.shippingFee)}</strong></div>
            <div><span>Làm tròn</span><strong>${money.format(order.roundingAmount)}</strong></div>
            <div><span>Đã thu</span><strong>${money.format(collected || order.cashReceived || 0)}</strong></div>
            <div><span>Còn phải thu</span><strong>${money.format(outstanding)}</strong></div>
            <div class="total"><span>Tổng thanh toán</span><strong>${money.format(order.netTotal)}</strong></div>
          </div>
        </div>
      </div>
    `;
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

  function productGrossProfit(product) {
    if (!Number(product.salePrice || 0)) return 0;
    return Number(product.salePrice || 0) - Number(product.costPrice || 0);
  }

  function productMarginRate(product) {
    return Number(product.salePrice || 0) > 0 ? productGrossProfit(product) / Number(product.salePrice) * 100 : 0;
  }

  function productHasShopPrice(product) {
    return Number(product && product.salePrice || 0) > 0;
  }

  function productChannelPrices(productId) {
    return (state.channelProducts || [])
      .map(normalizeChannelProduct)
      .filter(item => item.productId === productId && item.status !== "deleted" && Number(item.channelPrice || 0) > 0);
  }

  function productChannelPriceByCode(productId, code) {
    const target = normalizeSearchText(code);
    const mapping = productChannelPrices(productId).find(item => {
      const channel = channelByIdOrCode(item.channelId);
      return normalizeSearchText(channel?.code || item.channelCode || item.channelName) === target;
    });
    return mapping ? Number(mapping.channelPrice || 0) : 0;
  }

  function productPriceStatus(product) {
    const hasShop = productHasShopPrice(product);
    const channelCount = productChannelPrices(product.id).length;
    if (hasShop && channelCount) return { key: "complete", label: "Đủ giá" };
    if (channelCount) return { key: "channel", label: "Có giá kênh" };
    if (hasShop) return { key: "shop", label: "Có giá shop" };
    return { key: "missing", label: "Chưa có giá" };
  }

  function productAssetsComplete(product) {
    return Boolean(product.contentDocUrl && product.mediaFolderUrl && product.imageFolderUrl && product.videoFolderUrl);
  }

  function productMarginTone(product) {
    if (!productHasShopPrice(product)) return "missing";
    const margin = productMarginRate(product);
    if (productGrossProfit(product) <= 0) return "loss";
    if (margin < 20) return "low";
    if (margin < 40) return "good";
    return "high";
  }

  function renderProducts() {
    if (!els.productsTable) return;
    const products = state.products.filter(product => product.status !== "deleted");
    const missingAssets = products.filter(product => !productAssetsComplete(product));
    document.querySelectorAll("[data-provision-missing-products]").forEach(button => {
      button.disabled = !missingAssets.length;
      const label = missingAssets.length ? `Tạo tài nguyên hàng loạt (${missingAssets.length})` : "Tài nguyên đã đầy đủ";
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);
    });
    if (els.productCategoryFilter) {
      const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
      els.productCategoryFilter.innerHTML = `<option value="all">Tất cả danh mục</option>${categories.map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`).join("")}`;
      els.productCategoryFilter.value = categories.includes(productFilters.category) ? productFilters.category : "all";
      productFilters.category = els.productCategoryFilter.value;
    }
    [
      [els.productStatusFilter, "status"],
      [els.productStockFilter, "stock"],
      [els.productMarginFilter, "margin"],
      [els.productContentFilter, "content"],
      [els.productAssetsFilter, "assets"],
      [els.productSort, "sort"]
    ].forEach(([select, key]) => {
      if (select) select.value = productFilters[key];
    });

    const termFiltered = filtered(products, ["sku", "name", "category", "brand", "barcode", "contentOwner", "seoKeywords", "websiteProductUrl", "shopeeProductUrl", "tiktokProductUrl", "facebookProductUrl", "contentPostLinks"]);
    const rows = termFiltered.filter(product => {
      const margin = productMarginRate(product);
      const grossProfit = productGrossProfit(product);
      const stockMatch = productFilters.stock === "all" ||
        (productFilters.stock === "out" && product.stock <= 0) ||
        (productFilters.stock === "low" && product.stock > 0 && product.stock <= product.lowStock) ||
        (productFilters.stock === "healthy" && product.stock > product.lowStock);
      const marginMatch = productFilters.margin === "all" ||
        (productFilters.margin === "loss" && productHasShopPrice(product) && grossProfit <= 0) ||
        (productFilters.margin === "low" && grossProfit > 0 && margin < 20) ||
        (productFilters.margin === "good" && margin >= 20 && margin < 40) ||
        (productFilters.margin === "high" && margin >= 40);
      const assetsComplete = productAssetsComplete(product);
      const activeForPreset = product.status === "active";
      const presetMatch = productFilters.preset === "all" ||
        (productFilters.preset === "attention" && activeForPreset && (product.stock <= product.lowStock || !productHasShopPrice(product) || (productHasShopPrice(product) && grossProfit <= 0) || !assetsComplete)) ||
        (productFilters.preset === "out" && activeForPreset && product.stock <= 0) ||
        (productFilters.preset === "missing" && activeForPreset && !assetsComplete) ||
        (productFilters.preset === "low_margin" && activeForPreset && productHasShopPrice(product) && (grossProfit <= 0 || margin < 20));
      return presetMatch && (productFilters.category === "all" || product.category === productFilters.category) &&
        (productFilters.status === "all" || product.status === productFilters.status) && stockMatch && marginMatch &&
        (productFilters.content === "all" || product.contentStatus === productFilters.content) &&
        (productFilters.assets === "all" || (productFilters.assets === "complete" ? assetsComplete : !assetsComplete));
    }).sort((a, b) => {
      if (productFilters.sort === "margin_desc") return productMarginRate(b) - productMarginRate(a);
      if (productFilters.sort === "stock_asc") return a.stock - b.stock || a.name.localeCompare(b.name, "vi");
      if (productFilters.sort === "price_desc") return b.salePrice - a.salePrice;
      if (productFilters.sort === "updated_desc") return String(b.updatedAt).localeCompare(String(a.updatedAt));
      return a.name.localeCompare(b.name, "vi");
    });
    const resultCount = qs("[data-product-result-count]");
    if (resultCount) resultCount.textContent = rows.length;
    document.querySelectorAll("[data-product-preset]").forEach(button => {
      button.classList.toggle("active", button.dataset.productPreset === productFilters.preset);
    });
    els.productsTable.innerHTML = rows.length ? rows.map(product => {
      const channelCount = productChannelPrices(product.id).length;
      return `
      <tr class="data-row-clickable ${product.status === "archived" ? "product-row-archived" : ""}" data-view-product="${product.id}" tabindex="0" aria-label="Xem chi tiết ${escapeAttribute(product.name)}">
        <td><div class="resource-primary-cell">${product.imageUrl ? `<img class="product-table-image" src="${escapeAttribute(productImageUrl(product.imageUrl))}" alt="" loading="lazy" />` : `<span class="product-table-image placeholder">${icon("image")}</span>`}<span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small></span></div></td>
        <td><strong>${escapeHtml(product.sku)}</strong></td>
        <td><strong>${productHasShopPrice(product) ? money.format(product.salePrice) : "Chưa có giá"}</strong>${channelCount ? `<br><small>${channelCount} giá theo kênh</small>` : ""}</td>
        <td><span class="badge ${product.stock <= 0 ? "margin-loss" : product.stock <= product.lowStock ? "low" : "active"}">${product.stock}</span><br><small>Ngưỡng ${product.lowStock}</small></td>
        <td><span class="badge ${product.status}">${statusLabel(product.status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="link-button action-view icon-only" data-view-product="${product.id}" aria-label="Chi tiết" title="Chi tiết">${icon("eye")}</button>
            ${canManageProducts() ? `<button class="link-button action-edit icon-only" data-open-pricing-for-product="${product.id}" aria-label="Tính giá" title="Tính giá">${icon("calculator")}</button><button class="link-button action-edit icon-only" data-edit-product="${product.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button><button class="link-button icon-only ${product.status === "active" ? "action-archive" : "action-activate"}" data-archive-product="${product.id}" data-next-status="${product.status === "active" ? "archived" : "active"}" aria-label="${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}" title="${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}">${icon(product.status === "active" ? "archive" : "check")}</button>` : ""}
          </div>
        </td>
      </tr>
    `;
    }).join("") : `<tr><td colspan="6" class="empty">${products.length ? "Không có sản phẩm phù hợp bộ lọc." : "Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên."}</td></tr>`;
  }

  function getContentProduct(item) {
    return item && item.productId ? byId("products", item.productId) : null;
  }

  function contentAssetsComplete(item) {
    return Boolean(item && item.contentDocUrl && item.mediaFolderUrl);
  }

  function contentDueTone(item) {
    if (!item || !item.dueDate || ["published", "archived"].includes(item.status)) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(item.dueDate);
    if (Number.isNaN(due.getTime())) return "";
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return "overdue";
    if (diff <= 2) return "soon";
    return "";
  }

  function contentSearchText(item) {
    const product = getContentProduct(item);
    return [
      item.title, item.type, item.channel, item.status, item.priority, item.owner,
      item.collaborators, item.tags, item.campaign, item.targetMetric, item.brief, item.note, item.publishUrl,
      product ? product.sku : "", product ? product.name : "", product ? product.category : ""
    ].join(" ").toLowerCase();
  }

  function contentOwnerOptions(selected) {
    const owners = [...(state.contentOwners || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
    const values = owners.map(user => user.name || user.email).filter(Boolean);
    if (selected && !values.includes(selected)) values.unshift(selected);
    return `<option value="">Chưa giao</option>${values.map(name => `<option value="${escapeAttribute(name)}" ${selected === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}`;
  }

  function contentProductOptions(selected) {
    const products = [...(state.products || [])].filter(product => product.status !== "deleted").sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return `<option value="">Không gắn sản phẩm</option>${products.map(product => `<option value="${product.id}" ${selected === product.id ? "selected" : ""}>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</option>`).join("")}`;
  }

  function renderContentFilters(items) {
    const setOptions = (select, options, current, allLabel) => {
      if (!select) return;
      select.innerHTML = `<option value="all">${allLabel}</option>${options.map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join("")}`;
      select.value = options.some(([value]) => value === current) ? current : "all";
    };
    setOptions(els.contentStatusFilter, Object.entries(contentItemStatuses), contentFilters.status, "Tất cả trạng thái");
    setOptions(els.contentTypeFilter, Object.entries(contentItemTypes), contentFilters.type, "Tất cả loại");
    setOptions(els.contentChannelFilter, Object.entries(contentChannels), contentFilters.channel, "Tất cả kênh");
    const owners = [...new Set(items.map(item => item.owner).filter(Boolean))].sort((a, b) => ownerName(a).localeCompare(ownerName(b), "vi")).map(name => [name, ownerName(name)]);
    setOptions(els.contentOwnerFilter, owners, contentFilters.owner, "Tất cả phụ trách");
    const products = (state.products || []).filter(product => product.status !== "deleted").map(product => [product.id, `${product.sku} · ${product.name}`]);
    setOptions(els.contentProductFilter, products, contentFilters.product, "Tất cả sản phẩm");
    setOptions(els.contentScheduleFilter, [["overdue", "Quá hạn"], ["today", "Hôm nay"], ["week", "7 ngày tới"], ["unscheduled", "Chưa có lịch"]], contentFilters.schedule, "Tất cả lịch đăng");
  }

  function filteredContentItems() {
    const items = (state.contentItems || []).filter(item => item.status !== "deleted");
    const term = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      return (contentFilters.status === "all" || item.status === contentFilters.status) &&
        (contentFilters.type === "all" || item.type === contentFilters.type) &&
        (contentFilters.owner === "all" || item.owner === contentFilters.owner) &&
        (contentFilters.channel === "all" || item.channel === contentFilters.channel) &&
        (contentFilters.product === "all" || item.productId === contentFilters.product) &&
        contentScheduleMatches(item) &&
        (!term || contentSearchText(item).includes(term));
    });
  }

  function contentScheduleMatches(item) {
    const filter = contentFilters.schedule || "all";
    if (filter === "all") return true;
    if (!item.publishAt) return filter === "unscheduled";
    const publishTime = new Date(item.publishAt).getTime();
    if (Number.isNaN(publishTime)) return filter === "unscheduled";
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endToday = startToday + 24 * 60 * 60 * 1000;
    const endWeek = startToday + 7 * 24 * 60 * 60 * 1000;
    if (filter === "overdue") return publishTime < now.getTime() && item.status !== "published";
    if (filter === "today") return publishTime >= startToday && publishTime < endToday;
    if (filter === "week") return publishTime >= startToday && publishTime < endWeek;
    return true;
  }

  function renderContentCard(item) {
    const product = getContentProduct(item);
    const dueTone = contentDueTone(item);
    return `
      <article class="content-card ${dueTone ? `content-due-${dueTone}` : ""}">
        <div class="content-card-head">
          <span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span>
          <span class="badge priority-${item.priority}">${contentPriorities[item.priority] || item.priority}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.brief || item.note || "Chưa có brief.")}</p>
        <div class="content-meta">
          <span>${icon("file")} ${contentItemTypes[item.type] || item.type}</span>
          <span>${icon("external")} ${contentChannels[item.channel] || item.channel}</span>
          ${product ? `<span>${icon("package")} ${escapeHtml(product.sku)}</span>` : ""}
          ${item.dueDate ? `<span>${icon("history")} ${formatDate(item.dueDate)}</span>` : ""}
        </div>
        <div class="content-card-foot">
          <small>${escapeHtml(item.owner || "Chưa giao")}${item.tags ? ` · ${escapeHtml(item.tags)}` : ""}</small>
          <div class="row-actions">
            ${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" aria-label="Mở Docs" title="Mở Docs">${icon("external")}</a>` : ""}
            ${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button><button class="link-button icon-only" type="button" data-provision-content-item="${item.id}" aria-label="Tạo tài nguyên" title="Tạo tài nguyên">${icon("folderPlus")}</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function renderContentTopicCard(item) {
    const product = getContentProduct(item);
    const dueTone = contentDueTone(item);
    return `
      <article class="content-topic-card ${dueTone ? `content-due-${dueTone}` : ""}">
        <div class="content-topic-main">
          <div class="content-topic-title">
            <span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.brief || item.note || "Chưa có brief.")}</p>
          </div>
          <div class="content-topic-meta">
            <span>${icon("file")} ${contentItemTypes[item.type] || item.type}</span>
            <span>${icon("external")} ${contentChannels[item.channel] || item.channel}</span>
            <span>${icon("users")} ${escapeHtml(item.owner || "Chưa giao")}</span>
            ${product ? `<span>${icon("package")} ${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</span>` : ""}
            ${item.dueDate ? `<span>${icon("history")} ${formatDate(item.dueDate)}</span>` : ""}
          </div>
        </div>
        <div class="content-topic-side">
          <span class="badge priority-${item.priority}">${contentPriorities[item.priority] || item.priority}</span>
          <span class="${contentAssetsComplete(item) ? "assets-complete" : "assets-missing"}">${contentAssetsComplete(item) ? "Đủ tài nguyên" : "Thiếu tài nguyên"}</span>
          <div class="row-actions">
            ${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" title="Mở Docs">${icon("external")}</a>` : ""}
            ${item.mediaFolderUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.mediaFolderUrl)}" target="_blank" rel="noopener" title="Mở Drive">${icon("folderPlus")}</a>` : ""}
            ${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-content="${item.id}" title="Ẩn">${icon("archive")}</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function contentChecklistItems(item, key, defaults) {
    const values = Array.isArray(item && item[key]) && item[key].length ? item[key] : defaults.map(label => ({ label, done: false }));
    return values.map(entry => {
      if (typeof entry === "string") return { label: entry, done: false, link: "" };
      return { label: entry.label || "", done: Boolean(entry.done), link: entry.link || "" };
    }).filter(entry => entry.label);
  }

  function renderContentChecklist(name, title, items, withLink) {
    return `
      <div class="content-form-box full">
        <strong>${title}</strong>
        <div class="content-checklist">
          ${items.map((entry, index) => `
            <label class="content-check-item ${withLink ? "has-link" : ""}">
              <input type="checkbox" data-content-${name}-done="${index}" ${entry.done ? "checked" : ""} />
              <input type="text" data-content-${name}-label="${index}" value="${escapeAttribute(entry.label)}" />
              ${withLink ? `<input type="url" data-content-${name}-link="${index}" value="${escapeAttribute(entry.link || "")}" placeholder="Link" />` : ""}
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }

  function collectContentChecklist(form, name, withLink) {
    return Array.from(form.querySelectorAll(`[data-content-${name}-label]`)).map(input => {
      const index = input.dataset[`content${name[0].toUpperCase()}${name.slice(1)}Label`];
      const done = form.querySelector(`[data-content-${name}-done="${index}"]`)?.checked || false;
      const link = withLink ? form.querySelector(`[data-content-${name}-link="${index}"]`)?.value.trim() || "" : "";
      return { label: input.value.trim(), done, link };
    }).filter(item => item.label);
  }

  function contentPromptFor(item, product) {
    const channel = contentChannels[item.channel] || item.channel || "đa kênh";
    const productText = product ? `\nSản phẩm: ${product.sku} - ${product.name}\nDanh mục: ${product.category}\nĐiểm nổi bật: ${product.keyFeatures || ""}\nMô tả ngắn: ${product.shortDescription || ""}` : "";
    return `Bạn là content creator cho cửa hàng họa cụ ArtFlow. Hãy tạo nội dung cho kênh ${channel}.\nChủ đề: ${item.title}\nLoại nội dung: ${contentItemTypes[item.type] || item.type}\nBrief:\n${item.brief || ""}${productText}\nYêu cầu: viết rõ hook, nội dung chính, CTA, hashtag/SEO nếu phù hợp.`;
  }


  function preferredContentTemplate(type, channel, current) {
    if (current && current !== "blank") return current;
    if (channel && contentBriefTemplates[channel]) return channel;
    if (type && contentBriefTemplates[type]) return type;
    return "blank";
  }

  function contentProductContext(product) {
    if (!product) return "";
    return [
      "",
      "Thông tin sản phẩm:",
      `- SKU: ${product.sku}`,
      `- Tên: ${product.name}`,
      `- Danh mục: ${product.category || "Chưa có"}`,
      `- Thương hiệu: ${product.brand || "Chưa có"}`,
      product.shortDescription ? `- Mô tả ngắn: ${product.shortDescription}` : "",
      product.keyFeatures ? `- Điểm nổi bật: ${product.keyFeatures}` : "",
      product.targetAudience ? `- Khách hàng mục tiêu: ${product.targetAudience}` : "",
      product.seoKeywords ? `- Từ khóa: ${product.seoKeywords}` : ""
    ].filter(Boolean).join("\n");
  }

  function setContentChecklistValues(form, name, labels) {
    Array.from(form.querySelectorAll(`[data-content-${name}-label]`)).forEach((input, index) => {
      if (labels[index]) input.value = labels[index];
    });
  }

  function contentAutoTitle(type, channel, product) {
    if (product) {
      if (type === "video" || channel === "tiktok") return "Video giới thiệu " + product.name;
      if (channel === "shopee") return "Mô tả bán hàng " + product.name;
      if (channel === "website") return "Bài SEO " + product.name;
      return "Content cho " + product.name;
    }
    if (type === "campaign") return "Chiến dịch content mới";
    if (type === "video") return "Kịch bản video mới";
    return "Chủ đề content mới";
  }

  function applyContentAutomation(form, mode) {
    if (!form) return;
    const product = byId("products", form.productId?.value || "");
    const type = form.type?.value || "campaign";
    const channel = form.channel?.value || "multi";
    const templateKey = preferredContentTemplate(type, channel, form.template?.value || "");
    const template = contentBriefTemplates[templateKey] || contentBriefTemplates.blank;
    if (form.template && (!form.template.value || mode === "template")) form.template.value = templateKey;
    if (form.title && (!form.title.value.trim() || mode === "product")) form.title.value = contentAutoTitle(type, channel, product);
    if (form.campaign && !form.campaign.value.trim() && type === "campaign") form.campaign.value = form.title?.value || "";
    if (form.tags && (!form.tags.value.trim() || mode === "product")) {
      form.tags.value = [product?.category, product?.brand, channel !== "multi" ? contentChannels[channel] : "", template.label].filter(Boolean).join(", ");
    }
    if (form.targetMetric && (!form.targetMetric.value.trim() || mode === "template")) {
      form.targetMetric.value = template.kpi || "1 nội dung hoàn chỉnh, có CTA rõ và link đăng";
    }
    const brief = form.querySelector("[data-content-brief]");
    if (brief && (!brief.value.trim() || mode !== "gentle")) {
      brief.value = [template.brief || "", contentProductContext(product)].filter(Boolean).join("\n");
    }
    setContentChecklistValues(form, "checklist", template.checklist || defaultContentChecklist);
    setContentChecklistValues(form, "asset", template.assets || defaultContentAssetChecklist);
    const prompt = form.querySelector("[data-content-prompt]");
    if (prompt) {
      prompt.value = contentPromptFor({
        title: form.title?.value || "",
        type,
        channel,
        brief: brief ? brief.value : ""
      }, product);
    }
  }

  function renderContentWorkspace() {
    if (!els.contentTable) return;
    const items = (state.contentItems || []).filter(item => item.status !== "deleted");
    renderContentFilters(items);
    const visibleItems = filteredContentItems().sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (els.contentResultCount) els.contentResultCount.textContent = String(visibleItems.length);
    const advancedFilterCount = ["type", "owner", "product"].filter(key => contentFilters[key] !== "all").length;
    if (els.contentAdvancedFilterButton) els.contentAdvancedFilterButton.classList.toggle("has-active-filters", advancedFilterCount > 0);
    if (els.contentAdvancedFilterLabel) els.contentAdvancedFilterLabel.textContent = advancedFilterCount ? `Bộ lọc (${advancedFilterCount})` : "Bộ lọc";
    if (els.contentTable) {
      els.contentTable.innerHTML = visibleItems.length ? visibleItems.map(item => {
        const product = getContentProduct(item);
        return `<tr><td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(contentItemTypes[item.type] || item.type)}${product ? ` · ${escapeHtml(product.sku)}` : ""}</small></td><td><span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span></td><td>${escapeHtml(contentChannels[item.channel] || item.channel)}</td><td>${escapeHtml(ownerName(item.owner) || "—")}</td><td>${item.dueDate ? formatDate(item.dueDate) : "—"}${item.publishAt ? `<br><small>Đăng: ${escapeHtml(formatDateTimeShort(item.publishAt))}</small>` : ""}</td><td>${contentAssetsComplete(item) ? `<span class="assets-complete">Đủ</span>` : `<span class="assets-missing">Thiếu</span>`}</td><td><div class="row-actions">${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" aria-label="Mở Docs" title="Mở Docs">${icon("external")}</a>` : ""}${item.mediaFolderUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.mediaFolderUrl)}" target="_blank" rel="noopener" aria-label="Mở Drive" title="Mở Drive">${icon("folderPlus")}</a>` : ""}${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" aria-label="Sửa chủ đề" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-content="${item.id}" aria-label="Ẩn chủ đề" title="Ẩn">${icon("archive")}</button>` : ""}</div></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="empty">Chưa có chủ đề content phù hợp.</td></tr>`;
    }
  }

  function renderContentItemForm(item, defaults = {}) {
    const selectedProductId = item ? item.productId : (defaults.productId || "");
    const defaultProduct = selectedProductId ? byId("products", selectedProductId) : null;
    const value = key => escapeAttribute(item ? item[key] : (defaults[key] || ""));
    const selectedTemplate = item ? (item.template || "blank") : (defaults.template || "blank");
    const briefValue = item ? item.brief : (defaults.brief || contentBriefTemplates[selectedTemplate]?.brief || (defaultProduct ? `${defaultProduct.shortDescription || ""}\n\nĐiểm nổi bật:\n${defaultProduct.keyFeatures || ""}` : ""));
    const checklistItems = contentChecklistItems(item, "checklist", defaultContentChecklist);
    const assetItems = contentChecklistItems(item, "assetChecklist", defaultContentAssetChecklist);
    const comments = Array.isArray(item && item.commentLog) ? item.commentLog : [];
    const promptText = item && item.promptText ? item.promptText : contentPromptFor({
      title: item ? item.title : (defaults.title || (defaultProduct ? "Content cho " + defaultProduct.name : "")),
      type: item ? item.type : (defaults.type || (selectedProductId ? "product" : "campaign")),
      channel: item ? item.channel : (defaults.channel || "multi"),
      brief: briefValue
    }, defaultProduct);
    return `
      <div class="field"><label for="contentTitle">Tiêu đề</label><input id="contentTitle" name="title" value="${value("title") || (defaultProduct ? escapeAttribute("Content cho " + defaultProduct.name) : "")}" placeholder="VD: Video hướng dẫn dùng màu nước cho người mới" required /></div>
      <div class="field"><label for="contentTemplate">Mẫu brief</label><select id="contentTemplate" name="template" data-content-template>${Object.entries(contentBriefTemplates).map(([key, template]) => `<option value="${key}" ${selectedTemplate === key ? "selected" : ""}>${template.label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentType">Loại</label><select id="contentType" name="type">${Object.entries(contentItemTypes).map(([key, label]) => `<option value="${key}" ${(item ? item.type : defaults.type || (selectedProductId ? "product" : "campaign")) === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentProductId">Sản phẩm liên quan</label><select id="contentProductId" name="productId">${contentProductOptions(selectedProductId)}</select></div>
      <div class="field"><label for="contentChannel">Kênh</label><select id="contentChannel" name="channel">${Object.entries(contentChannels).map(([key, label]) => `<option value="${key}" ${(item ? item.channel : defaults.channel || "multi") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentStatus">Trạng thái</label><select id="contentStatus" name="status">${Object.entries(contentItemStatuses).filter(([key]) => key !== "archived").map(([key, label]) => `<option value="${key}" ${(item ? item.status : defaults.status || "idea") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentPriority">Ưu tiên</label><select id="contentPriority" name="priority">${Object.entries(contentPriorities).map(([key, label]) => `<option value="${key}" ${(item ? item.priority : defaults.priority || "normal") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="content-automation-box full">
        <div><strong>Trợ lý tạo nhanh</strong><small>Tự điền brief, KPI, checklist và prompt theo loại nội dung, kênh và sản phẩm.</small></div>
        <div class="content-automation-actions">
          <button class="button ghost compact-button" type="button" data-content-auto="template">Tạo từ mẫu</button>
          <button class="button ghost compact-button" type="button" data-content-auto="product">Đồng bộ sản phẩm</button>
          <button class="button ghost compact-button" type="button" data-content-auto="gentle">Chỉ gợi ý chỗ trống</button>
        </div>
      </div>
      <div class="field"><label for="contentDueDate">Deadline</label><input id="contentDueDate" name="dueDate" type="date" value="${value("dueDate")}" /></div>
      <div class="field"><label for="contentPublishAt">Lịch đăng</label><input id="contentPublishAt" name="publishAt" type="datetime-local" value="${value("publishAt")}" /></div>
      <div class="field"><label for="contentOwner">Người phụ trách</label><select id="contentOwner" name="owner">${contentOwnerOptions(item ? item.owner : defaults.owner || "")}</select></div>
      <div class="field full"><label for="contentCollaborators">Người phối hợp</label><input id="contentCollaborators" name="collaborators" value="${value("collaborators")}" placeholder="Tên thành viên, phân tách bằng dấu phẩy" /></div>
      <div class="field"><label for="contentCampaign">Campaign / series</label><input id="contentCampaign" name="campaign" value="${value("campaign")}" placeholder="Back to School, ra mắt sản phẩm..." /></div>
      <div class="field"><label for="contentTargetMetric">Mục tiêu KPI</label><input id="contentTargetMetric" name="targetMetric" value="${value("targetMetric")}" placeholder="VD: 2.000 views, 20 inbox, 5 đơn" /></div>
      <div class="field full"><label for="contentTags">Tag</label><input id="contentTags" name="tags" value="${value("tags") || (defaultProduct ? escapeAttribute([defaultProduct.category, defaultProduct.brand].filter(Boolean).join(", ")) : "")}" placeholder="launch, hướng dẫn, back-to-school..." /></div>
      <div class="field full"><label for="contentBrief">Brief</label><textarea id="contentBrief" name="brief" rows="6" data-content-brief placeholder="Mục tiêu, insight, thông điệp chính, format, yêu cầu hình ảnh/video...">${escapeHtml(briefValue)}</textarea></div>
      ${renderContentChecklist("checklist", "Checklist xử lý", checklistItems, false)}
      ${renderContentChecklist("asset", "Asset cần chuẩn bị", assetItems, true)}
      <div class="field full"><label for="contentPromptText">Prompt hỗ trợ viết</label><textarea id="contentPromptText" name="promptText" rows="5" data-content-prompt>${escapeHtml(promptText)}</textarea><button class="button ghost compact-button" type="button" data-copy-content-prompt>Copy prompt</button></div>
      <div class="content-form-box full"><strong>Góp ý / comment</strong>${comments.length ? `<div class="content-comment-log">${comments.slice(-5).map(comment => `<p><span>${escapeHtml(comment.author || "Team")} · ${escapeHtml(formatDateTime(comment.createdAt || ""))}</span>${escapeHtml(comment.text || "")}</p>`).join("")}</div>` : `<p class="content-empty">Chưa có góp ý.</p>`}<textarea name="newComment" rows="2" placeholder="Thêm góp ý mới..."></textarea></div>
      <div class="content-form-box full"><strong>Kết quả sau đăng</strong><div class="content-result-grid"><label>Lượt xem<input name="resultViews" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.views || 0 : 0)}" /></label><label>Tương tác<input name="resultEngagement" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.engagement || 0 : 0)}" /></label><label>Inbox/lead<input name="resultLeads" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.leads || 0 : 0)}" /></label><label>Đơn hàng<input name="resultOrders" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.orders || 0 : 0)}" /></label></div></div>
      <div class="field full"><label for="contentNote">Ghi chú nội bộ</label><textarea id="contentNote" name="note" rows="3">${escapeHtml(item ? item.note : defaults.note || "")}</textarea></div>
      <div class="field full"><label for="contentPublishUrl">Link đã đăng</label><input id="contentPublishUrl" name="publishUrl" type="url" value="${value("publishUrl")}" placeholder="https://..." /></div>
      ${item ? "" : `<div class="field checkbox-field full"><label><input type="checkbox" name="createAssets" checked /> Tạo Google Docs và folder Drive ngay khi lưu</label></div>`}
    `;
  }

  function contentDetailsSection(title, note, nodes, open) {
    const details = document.createElement("details");
    details.className = "content-details full";
    if (open) details.open = true;
    const summary = document.createElement("summary");
    const summaryText = document.createElement("span");
    summaryText.textContent = title;
    const summaryNote = document.createElement("small");
    summaryNote.textContent = note;
    summaryText.appendChild(summaryNote);
    summary.appendChild(summaryText);
    const body = document.createElement("div");
    body.className = "content-details-body";
    nodes.filter(Boolean).forEach(node => body.appendChild(node));
    details.append(summary, body);
    return details;
  }

  function compactContentItemForm(form) {
    if (!form || form.dataset.contentCompacted === "true") return;
    const checklistBoxes = Array.from(form.querySelectorAll(".content-form-box.full")).slice(0, 2);
    const promptField = form.querySelector("[data-content-prompt]")?.closest(".field");
    const formBoxes = Array.from(form.querySelectorAll(".content-form-box.full"));
    const commentBox = formBoxes[2];
    const resultBox = formBoxes[3];
    const noteField = form.querySelector("#contentNote")?.closest(".field");
    const publishUrlField = form.querySelector("#contentPublishUrl")?.closest(".field");
    const firstAdvancedNode = checklistBoxes[0] || promptField || noteField;
    if (!firstAdvancedNode) return;
    const marker = document.createComment("content advanced sections");
    form.insertBefore(marker, firstAdvancedNode);

    const sections = [
      contentDetailsSection("Checklist và tài nguyên", "Việc cần làm, asset cần chuẩn bị và link Drive liên quan.", checklistBoxes, false),
      contentDetailsSection("Prompt và góp ý", "Prompt hỗ trợ viết, lịch sử comment và góp ý mới.", [promptField, commentBox], false),
      contentDetailsSection("Ghi chú và link xuất bản", "Thông tin nội bộ và đường dẫn bài đã đăng.", [resultBox, noteField, publishUrlField], false)
    ];
    sections.forEach(section => form.insertBefore(section, marker));
    marker.remove();
    form.dataset.contentCompacted = "true";
  }

  async function saveContentItem(form, item) {
    const data = Object.fromEntries(new FormData(form));
    const commentLog = Array.isArray(item && item.commentLog) ? [...item.commentLog] : [];
    const newComment = String(data.newComment || "").trim();
    if (newComment) {
      commentLog.push({
        text: newComment,
        author: currentUser ? currentUser.name : "Team",
        createdAt: new Date().toISOString()
      });
    }
    const path = item ? "/content/update" : "/content/create";
    const response = await apiRequest(path, {
      method: "POST",
      body: JSON.stringify({
        id: item ? item.id : "",
        ...data,
        checklistJson: JSON.stringify(collectContentChecklist(form, "checklist", false)),
        assetChecklistJson: JSON.stringify(collectContentChecklist(form, "asset", true)),
        commentLogJson: JSON.stringify(commentLog),
        resultJson: JSON.stringify({
          views: Number(data.resultViews || 0),
          engagement: Number(data.resultEngagement || 0),
          leads: Number(data.resultLeads || 0),
          orders: Number(data.resultOrders || 0)
        }),
        createAssets: item ? "false" : Boolean(data.createAssets)
      })
    });
    const saved = normalizeContentItem(response.contentItem);
    state.contentItems = state.contentItems || [];
    const index = state.contentItems.findIndex(entry => entry.id === saved.id);
    if (index >= 0) state.contentItems[index] = saved;
    else state.contentItems.unshift(saved);
    window.ArtFlowPosStore.save(state);
    renderPage();
    if (response.assetWarning) showToast("Đã lưu content, nhưng chưa tạo được tài nguyên Drive: " + response.assetWarning, "error");
    else showToast(item ? "Đã cập nhật content." : "Đã tạo chủ đề content.");
  }

  async function provisionContentItem(itemId) {
    const response = await apiRequest("/content/provision-assets", {
      method: "POST",
      body: JSON.stringify({ id: itemId })
    });
    const saved = normalizeContentItem(response.contentItem);
    state.contentItems = (state.contentItems || []).map(item => item.id === saved.id ? saved : item);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã tạo tài nguyên content.");
    return saved;
  }

  async function archiveContentItem(itemId) {
    await apiRequest("/content/archive", {
      method: "POST",
      body: JSON.stringify({ id: itemId })
    });
    state.contentItems = (state.contentItems || []).filter(item => item.id !== itemId);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã ẩn chủ đề content.");
  }

  const teamViews = {
    tasks: { title: "Việc cần làm", note: "Tập trung các việc phát sinh từ họp, kênh bán, content và kho.", action: "Việc" },
    meetings: { title: "Biên bản họp", note: "Agenda, quyết định và việc cần làm sau mỗi cuộc họp.", action: "Cuộc họp" },
    plans: { title: "Kế hoạch kinh doanh", note: "Mục tiêu, ngân sách, kênh triển khai và milestone theo kỳ.", action: "Kế hoạch" },
    pricing: { title: "Pricing Lab", note: "Cân đối giá vốn, chi phí, biên lãi và kịch bản giá bán.", action: "Bảng giá" },
    decisions: { title: "Quyết định", note: "Các quyết định đã chốt, người chịu trách nhiệm và ngày cần xem lại.", action: "Quyết định" }
  };

  const teamStatuses = {
    draft: "Nháp",
    scheduled: "Đã lên lịch",
    completed: "Hoàn tất",
    cancelled: "Hủy",
    idea: "Ý tưởng",
    active: "Đang chạy",
    paused: "Tạm dừng",
    done: "Xong",
    archived: "Lưu trữ",
    todo: "Cần làm",
    doing: "Đang làm",
    approved: "Đã duyệt"
  };


















  const incenseKinds = {
    sales: ["Đơn", "Xin chốt đơn mượt."],
    content: ["Content", "Xin ý tưởng tới nhanh."],
    stock: ["Kho", "Xin kho gọn, hàng đủ."],
    cash: ["Tiền", "Xin dòng tiền sáng."],
    bug: ["Bug", "Xin bug tự lộ mặt."],
    team: ["Team", "Xin cả team nhẹ đầu."]
  };

  const incenseOfferings = {
    banana: { label: "Chuối", image: "banana-bunch.png" },
    fruit: { label: "Trái cây", image: "fruit-plate.png" },
    cake: { label: "Bánh chay", image: "vegan-cake.png" },
    tea: { label: "Trà", image: "tea-cup.png" },
    water: { label: "Nước", image: "water-glass.png" },
    flower: { label: "Hoa sen", image: "lotus-flowers.png" },
    orange: { label: "Cam", image: "orange.png" },
    apple: { label: "Táo", image: "apple.png" },
    watermelon: { label: "Dưa hấu", image: "watermelon.png" },
    sticky_rice: { label: "Xôi chay", image: "sticky-rice.png" },
    coconut: { label: "Dừa", image: "coconut.png" },
    sweet_soup: { label: "Chè chay", image: "sweet-soup.png" }
  };













































































































































  async function saveTeamItem(type, form, existing) {
    const data = Object.fromEntries(new FormData(form));
    const commentLog = appendTeamCommentLog(existing, data);
    const now = new Date().toISOString();
    const id = existing ? existing.id : makeLocalId(type);
    const base = { id, createdAt: existing?.createdAt || now, updatedAt: now };
    let item;
    if (type === "meeting") {
      item = normalizeTeamMeeting({ ...base, ...data, commentLog, decisions: String(data.decisionsText || "").split(/\n+/).map(item => item.trim()).filter(Boolean), actions: actionRowsFromText(data.actionsText) });
    } else if (type === "plan") {
      const milestones = String(data.milestonesText || "").split(/\n+/).map(line => {
        const [title, dueDate, owner] = line.split("|").map(part => part.trim());
        return title ? { title, dueDate: dueDate || "", owner: owner || "" } : null;
      }).filter(Boolean);
      item = normalizeTeamPlan({ ...base, ...data, commentLog, milestones });
    } else if (type === "pricing") {
      item = normalizePricingModel({ ...existing, ...base, ...data, ...pricingModelFromForm(form), commentLog });
    } else if (type === "decision") {
      item = normalizeTeamDecision({ ...base, ...data, commentLog });
    }
    const response = await apiRequest(existing ? "/team/update" : "/team/create", {
      method: "POST",
      body: JSON.stringify({
        id: existing ? existing.id : "",
        itemType: teamApiItemType(type),
        itemJson: JSON.stringify(item)
      })
    });
    const [collection, normalizer] = teamApiCollection(type);
    const saved = normalizer(response.teamItem || item);
    state[collection] = upsertLocalItem(state[collection] || [], saved);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast(type === "pricing" ? "Đã lưu bảng tính giá." : "Đã lưu Team Hub.");
    return saved;
  }





  async function persistAppliedPricingModel(form, model) {
    const existingId = form.dataset.pricingExistingId || "";
    const existing = existingId ? (state.teamPricingModels || []).find(item => item.id === existingId) : null;
    const now = new Date().toISOString();
    const item = normalizePricingModel({
      ...existing,
      ...model,
      id: existing?.id || model.id || makeLocalId("pricing"),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    const response = await apiRequest(existing ? "/team/update" : "/team/create", {
      method: "POST",
      body: JSON.stringify({
        id: existing ? existing.id : "",
        itemType: "pricing",
        itemJson: JSON.stringify(item)
      })
    });
    const saved = normalizePricingModel(response.teamItem || item);
    state.teamPricingModels = upsertLocalItem(state.teamPricingModels || [], saved);
    form.dataset.pricingExistingId = saved.id;
    if (!existingId) window.history.replaceState(null, "", `./team-pricing.html?id=${encodeURIComponent(saved.id)}`);
    return saved;
  }

  async function applyPricingFromForm(form, target, scenarioId = "") {
    const model = pricingModelFromForm(form);
    validatePricingModel(model);
    const product = byId("products", model.productId);
    if (!product) throw new Error("Chọn sản phẩm trước khi áp dụng giá.");
    const selectedScenarioId = scenarioId || model.selectedScenarioId || model.scenarios[0]?.id || "";
    const scenario = model.scenarios.find(item => item.id === selectedScenarioId) || model.scenarios[0];
    if (!scenario) throw new Error("Cần có ít nhất một kịch bản giá.");
    const result = calculatePricingScenario(model, scenario);
    const appliedPrice = Math.max(0, Number(result.roundedPrice || 0));
    if (!appliedPrice) throw new Error("Giá áp dụng chưa hợp lệ.");
    if (appliedPrice < Number(product.costPrice || 0) || result.expectedProfit < 0) {
      throw new Error("Giá đang thấp hơn giá vốn hoặc tạo lợi nhuận âm. Hãy điều chỉnh kịch bản trước khi áp dụng.");
    }
    const appliedAt = new Date().toISOString();
    let appliedChannel = null;
    if (target === "channel") {
      const channelId = scenario.channelId || model.channelId;
      if (!channelId) throw new Error("Chọn kênh/sàn trước khi áp dụng giá kênh.");
      const channel = channelByIdOrCode(channelId);
      if (!channel || channel.status !== "active") throw new Error("Kênh/sàn đã chọn không tồn tại hoặc đang ngừng hoạt động.");
      const existing = (state.channelProducts || []).find(item => item.productId === product.id && item.channelId === channelId && item.status !== "deleted");
      const response = await apiRequest("/omni/mappings/upsert", {
        method: "POST",
        body: JSON.stringify({
          id: existing ? existing.id : "",
          productId: product.id,
          channelId,
          channelSku: existing?.channelSku || product.sku,
          channelName: existing?.channelName || product.name,
          channelPrice: appliedPrice,
          channelStock: existing?.channelStock ?? product.stock,
          syncStock: existing?.syncStock ?? true,
          syncPrice: true,
          status: "active",
          note: `Áp dụng từ pricing: ${model.title || scenario.label || product.sku}`
        })
      });
      const saved = normalizeChannelProduct(response.channelProduct);
      state.channelProducts = upsertLocalItem(state.channelProducts || [], saved);
      appliedChannel = channel;
      showToast(`Đã áp dụng giá kênh ${money.format(appliedPrice)}.`);
    } else {
      const payload = { ...product, salePrice: appliedPrice };
      const response = await apiRequest("/products/update", { method: "POST", body: JSON.stringify(payload) });
      const saved = normalizeProduct(response.product);
      state.products = upsertLocalItem(state.products || [], saved);
      showToast(`Đã áp dụng giá shop/offline ${money.format(appliedPrice)}.`);
    }
    const scenarios = model.scenarios.map(item => item.id === scenario.id ? normalizePricingScenario({ ...item, resultSnapshot: result }) : item);
    await persistAppliedPricingModel(form, normalizePricingModel({
      ...model,
      scenarios,
      selectedScenarioId: scenario.id,
      appliedPrice,
      appliedAt,
      appliedToProduct: target !== "channel",
      appliedToChannelProduct: target === "channel",
      appliedChannelId: appliedChannel?.id || "",
      appliedChannelCode: appliedChannel?.code || "",
      appliedSnapshot: result
    }));
    window.ArtFlowPosStore.save(state);
    if (document.body.dataset.page === "teamPricing" && form?.isConnected) {
      const selected = form.querySelector("[data-pricing-selected-product]");
      const refreshedProduct = byId("products", model.productId);
      if (selected && refreshedProduct) selected.innerHTML = renderPricingSelectedProduct(refreshedProduct);
    } else {
      renderPage();
    }
    selectPricingScenario(form, scenario.id);
    updateTeamPricingPreview(form);
  }

  function upsertLocalItem(items, saved) {
    const index = items.findIndex(item => item.id === saved.id);
    if (index >= 0) return items.map(item => item.id === saved.id ? saved : item);
    return [saved, ...items];
  }

  async function archiveTeamItem(kind, id) {
    const typeMap = { meetings: "meeting", plans: "plan", pricing: "pricing", decisions: "decision" };
    const collectionMap = { meetings: "teamMeetings", plans: "teamPlans", pricing: "teamPricingModels", decisions: "teamDecisions" };
    const itemType = typeMap[kind];
    const collection = collectionMap[kind];
    if (!itemType || !collection) return;
    await apiRequest("/team/archive", {
      method: "POST",
      body: JSON.stringify({ id, itemType })
    });
    state[collection] = (state[collection] || []).filter(item => item.id !== id);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã lưu trữ Team Hub.");
  }

  function renderCustomers() {
    if (!els.customersTable) return;
    const rows = filtered(state.customers, ["name", "phone", "email", "group"]);
    els.customersTable.innerHTML = rows.length ? rows.map(customer => `
      <tr class="data-row-clickable" data-view-customer="${customer.id}" tabindex="0" aria-label="Xem chi tiết khách hàng ${escapeAttribute(customer.name)}">
        <td><strong>${escapeHtml(customer.name)}</strong><br><small>${escapeHtml(customer.email || "Chưa có email")}</small></td>
        <td>${customer.phone}</td>
        <td><span class="badge">${customer.group}</span></td>
        <td>${money.format(customer.totalSpent)}</td>
        <td>${formatDate(customer.lastOrderAt)}</td>
        <td><span class="badge ${customer.status}">${statusLabel(customer.status)}</span></td>
        <td>
          <div class="row-actions">
            ${canManageCustomers() ? `<button class="link-button icon-only" data-edit-customer="${customer.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button><button class="link-button icon-only" data-archive-customer="${customer.id}" data-next-status="${customer.status === "active" ? "archived" : "active"}" aria-label="${customer.status === "active" ? "Ngừng theo dõi" : "Kích hoạt"}" title="${customer.status === "active" ? "Ngừng theo dõi" : "Kích hoạt"}">${icon(customer.status === "active" ? "archive" : "check")}</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7" class="empty">Chưa có khách hàng. Hãy thêm khách hàng đầu tiên.</td></tr>`;
  }

  function renderCustomerDetail(customer) {
    const orders = (state.orders || [])
      .filter(order => order.customerId === customer.id && order.status !== "cancelled")
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const points = loyaltyPointsForCustomer(customer);
    const latestOrders = orders.slice(0, 5);
    return `
      <section class="customer-detail-hero full">
        <div class="customer-avatar" aria-hidden="true">${escapeHtml(String(customer.name || "K").trim().charAt(0).toUpperCase())}</div>
        <div><span class="badge ${customer.status}">${statusLabel(customer.status)}</span><h3>${escapeHtml(customer.name)}</h3><p>${escapeHtml(customer.group || "Khách hàng")}</p></div>
      </section>
      <section class="detail-metric-grid full">
        <article><span>Tổng đã mua</span><strong>${money.format(customer.totalSpent || 0)}</strong></article>
        <article><span>Điểm thành viên</span><strong>${Number(points || 0).toLocaleString("vi-VN")}</strong></article>
        <article><span>Số đơn</span><strong>${orders.length}</strong></article>
      </section>
      <section class="detail-section full"><h3>Liên hệ</h3><dl class="detail-list"><div><dt>Điện thoại</dt><dd>${escapeHtml(customer.phone || "—")}</dd></div><div><dt>Email</dt><dd>${escapeHtml(customer.email || "—")}</dd></div><div><dt>Lần mua cuối</dt><dd>${customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—"}</dd></div></dl></section>
      <section class="detail-section full"><div class="detail-section-header"><h3>Đơn gần đây</h3><a href="./orders.html?customer=${encodeURIComponent(customer.id)}">Xem danh sách</a></div>${latestOrders.length ? `<div class="detail-activity-list">${latestOrders.map(order => `<button type="button" data-view-order="${order.id}"><span><strong>${escapeHtml(order.code)}</strong><small>${formatDateTimeShort(order.createdAt)}</small></span><b>${money.format(order.netTotal)}</b></button>`).join("")}</div>` : `<p class="resource-empty-copy">Khách hàng chưa có đơn mua.</p>`}</section>
      <section class="detail-section full"><h3>Ghi chú</h3><p>${escapeHtml(customer.note || "Chưa có ghi chú.").replace(/\n/g, "<br>")}</p></section>
      ${canManageCustomers() ? `<footer class="detail-sticky-actions"><button class="button primary" type="button" data-edit-customer="${customer.id}">${icon("edit")} Sửa khách hàng</button></footer>` : ""}
    `;
  }

  function renderUsers() {
    if (!els.usersTable) return;
    const rows = filtered(staffUsers, ["name", "email", "role", "status"]).filter(user => {
      return (userFilters.role === "all" || user.role === userFilters.role) &&
        (userFilters.status === "all" || user.status === userFilters.status);
    });
    if (els.userResultCount) els.userResultCount.textContent = String(rows.length);
    els.usersTable.innerHTML = rows.length ? rows.map(user => {
      const isCurrent = user.id === currentUser.id;
      return `
      <tr class="${isCurrent ? "is-current-user" : ""}">
        <td><strong>${escapeHtml(user.name)}</strong>${isCurrent ? `<small class="current-user-label">Tài khoản của bạn</small>` : ""}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badge">${roleLabel(user.role)}</span></td>
        <td><span class="badge ${user.status}">${statusLabel(user.status)}</span></td>
        <td>${formatDate(user.lastLoginAt)}</td>
        <td>
          ${isCurrent ? `<span class="current-user-label">Được bảo vệ</span>` : `<div class="row-actions">
            <button class="link-button icon-only user-action-toggle ${user.status === "active" ? "" : "is-enable"}" data-toggle-user="${escapeAttribute(user.id)}" aria-label="${user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}" title="${user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}">${icon(user.status === "active" ? "archive" : "check")}</button>
            <button class="link-button icon-only user-action-delete" data-delete-user="${escapeAttribute(user.id)}" aria-label="Xóa tài khoản" title="Xóa tài khoản">${icon("trash")}</button>
          </div>`}
        </td>
      </tr>
    `;
    }).join("") : `<tr><td colspan="6" class="empty">${staffUsers.length ? "Không có tài khoản phù hợp bộ lọc hiện tại." : "Chưa có tài khoản nhân viên."}</td></tr>`;
  }

  function auditEntityLabel(type) {
    return {
      user: "Nhân viên", session: "Phiên đăng nhập", product: "Sản phẩm", product_import: "Nhập sản phẩm",
      customer: "Khách hàng", customer_import: "Nhập khách hàng", order: "Đơn hàng", sales_return: "Khách trả hàng",
      order_refund: "Hoàn tiền", stock_movement: "Kho hàng", cash_transaction: "Thu chi",
      accounting_account: "Tài khoản tiền", accounting_category: "Danh mục thu chi", reconciliation: "Đối soát",
      supplier: "Nhà cung cấp", purchase_order: "Phiếu mua", supplier_payment: "Thanh toán NCC",
      purchase_return: "Trả hàng NCC", supplier_credit: "Bù trừ NCC",
      content_item: "Content", team_item: "Team Hub", incense_wish: "Xin vía",
      app_setting: "Cài đặt", product_option: "Thuộc tính sản phẩm",
      product_content_batch: "Tài nguyên sản phẩm", sales_channel: "Kênh bán",
      channel_product: "Sản phẩm theo kênh", campaign: "Chiến dịch",
      workspace_task: "Công việc liên kênh", d1_entity: "Dữ liệu hệ thống"
    }[type] || type || "Hệ thống";
  }

  function auditActionLabel(action) {
    return {
      createProduct: "Tạo sản phẩm", updateProduct: "Cập nhật sản phẩm",
      archiveProduct: "Đổi trạng thái sản phẩm", createProductOption: "Tạo thuộc tính sản phẩm",
      updateProductOption: "Cập nhật thuộc tính sản phẩm", toggleProductOption: "Đổi trạng thái thuộc tính sản phẩm",
      createCustomer: "Tạo khách hàng", updateCustomer: "Cập nhật khách hàng",
      archiveCustomer: "Đổi trạng thái khách hàng", createOrder: "Tạo đơn hàng",
      updateOrderStatus: "Cập nhật trạng thái đơn hàng", updateOrderFulfillment: "Cập nhật giao hàng",
      cancelOrder: "Hủy đơn hàng", returnOrder: "Ghi nhận khách trả hàng",
      refundOrder: "Hoàn tiền đơn hàng", createContentItem: "Tạo chủ đề content",
      updateContentItem: "Cập nhật chủ đề content", archiveContentItem: "Lưu trữ chủ đề content",
      createTeamItem: "Tạo nội dung Team Hub", updateTeamItem: "Cập nhật nội dung Team Hub",
      archiveTeamItem: "Lưu trữ nội dung Team Hub", createIncenseWish: "Thắp hương xin vía",
      updateAppSettings: "Cập nhật cài đặt hệ thống", updateMyProfile: "Cập nhật hồ sơ cá nhân",
      changeMyPassword: "Đổi mật khẩu", createOrderReceiptPdf: "Tạo PDF hóa đơn",
      provisionContentItemAssets: "Tạo tài nguyên Drive cho content",
      createWorkspaceTask: "Tạo việc cần làm", updateWorkspaceTask: "Cập nhật việc cần làm",
      archiveWorkspaceTask: "Lưu trữ việc cần làm", createSalesChannel: "Tạo kênh bán",
      updateSalesChannel: "Cập nhật kênh bán", createCampaign: "Tạo chiến dịch",
      updateCampaign: "Cập nhật chiến dịch", updateTeamPricing: "Cập nhật bảng tính giá"
    }[action] || action || "Hoạt động hệ thống";
  }

  function renderAuditLogs() {
    if (!els.auditTable) return;
    const cutoff = auditFilters.range === "all" ? 0 : Date.now() - Number(auditFilters.range || 30) * 24 * 60 * 60 * 1000;
    const term = searchTerm.trim().toLowerCase();
    const rows = auditLogs.filter(log => {
      const matchesEntity = auditFilters.entityType === "all" || log.entityType === auditFilters.entityType;
      const matchesDate = !cutoff || new Date(log.createdAt).getTime() >= cutoff;
      const text = [log.description, auditActionLabel(log.action), log.action, log.actorName, log.actorEmail, auditEntityLabel(log.entityType), log.entityType, log.entityId].join(" ").toLowerCase();
      return matchesEntity && matchesDate && (!term || text.includes(term));
    });

    if (els.auditResultCount) els.auditResultCount.textContent = String(rows.length);

    if (els.auditHealth) {
      const healthy = !Number(auditHealth.pending || 0) && !Number(auditHealth.failed || 0);
      els.auditHealth.classList.toggle("has-warning", !healthy);
      els.auditHealth.innerHTML = healthy
        ? `${icon("check")} Nhật ký D1 đang đồng bộ`
        : `${icon("alertTriangle")} ${Number(auditHealth.pending || 0)} đang chờ · ${Number(auditHealth.failed || 0)} lỗi`;
    }

    els.auditTable.innerHTML = rows.length ? rows.map(log => {
      const actionLabel = log.description && log.description !== log.action ? log.description : auditActionLabel(log.action);
      return `
      <tr>
        <td><strong>${escapeHtml(formatDateTime(log.createdAt))}</strong><small>Giờ Việt Nam</small></td>
        <td><strong>${escapeHtml(actionLabel)}</strong><small>${escapeHtml(log.action)}</small></td>
        <td><span class="badge">${escapeHtml(auditEntityLabel(log.entityType))}</span></td>
        <td><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmail)}</small></td>
        <td><code class="audit-reference">${escapeHtml(log.entityId || "—")}</code></td>
        <td><button class="link-button icon-only" type="button" data-view-audit="${escapeAttribute(log.id)}" aria-label="Xem chi tiết" title="Xem chi tiết">${icon("eye")}</button></td>
      </tr>
    `;
    }).join("") : `<tr><td colspan="6" class="empty">${auditLogs.length ? "Không có hoạt động phù hợp bộ lọc hiện tại." : "Chưa có hoạt động nào được ghi nhận."}</td></tr>`;
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
          <td data-label="Sản phẩm"><strong>${movement.sku}</strong><br><small>${movement.productName}</small></td>
          <td data-label="Loại"><span class="badge ${movement.type === "sale" ? "pending" : "active"}">${statusLabel(movement.type)}</span></td>
          <td data-label="Thay đổi"><span class="badge ${deltaClass}">${delta}</span></td>
          <td data-label="Tồn trước/sau">${movement.stockBefore} → ${movement.stockAfter}</td>
          <td data-label="Lý do">${movement.reason || "Không có ghi chú"}</td>
          <td data-label="Thời gian">${formatDateTime(movement.createdAt)}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="6" class="empty">Chưa có biến động kho.</td></tr>`;
  }

  function inventoryStockState(product) {
    const stock = Number(product.stock || 0);
    const lowStock = Number(product.lowStock || 0);
    if (stock <= 0) return { key: "out", badge: "cancelled", label: "Hết hàng", priority: 0 };
    if (stock <= lowStock) return { key: "low", badge: "low", label: "Sắp hết", priority: 1 };
    if (lowStock > 0 && stock >= lowStock * 4) return { key: "overstock", badge: "pending", label: "Tồn cao", priority: 3 };
    return { key: "healthy", badge: "active", label: "Ổn định", priority: 2 };
  }

  function inventoryRestockSuggestion(product) {
    const stock = Number(product.stock || 0);
    const lowStock = Number(product.lowStock || 0);
    if (stock <= 0) return Math.max(1, lowStock * 2);
    if (stock <= lowStock) return Math.max(1, lowStock * 2 - stock);
    return 0;
  }

  function renderInventoryFilters(products) {
    const categoryFilter = document.querySelector('[data-inventory-filter="category"]');
    if (!categoryFilter) return;
    const current = inventoryFilters.category;
    const categories = Array.from(new Set(products.map(product => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
    categoryFilter.innerHTML = `<option value="all">Tất cả danh mục</option>${categories.map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`).join("")}`;
    categoryFilter.value = categories.includes(current) ? current : "all";
    inventoryFilters.category = categoryFilter.value;
    document.querySelectorAll("[data-inventory-filter]").forEach(input => {
      const key = input.dataset.inventoryFilter;
      if (inventoryFilters[key] !== undefined && input.value !== inventoryFilters[key]) input.value = inventoryFilters[key];
    });
  }

  function inventoryFilteredProducts(products) {
    const term = searchTerm.trim().toLowerCase();
    const rows = products.filter(product => {
      const stateInfo = inventoryStockState(product);
      const categoryMatch = inventoryFilters.category === "all" || product.category === inventoryFilters.category;
      const stockMatch = inventoryFilters.stock === "all" || stateInfo.key === inventoryFilters.stock;
      const searchMatch = !term || [product.sku, product.name, product.category, product.brand, product.barcode].some(value => String(value || "").toLowerCase().includes(term));
      return categoryMatch && stockMatch && searchMatch;
    });
    return rows.sort((a, b) => {
      if (inventoryFilters.sort === "stockAsc") return a.stock - b.stock || a.name.localeCompare(b.name, "vi");
      if (inventoryFilters.sort === "stockDesc") return b.stock - a.stock || a.name.localeCompare(b.name, "vi");
      if (inventoryFilters.sort === "valueDesc") return (b.stock * b.costPrice) - (a.stock * a.costPrice) || a.name.localeCompare(b.name, "vi");
      if (inventoryFilters.sort === "name") return a.name.localeCompare(b.name, "vi");
      const stateA = inventoryStockState(a);
      const stateB = inventoryStockState(b);
      return stateA.priority - stateB.priority || a.stock - b.stock || a.name.localeCompare(b.name, "vi");
    });
  }

  function renderInventoryProducts(products) {
    if (!els.inventoryProductsTable) return;
    const rows = inventoryFilteredProducts(products);
    if (els.inventoryResultCount) els.inventoryResultCount.textContent = String(rows.length);
    els.inventoryProductsTable.innerHTML = rows.length ? rows.map(product => {
      const stateInfo = inventoryStockState(product);
      const suggestion = inventoryRestockSuggestion(product);
      const value = Number(product.stock || 0) * Number(product.costPrice || 0);
      return `
        <tr class="inventory-product-row" data-stock-state="${stateInfo.key}">
          <td data-label="Sản phẩm">
            <div class="inventory-product-cell">
              ${renderProductThumb(product, "product-thumb inventory-thumb")}
              <span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku)}${product.barcode ? ` · ${escapeHtml(product.barcode)}` : ""}</small></span>
            </div>
          </td>
          <td data-label="Phân loại"><strong>${escapeHtml(product.category || "Chưa phân loại")}</strong><small>${escapeHtml(product.brand || "Chưa có hãng")}</small></td>
          <td data-label="Tồn kho"><span class="badge ${stateInfo.badge}">${Number(product.stock || 0)} ${escapeHtml(product.unit || "")}</span></td>
          <td data-label="Ngưỡng">${Number(product.lowStock || 0)}</td>
          <td data-label="Giá vốn">${money.format(product.costPrice)}</td>
          <td data-label="Giá trị">${money.format(value)}</td>
          <td data-label="Gợi ý">${suggestion ? `Nhập thêm ${suggestion}` : "Đủ an toàn"}</td>
          <td data-label="Thao tác">
            <div class="table-actions">
              <button class="button small primary icon-only" type="button" data-stock-receive-product="${product.id}" aria-label="Nhập kho" title="Nhập kho">${icon("download")}</button>
              <button class="button small ghost icon-only" type="button" data-stock-adjust-product="${product.id}" aria-label="Kiểm kho" title="Kiểm kho">${icon("edit")}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="8" class="empty">Không có SKU phù hợp bộ lọc hiện tại.</td></tr>`;
  }

  function renderInventory() {
    if (!els.inventoryProductsTable) return;
    const activeProducts = state.products.filter(product => product.status === "active");
    renderInventoryFilters(activeProducts);
    renderInventoryProducts(activeProducts);
    renderStockMovements();
  }

  function openInventoryMovements() {
    if (!els.inventoryMovementsOverlay) return;
    renderStockMovements();
    els.inventoryMovementsOverlay.hidden = false;
    document.body.classList.add("overlay-open");
    requestAnimationFrame(() => els.inventoryMovementsOverlay.querySelector("[data-close-inventory-movements]")?.focus());
  }

  function closeInventoryMovements() {
    if (!els.inventoryMovementsOverlay || els.inventoryMovementsOverlay.hidden) return;
    els.inventoryMovementsOverlay.hidden = true;
    if (!els.modalBackdrop || els.modalBackdrop.hidden) document.body.classList.remove("overlay-open");
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






  function ownerName(ownerId) {
    const id = String(ownerId || "");
    const user = [...(state.users || []), ...(state.contentOwners || []), currentUser || {}].find(item => item && item.id === id);
    return user ? user.name : id;
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
    renderOrdersRows(els.ordersTable, orders);
    renderProducts();
    renderOmniWorkspace();
    renderContentWorkspace();
    renderTeamHub();
    renderTeamPricingPage();
    renderMeetingMinutesPage();
    renderIncense();
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
    renderSettingsPage();
    enhanceResponsiveTables();
    enhanceMoneyInputs();
    focusDeepLinkedRecord();
  }

  function focusDeepLinkedRecord() {
    if (deepLinkFocusHandled || !pageDataReady) return;
    const linkedPurchaseOrder = page === "purchasing" && purchasingOrderTarget
      ? (state.purchaseOrders || []).find(order => order.id === purchasingOrderTarget || order.code === purchasingOrderTarget)
      : null;
    const selector = page === "accounting" && accountingTransactionTarget
      ? `[data-transaction-row="${CSS.escape(accountingTransactionTarget)}"]`
      : page === "purchasing" && purchasingOrderTarget
        ? `[data-purchase-order-row="${CSS.escape(linkedPurchaseOrder?.id || purchasingOrderTarget)}"]`
        : page === "suppliers" && supplierTarget
          ? `[data-supplier-card="${CSS.escape(supplierTarget)}"]`
        : "";
    if (!selector) return;
    deepLinkFocusHandled = true;
    window.requestAnimationFrame(() => {
      const target = document.querySelector(selector);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      else showToast("Không tìm thấy bản ghi được liên kết trong dữ liệu hiện tại.", "error");
    });
  }

  function closeModal() {
    if (!els.modalBackdrop || !els.modalForm) return;
    const modal = els.modalBackdrop.querySelector(".modal");
    if (modal) delete modal.dataset.modalType;
    els.modalForm.classList.remove("modal-form-wide");
    els.modalForm.classList.remove("modal-form-fullscreen");
    els.modalBackdrop.hidden = true;
    document.body.classList.remove("overlay-open");
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
    revision: "Cần sửa",
    ready: "Sẵn sàng",
    published: "Đã đăng"
  };

  const contentItemStatuses = {
    brief: "Lên brief",
    revision: "Cần sửa",
    idea: "Ý tưởng",
    briefing: "Lên brief",
    drafting: "Đang làm",
    review: "Chờ duyệt",
    ready: "Sẵn sàng",
    scheduled: "Đã lên lịch",
    published: "Đã đăng",
    archived: "Tạm ẩn"
  };

  const contentItemTypes = {
    product: "Theo sản phẩm",
    campaign: "Chiến dịch",
    idea: "Ý tưởng",
    post: "Bài đăng",
    video: "Video",
    short_video: "Video ngắn",
    blog: "Bài SEO",
    brief: "Brief"
  };

  const contentChannels = {
    multi: "Đa kênh",
    website: "Website",
    facebook: "Facebook",
    tiktok: "TikTok",
    shopee: "Shopee",
    lazada: "Lazada",
    email: "Email",
    offline: "POS / Offline"
  };

  const contentPriorities = {
    low: "Thấp",
    normal: "Thường",
    high: "Cao",
    urgent: "Gấp"
  };

  const contentBriefTemplates = {
    blank: {
      label: "T\u1EF1 do",
      brief: "",
      kpi: "1 n\u1ED9i dung ho\u00E0n ch\u1EC9nh, c\u00F3 CTA r\u00F5",
      checklist: ["X\u00E1c \u0111\u1ECBnh m\u1EE5c ti\u00EAu", "Vi\u1EBFt b\u1EA3n nh\u00E1p", "Chu\u1EA9n b\u1ECB asset", "Review", "\u0110\u0103ng/l\u00EAn l\u1ECBch"],
      assets: ["\u1EA2nh/video ch\u00EDnh", "File thi\u1EBFt k\u1EBF", "Link tham kh\u1EA3o", "Link b\u00E0i \u0111\u00E3 \u0111\u0103ng", "S\u1ED1 li\u1EC7u sau \u0111\u0103ng"]
    },
    facebook: {
      label: "B\u00E0i Facebook",
      brief: "M\u1EE5c ti\u00EAu:\n\u0110\u1ED1i t\u01B0\u1EE3ng:\nHook m\u1EDF \u0111\u1EA7u:\nV\u1EA5n \u0111\u1EC1/insight:\nL\u1EE3i \u00EDch s\u1EA3n ph\u1EA9m:\nN\u1ED9i dung ch\u00EDnh:\nCTA:\nHashtag:",
      kpi: "1 b\u00E0i Facebook c\u00F3 hook r\u00F5, CTA v\u00E0 t\u1ED1i thi\u1EC3u 1 asset ch\u00EDnh",
      checklist: ["Ch\u1ED1t hook", "Vi\u1EBFt caption", "G\u1EAFn CTA", "Review h\u00ECnh/hashtag", "L\u00EAn l\u1ECBch \u0111\u0103ng"],
      assets: ["\u1EA2nh b\u00ECa", "\u1EA2nh ph\u1EE5/reel", "Hashtag", "Link s\u1EA3n ph\u1EA9m", "Link b\u00E0i \u0111\u00E3 \u0111\u0103ng"]
    },
    tiktok: {
      label: "Video TikTok/Reels",
      brief: "M\u1EE5c ti\u00EAu video:\n\u0110\u1ED1i t\u01B0\u1EE3ng:\nHook 3 gi\u00E2y \u0111\u1EA7u:\nK\u1ECBch b\u1EA3n c\u1EA3nh 1-2-3:\nG\u00F3c quay/\u0111\u1EA1o c\u1EE5:\nText overlay:\nCTA:\nNh\u1EA1c/nh\u1ECBp d\u1EF1ng:",
      kpi: "1 video ng\u1EAFn 15-45s, c\u00F3 hook 3s v\u00E0 CTA mua/nh\u1EAFn tin",
      checklist: ["Ch\u1ED1t hook 3 gi\u00E2y", "Vi\u1EBFt shot list", "Quay demo", "D\u1EF1ng video + text overlay", "L\u00EAn l\u1ECBch \u0111\u0103ng"],
      assets: ["Video th\u00F4", "\u1EA2nh thumbnail", "Nh\u1EA1c/voice", "Caption", "Link video \u0111\u00E3 \u0111\u0103ng"]
    },
    shopee: {
      label: "M\u00F4 t\u1EA3 Shopee",
      brief: "T\u00EAn/t\u1EEB kh\u00F3a ch\u00EDnh:\n\u0110i\u1EC3m n\u1ED5i b\u1EADt:\nTh\u00F4ng s\u1ED1:\nC\u00E1ch d\u00F9ng:\n\u0110\u1ED1i t\u01B0\u1EE3ng ph\u00F9 h\u1EE3p:\nCam k\u1EBFt/ch\u00EDnh s\u00E1ch:\nT\u1EEB kh\u00F3a SEO:",
      kpi: "1 m\u00F4 t\u1EA3 s\u00E0n \u0111\u1EE7 t\u1EEB kh\u00F3a, th\u00F4ng s\u1ED1 v\u00E0 h\u01B0\u1EDBng d\u1EABn d\u00F9ng",
      checklist: ["T\u1ED1i \u01B0u t\u00EAn s\u1EA3n ph\u1EA9m", "Vi\u1EBFt m\u00F4 t\u1EA3", "Th\u00EAm th\u00F4ng s\u1ED1", "Review t\u1EEB kh\u00F3a", "C\u1EADp nh\u1EADt link s\u00E0n"],
      assets: ["\u1EA2nh ch\u00EDnh 1:1", "\u1EA2nh chi ti\u1EBFt", "B\u1EA3ng th\u00F4ng s\u1ED1", "T\u1EEB kh\u00F3a", "Link Shopee"]
    },
    website: {
      label: "M\u00F4 t\u1EA3 Website/SEO",
      brief: "M\u1EE5c ti\u00EAu SEO:\nM\u00F4 t\u1EA3 ng\u1EAFn:\nUSP:\nTh\u00F4ng s\u1ED1 k\u1EF9 thu\u1EADt:\nC\u00E1ch d\u00F9ng/b\u1EA3o qu\u1EA3n:\nFAQ:\nMeta title/description:\nMeta keywords:",
      kpi: "1 b\u00E0i/m\u00F4 t\u1EA3 website c\u00F3 SEO title, FAQ v\u00E0 CTA",
      checklist: ["Vi\u1EBFt m\u00F4 t\u1EA3 ng\u1EAFn", "Vi\u1EBFt USP", "Th\u00EAm FAQ", "T\u1ED1i \u01B0u SEO", "G\u1EAFn link s\u1EA3n ph\u1EA9m"],
      assets: ["\u1EA2nh s\u1EA3n ph\u1EA9m", "\u1EA2nh lifestyle", "T\u1EEB kh\u00F3a SEO", "FAQ", "Link website"]
    },
    campaign: {
      label: "Campaign",
      brief: "T\u00EAn campaign:\nM\u1EE5c ti\u00EAu:\nInsight:\nTh\u00F4ng \u0111i\u1EC7p ch\u00EDnh:\nK\u00EAnh tri\u1EC3n khai:\nDanh s\u00E1ch n\u1ED9i dung c\u1EA7n l\u00E0m:\nTimeline:\nAsset c\u1EA7n chu\u1EA9n b\u1ECB:\nC\u00E1ch \u0111o hi\u1EC7u qu\u1EA3:",
      kpi: "Danh s\u00E1ch topic, deadline, owner v\u00E0 KPI cho t\u1EEBng k\u00EAnh",
      checklist: ["Ch\u1ED1t m\u1EE5c ti\u00EAu", "Ch\u1ED1t danh s\u00E1ch topic", "Ph\u00E2n owner", "Chu\u1EA9n b\u1ECB asset", "Theo d\u00F5i k\u1EBFt qu\u1EA3"],
      assets: ["Brief campaign", "L\u1ECBch \u0111\u0103ng", "Folder asset", "B\u1EA3ng KPI", "Link t\u1ED5ng h\u1EE3p"]
    },
    product: {
      label: "Theo s\u1EA3n ph\u1EA9m",
      brief: "S\u1EA3n ph\u1EA9m:\nKh\u00E1ch h\u00E0ng m\u1EE5c ti\u00EAu:\nV\u1EA5n \u0111\u1EC1 kh\u00E1ch g\u1EB7p:\nL\u1EE3i \u00EDch ch\u00EDnh:\nB\u1EB1ng ch\u1EE9ng/demo c\u1EA7n quay/ch\u1EE5p:\nCTA:\nK\u00EAnh \u0111\u0103ng:",
      kpi: "1 b\u1ED9 content s\u1EA3n ph\u1EA9m \u0111\u1EE7 brief, asset v\u00E0 prompt",
      checklist: ["Ch\u1ED1t insight s\u1EA3n ph\u1EA9m", "Vi\u1EBFt USP", "Chu\u1EA9n b\u1ECB demo", "Review gi\u00E1/link", "\u0110\u0103ng/l\u00EAn l\u1ECBch"],
      assets: ["\u1EA2nh s\u1EA3n ph\u1EA9m", "Video demo", "Gi\u00E1/link b\u00E1n", "Feedback/USP", "Link b\u00E0i \u0111\u0103ng"]
    }
  };

  const defaultContentChecklist = ["Brief rõ mục tiêu", "Caption/nội dung nháp", "Hình/video đã chuẩn bị", "Đã review", "Đã lên lịch hoặc đăng"];
  const defaultContentAssetChecklist = ["Ảnh chính", "Ảnh phụ", "Video/Reel", "File thiết kế", "Link bài đã đăng"];

  const productOptionLabels = {
    category: "Danh mục",
    brand: "Thương hiệu",
    unit: "Đơn vị tính"
  };

  function renderManagedProductSelect(type, currentValue, options = {}) {
    const current = String(currentValue || "");
    const values = (state.productOptions || [])
      .filter(option => option.type === type && option.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (current && !values.some(option => option.name === current)) {
      values.unshift({ id: "legacy", name: current, status: "archived" });
    }
    const placeholder = options.placeholder || `Chọn ${productOptionLabels[type].toLowerCase()}`;
    return `<option value="" ${current ? "" : "selected"}>${placeholder}</option>${values.map(option => `<option value="${escapeAttribute(option.name)}" ${option.name === current ? "selected" : ""}>${escapeHtml(option.name)}${option.status !== "active" ? " (đã ngừng dùng)" : ""}</option>`).join("")}`;
  }

  function renderContentOwnerSelect(currentValue) {
    const current = String(currentValue || "");
    const owners = [...(state.contentOwners || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
    if (current && !owners.some(owner => owner.name === current)) owners.unshift({ id: "legacy", name: current, email: "" });
    return `<option value="">Chưa phân công</option>${owners.map(owner => `<option value="${escapeAttribute(owner.name)}" ${owner.name === current ? "selected" : ""}>${escapeHtml(owner.name)}${owner.email ? ` · ${escapeHtml(owner.email)}` : ""}</option>`).join("")}`;
  }

  function productOptionUsageCount(option) {
    const fieldByType = { category: "category", brand: "brand", unit: "unit" };
    const field = fieldByType[option.type];
    return field ? state.products.filter(product => product.status !== "deleted" && product[field] === option.name).length : 0;
  }

  function renderProductOptionManager(activeType, editOptionId) {
    const type = productOptionLabels[activeType] ? activeType : "category";
    const options = (state.productOptions || [])
      .filter(option => option.type === type)
      .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || a.name.localeCompare(b.name, "vi"));
    return `
      <div class="product-option-manager full">
        <div class="segmented-control product-option-tabs">${Object.entries(productOptionLabels).map(([key, label]) => `<button class="${key === type ? "active" : ""}" type="button" data-product-option-type="${key}">${label}</button>`).join("")}</div>
        <div class="product-option-create">
          <label class="field"><span>Thêm ${productOptionLabels[type].toLowerCase()}</span><input type="text" maxlength="100" placeholder="Nhập tên mới" data-product-option-name data-option-type="${type}" /></label>
          <button class="button primary" type="button" data-create-product-option="${type}">${icon("plus")} Thêm</button>
        </div>
        <div class="product-option-list">${options.length ? options.map(option => `
          <div class="product-option-item ${option.status !== "active" ? "archived" : ""}">
            ${editOptionId === option.id ? `<div class="product-option-edit"><input type="text" maxlength="100" value="${escapeAttribute(option.name)}" data-product-option-edit-name="${escapeAttribute(option.id)}" /><div class="row-actions"><button class="link-button action-edit icon-only" type="button" data-save-product-option="${escapeAttribute(option.id)}" data-option-type="${type}" aria-label="Lưu" title="Lưu">${icon("check")}</button><button class="link-button icon-only" type="button" data-cancel-product-option-edit data-option-type="${type}" aria-label="Hủy" title="Hủy">${icon("close")}</button></div></div>` : `<div><strong>${escapeHtml(option.name)}</strong><small>${option.status === "active" ? "Đang sử dụng" : "Đã ngừng dùng"} · ${productOptionUsageCount(option)} sản phẩm</small></div><div class="row-actions"><button class="link-button action-edit icon-only" type="button" data-edit-product-option="${escapeAttribute(option.id)}" data-option-type="${type}" aria-label="Đổi tên" title="Đổi tên">${icon("edit")}</button><button class="link-button icon-only ${option.status === "active" ? "action-archive" : "action-activate"}" type="button" data-toggle-product-option="${escapeAttribute(option.id)}" data-option-type="${type}" data-option-usage="${productOptionUsageCount(option)}" data-next-status="${option.status === "active" ? "archived" : "active"}" aria-label="${option.status === "active" ? "Ngừng dùng" : "Dùng lại"}" title="${option.status === "active" ? "Ngừng dùng" : "Dùng lại"}">${icon(option.status === "active" ? "archive" : "check")}</button></div>`}
          </div>`).join("") : `<div class="empty">Chưa có ${productOptionLabels[type].toLowerCase()}.</div>`}</div>
      </div>`;
  }

  function updateProductPricingPreview(form) {
    const preview = form && form.querySelector("[data-product-pricing-preview]");
    if (!preview) return;
    const costPrice = Math.max(0, Number(form.elements.costPrice && form.elements.costPrice.value || 0));
    const salePrice = Math.max(0, Number(form.elements.salePrice && form.elements.salePrice.value || 0));
    const grossProfit = salePrice - costPrice;
    const margin = salePrice > 0 ? grossProfit / salePrice * 100 : 0;
    const markup = costPrice > 0 ? grossProfit / costPrice * 100 : 0;
    preview.classList.toggle("has-warning", grossProfit <= 0 && salePrice > 0);
    preview.innerHTML = `<div><span>Lãi gộp / SP</span><strong>${money.format(grossProfit)}</strong></div><div><span>Biên lãi</span><strong>${margin.toFixed(1)}%</strong></div><div><span>Cộng trên vốn</span><strong>${markup.toFixed(1)}%</strong></div>`;
  }

  function renderProductForm(product) {
    const value = field => escapeAttribute(product ? product[field] : "");
    return `
      <div class="product-form-section full"><h3>Thông tin bán hàng</h3><p>Các trường dùng cho danh mục, kho và đơn hàng.</p></div>
      <div class="field"><label for="sku">SKU</label><input id="sku" name="sku" value="${value("sku")}" placeholder="AF-NEW-001" required /></div>
      <div class="field"><label for="name">Tên sản phẩm</label><input id="name" name="name" value="${value("name")}" placeholder="Bộ cọ vẽ chi tiết" required /></div>
      <div class="field"><label for="category">Danh mục</label><select id="category" name="category" required>${renderManagedProductSelect("category", product ? product.category : "")}</select></div>
      <div class="field"><label for="brand">Thương hiệu</label><select id="brand" name="brand">${renderManagedProductSelect("brand", product ? product.brand : "", { placeholder: "Không có thương hiệu" })}</select></div>
      <div class="field"><label for="barcode">Barcode / Mã vạch</label><input id="barcode" name="barcode" value="${value("barcode")}" placeholder="893..." /></div>
      <div class="field"><label for="unit">Đơn vị tính</label><select id="unit" name="unit" required>${renderManagedProductSelect("unit", product ? product.unit : "cái")}</select></div>
      <div class="field"><label for="costPrice">Giá vốn</label><input id="costPrice" name="costPrice" type="number" min="0" step="1000" value="${value("costPrice")}" required /></div>
      <div class="field"><label for="salePrice">Giá shop/offline hiện tại</label><input id="salePrice" name="salePrice" type="number" min="0" step="1000" value="${value("salePrice")}" placeholder="Có thể để trống và tính sau" /><small>Không bắt buộc khi tạo mới. Dùng Team Hub Pricing để tính và áp dụng giá chuẩn.</small></div>
      <div class="product-pricing-preview full" data-product-pricing-preview></div>
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
      <div class="field"><label for="contentOwner">Người phụ trách content</label><select id="contentOwner" name="contentOwner">${renderContentOwnerSelect(product ? product.contentOwner : "")}</select></div>
      <div class="field"><label for="contentStatus">Trạng thái content</label><select id="contentStatus" name="contentStatus">${Object.entries(productContentStatuses).map(([key, label]) => `<option value="${key}" ${(product ? product.contentStatus : "not_started") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field full"><label for="contentNote">Ghi chú content</label><textarea id="contentNote" name="contentNote" rows="3" placeholder="Yêu cầu hình ảnh, video, deadline, kênh ưu tiên...">${escapeHtml(product ? product.contentNote : "")}</textarea></div>
      <div class="product-form-section full"><h3>Link bán hàng và bài content</h3><p>Tập hợp nơi sản phẩm đang được bán hoặc đã xuất hiện để team tra cứu nhanh.</p></div>
      <div class="field"><label for="websiteProductUrl">Link sản phẩm Website</label><input id="websiteProductUrl" name="websiteProductUrl" type="url" value="${value("websiteProductUrl")}" placeholder="https://website.vn/san-pham/..." /></div>
      <div class="field"><label for="shopeeProductUrl">Link sản phẩm Shopee</label><input id="shopeeProductUrl" name="shopeeProductUrl" type="url" value="${value("shopeeProductUrl")}" placeholder="https://shopee.vn/..." /></div>
      <div class="field"><label for="tiktokProductUrl">Link sản phẩm TikTok Shop</label><input id="tiktokProductUrl" name="tiktokProductUrl" type="url" value="${value("tiktokProductUrl")}" placeholder="https://shop.tiktok.com/..." /></div>
      <div class="field"><label for="facebookProductUrl">Link sản phẩm Facebook</label><input id="facebookProductUrl" name="facebookProductUrl" type="url" value="${value("facebookProductUrl")}" placeholder="https://facebook.com/..." /></div>
      <div class="field full"><label for="contentPostLinks">Các bài đăng / video liên quan</label><textarea id="contentPostLinks" name="contentPostLinks" rows="5" placeholder="TikTok hướng dẫn sử dụng | https://...&#10;Facebook launch sản phẩm | https://...&#10;Video review YouTube | https://...">${escapeHtml(product ? product.contentPostLinks : "")}</textarea><small>Mỗi dòng một link. Có thể dùng định dạng Tên bài | URL hoặc chỉ nhập URL.</small></div>
      ${product ? `<div class="product-resource-note full">Link Google Docs và Drive được hệ thống quản lý riêng. Dùng nút <strong>Tạo tài nguyên</strong> trong màn hình chi tiết nếu sản phẩm chưa có link.</div>` : `<div class="product-resource-note full">Sau khi lưu, hệ thống sẽ tự tạo Google Docs và các folder ảnh/video nếu Script Properties đã được cấu hình.</div>`}
    `;
  }

  function productResourceLink(url, label) {
    return url ? `<a class="resource-link" href="${escapeAttribute(url)}" target="_blank" rel="noopener">${escapeHtml(label)} ${icon("external")}</a>` : `<span class="resource-missing">Chưa tạo</span>`;
  }

  function productImageUrl(url) {
    const value = String(url || "").trim();
    const driveMatch = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/i);
    return driveMatch ? `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w600` : value;
  }

  function parseProductContentLinks(value) {
    return String(value || "").split(/\r?\n/).map((line, index) => {
      const text = line.trim();
      if (!text) return null;
      const separator = text.lastIndexOf("|");
      const label = separator >= 0 ? text.slice(0, separator).trim() : `Bài content ${index + 1}`;
      const url = (separator >= 0 ? text.slice(separator + 1) : text).trim();
      return /^https?:\/\//i.test(url) ? { label: label || `Bài content ${index + 1}`, url } : null;
    }).filter(Boolean);
  }

  function renderProductDetail(product) {
    const image = product.imageUrl
      ? `<img class="product-detail-image" src="${escapeAttribute(productImageUrl(product.imageUrl))}" alt="${escapeAttribute(product.name)}" />`
      : `<div class="product-detail-image placeholder">Không có ảnh</div>`;
    const info = (label, value) => `<div><span>${label}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
    const postLinks = parseProductContentLinks(product.contentPostLinks);
    const hasShopPrice = productHasShopPrice(product);
    const priceStatus = productPriceStatus(product);
    const channelPrices = productChannelPrices(product.id);
    const shopPriceLabel = hasShopPrice ? money.format(product.salePrice) : "Chưa có giá shop/offline";
    const grossProfit = productGrossProfit(product);
    const margin = productMarginRate(product);
    const markup = hasShopPrice && Number(product.costPrice || 0) > 0 ? grossProfit / Number(product.costPrice) * 100 : 0;
    const channelPriceBlock = channelPrices.length
      ? `<div class="price-channel-list full">${channelPrices.map(entry => `<span class="price-channel-chip"><b>${escapeHtml(entry.channelName || entry.channelCode || "Kênh bán")}</b>${money.format(entry.channelPrice || entry.price || 0)}</span>`).join("")}</div>`
      : `<p class="resource-empty-copy full">Chưa có giá riêng theo kênh bán.</p>`;
    return `
      <div class="product-detail-hero full">${image}<div><span class="badge ${product.status}">${statusLabel(product.status)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</p><b>${shopPriceLabel}</b><span class="price-status ${priceStatus.key}">${priceStatus.label}</span>${canManageProducts() ? `<div class="product-detail-actions"><button class="button info" type="button" data-edit-product-from-detail="${escapeAttribute(product.id)}">Sửa sản phẩm</button><button class="button ghost" type="button" data-open-pricing-for-product="${escapeAttribute(product.id)}">Tính giá</button></div>` : ""}</div></div>
      <section class="product-detail-section full"><h3>Thông tin sản phẩm</h3><div class="product-detail-grid">
        ${info("Barcode", product.barcode)}${info("Đơn vị", product.unit)}${info("Giá vốn", money.format(product.costPrice))}${info("Giá shop/offline", shopPriceLabel)}
        ${info("Lãi gộp / sản phẩm", hasShopPrice ? money.format(grossProfit) : "Chờ tính giá")}${info("Biên lãi", hasShopPrice ? `${margin.toFixed(1)}%` : "—")}${info("Tỷ lệ cộng trên vốn", hasShopPrice ? `${markup.toFixed(1)}%` : "—")}${info("Tồn kho", `${product.stock} / cảnh báo ${product.lowStock}`)}
        ${info("Khối lượng", product.weightGrams ? `${product.weightGrams} g` : "")}${info("Kích thước", product.dimensions)}${info("Xuất xứ", product.origin)}${info("Chất liệu", product.material)}
        ${info("Tạo lúc", formatDateTime(product.createdAt))}${info("Cập nhật lúc", formatDateTime(product.updatedAt))}
        ${channelPriceBlock}
      </div></section>
      <section class="product-detail-section full"><h3>Content</h3><div class="product-detail-grid">${info("Trạng thái", productContentStatuses[product.contentStatus])}${info("Phụ trách", product.contentOwner)}${info("Đối tượng", product.targetAudience)}${info("Từ khóa", product.seoKeywords)}</div>
        <div class="product-copy-block"><span>Mô tả ngắn</span><p>${escapeHtml(product.shortDescription || "Chưa có mô tả.")}</p></div>
        <div class="product-copy-block"><span>Điểm nổi bật / USP</span><p>${escapeHtml(product.keyFeatures || "Chưa có nội dung.").replace(/\n/g, "<br>")}</p></div>
        <div class="product-copy-block"><span>Ghi chú</span><p>${escapeHtml(product.contentNote || "Chưa có ghi chú.").replace(/\n/g, "<br>")}</p></div>
      </section>
      <section class="product-detail-section full"><h3>Kênh bán và bài content</h3><div class="product-resource-grid">
        ${productResourceLink(product.websiteProductUrl, "Sản phẩm trên Website")}${productResourceLink(product.shopeeProductUrl, "Sản phẩm trên Shopee")}${productResourceLink(product.tiktokProductUrl, "Sản phẩm trên TikTok Shop")}${productResourceLink(product.facebookProductUrl, "Sản phẩm trên Facebook")}
      </div>${postLinks.length ? `<div class="product-post-links">${postLinks.map(link => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener"><span>${escapeHtml(link.label)}</span><small>${escapeHtml(link.url)}</small></a>`).join("")}</div>` : `<p class="resource-empty-copy">Chưa có link bài đăng hoặc video liên quan.</p>`}</section>
      <section class="product-detail-section full"><h3>Tài nguyên Google</h3><div class="product-resource-grid">
        ${productResourceLink(product.contentDocUrl, "Google Docs mô tả")}${productResourceLink(product.mediaFolderUrl, "Folder sản phẩm")}${productResourceLink(product.imageFolderUrl, "Folder hình ảnh")}${productResourceLink(product.videoFolderUrl, "Folder video")}
      </div>${canManageProducts() && (!product.contentDocUrl || !product.mediaFolderUrl || !product.imageFolderUrl || !product.videoFolderUrl) ? `<button class="button ghost" type="button" data-provision-product="${product.id}">Bổ sung tài nguyên còn thiếu</button>` : ""}</section>
    `;
  }

  function productSearchText(product) {
    return normalizeSearchText(`${product.sku} ${product.name} ${product.category} ${product.brand || ""} ${product.barcode || ""}`);
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase();
  }

  function productImageDisplayUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/drive\.google\.com|docs\.google\.com/i.test(value)) {
      const idMatch = value.match(/[-\w]{20,}/);
      if (idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w320`;
    }
    return value;
  }

  function renderProductThumb(product, className = "product-thumb") {
    const imageUrl = productImageDisplayUrl(product && product.imageUrl);
    if (imageUrl) {
      return `<span class="${className} product-thumb-has-image"><img src="${escapeAttribute(imageUrl)}" alt="" loading="lazy" onload="this.closest('.product-thumb, .cart-product-thumb').classList.add('image-loaded');" onerror="this.closest('.product-thumb, .cart-product-thumb').classList.add('image-error'); this.remove();" /><span class="product-thumb-fallback">${icon("image")}</span></span>`;
    }
    return `<span class="${className} product-thumb-empty"><span class="product-thumb-fallback">${icon("image")}</span></span>`;
  }

  function renderProductPicker() {
    const products = state.products
      .filter(product => product.status === "active")
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));
    const categories = Array.from(new Set(products.map(product => String(product.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const brands = Array.from(new Set(products.map(product => String(product.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

    return `
      <div class="product-picker">
        <div class="product-picker-toolbar">
          <label class="search-box product-picker-search">
            ${icon("search")}
            <input type="search" placeholder="Tìm SKU, tên, danh mục, hãng, mã vạch..." data-product-picker-search />
          </label>
          <span class="pill" data-product-picker-count>${products.length} sản phẩm</span>
        </div>
        <div class="product-picker-filters">
          <select data-product-picker-filter="category"><option value="">Tất cả danh mục</option>${categories.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}</select>
          <select data-product-picker-filter="brand"><option value="">Tất cả hãng</option>${brands.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}</select>
          <select data-product-picker-filter="stock"><option value="">Tất cả tồn kho</option><option value="available">Còn hàng</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select>
          <select data-product-picker-sort><option value="name">Tên A-Z</option><option value="stock">Tồn kho nhiều</option><option value="priceAsc">Giá thấp</option><option value="priceDesc">Giá cao</option><option value="margin">Biên lãi cao</option></select>
          <button class="button ghost icon-only" type="button" data-reset-product-picker aria-label="Làm mới" title="Làm mới">${icon("refresh")}</button>
        </div>
        <div class="product-picker-list" data-product-picker-list>
          ${products.map(renderProductPickerCardV2).join("")}
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
          <strong>${productHasShopPrice(product) ? money.format(product.salePrice) : "Chưa có giá"}</strong>
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
          <small>${product.sku} · ${productHasShopPrice(product) ? money.format(product.salePrice) : "Chưa có giá"} · tồn ${product.stock}</small>
          <input type="hidden" name="productId" value="${product.id}" data-order-product required />
        </div>
        <div class="field compact-field">
          <label>Số lượng</label>
          <input name="quantity" data-order-quantity type="number" min="1" value="1" required />
        </div>
        <button class="icon-button" type="button" data-remove-order-item aria-label="Xóa dòng">${icon("close")}</button>
      </div>
    `;
  }

  function renderProductPickerCardV2(product) {
    const stockClass = product.stock <= 0 ? "draft" : (product.stock <= product.lowStock ? "low" : "active");
    const disabled = product.stock <= 0 ? "disabled" : "";
    const margin = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0;
    const stockState = product.stock <= 0 ? "out" : (product.stock <= product.lowStock ? "low" : "available");
    return `
      <button class="product-card product-card-rich" type="button" data-product-picker-card data-add-product-to-order="${product.id}" data-product-search="${escapeAttribute(productSearchText(product))}" data-category="${escapeAttribute(product.category || "")}" data-brand="${escapeAttribute(product.brand || "")}" data-stock-state="${stockState}" data-name="${escapeAttribute(product.name || "")}" data-price="${Number(product.salePrice || 0)}" data-stock="${Number(product.stock || 0)}" data-margin="${margin}" ${disabled}>
        ${renderProductThumb(product)}
        <span class="product-card-main">
          <strong>${escapeHtml(product.name)}</strong>
          <small>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small>
          <span class="product-card-tags"><em>${productHasShopPrice(product) ? money.format(product.salePrice) : "Chưa có giá"}</em><small>${productHasShopPrice(product) ? `Biên ${margin}%` : "Nhập giá khi bán"}</small></span>
        </span>
        <span class="product-card-side">
          <small class="badge ${stockClass}">${product.stock} còn</small>
          <small>Vốn ${money.format(product.costPrice)}</small>
        </span>
      </button>
    `;
  }

  function renderOrderItemRowV2(productId, values = {}) {
    const product = byId("products", productId) || state.products.find(item => item.status === "active");
    if (!product) return "";
    const quantity = Number(values.quantity || 1);
    const unitPrice = Number(values.unitPrice === undefined ? product.salePrice : values.unitPrice);
    const discountPercent = clampNumber(values.discountPercent || 0, 0, 100);
    const lineTotal = Math.max(0, quantity * unitPrice * (1 - discountPercent / 100));

    return `
      <div class="order-item-row order-sale-item" data-order-item-row>
        ${renderProductThumb(product, "cart-product-thumb")}
        <div class="cart-product-summary">
          <strong>${escapeHtml(product.name)}</strong>
          <small>${escapeHtml(product.sku)} · Giá gốc ${productHasShopPrice(product) ? money.format(product.salePrice) : "chưa có"} · tồn ${product.stock}</small>
          <input type="hidden" name="productId" value="${product.id}" data-order-product required />
        </div>
        <div class="field compact-field">
          <label>Số lượng</label>
          <input name="quantity" data-order-quantity type="number" min="1" max="${Math.max(1, product.stock)}" value="${quantity}" required />
        </div>
        <div class="field compact-field">
          <label>Giá bán</label>
          <input name="unitPrice" data-order-price type="number" min="0" step="1000" value="${unitPrice}" required />
        </div>
        <div class="field compact-field">
          <label>Giảm %</label>
          <input name="lineDiscountPercent" data-order-line-discount type="number" min="0" max="100" step="0.1" value="${discountPercent}" />
        </div>
        <div class="order-line-total"><span>Thành tiền</span><strong data-order-line-total>${money.format(lineTotal)}</strong></div>
        <button class="icon-button" type="button" data-remove-order-item aria-label="Xóa dòng">${icon("close")}</button>
      </div>
    `;
  }

  function filterProductPicker(source) {
    const panel = source && source.closest(".product-picker");
    if (!panel) return;
    const term = normalizeSearchText(panel.querySelector("[data-product-picker-search]")?.value || "");
    const category = String(panel.querySelector('[data-product-picker-filter="category"]')?.value || "");
    const brand = String(panel.querySelector('[data-product-picker-filter="brand"]')?.value || "");
    const price = String(panel.querySelector('[data-product-picker-filter="price"]')?.value || "");
    const stock = String(panel.querySelector('[data-product-picker-filter="stock"]')?.value || "");
    const sort = String(panel.querySelector("[data-product-picker-sort]")?.value || "name");
    const list = panel.querySelector("[data-product-picker-list]");
    const cards = [...panel.querySelectorAll("[data-product-picker-card], [data-add-product-to-order]")];
    cards.sort(function (a, b) {
      if (sort === "stock") return Number(b.dataset.stock || 0) - Number(a.dataset.stock || 0);
      if (sort === "priceAsc") return Number(a.dataset.price || 0) - Number(b.dataset.price || 0);
      if (sort === "priceDesc") return Number(b.dataset.price || 0) - Number(a.dataset.price || 0);
      if (sort === "margin") return Number(b.dataset.margin || 0) - Number(a.dataset.margin || 0);
      return String(a.dataset.name || "").localeCompare(String(b.dataset.name || ""));
    });
    if (list) cards.forEach(card => list.appendChild(card));
    let visible = 0;
    cards.forEach(card => {
      const matched = (!term || card.dataset.productSearch.indexOf(term) !== -1) &&
        (!category || card.dataset.category === category) &&
        (!brand || card.dataset.brand === brand) &&
        (!price || card.dataset.priceState === price) &&
        (!stock || card.dataset.stockState === stock);
      card.hidden = !matched;
      if (matched) visible += 1;
    });
    const count = panel.querySelector("[data-product-picker-count]");
    if (count) count.textContent = `${visible} sản phẩm`;
    const empty = panel.querySelector("[data-product-picker-empty]");
    if (empty) empty.hidden = visible > 0;
  }

  function resetProductPicker(panel) {
    if (!panel) return;
    const search = panel.querySelector("[data-product-picker-search]");
    if (search) search.value = "";
    panel.querySelectorAll("[data-product-picker-filter]").forEach(control => {
      control.value = "";
    });
    const sort = panel.querySelector("[data-product-picker-sort]");
    if (sort) sort.value = "name";
    filterProductPicker(search || panel);
  }

  function addProductToOrder(form, productId) {
    const product = byId("products", productId);
    const list = form && form.querySelector("[data-order-items]");
    if (!product || !list) return;
    if (!productHasShopPrice(product)) {
      showToast("Sản phẩm chưa có giá bán. Hãy nhập giá bán trực tiếp trong giỏ trước khi lưu đơn.", "warning");
    }

    const existing = [...list.querySelectorAll("[data-order-item-row]")].find(row => row.querySelector("[data-order-product]").value === product.id);
    if (existing) {
      const quantity = existing.querySelector("[data-order-quantity]");
      quantity.value = Number(quantity.value || 0) + 1;
    } else {
      list.insertAdjacentHTML("beforeend", renderOrderItemRowV2(product.id));
    }
    updateOrderTotalPreviewV2(form);
  }

  function renderInventoryProductOptions() {
    return state.products
      .filter(product => product.status === "active")
      .map(product => `<option value="${product.id}">${product.sku} · ${product.name} (${product.stock} hiện có)</option>`)
      .join("");
  }

  function renderInventoryProductOptionsV2(selectedId = "") {
    return state.products
      .filter(product => product.status === "active")
      .map(product => `<option value="${product.id}" ${product.id === selectedId ? "selected" : ""}>${product.sku} · ${product.name} (${product.stock} hiện có)</option>`)
      .join("");
  }

  function renderOptions(options, selected = "") {
    return Object.entries(options).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  }

  function renderAccountingAccountOptions(selectedId = "") {
    return (state.accountingAccounts || [])
      .filter(account => account.status === "active")
      .map(account => `<option value="${account.id}" ${account.id === selectedId ? "selected" : ""}>${account.name} · ${money.format(account.currentBalance)}</option>`)
      .join("");
  }

  function renderAccountingCategoryOptions(type, selectedId = "") {
    return (state.accountingCategories || [])
      .filter(category => category.status === "active" && category.type === type)
      .map(category => `<option value="${category.id}" ${category.id === selectedId ? "selected" : ""}>${category.name}</option>`)
      .join("");
  }

  function findAccountingCategoryByName(pattern, type = "expense") {
    return (state.accountingCategories || []).find(category => {
      return category.status === "active" && category.type === type && pattern.test(String(category.name || "").toLowerCase());
    }) || null;
  }

  function renderCashTransactionForm(transaction) {
    const today = localDateValue();
    const linked = Boolean(transaction && transaction.referenceType && transaction.referenceType !== "manual");
    if (linked) return `
      <div class="modal-summary full"><strong>${escapeHtml(transaction.description)}</strong><span>${formatDate(transaction.transactionDate)} · ${money.format(transaction.amount)} · Giao dịch liên kết ${escapeHtml(transaction.referenceType)}</span></div>
      <input type="hidden" name="id" value="${transaction.id}" />
      <div class="field full"><label for="documentUrl">Link chứng từ</label><input id="documentUrl" name="documentUrl" type="url" value="${escapeAttribute(transaction.documentUrl || "")}" placeholder="https://drive.google.com/..." /><small>Giao dịch liên kết chỉ cho bổ sung chứng từ. Muốn đổi số tiền cần xử lý từ chứng từ nguồn.</small></div>
    `;
    return `
      <input type="hidden" name="id" value="${transaction?.id || ""}" />
      <div class="field"><label for="type">Loại giao dịch</label><select id="type" name="type" required data-cash-type><option value="income" ${transaction?.type !== "expense" ? "selected" : ""}>Thu tiền</option><option value="expense" ${transaction?.type === "expense" ? "selected" : ""}>Chi tiền</option></select></div>
      <div class="field"><label for="transactionDate">Ngày ghi nhận</label><input id="transactionDate" name="transactionDate" type="date" value="${transaction?.transactionDate || today}" required /></div>
      <div class="field"><label for="accountId">Tài khoản tiền</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions(transaction?.accountId || "")}</select></div>
      <div class="field"><label for="categoryId">Danh mục</label><select id="categoryId" name="categoryId" required data-cash-category>${renderAccountingCategoryOptions(transaction?.type || "income", transaction?.categoryId || "")}</select></div>
      <div class="field"><label for="amount">Số tiền</label><input id="amount" name="amount" type="number" min="1" step="1" value="${transaction?.amount || ""}" placeholder="500000" required /></div>
      <div class="field"><label for="referenceId">Mã tham chiếu</label><input id="referenceId" name="referenceId" type="text" value="${escapeAttribute(transaction?.referenceId || "")}" placeholder="Mã đơn, phiếu chi..." /></div>
      <div class="field full"><label for="description">Nội dung</label><input id="description" name="description" type="text" value="${escapeAttribute(transaction?.description || "")}" placeholder="Thu tiền đơn hàng, chi nhập vật tư..." required /></div>
      <div class="field full"><label for="documentUrl">Link chứng từ</label><input id="documentUrl" name="documentUrl" type="url" value="${escapeAttribute(transaction?.documentUrl || "")}" placeholder="https://drive.google.com/file/..." /><small>Link hóa đơn, biên nhận, ảnh phiếu hoặc file trên Drive.</small></div>
    `;
  }

  function renderPayrollExpenseForm() {
    const today = localDateValue();
    const salaryCategory = findAccountingCategoryByName(/lương|luong|cộng tác viên|cong tac vien|nhân sự|nhan su|payroll/i, "expense")
      || (state.accountingCategories || []).find(category => category.status === "active" && category.type === "expense");
    const staffOptions = (staffUsers || [])
      .filter(user => user.status !== "deleted")
      .map(user => `<option value="${escapeAttribute(user.name || user.email)}">${escapeHtml(user.name || user.email)}</option>`)
      .join("");
    return `
      <div class="modal-summary full">
        <strong>Tính lương nhanh</strong>
        <span>Ghi một khoản chi lương, hoa hồng hoặc cộng tác viên vào sổ quỹ.</span>
      </div>
      <div class="field"><label for="transactionDate">Ngày ghi nhận</label><input id="transactionDate" name="transactionDate" type="date" value="${today}" required /></div>
      <div class="field"><label for="staffName">Nhân sự</label><select id="staffName" name="staffName"><option value="">Không gắn nhân sự</option>${staffOptions}</select></div>
      <div class="field"><label for="accountId">Tài khoản chi</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục chi</label><select id="categoryId" name="categoryId" required>${renderAccountingCategoryOptions("expense", salaryCategory ? salaryCategory.id : "")}</select></div>
      <div class="field"><label for="baseSalary">Lương cơ bản</label><input id="baseSalary" name="baseSalary" type="number" min="0" step="1000" value="0" data-payroll-money /></div>
      <div class="field"><label for="commission">Hoa hồng</label><input id="commission" name="commission" type="number" min="0" step="1000" value="0" data-payroll-money /></div>
      <div class="field"><label for="bonus">Thưởng / phụ cấp</label><input id="bonus" name="bonus" type="number" min="0" step="1000" value="0" data-payroll-money /></div>
      <div class="field"><label for="deduction">Khấu trừ</label><input id="deduction" name="deduction" type="number" min="0" step="1000" value="0" data-payroll-money /></div>
      <div class="reconciliation-preview full payroll-preview">
        <span><small>Tổng chi lương</small><b data-payroll-total>${money.format(0)}</b></span>
        <span><small>Phân loại</small><b>Chi phí vận hành</b></span>
        <span><small>Ghi vết</small><b>Sổ quỹ</b></span>
      </div>
      <div class="field full"><label for="description">Ghi chú</label><input id="description" name="description" type="text" placeholder="Lương tháng, ca làm, hoa hồng bán hàng..." /></div>
    `;
  }

  function payrollFormTotal(form) {
    if (!form) return 0;
    const data = Object.fromEntries(new FormData(form));
    return Math.max(0, Number(data.baseSalary || 0) + Number(data.commission || 0) + Number(data.bonus || 0) - Number(data.deduction || 0));
  }

  function updatePayrollPreview(form) {
    if (!form) return;
    const output = form.querySelector("[data-payroll-total]");
    if (output) output.textContent = money.format(payrollFormTotal(form));
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
      <div class="modal-summary full reconciliation-help"><strong>Đối soát không tự đổi số dư nếu chỉ lưu biên bản.</strong><span>Bật cân bằng số dư khi bạn muốn hệ thống tạo thu/chi điều chỉnh đúng bằng phần chênh lệch.</span></div>
      <div class="field full"><label for="accountId">Tài khoản đối soát</label><select id="accountId" name="accountId" required data-reconciliation-account>${activeAccounts.map(item => `<option value="${item.id}" ${selectedAccount && item.id === selectedAccount.id ? "selected" : ""}>${item.name} · ${money.format(item.currentBalance)}</option>`).join("")}</select></div>
      <div class="field"><label for="reconciledAt">Ngày đối soát</label><input id="reconciledAt" name="reconciledAt" type="date" value="${today}" required /></div>
      <div class="field"><label for="actualBalance">Số dư thực tế</label><input id="actualBalance" name="actualBalance" type="number" step="1000" value="${selectedAccount ? selectedAccount.currentBalance : 0}" required data-reconciliation-actual /></div>
      <div class="reconciliation-preview full" data-reconciliation-preview>
        <span><small>Số dư sổ</small><b data-reconciliation-system>${money.format(selectedAccount ? selectedAccount.currentBalance : 0)}</b></span>
        <span><small>Số dư thực tế</small><b data-reconciliation-actual-output>${money.format(selectedAccount ? selectedAccount.currentBalance : 0)}</b></span>
        <span><small>Chênh lệch</small><b data-reconciliation-difference>${money.format(0)}</b></span>
        <span><small>Sau khi lưu</small><b data-reconciliation-action>Chỉ ghi nhận</b></span>
      </div>
      <label class="toggle-card full reconciliation-adjust-toggle">
        <input type="checkbox" name="adjustBalance" data-reconciliation-adjust />
        <span><strong>Tạo giao dịch điều chỉnh để cân bằng số dư</strong><small>Nếu thực tế cao hơn sẽ tạo phiếu thu; nếu thấp hơn sẽ tạo phiếu chi. Có thể bỏ trống để chỉ lưu lịch sử đối soát.</small></span>
      </label>
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
    const actionOutput = form.querySelector("[data-reconciliation-action]");
    const preview = form.querySelector("[data-reconciliation-preview]");
    const adjustInput = form.querySelector("[data-reconciliation-adjust]");
    const shouldAdjust = Boolean(adjustInput && adjustInput.checked && difference !== 0);
    if (systemOutput) systemOutput.textContent = money.format(systemBalance);
    if (actualOutput) actualOutput.textContent = money.format(actualBalance);
    if (differenceOutput) differenceOutput.textContent = `${difference > 0 ? "+" : ""}${money.format(difference)}`;
    if (actionOutput) {
      actionOutput.textContent = difference === 0
        ? "Đã khớp"
        : shouldAdjust
          ? (difference > 0 ? `Tạo thu ${money.format(difference)}` : `Tạo chi ${money.format(Math.abs(difference))}`)
          : "Chỉ ghi nhận";
    }
    if (preview) preview.classList.toggle("has-difference", difference !== 0);
    if (preview) preview.classList.toggle("will-adjust", shouldAdjust);
  }

  function renderAccountingCategoryForm(category, defaultType = "expense") {
    const selectedType = category ? category.type : defaultType;
    return `
      <div class="field"><label for="name">Tên danh mục</label><input id="name" name="name" type="text" placeholder="Phí sàn, văn phòng phẩm, thu hoàn COD..." value="${category ? category.name : ""}" required /></div>
      <div class="field"><label for="type">Loại</label><select id="type" name="type" required><option value="expense" ${selectedType === "expense" ? "selected" : ""}>Chi</option><option value="income" ${selectedType === "income" ? "selected" : ""}>Thu</option></select></div>
    `;
  }

  function renderPlatformPayoutForm(payout) {
    const marketplace = (state.salesChannels || []).filter(channel => channel.status === "active" && channel.type === "marketplace");
    const channelOptions = marketplace.length ? marketplace : [
      { id:"shopee",code:"shopee",name:"Shopee" }, { id:"tiktok",code:"tiktok",name:"TikTok Shop" }, { id:"lazada",code:"lazada",name:"Lazada" }
    ];
    const selectedChannel = payout?.channelId || payout?.channelCode || "";
    return `
      <input type="hidden" name="id" value="${escapeAttribute(payout?.id || "")}" />
      <div class="field"><label for="channelId">Sàn bán hàng</label><select id="channelId" name="channelId" required>${channelOptions.map(channel => `<option value="${escapeAttribute(channel.id)}" data-code="${escapeAttribute(channel.code)}" ${[channel.id,channel.code].includes(selectedChannel) ? "selected" : ""}>${escapeHtml(channel.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="payoutCode">Mã payout / kỳ thanh toán</label><input id="payoutCode" name="payoutCode" value="${escapeAttribute(payout?.payoutCode || "")}" placeholder="SPX-202607-001" required /></div>
      <div class="field"><label for="periodStart">Từ ngày</label><input id="periodStart" name="periodStart" type="date" value="${payout?.periodStart || localDateValue()}" required /></div>
      <div class="field"><label for="periodEnd">Đến ngày</label><input id="periodEnd" name="periodEnd" type="date" value="${payout?.periodEnd || localDateValue()}" required /></div>
      <div class="field"><label for="payoutDate">Ngày tiền về</label><input id="payoutDate" name="payoutDate" type="date" value="${payout?.payoutDate || localDateValue()}" required /></div>
      <div class="field"><label for="accountId">Tài khoản nhận</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions(payout?.accountId || "")}</select></div>
      <div class="field"><label for="grossAmount">Doanh thu gộp</label><input id="grossAmount" name="grossAmount" type="number" min="0" step="1" value="${payout?.grossAmount || 0}" /></div>
      <div class="field"><label for="totalFees">Tổng phí sàn</label><input id="totalFees" name="totalFees" type="number" min="0" step="1" value="${payout?.totalFees || 0}" /></div>
      <div class="field"><label for="totalRefunds">Hoàn / trả</label><input id="totalRefunds" name="totalRefunds" type="number" min="0" step="1" value="${payout?.totalRefunds || 0}" /></div>
      <div class="field"><label for="expectedAmount">Tiền dự kiến</label><input id="expectedAmount" name="expectedAmount" type="number" min="0" step="1" value="${payout?.expectedAmount || 0}" required /></div>
      <div class="field"><label for="actualAmount">Tiền thực nhận</label><input id="actualAmount" name="actualAmount" type="number" min="0" step="1" value="${payout?.actualAmount || 0}" required /></div>
      <div class="field"><label for="status">Trạng thái</label><select id="status" name="status"><option value="draft">Chờ đối soát</option><option value="matched" ${payout?.status === "matched" ? "selected" : ""}>Đã khớp</option><option value="mismatch" ${payout?.status === "mismatch" ? "selected" : ""}>Đang lệch</option></select></div>
      <div class="field"><label for="sourceFileName">Tên file nguồn</label><input id="sourceFileName" name="sourceFileName" value="${escapeAttribute(payout?.sourceFileName || "")}" placeholder="doi-soat-shopee.xlsx" /></div>
      <div class="field"><label for="sourceFileUrl">Link file Drive</label><input id="sourceFileUrl" name="sourceFileUrl" type="url" value="${escapeAttribute(payout?.sourceFileUrl || "")}" placeholder="https://drive.google.com/..." /></div>
      <div class="field full"><label for="note">Ghi chú</label><textarea id="note" name="note" rows="2">${escapeHtml(payout?.note || "")}</textarea></div>
    `;
  }

  function renderPlatformPayoutDetail(payout) {
    const meta = payoutStatusMeta(payout.status);
    return `<div class="payout-detail full"><div class="modal-summary"><strong>${escapeHtml(commerceChannelLabel(payout.channelId || payout.channelCode))} · ${escapeHtml(payout.payoutCode)}</strong><span>${formatDate(payout.periodStart)} - ${formatDate(payout.periodEnd)} · <span class="badge ${meta[1]}">${meta[0]}</span></span></div><div class="payout-detail-kpis"><article><small>Dự kiến</small><strong>${money.format(payout.expectedAmount)}</strong></article><article><small>Thực nhận</small><strong>${money.format(payout.actualAmount)}</strong></article><article><small>Chênh lệch</small><strong>${money.format(payout.difference)}</strong></article></div><div class="table-wrap"><table><thead><tr><th>Đơn</th><th>Tiền hàng</th><th>Dự kiến</th><th>Sàn trả</th><th>Lệch</th></tr></thead><tbody>${payout.items.length ? payout.items.map(item=>`<tr><td><strong>${escapeHtml(item.orderCode || item.platformOrderCode || "Chưa ghép")}</strong><small>${escapeHtml(item.status)}</small></td><td>${money.format(item.productTotal)}</td><td>${money.format(item.expectedNetAmount)}</td><td>${money.format(item.platformNetAmount)}</td><td>${money.format(item.difference)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">Chưa có dòng chi tiết.</td></tr>`}</tbody></table></div>${payout.sourceFileUrl ? `<a class="button ghost" href="${escapeAttribute(payout.sourceFileUrl)}" target="_blank" rel="noopener">${icon("external")} Mở file nguồn</a>` : ""}</div>`;
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

  function renderStockReceiveForm(selectedProductId = "") {
    const product = byId("products", selectedProductId) || state.products.find(item => item.status === "active");
    const summary = product ? `
      <div class="modal-summary full">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.sku)} · Tồn hiện tại ${Number(product.stock || 0)} · Ngưỡng ${Number(product.lowStock || 0)}</span>
      </div>` : "";
    return `
      ${summary}
      <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptionsV2(product ? product.id : selectedProductId)}</select></div>
      <div class="field"><label for="quantity">Số lượng nhập thêm</label><input id="quantity" name="quantity" type="number" min="1" step="1" value="${product ? Math.max(1, inventoryRestockSuggestion(product)) : 1}" required /></div>
      <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" value="Nhập kho bổ sung" placeholder="Nhập hàng từ nhà cung cấp" /></div>
    `;
  }

  function renderStockAdjustForm(selectedProductId = "") {
    const product = byId("products", selectedProductId) || state.products.find(item => item.status === "active");
    const summary = product ? `
      <div class="modal-summary full">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.sku)} · Tồn hệ thống ${Number(product.stock || 0)} · Ngưỡng ${Number(product.lowStock || 0)}</span>
      </div>` : "";
    return `
      ${summary}
      <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptionsV2(product ? product.id : selectedProductId)}</select></div>
      <div class="field"><label for="stock">Tồn thực tế sau kiểm</label><input id="stock" name="stock" type="number" min="0" step="1" value="${product ? Number(product.stock || 0) : 0}" required /></div>
      <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" value="Điều chỉnh kiểm kho" placeholder="Kiểm kho định kỳ, hàng lỗi, thất lạc..." /></div>
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
          <button class="link-button icon-only" type="button" data-add-order-item aria-label="Thêm dòng" title="Thêm dòng">${icon("plus")}</button>
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

  function updateOrderTotalPreviewV2(form) {
    if (!form) return { total: 0, items: [] };
    const rows = [...form.querySelectorAll("[data-order-item-row]")];
    let subtotal = 0;
    let lineDiscountTotal = 0;
    const items = rows.map(row => {
      const productId = row.querySelector("[data-order-product]")?.value || "";
      const product = byId("products", productId);
      const quantity = Math.max(0, Number(row.querySelector("[data-order-quantity]")?.value || 0));
      const unitPrice = Math.max(0, Number(row.querySelector("[data-order-price]")?.value || (product ? product.salePrice : 0)));
      const discountPercent = clampNumber(row.querySelector("[data-order-line-discount]")?.value || 0, 0, 100);
      const gross = quantity * unitPrice;
      const lineDiscount = Math.round(gross * discountPercent / 100);
      const lineTotal = Math.max(0, gross - lineDiscount);
      subtotal += lineTotal;
      lineDiscountTotal += lineDiscount;
      const output = row.querySelector("[data-order-line-total]");
      if (output) output.textContent = money.format(lineTotal);
      row.dataset.stockWarning = product && quantity > product.stock ? "true" : "false";
      return { productId, quantity, unitPrice, discountPercent, lineTotal };
    });

    const discountPercent = clampNumber(form.discountPercent?.value || 0, 0, 100);
    const percentDiscount = Math.round(subtotal * discountPercent / 100);
    const discount = Math.max(0, Number(form.discount?.value || 0));
    const shippingFee = Math.max(0, Number(form.shippingFee?.value || 0));
    const customer = byId("customers", form.customerId?.value || "");
    const availablePoints = loyaltyPointsForCustomer(customer);
    const maxPointDiscount = Math.floor(Math.max(0, subtotal - percentDiscount - discount) * loyaltyRules.maxRedeemRate);
    const maxRedeemPoints = Math.min(availablePoints, Math.floor(maxPointDiscount / loyaltyRules.pointValue));
    let loyaltyPointsUsed = Math.floor(Math.max(0, Number(form.loyaltyPointsUsed?.value || 0)));
    if (loyaltyPointsUsed > maxRedeemPoints) loyaltyPointsUsed = maxRedeemPoints;
    if (form.loyaltyPointsUsed && String(form.loyaltyPointsUsed.value) !== String(loyaltyPointsUsed)) form.loyaltyPointsUsed.value = String(loyaltyPointsUsed);
    const loyaltyDiscount = loyaltyPointsUsed * loyaltyRules.pointValue;
    const beforeRound = Math.max(0, subtotal - percentDiscount - discount - loyaltyDiscount + shippingFee);
    const roundingStep = Math.max(0, Number(form.roundingStep?.value || 0));
    const total = roundingStep ? Math.max(0, Math.round(beforeRound / roundingStep) * roundingStep) : beforeRound;
    const roundingAmount = total - beforeRound;
    const cashReceived = Math.max(0, Number(form.cashReceived?.value || 0));
    const changeAmount = Math.max(0, cashReceived - total);
    const earnedPoints = Math.floor(total / loyaltyRules.earnPerVnd);

    const outputs = {
      "[data-summary-subtotal]": subtotal,
      "[data-summary-line-discount]": lineDiscountTotal,
      "[data-summary-discount]": discount + percentDiscount,
      "[data-summary-loyalty]": loyaltyDiscount,
      "[data-summary-shipping]": shippingFee,
      "[data-summary-rounding]": roundingAmount,
      "[data-summary-total]": total,
      "[data-summary-received]": cashReceived,
      "[data-summary-change]": changeAmount
    };
    Object.entries(outputs).forEach(([selector, value]) => {
      const output = form.querySelector(selector);
      if (output) output.textContent = money.format(value);
    });
    const loyaltyStatus = form.querySelector("[data-loyalty-status]");
    if (loyaltyStatus) loyaltyStatus.textContent = customer
      ? `${availablePoints} điểm có sẵn · dùng tối đa ${maxRedeemPoints} điểm · đơn này cộng ${earnedPoints} điểm`
      : "Chọn khách hàng để xem điểm tích lũy.";
    const output = form.querySelector("[data-order-total]");
    if (output) output.textContent = `Tạm tính: ${money.format(subtotal)} · Thanh toán: ${money.format(total)}`;
    const emptyCart = form.querySelector("[data-order-empty-cart]");
    const cartCount = form.querySelector("[data-order-cart-count]");
    if (emptyCart) emptyCart.hidden = rows.length > 0;
    if (cartCount) cartCount.textContent = `${rows.length} dòng · ${money.format(total)}`;
    return { subtotal, discountPercent, discount, percentDiscount, shippingFee, loyaltyPointsUsed, loyaltyDiscount, roundingAmount, total, cashReceived, changeAmount, earnedPoints, items };
  }

  async function submitOrderForm(form) {
    const shouldPrint = Boolean(form.printAfterSave && form.printAfterSave.checked);
    const shouldSavePdf = Boolean(form.receiptPdf && form.receiptPdf.checked);
    const printWindow = shouldPrint ? openReceiptPrintWindow() : null;
    const data = Object.fromEntries(new FormData(form));
    const totals = updateOrderTotalPreviewV2(form);
    const customer = byId("customers", data.customerId);
    const items = [...form.querySelectorAll("[data-order-item-row]")].map(row => ({
      productId: row.querySelector("[data-order-product]").value,
      quantity: Number(row.querySelector("[data-order-quantity]").value),
      unitPrice: Number(row.querySelector("[data-order-price]")?.value || (byId("products", row.querySelector("[data-order-product]").value)?.salePrice || 0)),
      discountPercent: Number(row.querySelector("[data-order-line-discount]")?.value || 0)
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
        discountPercent: Number(data.discountPercent || 0),
        loyaltyPointsUsed: totals.loyaltyPointsUsed,
        loyaltyDiscount: totals.loyaltyDiscount,
        cashReceived: totals.cashReceived,
        changeAmount: totals.changeAmount,
        roundingAmount: totals.roundingAmount,
        shippingFee: Number(data.shippingFee || 0),
        note: data.note || "",
        items
      })
    });
    const savedOrder = saveOrderToState(dataFromApi.order);
    lastCreatedOrder = savedOrder;

    if (shouldPrint || shouldSavePdf) {
      try {
        lastCreatedOrder = await ensureOrderReceiptPdf(savedOrder, { force: true });
      } catch (error) {
        showToast(`Đã tạo đơn, nhưng chưa lưu được PDF hóa đơn: ${error.message}`, "error");
      }
    }

    await Promise.all([
      loadProducts({ quiet: true }),
      loadCustomers({ quiet: true })
    ]);

    window.ArtFlowPosStore.save(state);

    if (shouldPrint) {
      const printableOrder = lastCreatedOrder || savedOrder;
      if (printableOrder.receiptPdfUrl) {
        openReceiptPdf(printableOrder, printWindow);
      } else if (printWindow && !printWindow.closed) {
        printReceipt(printableOrder, printWindow);
      } else {
        showToast("Đơn đã được tạo nhưng cửa sổ in đã bị đóng hoặc bị chặn.", "error");
      }
    }

    renderPage();
    showToast("Đã tạo đơn và trừ tồn kho.");
    return lastCreatedOrder || savedOrder;
  }

  function saveOrderToState(order) {
    const normalized = normalizeOrder(order);
    const index = state.orders.findIndex(item => item.id === normalized.id);
    if (index >= 0) state.orders[index] = normalized;
    else state.orders.unshift(normalized);
    window.ArtFlowPosStore.save(state);
    return normalized;
  }

  async function ensureOrderReceiptPdf(order, options = {}) {
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (order.receiptPdfUrl && !options.force) return order;
    const response = await apiRequest("/orders/receipt-pdf", {
      method: "POST",
      body: JSON.stringify({ orderId: order.id, receiptSettings: getReceiptSettings() })
    });
    if (!response.order) throw new Error("Không nhận được thông tin hóa đơn PDF.");
    return saveOrderToState(response.order);
  }

  async function openOrCreateOrderReceiptPdf(order, options = {}) {
    const preparedOrder = await ensureOrderReceiptPdf(order, options);
    openReceiptPdf(preparedOrder, options.printWindow);
    renderPage();
    return preparedOrder;
  }

  function renderReceiptSettingsForm() {
    const settings = getReceiptSettings();
    return `
      <div class="field"><label for="storeName">Tên hiển thị trên phiếu</label><input id="storeName" name="storeName" value="${escapeAttribute(settings.storeName)}" required /></div>
      <div class="field"><label for="legalName">Tên pháp lý / hộ kinh doanh</label><input id="legalName" name="legalName" value="${escapeAttribute(settings.legalName)}" placeholder="Tên đăng ký kinh doanh hoặc tên hộ kinh doanh" /></div>
      <div class="field"><label for="paperSize">Khổ giấy</label><select id="paperSize" name="paperSize">
        <option value="thermal80" ${settings.paperSize === "thermal80" ? "selected" : ""}>Nhiệt 80mm - phổ biến POS</option>
        <option value="thermal58" ${settings.paperSize === "thermal58" || settings.paperWidth === "58" ? "selected" : ""}>Nhiệt 58mm - máy mini</option>
        <option value="thermal76" ${settings.paperSize === "thermal76" ? "selected" : ""}>Nhiệt 76mm</option>
        <option value="thermal112" ${settings.paperSize === "thermal112" ? "selected" : ""}>Nhiệt 112mm</option>
        <option value="a5" ${settings.paperSize === "a5" ? "selected" : ""}>A5</option>
        <option value="a4" ${settings.paperSize === "a4" ? "selected" : ""}>A4</option>
      </select></div>
      <div class="field"><label for="phone">Điện thoại</label><input id="phone" name="phone" value="${escapeAttribute(settings.phone)}" /></div>
      <div class="field"><label for="taxCode">Mã số thuế</label><input id="taxCode" name="taxCode" value="${escapeAttribute(settings.taxCode)}" /></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" value="${escapeAttribute(settings.email)}" /></div>
      <div class="field"><label for="website">Website / fanpage</label><input id="website" name="website" value="${escapeAttribute(settings.website)}" /></div>
      <div class="field"><label for="representative">Người đại diện</label><input id="representative" name="representative" value="${escapeAttribute(settings.representative)}" /></div>
      <div class="field"><label for="businessRegistration">Số ĐKKD / mã hộ KD</label><input id="businessRegistration" name="businessRegistration" value="${escapeAttribute(settings.businessRegistration)}" /></div>
      <div class="field full"><label for="storeInfo">Dòng mô tả</label><input id="storeInfo" name="storeInfo" value="${escapeAttribute(settings.storeInfo)}" /></div>
      <div class="field full"><label for="address">Địa chỉ</label><input id="address" name="address" value="${escapeAttribute(settings.address)}" /></div>
      <div class="field"><label for="bankName">Ngân hàng</label><input id="bankName" name="bankName" value="${escapeAttribute(settings.bankName)}" placeholder="VD: Vietcombank" /></div>
      <div class="field"><label for="bankAccount">Số tài khoản</label><input id="bankAccount" name="bankAccount" value="${escapeAttribute(settings.bankAccount)}" /></div>
      <div class="field"><label for="bankOwner">Chủ tài khoản</label><input id="bankOwner" name="bankOwner" value="${escapeAttribute(settings.bankOwner)}" /></div>
      <div class="field"><label for="invoiceSeries">Ký hiệu / mẫu hóa đơn</label><input id="invoiceSeries" name="invoiceSeries" value="${escapeAttribute(settings.invoiceSeries)}" placeholder="Nếu có hóa đơn điện tử" /></div>
      <div class="field full"><label for="footer">Lời cuối phiếu</label><input id="footer" name="footer" value="${escapeAttribute(settings.footer)}" /></div>
      <div class="field full"><label for="invoiceLegalNotice">Ghi chú pháp lý trên phiếu</label><textarea id="invoiceLegalNotice" name="invoiceLegalNotice" rows="3">${escapeHtml(settings.invoiceLegalNotice)}</textarea></div>
      <div class="field checkbox-field full">
        <label><input type="checkbox" name="showSku" ${settings.showSku ? "checked" : ""} /> Hiện SKU</label>
        <label><input type="checkbox" name="showCustomer" ${settings.showCustomer ? "checked" : ""} /> Hiện khách hàng</label>
        <label><input type="checkbox" name="showPoints" ${settings.showPoints ? "checked" : ""} /> Hiện điểm tích lũy</label>
        <label><input type="checkbox" name="showUnitPrice" ${settings.showUnitPrice ? "checked" : ""} /> Hiện đơn giá</label>
      </div>
      <div class="receipt-setting-note full">
        Theo Nghị định 123/2020/NĐ-CP, khi bán hàng hóa/dịch vụ người bán phải lập hóa đơn nếu thuộc trường hợp phải xuất hóa đơn. Phiếu POS trong ArtFlow giúp in nhanh và lưu chứng từ nội bộ; nếu cần hóa đơn điện tử hợp pháp, hãy dùng thông tin này để lập hóa đơn qua hệ thống hóa đơn điện tử đã đăng ký với cơ quan thuế.
      </div>
    `;
  }

  function receiptSettingsPayloadFromForm(form) {
    const data = Object.fromEntries(new FormData(form));
    return {
      storeName: String(data.storeName || "ArtFlow").trim(),
      legalName: String(data.legalName || data.storeName || "ArtFlow").trim(),
      storeInfo: String(data.storeInfo || "").trim(),
      phone: String(data.phone || "").trim(),
      email: String(data.email || "").trim(),
      website: String(data.website || "").trim(),
      taxCode: String(data.taxCode || "").trim(),
      address: String(data.address || "").trim(),
      bankName: String(data.bankName || "").trim(),
      bankAccount: String(data.bankAccount || "").trim(),
      bankOwner: String(data.bankOwner || "").trim(),
      representative: String(data.representative || "").trim(),
      businessRegistration: String(data.businessRegistration || "").trim(),
      invoiceSeries: String(data.invoiceSeries || "").trim(),
      invoiceLegalNotice: String(data.invoiceLegalNotice || "").trim(),
      footer: String(data.footer || "").trim(),
      paperSize: String(data.paperSize || "thermal80"),
      paperWidth: String(data.paperSize || "thermal80").replace("thermal", ""),
      showSku: Boolean(data.showSku),
      showCustomer: Boolean(data.showCustomer),
      showPoints: Boolean(data.showPoints),
      showUnitPrice: Boolean(data.showUnitPrice)
    };
  }

  function renderSettingsPreview(settings = getReceiptSettings()) {
    if (!els.settingsPreview) return;
    els.settingsPreview.innerHTML = `
      <div class="settings-preview-card">
        <span>Thông tin sẽ in trên chứng từ</span>
        <h3>${escapeHtml(settings.storeName)}</h3>
        <p>${escapeHtml(settings.legalName || settings.storeName)}</p>
        <p>${settings.taxCode ? `MST: ${escapeHtml(settings.taxCode)} · ` : ""}${escapeHtml(settings.phone || "Chưa có SĐT")}</p>
        <p>${escapeHtml(settings.address || "Chưa có địa chỉ")}</p>
        ${settings.email || settings.website ? `<p>${escapeHtml([settings.email, settings.website].filter(Boolean).join(" · "))}</p>` : ""}
        ${settings.bankAccount ? `<p>CK: ${escapeHtml(settings.bankAccount)} ${settings.bankName ? `- ${escapeHtml(settings.bankName)}` : ""}</p>` : ""}
      </div>
      <div class="settings-compliance-card">
        <strong>Lưu ý pháp lý</strong>
        <p>${escapeHtml(settings.invoiceLegalNotice)}</p>
      </div>
    `;
  }

  function renderSettingsPage() {
    if (!els.settingsForm) return;
    els.settingsForm.innerHTML = `${renderReceiptSettingsForm()}<div class="button-row"><button class="button primary" type="submit">${icon("check")} Lưu thông tin shop</button></div>`;
    renderSettingsPreview();
    enhanceMoneyInputs(els.settingsForm);
  }

  function receiptHtml(order) {
    const settings = getReceiptSettings();
    const profile = receiptPaperProfile(settings);
    const customer = getCustomer(order);
    const rows = (order.items || []).map(item => `
      <tr>
        <td><b>${escapeHtml(item.name)}</b>${settings.showSku ? `<small>SKU: ${escapeHtml(item.sku)}</small>` : ""}${settings.showUnitPrice ? `<small>Đơn giá: ${money.format(item.unitPrice)}${item.discountPercent ? ` · Giảm ${Number(item.discountPercent).toFixed(1)}%` : ""}</small>` : ""}</td>
        <td>${item.quantity}</td>
        ${profile.compact ? "" : `<td>${money.format(item.unitPrice)}</td>`}
        <td><b>${money.format(item.lineTotal)}</b></td>
      </tr>
    `).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(order.code)}</title><style>
      @page { size: ${profile.width}mm auto; margin: ${profile.margin}mm; }
      * { box-sizing: border-box; }
      body { width: ${profile.width - profile.margin * 2}mm; margin: 0; font: ${profile.font}px/1.35 Arial, sans-serif; color: #101828; }
      h1 { margin: 0 0 3px; font-size: ${profile.title}px; line-height: 1.15; text-align: center; letter-spacing: .04em; }
      p { margin: 2px 0; } .center { text-align: center; } .muted { color: #475467; }
      .title { margin-top: 8px; text-align: center; font-weight: 800; font-size: ${profile.title - 1}px; }
      .line { border-top: 1px dashed #667085; margin: 8px 0; }
      .info div, .totals div { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
      .info b, .totals b { text-align: right; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { background: #eef2f7; font-weight: 800; }
      th, td { padding: 4px 2px; vertical-align: top; text-align: right; border-bottom: 1px solid #eaecf0; }
      th:first-child, td:first-child { width: ${profile.compact ? 64 : 50}%; text-align: left; }
      th:nth-child(2), td:nth-child(2) { width: ${profile.compact ? 12 : 10}%; text-align: center; }
      small { display: block; margin-top: 2px; color: #475467; font-size: ${Math.max(9, profile.font - 1)}px; }
      .total { margin-top: 5px; padding: 6px; background: #eef2f7; font-weight: 800; font-size: ${profile.font + 2}px; }
      .footer { margin-top: 8px; text-align: center; color: #344054; }
    </style></head><body>
      <h1>${escapeHtml(settings.storeName).toUpperCase()}</h1><p class="center muted">${escapeHtml(settings.legalName || settings.storeName)}</p><p class="center muted">${escapeHtml(settings.storeInfo)}</p>
      ${settings.taxCode ? `<p class="center muted">MST: ${escapeHtml(settings.taxCode)}</p>` : ""}${settings.address ? `<p class="center muted">${escapeHtml(settings.address)}</p>` : ""}${settings.phone ? `<p class="center muted">ĐT: ${escapeHtml(settings.phone)}</p>` : ""}${settings.email ? `<p class="center muted">${escapeHtml(settings.email)}</p>` : ""}
      <div class="line"></div><div class="title">PHIẾU BÁN HÀNG</div>
      <div class="info"><div><span>Mã đơn</span><b>${escapeHtml(order.code)}</b></div><div><span>Thời gian</span><b>${escapeHtml(formatDateTime(order.createdAt || new Date().toISOString()))}</b></div><div><span>Kênh</span><b>${escapeHtml(channelLabel(order.channel))}</b></div><div><span>Thanh toán</span><b>${escapeHtml(order.paymentMethod || "cash")}</b></div>${settings.showCustomer ? `<div><span>Khách</span><b>${escapeHtml(customer.name || "Khách lẻ")}</b></div>${customer.phone ? `<div><span>SĐT khách</span><b>${escapeHtml(customer.phone)}</b></div>` : ""}` : ""}</div>
      <div class="line"></div><table><thead><tr><th>Sản phẩm</th><th>SL</th>${profile.compact ? "" : "<th>Đơn giá</th>"}<th>Tiền</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="line"></div><div class="totals">
        <div><span>Tạm tính</span><b>${money.format(order.subtotal)}</b></div>
        ${(order.discount || order.loyaltyDiscount) ? `<div><span>Giảm</span><b>${money.format(Number(order.discount || 0) + Number(order.loyaltyDiscount || 0))}</b></div>` : ""}
        ${order.shippingFee ? `<div><span>Phí giao hàng</span><b>${money.format(order.shippingFee)}</b></div>` : ""}
        ${order.roundingAmount ? `<div><span>Làm tròn</span><b>${money.format(order.roundingAmount)}</b></div>` : ""}
        <div class="total"><span>Tổng cộng</span><b>${money.format(order.total)}</b></div>
        ${order.cashReceived ? `<div><span>Tiền nhận</span><b>${money.format(order.cashReceived)}</b></div><div><span>Tiền thối</span><b>${money.format(order.changeAmount)}</b></div>` : ""}
        ${settings.showPoints ? `<div><span>Điểm dùng/cộng</span><b>${Number(order.loyaltyPointsUsed || 0)} / ${Math.floor(Number(order.total || 0) / loyaltyRules.earnPerVnd)}</b></div>` : ""}
      </div>${settings.bankAccount ? `<div class="line"></div><p class="center muted">CK: ${escapeHtml(settings.bankAccount)} ${settings.bankName ? `- ${escapeHtml(settings.bankName)}` : ""}${settings.bankOwner ? ` - ${escapeHtml(settings.bankOwner)}` : ""}</p>` : ""}<div class="line"></div><p class="footer">${escapeHtml(settings.footer)}</p><p class="center muted">${escapeHtml(settings.invoiceLegalNotice)}</p><p class="center muted">Khổ ${escapeHtml(settings.paperSize || settings.paperWidth || "80")}</p><script>window.onload=()=>{setTimeout(()=>window.print(),150)};</script>
    </body></html>`;
  }

  function purchaseOrderRows(order) {
    return (order.items || []).map((item, index) => ({
      index: index + 1,
      sku: item.sku || "",
      name: item.name || "",
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unitCost || 0),
      lineTotal: Number(item.lineTotal || 0)
    }));
  }

  function purchaseOrderPrintHtml(order) {
    const settings = getReceiptSettings();
    const supplier = getSupplier(order);
    const rows = purchaseOrderRows(order);
    const issuedAt = formatDateTime(order.createdAt || new Date().toISOString());
    const receivedAt = order.receivedAt ? formatDateTime(order.receivedAt) : "";
    const rowHtml = rows.map(item => `
      <tr>
        <td>${item.index}</td>
        <td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></td>
        <td>${item.quantity}</td>
        <td>${money.format(item.unitCost)}</td>
        <td>${money.format(item.lineTotal)}</td>
      </tr>
    `).join("");
    return `<!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(order.code)} - Phiếu mua hàng</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #0f172a; font: 12px/1.45 Arial, sans-serif; background: #fff; }
            h1, h2, h3, p { margin: 0; }
            .sheet { width: 100%; }
            .top { display: grid; grid-template-columns: 1.15fr .85fr; gap: 18px; align-items: start; padding-bottom: 14px; border-bottom: 2px solid #0f172a; }
            .brand h1 { font-size: 22px; letter-spacing: .04em; text-transform: uppercase; }
            .brand p { margin-top: 4px; color: #475569; }
            .doc-title { text-align: right; }
            .doc-title h2 { font-size: 24px; text-transform: uppercase; }
            .doc-title strong { display: inline-block; margin-top: 6px; padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-size: 15px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
            .box { border: 1px solid #dbe3ef; border-radius: 10px; padding: 10px 12px; min-height: 84px; background: #fbfdff; }
            .box span { display: block; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .box strong { display: block; margin-top: 5px; font-size: 14px; }
            .box p { margin-top: 3px; color: #334155; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th { background: #eaf2ff; color: #1e3a8a; font-size: 11px; text-transform: uppercase; }
            th, td { padding: 8px 7px; border: 1px solid #dbe3ef; vertical-align: top; text-align: right; }
            th:nth-child(1), td:nth-child(1) { width: 42px; text-align: center; }
            th:nth-child(2), td:nth-child(2) { width: auto; text-align: left; }
            th:nth-child(3), td:nth-child(3) { width: 72px; text-align: center; }
            th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { width: 120px; }
            td small { display: block; margin-top: 3px; color: #64748b; }
            .summary { width: 45%; margin-left: auto; margin-top: 14px; border: 1px solid #dbe3ef; border-radius: 10px; overflow: hidden; }
            .summary div { display: flex; justify-content: space-between; gap: 16px; padding: 8px 10px; border-bottom: 1px solid #e5edf7; }
            .summary div:last-child { border-bottom: 0; }
            .summary .total { background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; }
            .note { margin-top: 14px; padding: 10px 12px; border: 1px dashed #94a3b8; border-radius: 10px; min-height: 46px; color: #334155; }
            .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; margin-top: 26px; page-break-inside: avoid; }
            .signature { min-height: 112px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 10px; }
            .signature strong { display: block; font-size: 14px; text-transform: uppercase; }
            .signature small { display: block; margin-top: 4px; color: #64748b; }
            .signature em { display: block; margin-top: 58px; color: #475569; font-style: normal; }
            .print-meta { margin-top: 18px; color: #64748b; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <main class="sheet">
            <section class="top">
              <div class="brand"><h1>${escapeHtml(settings.storeName || "ArtFlow POS")}</h1><p>${escapeHtml(settings.legalName || settings.storeName || "ArtFlow POS")}</p><p>${settings.taxCode ? `MST: ${escapeHtml(settings.taxCode)} · ` : ""}${escapeHtml(settings.phone || "")}</p><p>${escapeHtml(settings.address || "")}</p></div>
              <div class="doc-title"><h2>Phiếu mua hàng</h2><strong>${escapeHtml(order.code)}</strong></div>
            </section>
            <section class="info-grid">
              <div class="box"><span>Bên bán / nhà cung cấp</span><strong>${escapeHtml(supplier.name || "Chưa chọn")}</strong><p>${escapeHtml([supplier.code, supplier.phone, supplier.email].filter(Boolean).join(" · "))}</p><p>${escapeHtml(supplier.address || "")}</p></div>
              <div class="box"><span>Bên mua</span><strong>${escapeHtml(settings.legalName || settings.storeName || "ArtFlow POS")}</strong><p>${settings.taxCode ? `MST: ${escapeHtml(settings.taxCode)}` : "Chưa cấu hình MST"}</p><p>Người lập: ${escapeHtml(currentUser ? currentUser.name : order.createdBy || "")} · Ngày lập: ${escapeHtml(issuedAt)}</p></div>
              <div class="box"><span>Thông tin chứng từ</span><strong>${escapeHtml(order.invoiceNumber || "Chưa có số hóa đơn")}</strong><p>Trạng thái: ${escapeHtml(statusLabel(order.status))} · ${escapeHtml(statusLabel(order.paymentStatus))}</p><p>${receivedAt ? `Ngày nhận: ${escapeHtml(receivedAt)}` : "Chưa nhận hàng"}</p></div>
              <div class="box"><span>Thanh toán</span><strong>${escapeHtml(order.dueDate ? `Hạn ${formatDate(order.dueDate)}` : "Chưa đặt hạn")}</strong><p>Đã trả: ${money.format(order.paidAmount)} · Bù trừ: ${money.format(order.creditAppliedAmount)}</p><p>Còn phải trả: ${money.format(order.outstanding)}</p></div>
            </section>
            <table>
              <thead><tr><th>STT</th><th>Hàng hóa</th><th>SL</th><th>Đơn giá nhập</th><th>Thành tiền</th></tr></thead>
              <tbody>${rowHtml || `<tr><td colspan="5">Chưa có hàng hóa.</td></tr>`}</tbody>
            </table>
            <section class="summary">
              <div><span>Tạm tính</span><strong>${money.format(order.subtotal)}</strong></div>
              <div><span>Chiết khấu</span><strong>${money.format(order.discount)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>${money.format(order.shippingFee)}</strong></div>
              <div><span>Đã trả / bù trừ</span><strong>${money.format(Number(order.paidAmount || 0) + Number(order.creditAppliedAmount || 0))}</strong></div>
              <div class="total"><span>Tổng phiếu</span><strong>${money.format(order.total)}</strong></div>
            </section>
            <section class="note"><strong>Ghi chú:</strong> ${escapeHtml(order.note || "Không có ghi chú.")}</section>
            <section class="signatures">
              <div class="signature"><strong>Bên bán</strong><small>Ký, ghi rõ họ tên và đóng dấu nếu có</small><em>....................................</em></div>
              <div class="signature"><strong>Bên mua</strong><small>Ký, ghi rõ họ tên</small><em>....................................</em></div>
            </section>
            <p class="print-meta">${escapeHtml(settings.invoiceLegalNotice || "")}</p>
            <p class="print-meta">In từ ArtFlow POS lúc ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
          </main>
          <script>window.onload=()=>{setTimeout(()=>window.print(),180)};</script>
        </body>
      </html>`;
  }

  function printPurchaseOrderPdf(order) {
    const win = window.open("", "_blank", "width=960,height=780");
    if (!win) {
      showToast("Trình duyệt đã chặn cửa sổ in phiếu mua. Hãy cho phép popup cho ArtFlow POS.", "error");
      return;
    }
    win.document.open();
    win.document.write(purchaseOrderPrintHtml(order));
    win.document.close();
  }

  function exportPurchaseOrderExcel(order) {
    const XLSX = requireXlsx();
    const supplier = getSupplier(order);
    const settings = getReceiptSettings();
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ["Mã phiếu", order.code],
      ["Bên mua", settings.legalName || settings.storeName || "ArtFlow POS"],
      ["MST bên mua", settings.taxCode || ""],
      ["Địa chỉ bên mua", settings.address || ""],
      ["Điện thoại bên mua", settings.phone || ""],
      ["Nhà cung cấp", supplier.name || ""],
      ["Mã NCC", supplier.code || ""],
      ["Điện thoại", supplier.phone || ""],
      ["Email", supplier.email || ""],
      ["Số hóa đơn", order.invoiceNumber || ""],
      ["Trạng thái", statusLabel(order.status)],
      ["Thanh toán", statusLabel(order.paymentStatus)],
      ["Ngày tạo", formatDateTime(order.createdAt)],
      ["Ngày nhận", order.receivedAt ? formatDateTime(order.receivedAt) : ""],
      ["Hạn thanh toán", order.dueDate || ""],
      ["Tạm tính", order.subtotal],
      ["Chiết khấu", order.discount],
      ["Phí vận chuyển", order.shippingFee],
      ["Tổng phiếu", order.total],
      ["Đã trả", order.paidAmount],
      ["Bù trừ", order.creditAppliedAmount],
      ["Còn phải trả", order.outstanding],
      ["Ghi chú", order.note || ""]
    ];
    const summary = createExcelSheet("PHIẾU MUA HÀNG", `Xuất lúc ${formatDateTime(new Date().toISOString())}`, ["Thông tin", "Giá trị"], summaryRows, { widths: [24, 48], moneyColumns: [1], wrapColumn: 1 });
    XLSX.utils.book_append_sheet(workbook, summary, "Phiếu mua");
    const itemRows = purchaseOrderRows(order).map(item => [item.index, item.sku, item.name, item.quantity, item.unitCost, item.lineTotal]);
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("CHI TIẾT HÀNG MUA", `${order.code} · ${supplier.name || "Nhà cung cấp"}`, ["STT", "SKU", "Hàng hóa", "Số lượng", "Đơn giá nhập", "Thành tiền"], itemRows, { widths: [8, 18, 42, 12, 18, 18], numberColumns: [0, 3], moneyColumns: [4, 5], textColumns: [1], wrapColumn: 2 }), "Hàng hóa");
    XLSX.utils.book_append_sheet(workbook, createExcelSheet("KÝ NHẬN", "Dùng khi cần in kèm file Excel hoặc lưu chứng từ đối chiếu.", ["Bên", "Người ký", "Ngày ký", "Ghi chú"], [["Bên bán", "", "", ""], ["Bên mua", "", "", ""]], { widths: [18, 28, 18, 42], wrapColumn: 3 }), "Ký nhận");
    saveExcelWorkbook(workbook, `artflow-phieu-mua-${safeFilePart(order.code)}.xlsx`);
  }

  function openReceiptPrintWindow() {
    const win = window.open(
      "",
      "_blank",
      "width=420,height=720"
    );

    if (!win) {
      showToast(
        "Trình duyệt đã chặn cửa sổ in hóa đơn. " +
        "Hãy cho phép popup cho trang ArtFlow POS.",
        "error"
      );

      return null;
    }

    win.document.open();
    win.document.write(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Đang chuẩn bị hóa đơn</title>
        <style>
          body {
            display: grid;
            min-height: 100vh;
            margin: 0;
            place-items: center;
            font-family: Arial, sans-serif;
            color: #334155;
            background: #f8fafc;
          }

          .loading {
            text-align: center;
          }

          .spinner {
            width: 28px;
            height: 28px;
            margin: 0 auto 14px;
            border: 3px solid #dbeafe;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        </style>
      </head>

      <body>
        <div class="loading">
          <div class="spinner"></div>
          <strong>Đang chuẩn bị hóa đơn...</strong>
        </div>
      </body>
    </html>
  `);

    win.document.close();

    return win;
  }

  function printReceipt(order, existingWindow) {
    if (!order) {
      if (existingWindow && !existingWindow.closed) {
        existingWindow.close();
      }

      return;
    }

    const win = existingWindow || window.open(
      "",
      "_blank",
      "width=420,height=720"
    );

    if (!win) {
      showToast(
        "Trình duyệt đã chặn cửa sổ in hóa đơn.",
        "error"
      );

      return;
    }

    try {
      win.document.open();
      win.document.write(receiptHtml(order));
      win.document.close();
      win.focus();
    } catch (error) {
      if (!win.closed) {
        win.close();
      }

      showToast(
        `Không thể mở phiếu in: ${error.message}`,
        "error"
      );
    }
  }

  function openReceiptPdf(order, existingWindow) {
    if (!order || !order.receiptPdfUrl) return false;
    const targetWindow = existingWindow && !existingWindow.closed ? existingWindow : null;
    if (targetWindow) {
      targetWindow.location.href = order.receiptPdfUrl;
      targetWindow.focus();
      return true;
    }
    const opened = window.open(order.receiptPdfUrl, "_blank", "noopener");
    if (!opened) {
      showToast("Trình duyệt đã chặn cửa sổ hóa đơn PDF. Hãy cho phép popup cho ArtFlow POS.", "error");
      return false;
    }
    return true;
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
            <div class="panel-header">
              <div><h2>Giỏ hàng</h2><p>Sản phẩm đã chọn trong hóa đơn hiện tại.</p></div>
              <button class="button primary" type="button" data-open-product-picker>Thêm sản phẩm</button>
            </div>
            <div class="order-builder-layout">
              <div class="order-cart-panel">
                <div class="order-cart-heading">
                  <strong>Sản phẩm đã chọn</strong>
                  <span data-order-cart-count>0 dòng</span>
                </div>
                <div class="order-empty-cart" data-order-empty-cart>Bấm “Thêm sản phẩm” để tìm và thêm hàng vào hóa đơn.</div>
                <div class="order-items order-items-large" data-order-items></div>
              </div>
            </div>
          </section>

          <section class="panel order-compose-section order-customer-section">
            <div class="panel-header"><div><h2>Khách hàng và kênh bán</h2><p>Chọn người mua, nguồn đơn và ghi chú xử lý.</p></div></div>
            <div class="form-grid compact-grid">
              <div class="field order-customer-picker"><label for="customerId">Khách hàng</label><div class="inline-control"><select id="customerId" name="customerId" required>${customerOptions}</select><button class="button ghost" type="button" data-open-customer data-order-quick-customer>Thêm nhanh</button></div></div>
              <div class="field"><label for="channel">Kênh bán</label><select id="channel" name="channel" required>${renderOptions(channels, "pos")}</select></div>
              <div class="field"><label for="paymentMethod">Phương thức</label><select id="paymentMethod" name="paymentMethod" required><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="cod">COD</option><option value="ecommerce">Sàn TMĐT</option></select></div>
              <small class="loyalty-status-line" data-loyalty-status>Chọn khách hàng để xem điểm tích lũy.</small>
              <div class="field full"><label for="note">Ghi chú nội bộ</label><input id="note" name="note" type="text" placeholder="Yêu cầu giao hàng, nguồn inbox, mã đơn sàn..." /></div>
            </div>
          </section>
        </div>

        <aside class="order-summary-panel">
          <section class="panel order-compose-section sticky-summary">
            <div class="panel-header"><div><h2>Thanh toán và giao hàng</h2><p>Hoàn tất trạng thái trước khi lưu đơn.</p></div></div>
            <div class="form-grid summary-grid">
              <div class="field"><label for="status">Trạng thái đơn</label><select id="status" name="status" required><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="packed">Đã đóng gói</option><option value="shipping">Đang giao</option><option value="completed" selected>Hoàn tất</option></select></div>
              <div class="field"><label for="paymentStatus">Thanh toán</label><select id="paymentStatus" name="paymentStatus" required>${renderOptions(paymentStatuses, "paid")}</select></div>
              <div class="field"><label for="discountPercent">Giảm giá %</label><input id="discountPercent" name="discountPercent" type="number" min="0" max="100" step="0.1" value="0" data-order-money /></div>
              <div class="field"><label for="discount">Giảm tiền</label><input id="discount" name="discount" type="number" min="0" step="1000" value="0" data-order-money /></div>
              <div class="field"><label for="loyaltyPointsUsed">Dùng điểm</label><input id="loyaltyPointsUsed" name="loyaltyPointsUsed" type="number" min="0" step="1" value="0" data-order-money /></div>
              <div class="field"><label for="shippingFee">Phí giao hàng</label><input id="shippingFee" name="shippingFee" type="number" min="0" step="1000" value="0" data-order-money /></div>
              <div class="field"><label for="roundingStep">Làm tròn</label><select id="roundingStep" name="roundingStep" data-order-money><option value="0">Không</option><option value="1000" selected>1.000đ</option><option value="5000">5.000đ</option></select></div>
              <div class="field"><label for="cashReceived">Tiền đã nhận</label><input id="cashReceived" name="cashReceived" type="number" min="0" step="1000" value="0" data-order-money /></div>
              <details class="order-extra-settings full">
                <summary>Giao hàng / vận đơn</summary>
                <div class="form-grid summary-subgrid">
                  <div class="field"><label for="shippingStatus">Vận chuyển</label><select id="shippingStatus" name="shippingStatus" required>${renderOptions(shippingStatuses, "none")}</select></div>
                  <div class="field"><label for="carrier">Đơn vị giao</label><select id="carrier" name="carrier">${renderOptions(carriers, "none")}</select></div>
                  <div class="field full"><label for="trackingCode">Mã vận đơn</label><input id="trackingCode" name="trackingCode" type="text" placeholder="SPXVN..., GHTK..., GHN..." /></div>
                </div>
              </details>
              <div class="field checkbox-field receipt-actions full"><label><input type="checkbox" name="printAfterSave" checked /> In phiếu</label><label><input type="checkbox" name="receiptPdf" checked /> Lưu PDF</label><button class="link-button icon-only" type="button" data-open-receipt-settings aria-label="Cài đặt phiếu in" title="Cài đặt phiếu in">${icon("settings")}</button></div>
            </div>
            <div class="summary-lines">
              <div><span>Tạm tính</span><strong data-summary-subtotal>${money.format(0)}</strong></div>
              <div><span>Giảm từng dòng</span><strong data-summary-line-discount>${money.format(0)}</strong></div>
              <div><span>Giảm giá</span><strong data-summary-discount>${money.format(0)}</strong></div>
              <div><span>Đổi điểm</span><strong data-summary-loyalty>${money.format(0)}</strong></div>
              <div><span>Phí giao hàng</span><strong data-summary-shipping>${money.format(0)}</strong></div>
              <div><span>Làm tròn</span><strong data-summary-rounding>${money.format(0)}</strong></div>
              <div><span>Tiền nhận</span><strong data-summary-received>${money.format(0)}</strong></div>
              <div><span>Tiền thối</span><strong data-summary-change>${money.format(0)}</strong></div>
              <div class="summary-total"><span>Tổng thanh toán</span><strong data-summary-total>${money.format(0)}</strong></div>
            </div>
            <div class="form-actions order-submit-actions">
              <a class="button ghost" href="./orders.html">Hủy</a>
              <button class="button primary" type="submit">Tạo đơn hàng</button>
            </div>
          </section>
        </aside>
        <div class="order-product-popup" data-order-product-popup hidden>
          <div class="order-product-popup-panel">
            <div class="order-product-popup-header">
              <div><h2>Thêm sản phẩm</h2><p>Tìm SKU, tên, danh mục hoặc thương hiệu rồi bấm sản phẩm để thêm vào giỏ.</p></div>
              <button class="icon-button" type="button" data-close-product-picker aria-label="Đóng">${icon("close")}</button>
            </div>
            ${renderProductPicker()}
          </div>
        </div>
      </section>
    `;
    updateOrderTotalPreviewV2(els.orderCreateForm);
  }

  function renderPurchaseProductPicker() {
    const products = state.products.filter(product => product.status === "active").sort((a, b) => a.name.localeCompare(b.name));
    return `
      <div class="product-picker purchase-product-picker">
        <div class="product-picker-toolbar"><label class="search-box product-picker-search">${icon("search")}<input type="search" placeholder="Tìm SKU, tên, danh mục..." data-purchase-product-search /></label><span class="pill" data-purchase-product-count>${products.length} sản phẩm</span></div>
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
        <div class="field compact-field purchase-cost-field"><label>Đơn giá nhập</label><input type="number" min="0" step="1" value="${unitCost}" data-purchase-cost required /></div>
        <strong class="purchase-line-total" data-purchase-line-total>${money.format(quantity * unitCost)}</strong>
        <button class="icon-button" type="button" data-remove-purchase-item aria-label="Xóa dòng">${icon("close")}</button>
      </div>
    `;
  }

  function filterPurchaseProductPicker(input) {
    const panel = input && input.closest(".product-picker");
    if (!panel) return;
    const term = normalizeSearchText(input.value || "");
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
    const response = await apiRequest(editingOrder ? "/purchase-orders/update" : "/purchase-orders/create", {
      method: "POST", body: JSON.stringify({
        id: editingOrder ? editingOrder.id : undefined,
        supplierId: data.supplierId,
        dueDate: data.dueDate || "",
        invoiceNumber: data.invoiceNumber || "",
        discount: Number(data.discount || 0),
        shippingFee: Number(data.shippingFee || 0),
        note: data.note || "",
        items
      })
    });
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
        <aside class="order-summary-panel"><section class="panel order-compose-section sticky-summary"><div class="panel-header"><div><h2>Tổng phiếu mua</h2><p>Phiếu được lưu ở trạng thái nháp trước khi nhận hàng.</p></div></div><div class="form-grid summary-grid"><div class="field"><label for="discount">Chiết khấu</label><input id="discount" name="discount" type="number" min="0" step="1" value="0" data-purchase-money /></div><div class="field"><label for="shippingFee">Phí vận chuyển</label><input id="shippingFee" name="shippingFee" type="number" min="0" step="1" value="0" data-purchase-money /></div></div><div class="summary-lines"><div><span>Tạm tính</span><strong data-purchase-summary-subtotal>${money.format(0)}</strong></div><div><span>Chiết khấu</span><strong data-purchase-summary-discount>${money.format(0)}</strong></div><div><span>Phí vận chuyển</span><strong data-purchase-summary-shipping>${money.format(0)}</strong></div><div class="summary-total"><span>Tổng phải trả</span><strong data-purchase-summary-total>${money.format(0)}</strong></div></div><div class="form-actions order-submit-actions"><a class="button ghost" href="./purchasing.html">Hủy</a><button class="button primary" type="submit">Lưu phiếu mua</button></div></section></aside>
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
    const defaultExpenseCategory = (state.accountingCategories || []).find(category => category.status === "active" && category.type === "expense" && /nhập hàng|mua hàng|giá vốn/i.test(category.name || ""))
      || (state.accountingCategories || []).find(category => category.status === "active" && category.type === "expense");
    return `
      <div class="purchase-payment-summary full">
        <div><small>Phiếu mua</small><strong>${escapeHtml(order.code)}</strong><span>${escapeHtml(supplier.name)}</span></div>
        <div><small>Tổng phiếu</small><strong>${money.format(order.netTotal)}</strong></div>
        <div><small>Đã thanh toán</small><strong>${money.format(order.paidAmount)}</strong></div>
        <div><small>Đã bù trừ</small><strong>${money.format(order.creditAppliedAmount)}</strong></div>
        <div class="outstanding"><small>Còn phải trả</small><strong>${money.format(order.outstanding)}</strong></div>
      </div>
      <div class="field"><label for="paymentDate">Ngày thanh toán</label><input id="paymentDate" name="paymentDate" type="date" value="${today}" required /></div>
      <div class="field"><label for="amount">Số tiền</label><input id="amount" name="amount" type="number" min="1" max="${Math.max(1, order.outstanding)}" step="1" value="${order.outstanding}" required /></div>
      <div class="field"><label for="accountId">Tài khoản chi</label><select id="accountId" name="accountId" required>${renderAccountingAccountOptions()}</select></div>
      <div class="field"><label for="categoryId">Danh mục chi</label><select id="categoryId" name="categoryId" required>${renderAccountingCategoryOptions("expense", defaultExpenseCategory?.id || "")}</select></div>
      <div class="field full"><label for="note">Nội dung</label><input id="note" name="note" value="Thanh toán phiếu mua ${escapeAttribute(order.code)}" required /></div>
    `;
  }

  function openPurchasePaymentModal(purchaseOrder, options = {}) {
    if (!purchaseOrder) return;
    if (purchaseOrder.status !== "received") {
      showToast("Phiếu mua chưa nhận hàng nên chưa thể thanh toán.", "error");
      return;
    }
    if (purchaseOrder.paymentStatus === "paid" || purchaseOrder.outstanding <= 0) {
      showToast("Phiếu mua này không còn công nợ phải trả.", "error");
      return;
    }
    openModal("purchasePayment", { purchaseOrder, source: options.source || page });
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
      <p class="user-role-note"><strong>Chọn quyền tối thiểu cần thiết.</strong> Bán hàng quản lý đơn và khách; Kho quản lý hàng hóa và mua hàng; Chỉ xem không được thay đổi dữ liệu; Admin có toàn quyền hệ thống.</p>
    `;
  }

  function renderSalesChannelForm(channel) {
    const item = normalizeSalesChannel(channel || {});
    return `
      <div class="field"><label for="channelName">Tên kênh</label><input id="channelName" name="name" value="${escapeAttribute(item.name)}" placeholder="Shopee, TikTok Shop, POS cửa hàng..." required /></div>
      <div class="field"><label for="channelCode">Mã kênh</label><input id="channelCode" name="code" value="${escapeAttribute(item.code)}" placeholder="shopee, tiktok, pos..." required /></div>
      <div class="field"><label for="channelType">Loại kênh</label><select id="channelType" name="type"><option value="pos" ${item.type === "pos" ? "selected" : ""}>POS offline</option><option value="marketplace" ${item.type === "marketplace" ? "selected" : ""}>Sàn TMĐT</option><option value="social" ${item.type === "social" ? "selected" : ""}>Social / Inbox</option><option value="website" ${item.type === "website" ? "selected" : ""}>Website</option><option value="other" ${item.type === "other" ? "selected" : ""}>Khác</option></select></div>
      <div class="field"><label for="syncMode">Cách đồng bộ</label><select id="syncMode" name="syncMode"><option value="manual" ${item.syncMode === "manual" ? "selected" : ""}>Thủ công</option><option value="file" ${item.syncMode === "file" ? "selected" : ""}>Import/Export file</option><option value="api" ${item.syncMode === "api" ? "selected" : ""}>API sau này</option></select></div>
      <div class="field full"><label for="channelNote">Ghi chú</label><input id="channelNote" name="note" value="${escapeAttribute(item.note)}" placeholder="Tên shop, người phụ trách, quy ước xử lý..." /></div>
    `;
  }

  function renderChannelProductForm(productId = "") {
    const products = (state.products || []).map(normalizeProduct).filter(product => product.status === "active");
    const channelsList = activeSalesChannels().filter(channel => channel.status === "active");
    const selectedProduct = byId("products", productId) || products[0] || {};
    const mappings = (state.channelProducts || []).map(normalizeChannelProduct).filter(item => item.status !== "deleted");
    const selectedMapping = mappings.find(item => item.productId === selectedProduct.id) || {};
    const selectedChannelId = selectedMapping.channelId || (channelsList[0] || {}).id || "";
    return `
      <input type="hidden" name="id" value="${escapeAttribute(selectedMapping.id || "")}" />
      <div class="field"><label for="channelId">Kênh bán</label><select id="channelId" name="channelId" required>${channelsList.map(channel => `<option value="${channel.id}" ${selectedChannelId === channel.id ? "selected" : ""}>${escapeHtml(channel.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="productId">Sản phẩm nội bộ</label><select id="productId" name="productId" required>${products.map(product => `<option value="${product.id}" ${selectedProduct.id === product.id ? "selected" : ""}>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="channelSku">SKU trên kênh</label><input id="channelSku" name="channelSku" placeholder="SKU Shopee/TikTok/Lazada" value="${escapeAttribute(selectedMapping.channelSku || selectedProduct.sku || "")}" /></div>
      <div class="field"><label for="channelName">Tên trên kênh</label><input id="channelName" name="channelName" placeholder="Tên sản phẩm trên sàn" value="${escapeAttribute(selectedMapping.channelName || selectedProduct.name || "")}" /></div>
      <div class="field"><label for="channelPrice">Giá trên kênh</label><input id="channelPrice" name="channelPrice" type="text" data-money-input="true" value="${selectedMapping.channelPrice ?? selectedProduct.salePrice ?? 0}" /></div>
      <div class="field"><label for="channelStock">Tồn trên kênh</label><input id="channelStock" name="channelStock" type="number" min="0" step="1" value="${selectedMapping.channelStock ?? selectedProduct.stock ?? 0}" /></div>
      <label class="checkbox-row full"><input type="checkbox" name="syncStock" ${selectedMapping.syncStock === false ? "" : "checked"} /> Đồng bộ/cảnh báo tồn kho cho SKU này</label>
      <label class="checkbox-row full"><input type="checkbox" name="syncPrice" ${selectedMapping.syncPrice ? "checked" : ""} /> Đồng bộ/cảnh báo giá bán</label>
      <div class="field full"><label for="mappingNote">Ghi chú</label><input id="mappingNote" name="note" value="${escapeAttribute(selectedMapping.note || "")}" placeholder="Link sản phẩm, tên shop, lưu ý flash sale..." /></div>
    `;
  }

  function syncChannelProductForm(form) {
    if (!form) return;
    const product = byId("products", form.elements.productId?.value);
    const channelId = form.elements.channelId?.value || "";
    if (!product) return;
    const mapping = (state.channelProducts || [])
      .map(normalizeChannelProduct)
      .find(item => item.productId === product.id && item.channelId === channelId && item.status !== "deleted");
    form.elements.id.value = mapping?.id || "";
    form.elements.channelSku.value = mapping?.channelSku || product.sku || "";
    form.elements.channelName.value = mapping?.channelName || product.name || "";
    form.elements.channelPrice.value = String(mapping?.channelPrice ?? product.salePrice ?? 0);
    form.elements.channelStock.value = String(mapping?.channelStock ?? product.stock ?? 0);
    form.elements.syncStock.checked = mapping?.syncStock !== false;
    form.elements.syncPrice.checked = Boolean(mapping?.syncPrice);
    form.elements.note.value = mapping?.note || "";
    form.elements.channelPrice.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function renderWorkspaceTaskForm(task) {
    const item = normalizeWorkspaceTask(task || {});
    const users = (state.users || state.contentOwners || []).map(user => `<option value="${escapeAttribute(user.id || user.name)}" ${item.owner === (user.id || user.name) ? "selected" : ""}>${escapeHtml(user.name || user.email || user.id)}</option>`).join("");
    const products = (state.products || []).map(normalizeProduct).filter(product => product.status !== "deleted");
    const channelsList = activeSalesChannels();
    const campaigns = (state.campaigns || []).map(normalizeCampaign);
    const hiddenId = `<input type="hidden" name="id" value="${escapeAttribute(item.id)}" />`;
    return `
      ${hiddenId}
      <div class="field full"><label for="taskTitle">Việc cần làm</label><input id="taskTitle" name="title" value="${escapeAttribute(item.title)}" placeholder="VD: Map SKU Shopee cho sản phẩm bán chạy" required /></div>
      <div class="field"><label for="taskOwner">Phụ trách</label><select id="taskOwner" name="owner"><option value="">Chưa giao</option>${users}</select></div>
      <div class="field"><label for="taskStatus">Trạng thái</label><select id="taskStatus" name="status"><option value="todo" ${item.status === "todo" ? "selected" : ""}>Cần làm</option><option value="doing" ${item.status === "doing" ? "selected" : ""}>Đang làm</option><option value="blocked" ${item.status === "blocked" ? "selected" : ""}>Đang vướng</option><option value="done" ${item.status === "done" ? "selected" : ""}>Xong</option></select></div>
      <div class="field"><label for="taskPriority">Ưu tiên</label><select id="taskPriority" name="priority"><option value="normal" ${item.priority === "normal" ? "selected" : ""}>Bình thường</option><option value="high" ${item.priority === "high" ? "selected" : ""}>Cao</option><option value="urgent" ${item.priority === "urgent" ? "selected" : ""}>Gấp</option><option value="low" ${item.priority === "low" ? "selected" : ""}>Thấp</option></select></div>
      <div class="field"><label for="taskDueDate">Deadline</label><input id="taskDueDate" name="dueDate" type="date" value="${escapeAttribute(item.dueDate)}" /></div>
      <div class="field"><label for="taskProductId">Sản phẩm</label><select id="taskProductId" name="productId"><option value="">Không gắn</option>${products.map(product => `<option value="${product.id}" ${item.productId === product.id ? "selected" : ""}>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="taskChannelId">Kênh bán</label><select id="taskChannelId" name="channelId"><option value="">Không gắn</option>${channelsList.map(channel => `<option value="${channel.id}" ${item.channelId === channel.id ? "selected" : ""}>${escapeHtml(channel.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="taskCampaignId">Chiến dịch</label><select id="taskCampaignId" name="campaignId"><option value="">Không gắn</option>${campaigns.map(campaign => `<option value="${campaign.id}" ${item.campaignId === campaign.id ? "selected" : ""}>${escapeHtml(campaign.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="taskSourceType">Nguồn</label><select id="taskSourceType" name="sourceType"><option value="manual">Ghi chú riêng</option><option value="meeting">Biên bản họp</option><option value="content">Content</option><option value="channel">Kênh bán</option><option value="inventory">Kho</option><option value="order">Đơn hàng</option></select></div>
      <div class="field full"><label for="taskDescription">Mô tả</label><textarea id="taskDescription" name="description" rows="4" placeholder="Bối cảnh, yêu cầu, link liên quan...">${escapeHtml(item.description)}</textarea></div>
    `;
  }

  function renderProfileForm() {
    return `
      <div class="modal-summary full profile-summary">
        <span><small>Tài khoản</small><strong>${escapeHtml(currentUser ? currentUser.name : "")}</strong></span>
        <span><small>Vai trò</small><strong>${currentUser ? roleLabel(currentUser.role) : ""}</strong></span>
        <span><small>Email hiện tại</small><strong>${escapeHtml(currentUser ? currentUser.email : "")}</strong></span>
      </div>
      <div class="product-form-section full"><h3>Thông tin cá nhân</h3><p>Tên và email dùng để hiển thị trên hệ thống, lịch sử hoạt động và phân công công việc.</p></div>
      <div class="field"><label for="profileName">Họ tên</label><input id="profileName" name="name" type="text" value="${escapeAttribute(currentUser ? currentUser.name : "")}" autocomplete="name" required /></div>
      <div class="field"><label for="profileEmail">Email đăng nhập</label><input id="profileEmail" name="email" type="email" value="${escapeAttribute(currentUser ? currentUser.email : "")}" autocomplete="username" required /></div>
      <div class="product-form-section full"><h3>Đổi mật khẩu</h3><p>Để trống phần này nếu bạn chỉ muốn cập nhật thông tin cá nhân.</p></div>
      <div class="field"><label for="currentPassword">Mật khẩu hiện tại</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu đang dùng" /></div>
      <div class="field"><label for="newPassword">Mật khẩu mới</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Ít nhất 8 ký tự" /></div>
      <div class="field"><label for="confirmPassword">Nhập lại mật khẩu mới</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Nhập lại để xác nhận" /></div>
      <div class="field"><label>Phiên đăng nhập</label><input type="text" value="Sau khi đổi mật khẩu, phiên hiện tại vẫn được giữ." disabled /></div>
    `;
  }

  async function saveMyProfile(form) {
    const data = Object.fromEntries(new FormData(form));
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const currentPassword = String(data.currentPassword || "");
    const newPassword = String(data.newPassword || "");
    const confirmPassword = String(data.confirmPassword || "");
    const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);

    if (!name || !email || !email.includes("@")) throw new Error("Vui lòng nhập họ tên và email hợp lệ.");
    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) throw new Error("Vui lòng nhập đủ mật khẩu hiện tại và mật khẩu mới.");
      if (newPassword.length < 8) throw new Error("Mật khẩu mới cần ít nhất 8 ký tự.");
      if (newPassword !== confirmPassword) throw new Error("Mật khẩu mới nhập lại chưa khớp.");
    }

    const profileChanged = !currentUser || currentUser.name !== name || String(currentUser.email || "").toLowerCase() !== email;
    let savedUser = currentUser;
    if (wantsPasswordChange) {
      const response = await apiRequest("/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      savedUser = response.user || savedUser;
    }

    if (profileChanged) {
      const response = await apiRequest("/auth/profile", {
        method: "POST",
        body: JSON.stringify({ name, email })
      });
      savedUser = response.user || savedUser;
    }

    if (savedUser) {
      currentUser = savedUser;
      renderCurrentUserChip();
      if (isAdmin()) {
        staffUsers = staffUsers.map(user => user.id === savedUser.id ? savedUser : user);
        if (page === "users") renderUsers();
      }
    }
    showToast(wantsPasswordChange ? "Đã cập nhật hồ sơ và mật khẩu." : "Đã cập nhật hồ sơ cá nhân.");
  }

  function renderSpreadsheetImportGuide(kind) {
    const product = kind === "product";
    const columns = product
      ? [["sku / name / category", "Bắt buộc"], ["cost_price", "Giá vốn bắt buộc, số không âm"], ["sale_price", "Giá shop/offline, có thể để trống hoặc bằng 0 để tính sau"], ["stock / low_stock", "Số không âm"], ["brand / barcode / unit", "Thông tin nhận diện, không bắt buộc"], ["weight_grams / dimensions / origin / material", "Thông số sản phẩm"], ["image_url", "Link ảnh người dùng có quyền xem"], ["short_description / key_features", "Nội dung brief"], ["target_audience / seo_keywords", "Thông tin marketing"], ["content_status", "not_started / drafting / review / ready / published"], ["content_owner / content_note", "Người phụ trách và ghi chú"], ["website / shopee / tiktok / facebook", "Các cột *_product_url, không bắt buộc"], ["content_post_links", "Mỗi dòng: Tên bài | URL"], ["status", "active / archived"]]
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
          <button class="button ghost" type="button" data-download-${product ? "product" : "customer"}-template>${icon("download")} Tải file mẫu</button>
          <button class="button primary" type="button" data-choose-${product ? "product" : "customer"}-file>${icon("upload")} Chọn file Excel</button>
        </div>
      </div>`;
  }

  function renderAccountingExportForm() {
    const range = accountingExportRange();
    const optionsByScope = {
      payouts: [
        ["payouts", "Đối soát sàn và chi tiết payout", "Hai sheet gồm tổng hợp từng kỳ chuyển tiền và các dòng đơn/phí chi tiết để gửi kế toán hoặc đối chiếu với sàn.", "receipt"]
      ],
      tax: [
        ["tax", "Gói dữ liệu cuối kỳ", "Tổng quan, sổ quỹ, payout, phí sàn và chi phí vận hành. Đây là dữ liệu tham khảo để đối chiếu và kê khai.", "spreadsheet"]
      ],
      receivables: [
        ["receivables", "Danh sách công nợ phải thu", "Mỗi đơn còn thiếu tiền, khách hàng, tuổi nợ, số đã thu và số còn phải thu.", "clipboard"]
      ],
      ledger: [
        ["ledger", "Sổ quỹ thu chi", "Chi tiết từng dòng tiền theo ngày, tài khoản, danh mục, tham chiếu và số tiền ròng.", "receipt"]
      ],
      payroll: [
        ["payroll", "Báo cáo tiền lương", "Danh sách lần trả lương, người nhận, tài khoản chi, danh mục và tổng tiền theo kỳ.", "users"]
      ],
      profit: [
        ["profit", "Báo cáo lãi lỗ", "Gồm tổng quan kết quả, lợi nhuận từng sản phẩm và chi phí vận hành theo kỳ.", "chart"],
        ["productProfit", "Lợi nhuận sản phẩm", "Chỉ xuất SKU, số lượng bán, doanh thu, giá vốn, lãi gộp và biên lãi.", "package"],
        ["expenses", "Chi phí vận hành", "Chỉ xuất tổng chi phí theo từng danh mục và tỷ trọng trong kỳ.", "calculator"]
      ],
      accounts: [
        ["accounts", "Tài khoản và đối soát", "Số dư đầu, số dư hiện tại của từng tài khoản và toàn bộ lịch sử đối soát.", "wallet"]
      ],
      categories: [
        ["categories", "Danh mục thu chi", "Danh sách danh mục, loại thu/chi, trạng thái, số giao dịch và tổng phát sinh.", "spreadsheet"]
      ]
    };
    const options = optionsByScope[accountingExportScope] || optionsByScope.ledger;
    return `
      <div class="modal-summary full">
        <strong>Kỳ xuất: ${escapeHtml(accountingRangeLabel(range))}</strong>
        <span>Chỉ hiển thị báo cáo phù hợp với nghiệp vụ đang mở. File Excel có định dạng sẵn để gửi hoặc mở bằng Google Sheets.</span>
      </div>
      <div class="accounting-export-grid full">
        ${options.map(([type, title, note, iconName]) => `
          <button class="export-choice" type="button" data-export-accounting-report="${type}">
            <span>${icon(iconName)}</span>
            <strong>${title}</strong>
            <small>${note}</small>
          </button>
        `).join("")}
      </div>
    `;
  }

  function openModal(type, options = {}) {
    if (!els.modalBackdrop || !els.modalForm) return;
    if (type === "product" && !canManageProducts()) {
      showToast("Bạn không có quyền quản lý sản phẩm.", "error");
      return;
    }
    if (type === "productOptions" && !canManageProducts()) {
      showToast("Bạn không có quyền quản lý thuộc tính sản phẩm.", "error");
      return;
    }
    if (type === "contentItem" && !canManageContent()) {
      showToast("Bạn không có quyền quản lý content.", "error");
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
    if (["cashTransaction", "payrollExpense", "orderPayment", "orderRefund", "accountingAccount", "accountingCategory", "accountingReconciliation", "accountingExport", "platformPayout", "platformPayoutDetail"].includes(type) && !canManageAccounting()) {
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
    if (type === "purchasePayment" && (!options.purchaseOrder || options.purchaseOrder.status !== "received" || options.purchaseOrder.paymentStatus === "paid" || options.purchaseOrder.outstanding <= 0)) {
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
    if (type === "payrollExpense" && (!(state.accountingAccounts || []).some(account => account.status === "active") || !(state.accountingCategories || []).some(category => category.status === "active" && category.type === "expense"))) {
      showToast("Cần có tài khoản tiền và danh mục chi trước khi tính lương.", "error");
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
    const editingContentItem = options.contentItem || null;
    const editingTeamMeeting = options.teamMeeting || null;
    const editingTeamPlan = options.teamPlan || null;
    const editingTeamPricing = options.teamPricing || null;
    const editingTeamDecision = options.teamDecision || null;
    const editingCustomer = options.customer || null;
    const viewingCustomer = options.customerDetail || null;
    const editingOrder = options.order || null;
    const viewingOrder = options.orderDetail || null;
    const editingAccountingAccount = options.account || null;
    const editingAccountingCategory = options.category || null;
    const editingCashTransaction = options.transaction || null;
    const editingPlatformPayout = options.platformPayout || null;
    const editingSupplier = options.supplier || null;
    const editingPurchaseOrder = options.purchaseOrder || null;
    const viewingAuditLog = options.auditLog || null;
    const definitions = {
      profile: {
        eyebrow: "Tài khoản",
        title: "Hồ sơ cá nhân",
        body: renderProfileForm(),
        submit(form) {
          return saveMyProfile(form);
        }
      },
      productOptions: {
        eyebrow: "Thiết lập sản phẩm",
        title: "Quản lý thuộc tính",
        body: renderProductOptionManager(options.optionType || "category", options.editOptionId || ""),
        readOnly: true
      },
      productDetail: {
        eyebrow: "Hồ sơ sản phẩm",
        title: editingProduct ? editingProduct.name : "Chi tiết sản phẩm",
        body: editingProduct ? renderProductDetail(editingProduct) : "",
        readOnly: true
      },
      customerDetail: {
        eyebrow: "Khách hàng",
        title: viewingCustomer ? viewingCustomer.name : "Chi tiết khách hàng",
        body: viewingCustomer ? renderCustomerDetail(viewingCustomer) : "",
        readOnly: true
      },
      contentItem: {
        eyebrow: "Content workspace",
        title: editingContentItem ? "Cập nhật content" : "Tạo chủ đề content",
        body: renderContentItemForm(editingContentItem, options.defaults || {}),
        submit(form) {
          return saveContentItem(form, editingContentItem);
        }
      },
      teamMeeting: {
        eyebrow: "Team Hub",
        title: editingTeamMeeting ? "Cập nhật biên bản" : "Tạo biên bản họp",
        body: renderMeetingForm(editingTeamMeeting),
        submit(form) {
          return saveTeamItem("meeting", form, editingTeamMeeting);
        }
      },
      teamPlan: {
        eyebrow: "Team Hub",
        title: editingTeamPlan ? "Cập nhật kế hoạch" : "Tạo kế hoạch kinh doanh",
        body: renderPlanForm(editingTeamPlan),
        submit(form) {
          return saveTeamItem("plan", form, editingTeamPlan);
        }
      },
      teamPricing: {
        eyebrow: "Team Hub",
        title: editingTeamPricing ? "Cập nhật bảng tính giá" : "Tạo bảng tính giá",
        body: renderPricingForm(editingTeamPricing),
        submit(form) {
          return saveTeamItem("pricing", form, editingTeamPricing);
        }
      },
      pricingProductPicker: {
        eyebrow: "Tính giá",
        title: "Chọn sản phẩm",
        body: renderPricingProductPicker(),
        readOnly: true
      },
      teamDecision: {
        eyebrow: "Team Hub",
        title: editingTeamDecision ? "Cập nhật quyết định" : "Ghi quyết định",
        body: renderDecisionForm(editingTeamDecision),
        submit(form) {
          return saveTeamItem("decision", form, editingTeamDecision);
        }
      },
      auditDetail: {
        eyebrow: "Nhật ký hệ thống",
        title: viewingAuditLog ? viewingAuditLog.description : "Chi tiết hoạt động",
        body: viewingAuditLog ? renderAuditDetail(viewingAuditLog) : "",
        readOnly: true
      },
      orderDetail: {
        eyebrow: "Bán hàng",
        title: viewingOrder ? `Chi tiết ${viewingOrder.code}` : "Chi tiết đơn hàng",
        body: viewingOrder ? renderOrderDetail(viewingOrder) : "",
        readOnly: true
      },
      receiptSettings: {
        eyebrow: "POS",
        title: "Cài đặt phiếu in",
        body: renderReceiptSettingsForm(),
        async submit(form) {
          await saveReceiptSettings(receiptSettingsPayloadFromForm(form));
          showToast("Đã lưu cài đặt phiếu in.");
        }
      },
      productImport: {
        eyebrow: "Nhập dữ liệu Excel",
        title: "Nhập danh mục sản phẩm",
        body: renderSpreadsheetImportGuide("product"),
        readOnly: true
      },
      accountingExport: {
        eyebrow: "Kế toán",
        title: "Xuất báo cáo nghiệp vụ",
        body: renderAccountingExportForm(),
        readOnly: true
      },
      platformPayout: {
        eyebrow: "Đối soát sàn",
        title: editingPlatformPayout ? "Cập nhật phiếu đối soát" : "Tạo phiếu đối soát",
        body: renderPlatformPayoutForm(editingPlatformPayout),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const channel = channelByIdOrCode(data.channelId) || { code: data.channelId };
          const response = await apiRequest(editingPlatformPayout ? "/accounting/payouts/update" : "/accounting/payouts/create", { method: "POST", body: JSON.stringify({ ...data, channelCode: channel.code || data.channelId }) });
          const saved = normalizePlatformPayout(response.platformPayout);
          state.platformPayouts = editingPlatformPayout ? state.platformPayouts.map(item => item.id === saved.id ? { ...item, ...saved } : item) : [saved, ...(state.platformPayouts || [])];
          await loadAccountingData({ quiet: true }); renderPage(); showToast("Đã lưu phiếu đối soát sàn.");
        }
      },
      platformPayoutDetail: {
        eyebrow: "Đối soát sàn",
        title: editingPlatformPayout ? `Chi tiết ${editingPlatformPayout.payoutCode}` : "Chi tiết payout",
        body: editingPlatformPayout ? renderPlatformPayoutDetail(editingPlatformPayout) : "",
        readOnly: true
      },
      accountingProfitDetails: {
        eyebrow: "Kết quả kinh doanh",
        title: "Phân tích lãi lỗ",
        body: renderAccountingProfitDetails(),
        readOnly: true
      },
      accountingLedgerAnalysis: {
        eyebrow: "Dòng tiền",
        title: "Phân tích thu và chi",
        body: renderAccountingLedgerAnalysis(),
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
          const salePrice = String(data.salePrice || "").trim() === "" ? 0 : Number(data.salePrice);
          const stock = Number(data.stock);
          const lowStock = Number(data.lowStock);
          const sku = String(data.sku || "").trim();
          const name = String(data.name || "").trim();
          const category = String(data.category || "").trim();
          if (!sku || !name || !category) throw new Error("Vui lòng nhập đầy đủ SKU, tên và danh mục.");
          if (state.products.some(product => product.id !== (editingProduct && editingProduct.id) && product.sku.toLowerCase() === sku.toLowerCase())) throw new Error("SKU này đã tồn tại.");
          if (salePrice > 0 && salePrice < costPrice) throw new Error("Giá shop/offline nên lớn hơn hoặc bằng giá vốn.");
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
          if (options.selectForOrder && els.orderCreateForm) {
            const select = els.orderCreateForm.querySelector("#customerId");
            if (select) {
              const label = `${savedCustomer.name} · ${savedCustomer.phone}`;
              const existingOption = [...select.options].find(option => option.value === savedCustomer.id);
              if (existingOption) existingOption.textContent = label;
              else select.insertAdjacentHTML("afterbegin", `<option value="${savedCustomer.id}">${escapeHtml(label)}</option>`);
              select.value = savedCustomer.id;
              updateOrderTotalPreviewV2(els.orderCreateForm);
            }
          } else {
            renderPage();
          }
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
        body: renderStockReceiveForm(options.productId || ""),
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
        body: renderStockAdjustForm(options.productId || ""),
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
        title: editingCashTransaction ? (editingCashTransaction.referenceType && editingCashTransaction.referenceType !== "manual" ? "Bổ sung chứng từ" : "Sửa giao dịch thu / chi") : "Ghi thu / chi",
        body: renderCashTransactionForm(editingCashTransaction),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const linked = Boolean(editingCashTransaction && editingCashTransaction.referenceType && editingCashTransaction.referenceType !== "manual");
          const amount = Number(data.amount);
          if (!linked && (!data.accountId || !data.categoryId || amount <= 0 || !String(data.description || "").trim())) {
            throw new Error("Vui lòng nhập đủ tài khoản, danh mục, số tiền và nội dung.");
          }
          const dataFromApi = await apiRequest(editingCashTransaction ? "/accounting/transactions/update" : "/accounting/transactions/create", {
            method: "POST",
            body: JSON.stringify({
              id: editingCashTransaction?.id,
              type: data.type,
              accountId: data.accountId,
              categoryId: data.categoryId,
              amount,
              transactionDate: data.transactionDate,
              description: data.description,
              referenceType: "manual",
              referenceId: data.referenceId || "",
              documentUrl: data.documentUrl || ""
            })
          });
          const savedTransaction = normalizeCashTransaction(dataFromApi.transaction);
          state.cashTransactions = editingCashTransaction ? state.cashTransactions.map(item => item.id === savedTransaction.id ? savedTransaction : item) : [savedTransaction, ...state.cashTransactions];
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast(editingCashTransaction ? "Đã cập nhật giao dịch và chứng từ." : "Đã ghi nhận giao dịch thu/chi.");
        }
      },
      payrollExpense: {
        eyebrow: "Chi phí nhân sự",
        title: "Tính lương",
        body: renderPayrollExpenseForm(),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const amount = payrollFormTotal(form);
          if (!data.accountId || !data.categoryId || amount <= 0) {
            throw new Error("Vui lòng nhập khoản lương hợp lệ.");
          }
          const staffName = String(data.staffName || "").trim();
          const description = String(data.description || "").trim() || `Chi lương${staffName ? " - " + staffName : ""}`;
          const dataFromApi = await apiRequest("/accounting/transactions/create", {
            method: "POST",
            body: JSON.stringify({
              type: "expense",
              accountId: data.accountId,
              categoryId: data.categoryId,
              amount,
              transactionDate: data.transactionDate,
              description,
              referenceType: "payroll",
              referenceId: staffName
            })
          });
          state.cashTransactions.unshift(normalizeCashTransaction(dataFromApi.transaction));
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast("Đã ghi nhận chi phí lương.");
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
              adjustBalance: data.adjustBalance === "on",
              note: data.note || ""
            })
          });
          state.accountingReconciliations.unshift(normalizeAccountingReconciliation(dataFromApi.reconciliation));
          await loadAccountingData({ quiet: true });
          renderPage();
          showToast(dataFromApi.transaction
            ? "Đã đối soát và tạo giao dịch điều chỉnh số dư."
            : dataFromApi.reconciliation.difference === 0
              ? "Đối soát hoàn tất, số dư đã khớp."
              : "Đã lưu đối soát. Số dư chưa đổi vì chưa bật cân bằng.");
        }
      },
      accountingCategory: {
        eyebrow: "Danh mục kế toán",
        title: editingAccountingCategory ? "Sửa danh mục" : "Thêm danh mục",
        body: renderAccountingCategoryForm(editingAccountingCategory, options.categoryType) + `<div class="field full"><label for="group">Nhóm vận hành</label><select id="group" name="group"><option value="other">Khác</option><option value="platform_fee" ${editingAccountingCategory?.group === "platform_fee" ? "selected" : ""}>Phí sàn</option><option value="marketing" ${editingAccountingCategory?.group === "marketing" ? "selected" : ""}>Marketing / Ads</option><option value="packaging" ${editingAccountingCategory?.group === "packaging" ? "selected" : ""}>Bao bì</option><option value="payroll" ${editingAccountingCategory?.group === "payroll" ? "selected" : ""}>Lương</option><option value="operation" ${editingAccountingCategory?.group === "operation" ? "selected" : ""}>Vận hành</option><option value="inventory_loss" ${editingAccountingCategory?.group === "inventory_loss" ? "selected" : ""}>Hao hụt kho</option></select><small>Dùng để tổng hợp chi phí; không thay đổi bản chất thu hoặc chi.</small></div>`,
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const name = String(data.name || "").trim();
          if (!name) throw new Error("Tên danh mục chưa hợp lệ.");
          const dataFromApi = await apiRequest(editingAccountingCategory ? "/accounting/categories/update" : "/accounting/categories/create", {
            method: "POST",
            body: JSON.stringify({
              id: editingAccountingCategory ? editingAccountingCategory.id : undefined,
              name,
              type: data.type,
              group: data.group || "other"
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
          const amount = Number(data.amount);
          const account = (state.accountingAccounts || []).find(item => item.id === data.accountId && item.status === "active");
          const category = (state.accountingCategories || []).find(item => item.id === data.categoryId && item.status === "active" && item.type === "expense");
          if (editingPurchaseOrder.status !== "received") throw new Error("Phiếu mua chưa nhận hàng nên chưa thể thanh toán.");
          if (editingPurchaseOrder.paymentStatus === "paid" || editingPurchaseOrder.outstanding <= 0) throw new Error("Phiếu mua đã được thanh toán đầy đủ.");
          if (!isFinite(amount) || amount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0.");
          if (amount > editingPurchaseOrder.outstanding) throw new Error("Số tiền thanh toán không được vượt công nợ còn lại.");
          if (!account) throw new Error("Vui lòng chọn tài khoản chi hợp lệ.");
          if (!category) throw new Error("Vui lòng chọn danh mục chi hợp lệ.");
          const response = await apiRequest("/purchase-orders/pay", { method: "POST", body: JSON.stringify({ id: editingPurchaseOrder.id, amount, accountId: data.accountId, categoryId: data.categoryId, paymentDate: data.paymentDate, note: data.note || "" }) });
          const saved = normalizePurchaseOrder(response.purchaseOrder);
          state.purchaseOrders = state.purchaseOrders.map(item => item.id === saved.id ? saved : item);
          if (response.payment) state.supplierPayments = [normalizeSupplierPayment(response.payment), ...(state.supplierPayments || [])];
          if (response.transaction) state.cashTransactions = [normalizeCashTransaction(response.transaction), ...(state.cashTransactions || [])];
          if (response.supplier) {
            const savedSupplier = normalizeSupplier(response.supplier);
            state.suppliers = state.suppliers.map(item => item.id === savedSupplier.id ? savedSupplier : item);
          }
          if (response.transaction && account) account.currentBalance -= amount;
          await Promise.all([loadPurchasingData({ quiet: true }), loadAccountingData({ quiet: true })]);
          renderPage();
          const message = saved.outstanding <= 0
            ? "Đã thanh toán đủ phiếu mua và ghi nhận giao dịch chi bên kế toán."
            : "Đã thanh toán một phần phiếu mua và ghi nhận giao dịch chi bên kế toán.";
          showToastLink(message, response.transaction ? `./accounting.html?transactionId=${encodeURIComponent(response.transaction.id)}` : "", "Xem giao dịch kế toán");
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
      workspaceTask: {
        eyebrow: "Team Hub",
        title: "Tạo việc cần làm",
        body: renderWorkspaceTaskForm(options.task || null),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const response = await apiRequest("/omni/tasks/upsert", {
            method: "POST",
            body: JSON.stringify(data)
          });
          const saved = normalizeWorkspaceTask(response.workspaceTask || response.task);
          state.workspaceTasks = [saved, ...(state.workspaceTasks || []).filter(item => item.id !== saved.id)];
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast("Đã lưu việc cần làm.");
        }
      },
      salesChannel: {
        eyebrow: "Kênh bán",
        title: "Thêm kênh bán",
        body: renderSalesChannelForm(options.channel || null),
        async submit(form) {
          const data = Object.fromEntries(new FormData(form));
          const response = await apiRequest("/omni/channels/upsert", {
            method: "POST",
            body: JSON.stringify(data)
          });
          const saved = normalizeSalesChannel(response.salesChannel);
          state.salesChannels = [saved, ...(state.salesChannels || []).filter(item => item.id !== saved.id)];
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast("Đã lưu kênh bán.");
        }
      },
      channelProduct: {
        eyebrow: "Đồng bộ SKU",
        title: "Map SKU với kênh bán",
        body: renderChannelProductForm(options.productId || ""),
        async submit(form) {
          const formData = new FormData(form);
          const data = Object.fromEntries(formData);
          data.syncStock = formData.has("syncStock");
          data.syncPrice = formData.has("syncPrice");
          const response = await apiRequest("/omni/mappings/upsert", {
            method: "POST",
            body: JSON.stringify(data)
          });
          const saved = normalizeChannelProduct(response.channelProduct);
          state.channelProducts = [saved, ...(state.channelProducts || []).filter(item => item.id !== saved.id)];
          window.ArtFlowPosStore.save(state);
          renderPage();
          showToast("Đã lưu mapping SKU.");
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
    const modal = els.modalBackdrop.querySelector(".modal");
    if (modal) modal.dataset.modalType = type;
    els.modalForm.classList.toggle("modal-form-wide", type === "orderDetail" || type === "productDetail" || type === "customerDetail" || type === "teamPricing" || type === "pricingProductPicker");
    els.modalForm.classList.toggle("modal-form-fullscreen", type === "product" || type === "contentItem" || type === "teamPricing");
    els.modalEyebrow.textContent = definition.eyebrow;
    els.modalTitle.textContent = definition.title;
    els.modalForm.innerHTML = definition.body;
    if (type === "contentItem") compactContentItemForm(els.modalForm);
    if (type === "contentItem" && !options.contentItem) applyContentAutomation(els.modalForm, "gentle");
    els.modalForm.insertAdjacentHTML("beforeend", definition.readOnly ? `
      <div class="form-actions"><button class="button primary" type="button" data-close-modal>${icon("check")} Đóng</button></div>
    ` : `
      <div class="form-actions"><button class="button ghost" type="button" data-close-modal>${icon("close")} Hủy</button><button class="button primary" type="submit">${icon("check")} Lưu</button></div>
    `);
    hydrateIcons(els.modalForm);
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
    document.body.classList.add("overlay-open");
    if (type === "order") updateOrderTotalPreviewV2(els.modalForm);
    if (type === "orderReturn") updateOrderReturnPreview(els.modalForm);
    if (type === "product") updateProductPricingPreview(els.modalForm);
    if (type === "teamPricing") updateTeamPricingPreview(els.modalForm);
    if (type === "pricingProductPicker") filterProductPicker(els.modalForm);
    enhanceMoneyInputs(els.modalForm);
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
    document.addEventListener("focusin", event => {
      if (isMoneyInput(event.target)) {
        window.clearTimeout(Number(event.target.dataset.moneyFormatTimer || 0));
        unformatMoneyInput(event.target);
        event.target.dataset.moneyFocusValue = cleanMoneyText(event.target.value);
        event.target.dataset.moneyFreshFocus = "true";
        window.setTimeout(() => {
          try {
            event.target.select();
          } catch (error) {
            // Some input types do not support selection.
          }
        }, 0);
      }
    }, true);

    document.addEventListener("focusout", event => {
      if (isMoneyInput(event.target)) formatMoneyInput(event.target);
    }, true);

    document.addEventListener("input", event => {
      const form = event.target.closest && event.target.closest("form");
      if (form) normalizeMoneyInputs(form);
      if (isMoneyInput(event.target)) {
        const input = event.target;
        const raw = cleanMoneyText(input.value);
        const focusValue = input.dataset.moneyFocusValue || "";
        if (input.dataset.moneyFreshFocus === "true" && focusValue && raw.indexOf(focusValue) === 0 && raw.length > focusValue.length) {
          input.value = raw.slice(focusValue.length);
        }
        input.dataset.moneyFreshFocus = "false";
        window.clearTimeout(Number(input.dataset.moneyFormatTimer || 0));
        input.dataset.moneyFormatTimer = String(window.setTimeout(() => {
          const formatted = formatMoneyText(input.value);
          if (input.value !== formatted) {
            input.value = formatted;
            try {
              input.setSelectionRange(input.value.length, input.value.length);
            } catch (error) {
              // Some input types do not support cursor placement.
            }
          }
        }, 280));
      }
    }, true);

    document.addEventListener("change", event => {
      const form = event.target.closest && event.target.closest("form");
      if (form) normalizeMoneyInputs(form);
    }, true);

    document.addEventListener("submit", event => {
      normalizeMoneyInputs(event.target);
    }, true);

    document.addEventListener("submit", async event => {
      const form = event.target.closest && event.target.closest("[data-team-pricing-page-form]");
      if (!form) return;
      event.preventDefault();
      const button = form.querySelector("button[type='submit']");
      setBusy(button, true, "Đang lưu...");
      try {
        await withLoading("Đang lưu bảng tính giá...", () => submitTeamPricingPageForm(form));
      } catch (error) {
        showToast(error.message || String(error), "error");
      } finally {
        setBusy(button, false);
      }
    });

    document.addEventListener("submit", async event => {
      const form = event.target.closest && event.target.closest("[data-accounting-settings-form]");
      if (!form) return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const settings = { tolerance:Number(data.tolerance || 0), autoAdjustment:data.autoAdjustment === "on", payrollKeywords:data.payrollKeywords || "", shopeeAccountId:data.shopeeAccountId || "", tiktokAccountId:data.tiktokAccountId || "" };
      try {
        await withLoading("Đang lưu cấu hình kế toán...", () => apiRequest("/accounting/settings/update", { method:"POST", body:JSON.stringify({ settings }) }));
        state.accountingSettings = settings; window.ArtFlowPosStore.save(state); showToast("Đã lưu cấu hình kế toán TMĐT.");
      } catch (error) { showToast(error.message || String(error), "error"); }
    });

    document.addEventListener("click", event => {
      const retryButton = event.target.closest && event.target.closest("[data-retry-backend]");
      if (retryButton) {
        window.location.reload();
        return;
      }
      const form = event.target.closest && event.target.closest("form");
      if (form) {
        normalizeMoneyInputs(form);
        window.setTimeout(() => enhanceMoneyInputs(form), 0);
      }
    }, true);

    if (els.loginForm) {
      els.loginForm.addEventListener("submit", event => {
        event.preventDefault();
        submitAuth(event.currentTarget);
      });
    }

    if (els.minutesForm) {
      els.minutesForm.addEventListener("input", event => {
        if (event.target.closest("[data-minutes-agenda-list], [data-minutes-decisions-list], [data-minutes-actions-list], [data-minutes-links-list]")) {
          syncMeetingMinutesForm();
        }
      });
      els.minutesForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type='submit']");
        setBusy(button, true, "Đang lưu...");
        try {
          await withLoading("Đang lưu biên bản họp...", () => submitMeetingMinutesForm(event.currentTarget));
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          setBusy(button, false);
        }
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

    [
      [els.productCategoryFilter, "category"],
      [els.productStatusFilter, "status"],
      [els.productStockFilter, "stock"],
      [els.productMarginFilter, "margin"],
      [els.productContentFilter, "content"],
      [els.productAssetsFilter, "assets"],
      [els.productSort, "sort"]
    ].forEach(([select, key]) => {
      if (!select) return;
      select.addEventListener("change", event => {
        productFilters[key] = event.target.value;
        productFilters.preset = "all";
        renderPage();
      });
    });

    if (els.accountingTypeSelect) {
      els.accountingTypeSelect.addEventListener("change", event => {
        accountingFilters.type = event.target.value;
        renderPage();
      });
    }
    const supplierSearch = qs("[data-supplier-search]");
    if (supplierSearch) {
      supplierSearch.addEventListener("input", event => {
        supplierFilters.search = event.target.value;
        renderPurchasing();
      });
    }
    const channelSettingsSearch = qs("[data-channel-settings-search]");
    if (channelSettingsSearch) {
      channelSettingsSearch.addEventListener("input", event => {
        channelSettingsFilters.search = event.target.value;
        renderOmniWorkspace();
      });
    }

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

    if (els.accountingProfitRange) {
      els.accountingProfitRange.addEventListener("change", event => {
        accountingFilters.range = event.target.value;
        renderPage();
      });
    }

    if (els.accountingPayrollRange) {
      els.accountingPayrollRange.addEventListener("change", event => {
        accountingFilters.payrollRange = event.target.value;
        renderPage();
      });
    }

    if (els.accountingPayrollSearch) {
      els.accountingPayrollSearch.addEventListener("input", event => {
        accountingFilters.payrollSearch = event.target.value;
        renderAccounting();
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
    if (els.userRoleFilter) {
      els.userRoleFilter.addEventListener("change", event => {
        userFilters.role = event.target.value;
        renderUsers();
      });
    }
    if (els.userStatusFilter) {
      els.userStatusFilter.addEventListener("change", event => {
        userFilters.status = event.target.value;
        renderUsers();
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

    if (els.incenseForm) {
      els.incenseForm.addEventListener("submit", async event => {
        event.preventDefault();
        try {
          await submitIncenseWish(event.currentTarget);
        } catch (error) {
          showToast(error.message, "error");
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

    if (els.settingsForm) {
      els.settingsForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type='submit']");
        setBusy(button, true, "Đang lưu...");
        try {
          await withLoading("Đang lưu thông tin shop...", () => saveReceiptSettings(receiptSettingsPayloadFromForm(event.currentTarget)));
          renderSettingsPreview();
          showToast("Đã lưu thông tin shop và chứng từ.");
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          setBusy(button, false);
        }
      });
      els.settingsForm.addEventListener("input", () => {
        const draft = receiptSettingsPayloadFromForm(els.settingsForm);
        renderSettingsPreview({ ...getReceiptSettings(), ...draft });
      });
    }

    document.addEventListener("click", async event => {
      const target = event.target.closest("button, a, [data-open-profile], [data-supplier-card], [data-purchase-order-row], [data-view-order], [data-view-product], [data-view-customer]");
      if (!target || target.disabled) return;

      if (target.matches("[data-menu-toggle]")) document.body.classList.toggle("context-open");
      if (target.matches("[data-menu-close]")) document.body.classList.remove("menu-open");
      if (target.matches(".nav-link")) document.body.classList.remove("menu-open", "context-open");
      if (target.matches("[data-toggle-nav-group]")) {
        const groupId = target.dataset.toggleNavGroup;
        const group = target.closest("[data-nav-group]");
        const items = group?.querySelector(".nav-group-items");
        const nextOpen = !(group?.classList.contains("open"));
        group?.classList.toggle("open", nextOpen);
        if (items) items.hidden = !nextOpen;
        target.setAttribute("aria-expanded", String(nextOpen));
        let stored = {};
        try {
          stored = JSON.parse(localStorage.getItem(navStateKey) || "{}");
        } catch (error) {
          stored = {};
        }
        stored[groupId] = nextOpen;
        localStorage.setItem(navStateKey, JSON.stringify(stored));
      }
      if (target.matches("[data-close-modal]")) closeModal();
      if (target.matches("[data-close-management-drawer]")) closeManagementDrawers();
      if (target.matches("[data-supplier-card]")) openSupplierDetail(target.dataset.supplierCard);
      if (target.matches("[data-purchase-order-row]")) openPurchaseDetail(target.dataset.purchaseOrderRow);
      if (target.matches("[data-purchase-saved-view]")) {
        purchasingFilters.savedView = target.dataset.purchaseSavedView || "all";
        purchasingFilters.status = "all";
        purchasingFilters.paymentStatus = "all";
        renderPurchasing();
      }
      if (target.matches("[data-omni-quick-filter]")) {
        const value = target.dataset.omniQuickFilter || "all";
        omniFilters.stock = "all";
        omniFilters.issue = "all";
        if (["missing", "mismatch"].includes(value)) omniFilters.issue = value;
        if (["out", "reserved"].includes(value)) omniFilters.stock = value;
        window.ArtFlowPageModules.channels?.selectQuickFilter(value);
        renderOmniWorkspace();
      }
      if (target.matches("[data-open-profile]")) openModal("profile");
      if (target.matches("[data-incense-kind-choice]")) {
        const kind = target.dataset.incenseKindChoice || "sales";
        if (els.incenseKind) els.incenseKind.value = kind;
        document.querySelectorAll("[data-incense-kind-choice]").forEach(button => {
          button.classList.toggle("active", button.dataset.incenseKindChoice === kind);
        });
        if (els.incenseResult) {
          const info = incenseKinds[kind] || incenseKinds.sales;
          els.incenseResult.textContent = info[1];
        }
      }
      if (target.matches("[data-offering-choice]")) {
        target.classList.toggle("active");
        if (!document.querySelector("[data-offering-choice].active")) {
          target.classList.add("active");
        }
        syncIncenseOfferings();
      }
      if (target.matches("[data-reset-product-filters]")) {
        Object.assign(productFilters, { category: "all", status: "all", stock: "all", margin: "all", content: "all", assets: "all", sort: "name", preset: "all" });
        searchTerm = "";
        const productSearch = qs("[data-global-search]");
        if (productSearch) productSearch.value = "";
        Object.entries({ productStatusFilter: "status", productStockFilter: "stock", productMarginFilter: "margin", productContentFilter: "content", productAssetsFilter: "assets", productSort: "sort" }).forEach(([elementKey, filterKey]) => {
          if (els[elementKey]) els[elementKey].value = productFilters[filterKey];
        });
        renderPage();
      }
      if (target.dataset.productPreset) {
        Object.assign(productFilters, { category: "all", status: "all", stock: "all", margin: "all", content: "all", assets: "all", preset: target.dataset.productPreset });
        renderPage();
      }
      if (target.matches("[data-refresh-audit]")) {
        await withLoading("Đang tải lại lịch sử...", loadAuditLogs);
        renderPage();
        showToast("Đã cập nhật lịch sử hoạt động.");
      }
      if (target.dataset.viewAudit) {
        const auditLog = auditLogs.find(log => log.id === target.dataset.viewAudit);
        if (auditLog) openModal("auditDetail", { auditLog });
      }
      if (target.dataset.viewOrder) {
        const order = byId("orders", target.dataset.viewOrder);
        if (order) openModal("orderDetail", { orderDetail: order });
      }
      if (target.dataset.orderReceiptPdf) {
        const order = byId("orders", target.dataset.orderReceiptPdf);
        if (order) {
          const pdfWindow = order.receiptPdfUrl ? null : openReceiptPrintWindow();
          await withLoading(order.receiptPdfUrl ? "Đang mở hóa đơn PDF..." : "Đang tạo hóa đơn PDF...", () => openOrCreateOrderReceiptPdf(order, { printWindow: pdfWindow }));
        }
      }
      if (target.dataset.orderReceiptRegenerate) {
        const order = byId("orders", target.dataset.orderReceiptRegenerate);
        if (order) {
          const pdfWindow = openReceiptPrintWindow();
          const updated = await withLoading("Đang tạo lại hóa đơn PDF...", () => openOrCreateOrderReceiptPdf(order, { force: true, printWindow: pdfWindow }));
          openModal("orderDetail", { orderDetail: updated });
        }
      }
      if (target.matches("[data-export-profit-report]")) exportProfitReport(page === "accounting" ? { range: accountingExportRange(), channel: "all" } : {});
      if (target.matches("[data-export-products]")) exportProductsCsv();
      if (target.matches("[data-export-content]")) exportContentReport();
      if (target.matches("[data-reset-content-filters]")) {
        Object.assign(contentFilters, { status: "all", type: "all", owner: "all", channel: "all", product: "all", schedule: "all" });
        searchTerm = "";
        const contentSearch = qs("[data-global-search]");
        if (contentSearch) contentSearch.value = "";
        renderContentWorkspace();
      }
      if (target.matches("[data-export-team]")) exportTeamReport();
      if (target.matches("[data-import-products]")) openModal("productImport");
      if (target.matches("[data-export-customers]")) exportCustomersCsv();
      if (target.matches("[data-import-customers]")) openModal("customerImport");
      if (target.matches("[data-download-product-template]")) downloadProductTemplate();
      if (target.matches("[data-download-customer-template]")) downloadCustomerTemplate();
      if (target.matches("[data-choose-product-file]")) els.productCsvFile?.click();
      if (target.matches("[data-choose-customer-file]")) els.customerCsvFile?.click();
      if (target.matches("[data-open-product]")) openModal("product");
      if (target.matches("[data-open-content-item]")) openModal("contentItem");
      if (target.matches("[data-open-channel-form]")) {
        const channel = (state.salesChannels || []).find(item => item.id === target.dataset.channelId);
        openModal("salesChannel", channel ? { channel } : {});
      }
      if (target.matches("[data-open-channel-product-form]")) openModal("channelProduct", { productId: target.dataset.productId || "" });
      if (target.matches("[data-export-omni]")) exportOmniReport();
      if (target.matches("[data-copy-content-prompt]")) {
        const prompt = target.closest("form")?.querySelector("[data-content-prompt]")?.value || "";
        if (prompt) {
          await navigator.clipboard.writeText(prompt);
          showToast("Đã copy prompt.");
        }
      }
      if (target.matches("[data-content-auto]")) {
        applyContentAutomation(target.closest("form"), target.dataset.contentAuto || "template");
        showToast("Đã gợi ý nội dung theo dữ liệu hiện có.");
      }
      if (target.dataset.createProductContent) {
        const product = byId("products", target.dataset.createProductContent);
        if (product) openModal("contentItem", { defaults: { productId: product.id, type: "product", title: "Content cho " + product.name } });
      }
      if (target.dataset.editContent) {
        const item = (state.contentItems || []).find(entry => entry.id === target.dataset.editContent);
        if (item) openModal("contentItem", { contentItem: item });
      }
      if (target.dataset.provisionContentItem) {
        try {
          await withLoading("Đang tạo tài nguyên content...", () => provisionContentItem(target.dataset.provisionContentItem));
        } catch (error) {
          showToast(error.message, "error");
        }
      }
      if (target.dataset.archiveContent) {
        if (confirm("Ẩn chủ đề content này?")) {
          try {
            await withLoading("Đang ẩn chủ đề content...", () => archiveContentItem(target.dataset.archiveContent));
          } catch (error) {
            showToast(error.message, "error");
          }
        }
      }
      if (target.dataset.teamView) {
        teamFilters.view = target.dataset.teamView;
        teamFilters.status = "all";
        renderPage();
      }
      if (target.matches("[data-team-primary-action]")) {
        const modalByView = { tasks: "workspaceTask", plans: "teamPlan", decisions: "teamDecision" };
        openModal(modalByView[teamFilters.view] || "workspaceTask");
      }
      if (target.dataset.editTeamMeeting) {
        window.location.href = `./meeting-minutes.html?id=${encodeURIComponent(target.dataset.editTeamMeeting)}`;
        return;
      }
      if (target.dataset.viewTeamMeeting) {
        window.location.href = `./meeting-minutes.html?id=${encodeURIComponent(target.dataset.viewTeamMeeting)}`;
        return;
      }
      if (target.matches("[data-minutes-new]")) {
        setMeetingMinutesUrl("");
        renderMeetingMinutesPage();
      }
      if (target.dataset.minutesSelect) {
        setMeetingMinutesUrl(target.dataset.minutesSelect);
        renderMeetingMinutesPage();
      }
      if (target.dataset.minutesTemplate) applyMeetingTemplate(target.dataset.minutesTemplate);
      if (target.matches("[data-minutes-add-agenda]")) addMinutesTextRow("agenda");
      if (target.matches("[data-minutes-add-decision]")) addMinutesTextRow("decision");
      if (target.matches("[data-minutes-add-action]")) addMinutesAction();
      if (target.matches("[data-minutes-add-link]")) addMinutesTextRow("link");
      if (target.matches("[data-minutes-parse-quick]")) parseQuickMeetingNote();
      if (target.matches("[data-minutes-clean]")) cleanMeetingMinutesText();
      if (target.matches("[data-minutes-insert-time]") && els.minutesQuickNote) {
        els.minutesQuickNote.value = [els.minutesQuickNote.value, `[${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}] `].join(els.minutesQuickNote.value ? "\n" : "");
        els.minutesQuickNote.focus();
      }
      if (target.matches("[data-minutes-add-attendee]")) {
        const form = target.closest("form");
        const select = form?.querySelector("[data-minutes-attendee-select]");
        const input = form?.querySelector("[data-minutes-attendee-input]");
        const hidden = form?.querySelector("[data-minutes-attendees-hidden]");
        const next = String(input?.value || select?.value || "").trim();
        const names = String(hidden?.value || "").split(/,\s*/).filter(Boolean);
        if (next && !names.includes(next)) names.push(next);
        if (input) input.value = "";
        renderMinutesAttendees(form, names.join(", "));
      }
      if (target.dataset.minutesRemoveAttendee) {
        const form = target.closest("form");
        const hidden = form?.querySelector("[data-minutes-attendees-hidden]");
        const names = String(hidden?.value || "").split(/,\s*/).filter(Boolean).filter(name => name !== target.dataset.minutesRemoveAttendee);
        renderMinutesAttendees(form, names.join(", "));
      }
      if (target.matches("[data-minutes-remove-row]")) {
        target.closest("[data-minutes-agenda-row], [data-minutes-decision-row], [data-minutes-action-row], [data-minutes-link-row]")?.remove();
        syncMeetingMinutesForm();
      }
      if (target.dataset.editTeamPlan) {
        const item = (state.teamPlans || []).find(entry => entry.id === target.dataset.editTeamPlan);
        if (item) openModal("teamPlan", { teamPlan: item });
      }
      if (target.dataset.editTeamPricing) {
        window.location.href = `./team-pricing.html?id=${encodeURIComponent(target.dataset.editTeamPricing)}`;
        return;
      }
      if (target.dataset.openPricingForProduct) {
        const product = byId("products", target.dataset.openPricingForProduct);
        if (product) {
          window.location.href = `./team-pricing.html?productId=${encodeURIComponent(product.id)}`;
          return;
        }
      }
      if (target.dataset.editTeamDecision) {
        const item = (state.teamDecisions || []).find(entry => entry.id === target.dataset.editTeamDecision);
        if (item) openModal("teamDecision", { teamDecision: item });
      }
      if (target.dataset.archiveTeamItem) {
        const [collection, id] = target.dataset.archiveTeamItem.split(":");
        const key = collection;
        if (key && confirm("Lưu trữ mục này?")) {
          await withLoading("Đang lưu trữ Team Hub...", () => archiveTeamItem(collection, id));
        }
      }
      if (target.matches("[data-add-pricing-line]")) {
        const container = target.closest("form")?.querySelector("[data-pricing-lines]");
        if (container) {
          container.querySelector("[data-pricing-empty]")?.remove();
          const index = container.querySelectorAll("[data-pricing-line-row]").length;
          container.insertAdjacentHTML("beforeend", renderPricingLineInput({ name: "", type: "fixed", value: 0 }, index));
          hydrateIcons(container);
          updateTeamPricingPreview(target.closest("form"));
        }
      }
      if (target.matches("[data-add-pricing-preset]")) {
        const form = target.closest("form");
        const container = form?.querySelector("[data-pricing-lines]");
        if (container) {
          const name = target.dataset.presetName || "Chi phí";
          const existing = collectPricingLines(form).some(line => normalizeSearchText(line.name) === normalizeSearchText(name));
          if (existing) {
            showToast(`${name} đã có trong bảng tính.`, "warning");
          } else {
            container.querySelector("[data-pricing-empty]")?.remove();
            const index = container.querySelectorAll("[data-pricing-line-row]").length;
            container.insertAdjacentHTML("beforeend", renderPricingLineInput({ name, type: target.dataset.presetType || "fixed", value: 0 }, index));
            hydrateIcons(container);
            updateTeamPricingPreview(form);
          }
        }
      }
      if (target.matches("[data-add-pricing-scenario]")) {
        const form = target.closest("form");
        const container = form?.querySelector("[data-pricing-scenarios]");
        if (container) {
          container.querySelector("[data-pricing-empty]")?.remove();
          const index = container.querySelectorAll("[data-pricing-scenario-row]").length;
          const scenario = normalizePricingScenario({ name: `Kịch bản ${index + 1}`, targetMargin: 35, manualPrice: 0 });
          container.insertAdjacentHTML("beforeend", renderPricingScenarioInput(scenario, index, scenario.id));
          hydrateIcons(container);
          selectPricingScenario(form, scenario.id);
        }
      }
      if (target.matches("[data-apply-pricing-scenario]")) {
        const form = target.closest("form");
        try {
          setBusy(target, true);
          await applyPricingFromForm(form, target.dataset.applyPricingTarget || "offline", target.dataset.applyPricingScenario || "");
        } catch (error) {
          showToast(error.message || String(error), "error");
        } finally {
          setBusy(target, false);
        }
      }
      if (target.matches("[data-remove-pricing-row]")) {
        const form = target.closest("form");
        const row = target.closest("[data-pricing-line-row], [data-pricing-scenario-row]");
        const removedScenarioId = row?.dataset.pricingScenarioId || "";
        row?.remove();
        if (removedScenarioId) {
          const nextScenario = form?.querySelector("[data-pricing-scenario-row]");
          if (nextScenario) selectPricingScenario(form, nextScenario.dataset.pricingScenarioId);
        }
        refreshPricingBuilderState(form);
        updateTeamPricingPreview(form);
      }
      if (target.matches("[data-select-pricing-scenario], [data-choose-pricing-result]")) {
        const form = target.closest("form");
        selectPricingScenario(form, target.dataset.choosePricingResult || target.value || "");
      }
      if (target.matches("[data-open-pricing-product-picker]")) {
        openModal("pricingProductPicker");
      }
      if (target.dataset.selectPricingProduct) {
        selectPricingProduct(target.dataset.selectPricingProduct);
      }
      if (target.matches("[data-open-product-options]")) openModal("productOptions", { optionType: "category" });
      if (target.dataset.productOptionType) openModal("productOptions", { optionType: target.dataset.productOptionType });
      if (target.dataset.editProductOption) openModal("productOptions", { optionType: target.dataset.optionType, editOptionId: target.dataset.editProductOption });
      if (target.matches("[data-cancel-product-option-edit]")) openModal("productOptions", { optionType: target.dataset.optionType });
      if (target.dataset.saveProductOption) {
        const id = target.dataset.saveProductOption;
        const type = target.dataset.optionType;
        const input = els.modalForm && els.modalForm.querySelector(`[data-product-option-edit-name="${id}"]`);
        const name = String(input ? input.value : "").trim();
        if (!name) showToast("Tên thuộc tính không được để trống.", "error");
        else {
          try {
            const response = await withLoading("Đang đổi tên thuộc tính...", () => apiRequest("/products/options/update", { method: "POST", body: JSON.stringify({ id, name }) }));
            await loadProducts({ quiet: true });
            renderPage();
            openModal("productOptions", { optionType: type });
            showToast(`Đã đổi tên và cập nhật ${Number(response.updatedProducts || 0)} sản phẩm.`);
          } catch (error) { showToast(error.message, "error"); }
        }
      }
      if (target.dataset.createProductOption) {
        const type = target.dataset.createProductOption;
        const input = els.modalForm && els.modalForm.querySelector(`[data-product-option-name][data-option-type="${type}"]`);
        const name = String(input ? input.value : "").trim();
        if (!name) {
          showToast("Hãy nhập tên thuộc tính.", "error");
        } else {
          try {
            const response = await withLoading("Đang thêm thuộc tính...", () => apiRequest("/products/options/create", { method: "POST", body: JSON.stringify({ type, name }) }));
            const saved = normalizeProductOption(response.option);
            const existingIndex = (state.productOptions || []).findIndex(option => option.id === saved.id);
            if (existingIndex >= 0) state.productOptions[existingIndex] = saved;
            else state.productOptions.push(saved);
            window.ArtFlowPosStore.save(state);
            openModal("productOptions", { optionType: type });
            showToast(`Đã thêm ${productOptionLabels[type].toLowerCase()}.`);
          } catch (error) {
            showToast(error.message, "error");
          }
        }
      }
      if (target.dataset.toggleProductOption) {
        const type = target.dataset.optionType;
        const nextStatus = target.dataset.nextStatus;
        const usage = Number(target.dataset.optionUsage || 0);
        if (nextStatus === "archived" && usage > 0 && !window.confirm(`Thuộc tính này đang dùng cho ${usage} sản phẩm. Ngừng dùng sẽ chỉ ẩn khỏi form sản phẩm mới, tiếp tục?`)) return;
        try {
          const response = await withLoading("Đang cập nhật thuộc tính...", () => apiRequest("/products/options/toggle", { method: "POST", body: JSON.stringify({ id: target.dataset.toggleProductOption, status: nextStatus }) }));
          const saved = normalizeProductOption(response.option);
          state.productOptions = (state.productOptions || []).map(option => option.id === saved.id ? saved : option);
          window.ArtFlowPosStore.save(state);
          openModal("productOptions", { optionType: type });
          showToast(nextStatus === "active" ? "Đã đưa thuộc tính vào sử dụng." : "Đã ngừng dùng thuộc tính.");
        } catch (error) {
          showToast(error.message, "error");
        }
      }
      if (target.matches("[data-open-customer]")) openModal("customer", { selectForOrder: Boolean(target.dataset.orderQuickCustomer) });
      if (target.matches("[data-open-receipt-settings]")) openModal("receiptSettings");
      if (target.matches("[data-open-product-picker]")) {
        const popup = els.orderCreateForm && els.orderCreateForm.querySelector("[data-order-product-popup]");
        if (popup) {
          popup.hidden = false;
          const search = popup.querySelector("[data-product-picker-search]");
          if (search) search.focus();
        }
      }
      if (target.matches("[data-close-product-picker]")) {
        const popup = target.closest("[data-order-product-popup]");
        if (popup) popup.hidden = true;
      }
      if (target.matches("[data-reset-product-picker]")) {
        resetProductPicker(target.closest(".product-picker"));
      }
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
      if (target.matches("[data-open-inventory-movements]")) openInventoryMovements();
      if (target.matches("[data-close-inventory-movements]")) closeInventoryMovements();
      if (target.matches("[data-stock-receive-product]")) openModal("stockReceive", { productId: target.dataset.stockReceiveProduct });
      if (target.matches("[data-stock-adjust-product]")) openModal("stockAdjust", { productId: target.dataset.stockAdjustProduct });
      if (target.matches("[data-reset-inventory-filters]")) {
        Object.assign(inventoryFilters, { category: "all", stock: "all", sort: "risk" });
        renderInventory();
      }
      if (target.matches("[data-open-cash-transaction]")) openModal("cashTransaction");
      if (target.matches("[data-open-payroll-expense]")) openModal("payrollExpense");
      if (target.matches("[data-open-accounting-export]")) {
        accountingExportScope = target.dataset.accountingExportScope || accountingFilters.view || "ledger";
        openModal("accountingExport");
      }
      if (target.matches("[data-open-accounting-profit-details]")) openModal("accountingProfitDetails");
      if (target.matches("[data-open-accounting-ledger-analysis]")) openModal("accountingLedgerAnalysis");
      if (target.dataset.exportAccountingReport) {
        exportAccountingReport(target.dataset.exportAccountingReport);
        closeModal();
      }
      if (target.matches("[data-open-accounting-account]")) openModal("accountingAccount");
      if (target.matches("[data-open-accounting-reconciliation]")) openModal("accountingReconciliation");
      if (target.matches("[data-open-accounting-category]")) {
        openModal("accountingCategory", { categoryType: target.dataset.categoryType || "expense" });
      }
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
        const url = new URL(window.location.href);
        url.searchParams.set("view", accountingFilters.view);
        window.history.replaceState({ accountingView: accountingFilters.view }, "", url);
        renderNav();
        renderPage();
      }
      if (target.dataset.accountingJump) {
        accountingFilters.view = target.dataset.accountingJump;
        renderPage();
      }
      if (target.dataset.accountingDebtView) { accountingFilters.debtView = target.dataset.accountingDebtView; renderPage(); }
      if (target.dataset.editCashTransaction) {
        const transaction = (state.cashTransactions || []).find(item => item.id === target.dataset.editCashTransaction);
        if (transaction) openModal("cashTransaction", { transaction });
      }
      if (target.matches("[data-open-platform-payout]")) openModal("platformPayout");
      if (target.dataset.viewPlatformPayout) {
        const payout = (state.platformPayouts || []).find(item => item.id === target.dataset.viewPlatformPayout);
        if (payout) openModal("platformPayoutDetail", { platformPayout: payout });
      }
      if (target.dataset.matchPlatformPayout) {
        await withLoading("Đang ghép đơn với payout...", () => apiRequest("/accounting/payouts/match", { method:"POST", body:JSON.stringify({ id:target.dataset.matchPlatformPayout }) }));
        await loadAccountingData({ quiet:true }); renderPage(); showToast("Đã hoàn tất ghép đơn có mã phù hợp.");
      }
      if (target.dataset.postPlatformPayout && window.confirm("Ghi nhận tiền sàn chuyển về tài khoản đã chọn? Thao tác này chỉ được thực hiện một lần.")) {
        await withLoading("Đang ghi nhận tiền sàn về...", () => apiRequest("/accounting/payouts/post", { method:"POST", body:JSON.stringify({ id:target.dataset.postPlatformPayout }) }));
        await loadAccountingData({ quiet:true }); renderPage(); showToast("Đã ghi nhận tiền sàn về sổ quỹ.");
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
      if (target.dataset.accountingCategoryFilter) {
        accountingFilters.categoryType = target.dataset.accountingCategoryFilter;
        document.querySelectorAll("[data-accounting-category-filter]").forEach(button => {
          button.classList.toggle("active", button.dataset.accountingCategoryFilter === accountingFilters.categoryType);
        });
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
      if (target.dataset.exportPurchaseOrder) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.exportPurchaseOrder);
        if (purchaseOrder) {
          try {
            await withLoading("Đang xuất Excel phiếu mua...", () => exportPurchaseOrderExcel(purchaseOrder));
            showToast("Đã xuất Excel phiếu mua.");
          } catch (error) {
            showToast(error.message || String(error), "error");
          }
        }
      }
      if (target.dataset.printPurchaseOrder) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.printPurchaseOrder);
        if (purchaseOrder) printPurchaseOrderPdf(purchaseOrder);
      }
      if (target.dataset.payPurchase) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.payPurchase);
        if (purchaseOrder) openPurchasePaymentModal(purchaseOrder, { source: page });
      }
      if (target.dataset.accountingPayPurchase) {
        const purchaseOrder = byId("purchaseOrders", target.dataset.accountingPayPurchase);
        if (purchaseOrder) openPurchasePaymentModal(purchaseOrder, { source: "accounting" });
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
      if (target.dataset.editProductFromDetail) {
        const product = byId("products", target.dataset.editProductFromDetail);
        if (product) openModal("product", { product });
      }
      if (target.dataset.viewProduct) {
        const product = byId("products", target.dataset.viewProduct);
        if (product) openModal("productDetail", { product });
      }
      if (target.dataset.viewCustomer) {
        const customer = byId("customers", target.dataset.viewCustomer);
        if (customer) openModal("customerDetail", { customerDetail: customer });
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
      if (target.matches("[data-provision-missing-products]")) {
        const missingCount = state.products.filter(product => product.status !== "deleted" && (!product.contentDocUrl || !product.mediaFolderUrl || !product.imageFolderUrl || !product.videoFolderUrl)).length;
        if (missingCount && window.confirm(`Tạo hoặc bổ sung tài nguyên cho ${missingCount} sản phẩm? Hệ thống chỉ tạo những phần còn thiếu và xử lý theo từng nhóm nhỏ.`)) {
          try {
            let created = 0;
            let remaining = missingCount;
            const failures = [];
            await withLoading("Đang tạo tài nguyên sản phẩm...", async () => {
              for (let iteration = 0; iteration < 200 && remaining > 0; iteration += 1) {
                if (els.loadingText) els.loadingText.textContent = `Đang tạo tài nguyên · còn khoảng ${remaining} sản phẩm...`;
                const response = await apiRequest("/products/provision-missing-content", {
                  method: "POST",
                  body: JSON.stringify({ batchSize: 3 })
                });
                (response.products || []).map(normalizeProduct).forEach(saved => {
                  state.products = state.products.map(product => product.id === saved.id ? saved : product);
                });
                created += Number(response.created || 0);
                remaining = Number(response.remaining || 0);
                failures.push(...(response.failures || []));
                if (response.failed || !response.processed) break;
              }
            });
            window.ArtFlowPosStore.save(state);
            renderPage();
            if (failures.length) {
              const first = failures[0];
              showToast(`Đã tạo cho ${created} sản phẩm. Lỗi tại ${first.sku || first.name}: ${first.error}`, "error");
            } else {
              showToast(`Đã bổ sung đầy đủ tài nguyên cho ${created} sản phẩm.`);
            }
          } catch (error) {
            showToast(`Không thể tạo tài nguyên hàng loạt: ${error.message}`, "error");
          }
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
          list.insertAdjacentHTML("beforeend", renderOrderItemRowV2());
          updateOrderTotalPreviewV2(form);
        }
      }
      if (target.matches("[data-remove-order-item]")) {
        const form = target.closest("form") || els.modalForm;
        target.closest("[data-order-item-row]").remove();
        updateOrderTotalPreviewV2(form);
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
      if (event.key === "Escape") {
        closeInventoryMovements();
        closeModal();
      }
    });

    if (els.inventoryMovementsOverlay) {
      els.inventoryMovementsOverlay.addEventListener("click", event => {
        if (event.target === els.inventoryMovementsOverlay) closeInventoryMovements();
      });
    }

    document.addEventListener("input", event => {
      if (event.target.matches("#costPrice, #salePrice")) updateProductPricingPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-product-picker-search], [data-product-picker-filter], [data-product-picker-sort]")) filterProductPicker(event.target);
      if (event.target.matches("[data-purchase-product-search]")) filterPurchaseProductPicker(event.target);
      if (event.target.matches("[data-order-quantity], [data-order-price], [data-order-line-discount], [data-order-money]")) updateOrderTotalPreviewV2(event.target.closest("form") || els.orderCreateForm || els.modalForm);
      if (event.target.matches("[data-purchase-quantity], [data-purchase-cost], [data-purchase-money]")) updatePurchaseTotalPreview(event.target.closest("form") || els.purchaseCreateForm);
      if (event.target.matches("[data-return-quantity]")) updatePurchaseReturnPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-order-return-quantity]")) updateOrderReturnPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-reconciliation-actual]")) updateReconciliationPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-payroll-money]")) updatePayrollPreview(event.target.closest("form") || els.modalForm);
      if (event.target.matches("[data-team-pricing-input]")) {
        updatePricingLineState(event.target);
        updateTeamPricingPreview(event.target.closest("form") || els.modalForm);
      }
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
      if (event.target.matches("[data-product-picker-filter], [data-product-picker-sort]")) filterProductPicker(event.target);
      if (event.target.matches("#teamPricingTarget")) updatePricingScopeFields(event.target.closest("form"));
      if (event.target.matches("#teamPricingChannel")) syncPricingTitle(event.target.closest("form"));
      if (event.target.matches("[data-payout-channel-filter]")) { accountingFilters.payoutChannel = event.target.value; renderPage(); }
      if (event.target.matches("[data-payout-status-filter]")) { accountingFilters.payoutStatus = event.target.value; renderPage(); }
      if (event.target.matches("[data-payout-range-filter]")) { accountingFilters.payoutRange = event.target.value; renderPage(); }
      if (event.target.matches("[data-pricing-line-type], [data-pricing-line-included]")) updatePricingLineState(event.target);
      if (event.target.matches("[data-select-pricing-scenario]")) selectPricingScenario(event.target.closest("form"), event.target.value);
      if (event.target.matches("[data-inventory-filter]")) {
        inventoryFilters[event.target.dataset.inventoryFilter] = event.target.value;
        renderInventory();
      }
      if (event.target.matches("#channelId, #productId") && event.target.closest("[data-modal-type='channelProduct']")) {
        syncChannelProductForm(event.target.closest("form"));
      }
      if (event.target.matches("[data-omni-filter]")) {
        omniFilters[event.target.dataset.omniFilter] = event.target.value;
        renderOmniWorkspace();
      }
      if (event.target.matches("[data-channel-settings-status]")) {
        channelSettingsFilters.status = event.target.value;
        renderOmniWorkspace();
      }
      if (event.target.matches("[data-content-filter]")) {
        contentFilters[event.target.dataset.contentFilter] = event.target.value;
        renderContentWorkspace();
      }
      if (event.target.matches("[data-content-template]")) {
        const form = event.target.closest("form");
        const brief = form?.querySelector("[data-content-brief]");
        const template = contentBriefTemplates[event.target.value];
        if (brief && template && !brief.value.trim()) brief.value = template.brief;
        applyContentAutomation(form, "gentle");
      }
      if (event.target.matches("#contentProductId")) {
        applyContentAutomation(event.target.closest("form"), "product");
      }
      if (event.target.matches("#contentType, #contentChannel")) {
        applyContentAutomation(event.target.closest("form"), "gentle");
      }
      if (event.target.matches("[data-team-status-filter]")) {
        teamFilters.status = event.target.value;
        renderTeamHub();
      }
      if (event.target.matches("[data-team-owner-filter]")) {
        teamFilters.owner = event.target.value;
        renderTeamHub();
      }
      if (event.target.matches("[data-team-range-filter]")) {
        teamFilters.range = event.target.value;
        renderTeamHub();
      }
      if (event.target.matches("[data-team-pricing-product]")) {
        const product = byId("products", event.target.value);
        const form = event.target.closest("form");
        if (product && form?.baseCost) {
          form.baseCost.value = product.costPrice || 0;
          updateTeamPricingPreview(form);
        }
      }
      if (event.target.matches("[data-supplier-status-filter]")) {
        supplierFilters.status = event.target.value;
        renderPurchasing();
      }
      if (event.target.matches("[data-supplier-balance-filter]")) {
        supplierFilters.balance = event.target.value;
        renderPurchasing();
      }
      if (event.target.matches("[data-order-product], #customerId, #roundingStep, #paymentMethod")) updateOrderTotalPreviewV2(event.target.closest("form") || els.orderCreateForm || els.modalForm);
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
      if (event.target.matches("[data-reconciliation-adjust]")) {
        updateReconciliationPreview(event.target.closest("form") || els.modalForm);
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
      if (event.target.matches("[data-order-product-popup]")) event.target.hidden = true;
    });
  }

  const { activeSalesChannels, channelByIdOrCode, reservedStockForProduct, channelProductRows, filteredChannelProductRows, renderStaticOmniWorkspace, renderChannelSettings, renderOmniWorkspace } = window.ArtFlowPageModules.channels ? window.ArtFlowPageModules.channels.create({ normalizeChannelProduct, normalizeInventoryReservation, normalizeProduct, normalizeSalesChannel, channelSettingsFilters, channels, enhanceResponsiveTables, escapeAttribute, escapeHtml, getSearchTerm: () => searchTerm, hydrateIcons, icon, money, omniFilters, qs, state }) : Object.fromEntries(["activeSalesChannels","channelByIdOrCode","reservedStockForProduct","channelProductRows","filteredChannelProductRows","renderStaticOmniWorkspace","renderChannelSettings","renderOmniWorkspace"].map(name => [name, function () {}]));
  const { teamOwners, teamDateInRange, teamSearchText, currentTeamItems, setTeamOptions, renderTeamFilters, renderTeamHub, selectedIncenseOfferings, syncIncenseOfferings, renderOfferingTray, renderIncense, submitIncenseWish, teamStatusBadge, renderTeamTasks, renderTeamMeetings, renderTeamPlans, pricingLineAmount, roundedPricingValue, calculatePricingScenario, pricingTotals, renderTeamPricing, teamPricingPageContext, renderTeamPricingPage, submitTeamPricingPageForm, renderTeamDecisions, teamOwnerOptions, teamProductOptions, teamChannelOptions, pricingMarketplaceChannels, pricingChannelOptions, pricingTargetLabel, pricingSuggestedTitle, renderTeamSourceAndComments, appendTeamCommentLog, actionRowsFromText, textFromActionRows, localDateTimeValue, meetingTypeOptions, meetingStatusOptions, actionStatusOptions, splitListText, meetingMinutesIdFromUrl, setMeetingMinutesUrl, renderMinutesTextRows, renderMinutesActions, renderMinutesAttendees, renderMeetingMinutesForm, renderMeetingMinutesList, renderMeetingMinutesPage, valuesFromMinutesRows, syncMeetingMinutesForm, addMinutesTextRow, addMinutesAction, applyMeetingTemplate, parseQuickMeetingNote, cleanMeetingMinutesText, submitMeetingMinutesForm, renderMeetingForm, renderPlanForm, renderPricingForm, renderPricingSelectedProduct, renderPricingProductPicker, renderPricingProductPickerCard, selectPricingProduct, renderPricingLineInput, renderPricingScenarioInput, renderDecisionForm, collectPricingLines, collectPricingScenarios, refreshPricingBuilderState, updatePricingScopeFields, syncPricingTitle, updatePricingLineState, selectPricingScenario, updateTeamPricingPreview, teamApiCollection, teamApiItemType, pricingModelFromForm, validatePricingModel } = window.ArtFlowPageModules.team ? window.ArtFlowPageModules.team.create({ normalizeIncenseWish, normalizePricingLine, normalizePricingModel, normalizePricingScenario, normalizeSalesChannel, normalizeTeamAction, normalizeTeamDecision, normalizeTeamMeeting, normalizeTeamPlan, normalizeWorkspaceTask, apiRequest, byId, channelByIdOrCode, closeModal, currentUser, els, enhanceMoneyInputs, enhanceResponsiveTables, escapeAttribute, escapeHtml, formatDate, formatDateTime, formatDateTimeShort, hydrateIcons, icon, incenseKinds, incenseOfferings, localDateValue, money, ownerName, productHasShopPrice, productSearchText, qs, renderProductThumb, saveTeamItem, searchTerm, setBusy, showToast, state, teamFilters, teamStatuses, teamViews }) : Object.fromEntries(["teamOwners","teamDateInRange","teamSearchText","currentTeamItems","setTeamOptions","renderTeamFilters","renderTeamHub","selectedIncenseOfferings","syncIncenseOfferings","renderOfferingTray","renderIncense","submitIncenseWish","teamStatusBadge","renderTeamTasks","renderTeamMeetings","renderTeamPlans","pricingLineAmount","roundedPricingValue","calculatePricingScenario","pricingTotals","renderTeamPricing","teamPricingPageContext","renderTeamPricingPage","submitTeamPricingPageForm","renderTeamDecisions","teamOwnerOptions","teamProductOptions","teamChannelOptions","pricingMarketplaceChannels","pricingChannelOptions","pricingTargetLabel","pricingSuggestedTitle","renderTeamSourceAndComments","appendTeamCommentLog","actionRowsFromText","textFromActionRows","localDateTimeValue","meetingTypeOptions","meetingStatusOptions","actionStatusOptions","splitListText","meetingMinutesIdFromUrl","setMeetingMinutesUrl","renderMinutesTextRows","renderMinutesActions","renderMinutesAttendees","renderMeetingMinutesForm","renderMeetingMinutesList","renderMeetingMinutesPage","valuesFromMinutesRows","syncMeetingMinutesForm","addMinutesTextRow","addMinutesAction","applyMeetingTemplate","parseQuickMeetingNote","cleanMeetingMinutesText","submitMeetingMinutesForm","renderMeetingForm","renderPlanForm","renderPricingForm","renderPricingSelectedProduct","renderPricingProductPicker","renderPricingProductPickerCard","selectPricingProduct","renderPricingLineInput","renderPricingScenarioInput","renderDecisionForm","collectPricingLines","collectPricingScenarios","refreshPricingBuilderState","updatePricingScopeFields","syncPricingTitle","updatePricingLineState","selectPricingScenario","updateTeamPricingPreview","teamApiCollection","teamApiItemType","pricingModelFromForm","validatePricingModel"].map(name => [name, function () {}]));
  const { syncAccountingView, commerceChannelLabel, payoutStatusMeta, renderCommerceAccounting, renderAccounting, productProfitRowsFromSnapshot, renderAccountingProfit, renderAccountingLedgerAnalysis, renderAccountingProfitDetails } = window.ArtFlowPageModules.accounting ? window.ArtFlowPageModules.accounting.create({ accountTypeLabel, accountingExportRange, accountingFilters, accountingPayrollRows, accountingRangeLabel, accountingTransactionTarget, accountingTypeLabel, byId, canManageAccounting, channelByIdOrCode, channels, collectedForOrder, els, escapeAttribute, escapeHtml, formatDate, getAccountingAccount, getAccountingCategory, getCustomer, getSupplier, icon, isPayrollTransaction, localDateValue, money, orderAgeDays, orderCost, outstandingForOrder, page, profitSnapshot, purchaseDueDays, reportDayKey, returnedOrderItemQuantity, searchTerm, shiftDateValue, state }) : Object.fromEntries(["syncAccountingView","commerceChannelLabel","payoutStatusMeta","renderCommerceAccounting","renderAccounting","productProfitRowsFromSnapshot","renderAccountingProfit","renderAccountingLedgerAnalysis","renderAccountingProfitDetails"].map(name => [name, function () {}]));
  const { renderPurchasing, closeManagementDrawers, openSupplierDetail, openPurchaseDetail } = window.ArtFlowPageModules.purchasing ? window.ArtFlowPageModules.purchasing.create({ byId, canManagePurchasing, canPayPurchases, canReturnPurchaseOrder, els, enhanceResponsiveTables, escapeHtml, formatDate, getSearchTerm: () => searchTerm, getSupplier, hydrateIcons, icon, localDateValue, money, purchaseItemSummary, purchasingFilters, purchasingOrderTarget, state, statusLabel, supplierFilters, supplierTarget }) : Object.fromEntries(["renderPurchasing","closeManagementDrawers","openSupplierDetail","openPurchaseDetail"].map(name => [name, function () {}]));
  const { renderReports } = window.ArtFlowPageModules.reports ? window.ArtFlowPageModules.reports.create({ byId, channelLabel, channels, comparisonText, els, formatDate, money, orderCost, profitSnapshot, reportDayKey, reportFilters, returnedOrderItemQuantity }) : Object.fromEntries(["renderReports"].map(name => [name, function () {}]));

  injectSharedUi();
  hydrateIcons(document);
  bindEvents();
  if (page === "auth") bootstrapAuthPage();
  else {
    bootstrapAppPage();
    if (page === "activity") {
      window.setInterval(async () => {
        if (document.hidden || !currentUser || !isAdmin()) return;
        try {
          await loadAuditLogs();
          renderAuditLogs();
        } catch {
          // Connection status is handled centrally; keep the visible history intact.
        }
      }, 30000);
    }
  }
})();
