export function createArtflowFixture() {
  const now = "2026-06-29T09:30:00+07:00";
  const user = {
    id: "user-admin",
    name: "Phan Ton Loc Nguyen",
    email: "admin@artflow.local",
    role: "admin",
    status: "active"
  };
  const users = [
    user,
    { id: "user-content", name: "Minh Anh", email: "content@artflow.local", role: "sales", status: "active" },
    { id: "user-inventory", name: "Kho ArtFlow", email: "kho@artflow.local", role: "inventory", status: "active" }
  ];
  const products = [
    product("prod-001", "ART001", "But chi 2B Faber Castell", "But chi", "Faber Castell", 5000, 8000, 42, 15, "https://placehold.co/160x160/eef6ff/1f2937?text=2B"),
    product("prod-002", "ART002", "But chi 4B Faber Castell", "But chi", "Faber Castell", 6000, 9000, 4, 5, "https://placehold.co/160x160/f3f4f6/1f2937?text=4B"),
    product("prod-003", "ART003", "But chi 6B Staedtler", "But chi", "Staedtler", 7000, 11000, 6, 10, "https://placehold.co/160x160/eff6ff/1f2937?text=6B"),
    product("prod-004", "ART004", "Bang pha mau nhua", "Phu kien", "ArtFlow", 9000, 15000, 18, 8, "https://placehold.co/160x160/ecfeff/155e75?text=Palette"),
    product("prod-005", "ART005", "Mau nuoc Giorgione 24 mau", "Mau ve", "Giorgione", 153000, 223000, 11, 4, "https://placehold.co/160x160/fef3c7/92400e?text=24+Mau")
  ];
  const customers = [
    customer("cust-001", "Nguyen Minh Anh", "990388981", "ban-le", 990000, "2026-06-27T14:20:00+07:00", 80),
    customer("cust-002", "Blue Studio", "0909123456", "studio", 5145000, "2026-06-25T10:10:00+07:00", 260)
  ];
  const orders = [
    order("ord-001", "POS-20260627-0001", "cust-001", "completed", "paid", "pos", "delivered", 236000, 0, "2026-06-27T01:48:36+07:00", [
      orderItem("oi-001", "ord-001", products[1], 1, 9000),
      orderItem("oi-002", "ord-001", products[4], 1, 223000)
    ], { receiptPdfUrl: "https://drive.google.com/file/d/fake-receipt-1/view" }),
    order("ord-002", "SHP-20260625-0002", "cust-002", "completed", "unpaid", "shopee", "shipping", 145000, 0, "2026-06-25T15:30:00+07:00", [
      orderItem("oi-003", "ord-002", products[0], 3, 8000),
      orderItem("oi-004", "ord-002", products[3], 2, 15000)
    ])
  ];
  const accountingAccounts = [
    { id: "acc-cash", name: "Tien mat", type: "cash", openingBalance: 25000000, currentBalance: 24923000, status: "active", createdAt: now, updatedAt: now },
    { id: "acc-bank", name: "Ngan hang", type: "bank", openingBalance: 0, currentBalance: 236000, status: "active", createdAt: now, updatedAt: now }
  ];
  const accountingCategories = [
    { id: "cat-sales", name: "Thu ban hang", type: "income", status: "active" },
    { id: "cat-stock", name: "Nhap hang", type: "expense", status: "active" },
    { id: "cat-payroll", name: "Luong / cong tac vien", type: "expense", status: "active" },
    { id: "cat-marketing", name: "Marketing", type: "expense", status: "active" }
  ];
  const cashTransactions = [
    tx("tx-001", "income", "acc-bank", "cat-sales", 236000, "2026-06-27", "Thu don POS-20260627-0001", "order", "POS-20260627-0001"),
    tx("tx-002", "expense", "acc-cash", "cat-stock", 1000000, "2026-06-24", "Nhap hang ve", "purchase_order", "PO-20260624-0001"),
    tx("tx-003", "expense", "acc-cash", "cat-marketing", 100000, "2026-06-20", "Chay quang cao", "manual", "")
  ];
  const suppliers = [
    { id: "sup-001", code: "NCC-0001", name: "Art Supplies VN", phone: "090000001", email: "sales@supplier.local", taxCode: "", address: "HCM", status: "active", totalPurchased: 1800000, outstanding: 800000, creditBalance: 0, lastPurchaseAt: "2026-06-24T09:00:00+07:00", note: "" }
  ];
  const purchaseOrders = [
    { id: "po-001", code: "PO-20260624-0001", supplierId: "sup-001", status: "received", paymentStatus: "partial", subtotal: 1800000, discount: 0, shippingFee: 0, total: 1800000, paidAmount: 1000000, creditAppliedAmount: 0, settledAmount: 1000000, returnedAmount: 0, netTotal: 1800000, outstanding: 800000, creditAmount: 0, dueDate: "2026-07-04", invoiceNumber: "INV-001", note: "", createdBy: user.id, receivedAt: "2026-06-24T09:00:00+07:00", createdAt: "2026-06-24T08:30:00+07:00", updatedAt: "2026-06-24T09:00:00+07:00", items: [] }
  ];
  const stockMovements = [
    movement("mv-001", products[1], "low_stock_audit", -1, 5, 4, "Kiem kho nhanh", "manual"),
    movement("mv-002", products[4], "sale", -1, 12, 11, "Tao don POS-20260627-0001", "order")
  ];
  const contentItems = [
    {
      id: "content-001",
      type: "campaign",
      title: "Back to school - but chi",
      status: "drafting",
      channel: "facebook",
      productId: "prod-001",
      owner: "user-content",
      dueDate: "2026-07-03",
      brief: "Goi y combo but chi cho hoc sinh.",
      contentDocUrl: "https://docs.google.com/document/d/fake-doc",
      mediaFolderUrl: "https://drive.google.com/drive/folders/fake-folder",
      postLinks: "",
      createdAt: now,
      updatedAt: now
    }
  ];
  const teamMeetings = [
    {
      id: "team-meeting-001",
      title: "Hop ke hoach thang 7",
      status: "scheduled",
      owner: "user-admin",
      meetingDate: "2026-06-30",
      participants: "Admin, Content, Kho",
      agenda: "Doanh thu, hang can nhap, lich content",
      decisions: "Tap trung combo back to school",
      nextActions: "Chot bang gia combo",
      createdAt: now,
      updatedAt: now
    }
  ];
  const teamPlans = [
    { id: "team-plan-001", title: "Ke hoach Back to School", status: "active", owner: "user-admin", period: "2026-07", goal: "Tang doanh thu but ve 20%", budget: 2500000, expectedRevenue: 18000000, tasks: "Nhap hang, content, chay ads", createdAt: now, updatedAt: now }
  ];
  const teamPricingModels = [
    { id: "team-price-001", title: "Gia combo but chi", status: "draft", owner: "user-admin", productId: "prod-001", baseCost: 5000, overheadPercent: 8, targetMarginPercent: 35, lines: [{ label: "Bao bi", amount: 500 }], scenarios: [{ label: "Ban le", price: 9000 }], createdAt: now, updatedAt: now }
  ];
  const teamDecisions = [
    { id: "team-decision-001", title: "Giu gia but chi 2B", status: "approved", owner: "user-admin", decisionDate: "2026-06-29", context: "Can giu bien loi nhuan tot", decision: "Gia ban 8.000d", impact: "On dinh POS va san", createdAt: now, updatedAt: now }
  ];

  return {
    user,
    users,
    products,
    productOptions: [
      option("category", "But chi"),
      option("category", "Phu kien"),
      option("category", "Mau ve"),
      option("brand", "Faber Castell"),
      option("brand", "Staedtler"),
      option("brand", "Giorgione"),
      option("unit", "cai"),
      option("unit", "hop")
    ],
    contentOwners: users.map(({ id, name, email }) => ({ id, name, email })),
    contentItems,
    teamMeetings,
    teamPlans,
    teamPricingModels,
    teamDecisions,
    customers,
    orders,
    salesReturns: [],
    orderRefunds: [],
    stockMovements,
    accountingAccounts,
    accountingCategories,
    accountingReconciliations: [],
    cashTransactions,
    suppliers,
    purchaseOrders,
    supplierPayments: [],
    purchaseReturns: [],
    supplierCreditApplications: [],
    auditLogs: [
      { id: "audit-001", action: "createOrder", description: "Tao don hang", entityType: "order", entityId: "ord-001", actorId: user.id, actorName: user.name, actorEmail: user.email, detail: { result: { order: orders[0] } }, createdAt: "2026-06-27T01:48:36+07:00", timezone: "Asia/Ho_Chi_Minh" }
    ]
  };
}

