(function () {
  function create(runtime) {
    const { byId, canManagePurchasing, canPayPurchases, canReturnPurchaseOrder, els, enhanceResponsiveTables, escapeHtml, formatDate, getSearchTerm, getSupplier, hydrateIcons, icon, localDateValue, money, normalizeSearchText, purchaseItemSummary, purchasingFilters, purchasingOrderTarget, state, statusLabel, supplierFilters, supplierProductHistory, supplierTarget } = runtime;

    function renderPurchasing() {
      if (!els.purchaseOrdersTable && !els.suppliersList) return;
      const term = getSearchTerm().trim().toLowerCase();
      const today = localDateValue();
      const orders = [...(state.purchaseOrders || [])]
        .filter(order => {
          if (purchasingFilters.savedView === "draft" && order.status !== "draft") return false;
          if (purchasingFilters.savedView === "unpaid" && !(order.status === "received" && order.outstanding > 0)) return false;
          if (purchasingFilters.savedView === "overdue" && !(order.outstanding > 0 && order.dueDate && order.dueDate < today)) return false;
          if (purchasingFilters.status !== "all" && order.status !== purchasingFilters.status) return false;
          if (purchasingFilters.paymentStatus !== "all" && order.paymentStatus !== purchasingFilters.paymentStatus) return false;
          if (!term) return true;
          const supplier = getSupplier(order);
          return [order.code, order.invoiceNumber, supplier.name, supplier.code, ...(order.items || []).flatMap(item => [item.name, item.sku])].join(" ").toLowerCase().includes(term);
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    
      document.querySelectorAll("[data-purchase-saved-view]").forEach(button => button.classList.toggle("active", button.dataset.purchaseSavedView === purchasingFilters.savedView));
      const purchaseCount = document.querySelector("[data-purchase-result-count]");
      if (purchaseCount) purchaseCount.textContent = `${orders.length} phiếu`;
    
      if (els.purchaseOrdersTable) {
        els.purchaseOrdersTable.innerHTML = orders.length ? orders.map(order => {
          const supplier = getSupplier(order);
          const isOverdue = order.outstanding > 0 && order.dueDate && order.dueDate < today;
          const actions = [];
          actions.push(`<button class="link-button icon-only action-export" type="button" data-export-purchase-order="${order.id}" aria-label="Xuất Excel phiếu mua" title="Xuất Excel phiếu mua">${icon("download")}</button>`);
          actions.push(`<button class="link-button icon-only action-print" type="button" data-print-purchase-order="${order.id}" aria-label="In/PDF phiếu mua" title="In/PDF phiếu mua">${icon("printer")}</button>`);
          if (canManagePurchasing() && order.status === "draft") actions.push(`<a class="link-button icon-only action-edit" href="./purchase-create.html?edit=${order.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</a><button class="link-button icon-only action-receive" type="button" data-receive-purchase="${order.id}" aria-label="Nhận hàng" title="Nhận hàng">${icon("truck")}</button>`);
          if (canReturnPurchaseOrder(order)) actions.push(`<button class="link-button icon-only action-return" type="button" data-return-purchase="${order.id}" aria-label="Trả hàng" title="Trả hàng">${icon("rotateCcw")}</button>`);
          if (canPayPurchases() && order.status === "received" && order.outstanding > 0) actions.push(`<button class="link-button icon-only action-pay" type="button" data-pay-purchase="${order.id}" aria-label="Thanh toán" title="Thanh toán">${icon("receipt")}</button>`);
          if (canPayPurchases() && order.status === "received" && order.outstanding > 0 && supplier.creditBalance > 0) actions.push(`<button class="link-button icon-only action-credit" type="button" data-apply-supplier-credit="${order.id}" aria-label="Bù trừ" title="Bù trừ">${icon("calculator")}</button>`);
          if (canManagePurchasing() && ["draft", "received"].includes(order.status) && order.paidAmount <= 0 && order.creditAppliedAmount <= 0 && order.returnedAmount <= 0) actions.push(`<button class="link-button danger-link icon-only" type="button" data-cancel-purchase="${order.id}" aria-label="Hủy" title="Hủy">${icon("close")}</button>`);
          return `
            <tr data-purchase-order-row="${order.id}" class="${isOverdue ? "overdue-row " : ""}${[order.id, order.code].includes(purchasingOrderTarget) ? "deep-link-highlight" : ""}">
              <td><strong>${order.code}</strong><br><small>${order.invoiceNumber || "Chưa có số hóa đơn"}</small></td>
              <td><a class="reference-link" href="./suppliers.html?supplierId=${encodeURIComponent(supplier.id)}"><strong>${supplier.name}</strong></a><br><small>${supplier.code}</small></td>
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
        const statusFilter = document.querySelector("[data-supplier-status-filter]");
        const balanceFilter = document.querySelector("[data-supplier-balance-filter]");
        const productFilter = document.querySelector("[data-supplier-product-filter]");
        if (statusFilter) statusFilter.value = supplierFilters.status;
        if (balanceFilter) balanceFilter.value = supplierFilters.balance;
        const suppliedProducts = (state.suppliers || []).flatMap(supplier => supplierProductHistory(supplier.id));
        if (productFilter) {
          const productChoices = [...new Map(suppliedProducts.map(entry => [entry.productId, entry])).values()]
            .sort((a, b) => a.productName.localeCompare(b.productName));
          productFilter.innerHTML = `<option value="all">Tất cả sản phẩm</option>${productChoices.map(entry => `<option value="${entry.productId}">${escapeHtml(entry.productName)} · ${escapeHtml(entry.productSku)}</option>`).join("")}`;
          productFilter.value = productChoices.some(entry => entry.productId === supplierFilters.product) ? supplierFilters.product : "all";
          supplierFilters.product = productFilter.value;
        }
        const supplierTerm = normalizeSearchText(supplierFilters.search || term);
        const suppliers = (state.suppliers || []).filter(supplier => {
          const productHistory = supplierProductHistory(supplier.id);
          if (supplierFilters.status !== "all" && supplier.status !== supplierFilters.status) return false;
          if (supplierFilters.balance === "payable" && supplier.outstanding <= 0) return false;
          if (supplierFilters.balance === "credit" && supplier.creditBalance <= 0) return false;
          if (supplierFilters.balance === "settled" && (supplier.outstanding > 0 || supplier.creditBalance > 0)) return false;
          if (supplierFilters.product !== "all" && !productHistory.some(entry => entry.productId === supplierFilters.product)) return false;
          if (!supplierTerm) return true;
          return normalizeSearchText([supplier.code, supplier.name, supplier.phone, supplier.email, supplier.taxCode, ...productHistory.flatMap(entry => [entry.productName, entry.productSku])].join(" ")).includes(supplierTerm);
        });
        const supplierCount = document.querySelector("[data-supplier-result-count]");
        if (supplierCount) supplierCount.textContent = `${suppliers.length} nhà cung cấp`;
        els.suppliersList.innerHTML = suppliers.length ? suppliers.map(supplier => {
          const isArchived = supplier.status === "archived";
          const productHistory = supplierProductHistory(supplier.id);
          const productSummary = productHistory.length
            ? `${productHistory.slice(0, 2).map(entry => escapeHtml(entry.productName)).join(", ")}${productHistory.length > 2 ? ` +${productHistory.length - 2}` : ""}`
            : "Chưa có lịch sử nhập";
          return `
            <tr class="supplier-row ${isArchived ? "archived" : ""} ${supplier.id === supplierTarget ? "deep-link-highlight" : ""}" data-supplier-card="${supplier.id}">
              <td><span class="supplier-identity"><strong>${escapeHtml(supplier.name)}</strong><small>${escapeHtml(supplier.code)}${supplier.taxCode ? ` · MST ${escapeHtml(supplier.taxCode)}` : ""}</small></span></td>
              <td><span class="supplier-contact"><strong>${escapeHtml(supplier.phone || "—")}</strong><small>${escapeHtml(supplier.email || "Chưa có email")}</small></span></td>
              <td><span class="supplier-contact"><strong>${productHistory.length} sản phẩm</strong><small>${productSummary}</small></span></td>
              <td><strong>${money.format(supplier.totalPurchased)}</strong></td>
              <td><strong class="${supplier.outstanding > 0 ? "danger-text" : ""}">${money.format(supplier.outstanding)}</strong></td>
              <td>${money.format(supplier.creditBalance)}</td>
              <td>${supplier.lastPurchaseAt ? formatDate(supplier.lastPurchaseAt) : "Chưa phát sinh"}</td>
              <td><span class="badge ${isArchived ? "cancelled" : supplier.outstanding > 0 ? "pending" : "active"}">${isArchived ? "Đã ẩn" : supplier.outstanding > 0 ? "Còn nợ" : supplier.creditBalance > 0 ? "Dư có" : "Đang dùng"}</span></td>
              <td><div class="row-actions"><button class="link-button icon-only action-view" type="button" data-supplier-card="${supplier.id}" aria-label="Xem chi tiết" title="Xem chi tiết">${icon("eye")}</button><button class="link-button icon-only" type="button" data-supplier-statement="${supplier.id}" aria-label="Lịch sử giao dịch" title="Lịch sử giao dịch">${icon("history")}</button>${canManagePurchasing() ? `<button class="link-button icon-only action-edit" type="button" data-edit-supplier="${supplier.id}" aria-label="Sửa hồ sơ" title="Sửa hồ sơ">${icon("edit")}</button><button class="link-button icon-only ${isArchived ? "" : "danger-link"}" type="button" data-archive-supplier="${supplier.id}" data-next-status="${isArchived ? "active" : "archived"}" ${!isArchived && (supplier.outstanding > 0 || supplier.creditBalance > 0) ? 'disabled aria-label="Không thể ẩn" title="Cần tất toán công nợ và dư có trước khi ẩn"' : `aria-label="${isArchived ? "Kích hoạt" : "Ẩn"}" title="${isArchived ? "Kích hoạt" : "Ẩn"}"`}>${icon(isArchived ? "check" : "archive")}</button>` : ""}</div></td>
            </tr>
          `;
        }).join("") : `<tr><td colspan="9" class="empty">Chưa có nhà cung cấp phù hợp.</td></tr>`;
        enhanceResponsiveTables(document.querySelector(".supplier-table-wrap"));
      }
    
    }
    
    function closeManagementDrawers() {
      document.querySelectorAll(".management-drawer").forEach(drawer => { drawer.hidden = true; drawer.innerHTML = ""; });
    }
    
    function openSupplierDetail(supplierId) {
      const drawer = document.querySelector("[data-supplier-detail]");
      const supplier = byId("suppliers", supplierId);
      if (!drawer || !supplier) return;
      const orders = (state.purchaseOrders || []).filter(order => order.supplierId === supplier.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
      const products = supplierProductHistory(supplier.id);
      drawer.innerHTML = `<header class="drawer-header"><div><p class="section-kicker">${escapeHtml(supplier.code)}</p><h2>${escapeHtml(supplier.name)}</h2><small>${escapeHtml(supplier.phone || "Chưa có điện thoại")}</small></div><button class="icon-button" type="button" data-close-management-drawer aria-label="Đóng" title="Đóng">${icon("close")}</button></header><section class="drawer-metrics"><article><small>Tổng mua</small><strong>${money.format(supplier.totalPurchased)}</strong></article><article class="${supplier.outstanding > 0 ? "has-payable" : ""}"><small>Phải trả</small><strong>${money.format(supplier.outstanding)}</strong></article><article><small>Sản phẩm đã nhập</small><strong>${products.length}</strong></article><article><small>Mua gần nhất</small><strong>${supplier.lastPurchaseAt ? formatDate(supplier.lastPurchaseAt) : "Chưa có"}</strong></article></section><section class="drawer-section supplier-contact-detail"><h3>Thông tin liên hệ</h3><span><small>Điện thoại</small><strong>${escapeHtml(supplier.phone || "Chưa có")}</strong></span><span><small>Email</small><strong>${escapeHtml(supplier.email || "Chưa có")}</strong></span><span><small>Địa chỉ</small><strong>${escapeHtml(supplier.address || "Chưa có")}</strong></span><span><small>Mã số thuế</small><strong>${escapeHtml(supplier.taxCode || "Chưa có")}</strong></span>${supplier.note ? `<span><small>Ghi chú</small><strong>${escapeHtml(supplier.note)}</strong></span>` : ""}</section><section class="drawer-section supplier-product-history-section"><div class="section-heading-inline"><div><h3>Sản phẩm đã nhập</h3><p>Tự tổng hợp từ phiếu đã nhận hàng.</p></div><span class="pill" data-supplier-product-history-count>${products.length}</span></div><label class="search-box compact-search">${icon("search")}<input type="search" placeholder="Tìm tên hoặc SKU..." data-supplier-product-history-search /></label><div class="supply-history-table" data-supplier-product-history-list>${products.length ? products.map(entry => `<a class="supply-history-row supplier-history-row" href="./products.html?productId=${encodeURIComponent(entry.productId)}" data-history-search="${escapeHtml(normalizeSearchText(`${entry.productName} ${entry.productSku}`))}"><span><strong>${escapeHtml(entry.productName)}</strong><small>${escapeHtml(entry.productSku)}</small></span><span><small>Số phiếu</small><strong>${entry.orderCount}</strong></span><span><small>Đã nhập</small><strong>${entry.totalQuantity}</strong></span><span><small>Giá gần nhất</small><strong>${money.format(entry.lastUnitCost)}</strong></span><span><small>Bình quân</small><strong>${money.format(entry.averageUnitCost)}</strong></span><span><small>Lần gần nhất</small><strong>${formatDate(entry.lastPurchasedAt)}</strong></span></a>`).join("") : `<div class="empty compact" data-supplier-product-history-empty>Chưa có sản phẩm từ phiếu đã nhận.</div>`}</div><div class="empty compact" data-supplier-product-history-empty hidden>Không tìm thấy sản phẩm phù hợp.</div></section><section class="drawer-section"><h3>Phiếu mua gần đây</h3><div class="supplier-detail-orders">${orders.length ? orders.map(order => `<a href="./purchasing.html?purchaseOrderId=${encodeURIComponent(order.id)}"><span><strong>${escapeHtml(order.code)}</strong><small>${formatDate(order.createdAt)} · ${statusLabel(order.status)}</small></span><b>${money.format(order.netTotal)}</b></a>`).join("") : `<div class="empty compact">Chưa phát sinh phiếu mua.</div>`}</div></section><div class="supplier-drawer-actions"><a class="button ghost" href="./accounting.html?view=receivables&debt=supplier"><span data-icon="calculator"></span> Xem công nợ</a>${canManagePurchasing() ? `<button class="button primary" type="button" data-edit-supplier="${supplier.id}">${icon("edit")} Sửa hồ sơ</button>` : ""}</div>`;
      drawer.hidden = false;
      hydrateIcons(drawer);
    }
    
    function openPurchaseDetail(orderId) {
      const drawer = document.querySelector("[data-purchase-detail]");
      const order = byId("purchaseOrders", orderId);
      if (!drawer || !order) return;
      const supplier = getSupplier(order);
      drawer.innerHTML = `<header class="drawer-header"><div><p class="section-kicker">Phiếu mua</p><h2>${escapeHtml(order.code)}</h2><small>${escapeHtml(supplier.name)} · ${formatDate(order.createdAt)}</small></div><button class="icon-button" type="button" data-close-management-drawer aria-label="Đóng">${icon("close")}</button></header><section class="drawer-metrics"><article><small>Tổng phiếu</small><strong>${money.format(order.total)}</strong></article><article><small>Đã trả</small><strong>${money.format(order.settledAmount)}</strong></article><article><small>Còn phải trả</small><strong>${money.format(order.outstanding)}</strong></article><article><small>Hạn trả</small><strong>${order.dueDate ? formatDate(order.dueDate) : "Chưa đặt"}</strong></article></section><section class="drawer-section"><h3>Hàng hóa</h3>${(order.items || []).map(item => `<div class="channel-work-item"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)} · ${item.quantity} × ${money.format(item.unitCost)}</small></span><b>${money.format(item.lineTotal)}</b></div>`).join("")}</section><section class="drawer-section"><h3>Bước tiếp theo</h3><div class="row-actions">${order.status === "draft" && canManagePurchasing() ? `<a class="button ghost" href="./purchase-create.html?edit=${order.id}">${icon("edit")} Sửa</a><button class="button primary" type="button" data-receive-purchase="${order.id}">${icon("truck")} Nhận hàng</button>` : ""}${order.status === "received" && order.outstanding > 0 && canPayPurchases() ? `<button class="button primary" type="button" data-pay-purchase="${order.id}">${icon("receipt")} Thanh toán</button>` : ""}<button class="button ghost" type="button" data-print-purchase-order="${order.id}">${icon("printer")} In phiếu</button></div></section>`;
      drawer.hidden = false;
      hydrateIcons(drawer);
    }

    return { renderPurchasing, closeManagementDrawers, openSupplierDetail, openPurchaseDetail };
  }

  function setSavedView(value) { window.ArtFlowUI?.syncPressedState(document.querySelectorAll("[data-purchase-saved-view]"), value, "purchaseSavedView"); }

  function openDrawer(drawer) { window.ArtFlowUI?.setDrawerState(drawer, true); }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.purchasing = Object.freeze({ create, setSavedView, openDrawer });
}());