function product(id, sku, name, category, brand, costPrice, salePrice, stock, lowStock, imageUrl) {
  return {
    id,
    sku,
    name,
    category,
    brand,
    barcode: "",
    unit: "cai",
    weightGrams: 0,
    dimensions: "",
    origin: "Vietnam",
    material: "",
    costPrice,
    salePrice,
    stock,
    lowStock,
    imageUrl,
    shortDescription: `${name} dung cho cua hang hoa cu.`,
    keyFeatures: "De ban, de bao quan",
    targetAudience: "Hoc sinh, sinh vien, studio",
    seoKeywords: name,
    contentStatus: "drafting",
    contentOwner: "user-content",
    contentNote: "",
    websiteProductUrl: "",
    shopeeProductUrl: "",
    tiktokProductUrl: "",
    facebookProductUrl: "",
    contentPostLinks: "",
    contentDocId: "",
    contentDocUrl: "",
    mediaFolderId: "",
    mediaFolderUrl: "",
    imageFolderId: "",
    imageFolderUrl: "",
    videoFolderId: "",
    videoFolderUrl: "",
    status: "active",
    createdAt: "2026-06-20T08:00:00+07:00",
    updatedAt: "2026-06-29T09:00:00+07:00"
  };
}

function customer(id, name, phone, group, totalSpent, lastOrderAt, loyaltyPoints) {
  return { id, name, phone, email: "", group, status: "active", totalSpent, lastOrderAt, note: "", loyaltyPoints, createdAt: "2026-06-20T08:00:00+07:00", updatedAt: lastOrderAt };
}

function order(id, code, customerId, status, paymentStatus, channel, shippingStatus, subtotal, discount, createdAt, items, extra = {}) {
  const total = subtotal - discount;
  return {
    id,
    code,
    customerId,
    status,
    paymentStatus,
    paymentMethod: "cash",
    subtotal,
    discount,
    shippingFee: 0,
    total,
    returnedAmount: 0,
    refundedAmount: 0,
    netTotal: total,
    note: "",
    createdBy: "user-admin",
    createdAt,
    updatedAt: createdAt,
    channel,
    shippingStatus,
    carrier: "",
    trackingCode: "",
    items,
    ...extra
  };
}

function orderItem(id, orderId, product, quantity, unitPrice) {
  return {
    id,
    orderId,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    quantity,
    unitPrice,
    costPrice: product.costPrice,
    lineTotal: unitPrice * quantity,
    createdAt: "2026-06-27T01:48:36+07:00"
  };
}

function option(type, name) {
  return { id: `${type}-${name}`.toLowerCase().replace(/\s+/g, "-"), type, name, status: "active" };
}

function tx(id, type, accountId, categoryId, amount, transactionDate, description, referenceType, referenceId) {
  return { id, type, accountId, categoryId, amount, transactionDate, description, referenceType, referenceId, createdBy: "user-admin", status: "active", createdAt: `${transactionDate}T09:00:00+07:00`, updatedAt: `${transactionDate}T09:00:00+07:00` };
}

function movement(id, product, type, quantityDelta, stockBefore, stockAfter, reason, referenceType) {
  return { id, productId: product.id, sku: product.sku, productName: product.name, type, quantityDelta, stockBefore, stockAfter, reason, referenceType, referenceId: "", createdBy: "user-admin", createdAt: "2026-06-29T09:00:00+07:00" };
}
