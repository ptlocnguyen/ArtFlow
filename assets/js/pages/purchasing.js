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
      document.querySelectorAll(".management-drawer").forEach(drawer => { drawer.hidden = true; });
    }
    
    function openSupplierDetail(supplierId) {
      const drawer = document.querySelector("[data-supplier-detail]");
      const supplier = byId("suppliers", supplierId);
      if (!drawer || !supplier) return;
      const orders = (state.purchaseOrders || []).filter(order => order.supplierId === supplier.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
      const products = supplierProductHistory(supplier.id);
      const setText = (selector, value) => {
        const node = drawer.querySelector(selector);
        if (node) node.textContent = value;
      };
      setText("[data-supplier-detail-code]", supplier.code);
      setText("[data-supplier-detail-name]", supplier.name);
      setText("[data-supplier-detail-phone-summary]", supplier.phone || "Chưa có điện thoại");
      setText("[data-supplier-detail-total]", money.format(supplier.totalPurchased));
      setText("[data-supplier-detail-payable]", money.format(supplier.outstanding));
      setText("[data-supplier-detail-product-count]", String(products.length));
      setText("[data-supplier-detail-last-purchase]", supplier.lastPurchaseAt ? formatDate(supplier.lastPurchaseAt) : "Chưa có");
      setText("[data-supplier-detail-phone]", supplier.phone || "Chưa có");
      setText("[data-supplier-detail-email]", supplier.email || "Chưa có");
      setText("[data-supplier-detail-address]", supplier.address || "Chưa có");
      setText("[data-supplier-detail-tax-code]", supplier.taxCode || "Chưa có");
      setText("[data-supplier-detail-note]", supplier.note || "");
      const payableCard = drawer.querySelector("[data-supplier-detail-payable-card]");
      if (payableCard) payableCard.classList.toggle("has-payable", supplier.outstanding > 0);
      const noteRow = drawer.querySelector("[data-supplier-detail-note-row]");
      if (noteRow) noteRow.hidden = !supplier.note;
      const historySearch = drawer.querySelector("[data-supplier-product-history-search]");
      if (historySearch) historySearch.value = "";
      setText("[data-supplier-product-history-count]", String(products.length));
      const historyList = drawer.querySelector("[data-supplier-product-history-list]");
      if (historyList) {
        historyList.scrollTop = 0;
        historyList.innerHTML = products.length ? products.map(entry => `<a class="supply-history-row supplier-history-row" href="./products.html?productId=${encodeURIComponent(entry.productId)}" data-history-search="${escapeHtml(normalizeSearchText(`${entry.productName} ${entry.productSku}`))}"><span><strong>${escapeHtml(entry.productName)}</strong><small>${escapeHtml(entry.productSku)}</small></span><span><small>Số phiếu</small><strong>${entry.orderCount}</strong></span><span><small>Đã nhập</small><strong>${entry.totalQuantity}</strong></span><span><small>Giá gần nhất</small><strong>${money.format(entry.lastUnitCost)}</strong></span><span><small>Bình quân</small><strong>${money.format(entry.averageUnitCost)}</strong></span><span><small>Lần gần nhất</small><strong>${formatDate(entry.lastPurchasedAt)}</strong></span></a>`).join("") : `<div class="empty compact">Chưa có sản phẩm từ phiếu đã nhận.</div>`;
      }
      const searchEmpty = drawer.querySelector("[data-supplier-product-history-empty]");
      if (searchEmpty) searchEmpty.hidden = true;
      const recentOrders = drawer.querySelector("[data-supplier-detail-orders]");
      if (recentOrders) recentOrders.innerHTML = orders.length ? orders.map(order => `<a href="./purchasing.html?purchaseOrderId=${encodeURIComponent(order.id)}"><span><strong>${escapeHtml(order.code)}</strong><small>${formatDate(order.createdAt)} · ${statusLabel(order.status)}</small></span><b>${money.format(order.netTotal)}</b></a>`).join("") : `<div class="empty compact">Chưa phát sinh phiếu mua.</div>`;
      const editButton = drawer.querySelector("[data-supplier-detail-edit]");
      if (editButton) {
        editButton.dataset.editSupplier = supplier.id;
        editButton.hidden = !canManagePurchasing();
      }
      drawer.hidden = false;
      hydrateIcons(drawer);
    }
    
    function openPurchaseDetail(orderId) {
      const drawer = document.querySelector("[data-purchase-detail]");
      const order = byId("purchaseOrders", orderId);
      if (!drawer || !order) return;
      const supplier = getSupplier(order);
      const items = order.items || [];
      const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const statusClass = order.status === "received" ? "active" : order.status === "cancelled" ? "cancelled" : "pending";
      const setText = (selector, value) => {
        const node = drawer.querySelector(selector);
        if (node) node.textContent = value;
      };
      const setBadge = (selector, value, className) => {
        const node = drawer.querySelector(selector);
        if (!node) return;
        node.className = `badge ${className}`;
        node.textContent = value;
      };
      setText("[data-purchase-detail-code]", order.code);
      setText("[data-purchase-detail-supplier]", supplier.name);
      setText("[data-purchase-detail-meta]", `Ngày lập ${formatDate(order.createdAt)}${order.invoiceNumber ? ` · Hóa đơn ${order.invoiceNumber}` : ""}`);
      setBadge("[data-purchase-detail-status]", statusLabel(order.status), statusClass);
      setBadge("[data-purchase-detail-payment-status]", statusLabel(order.paymentStatus), order.outstanding > 0 ? "pending" : "active");
      setText("[data-purchase-detail-total]", money.format(order.total));
      setText("[data-purchase-detail-settled]", money.format(order.settledAmount));
      setText("[data-purchase-detail-outstanding]", money.format(order.outstanding));
      setText("[data-purchase-detail-due-date]", order.dueDate ? formatDate(order.dueDate) : "Chưa đặt");
      setText("[data-purchase-detail-item-summary]", `${items.length} mặt hàng · ${totalQuantity} sản phẩm`);
      setText("[data-purchase-detail-item-count]", String(items.length));
      setText("[data-purchase-detail-note]", order.note || "");
      const outstandingCard = drawer.querySelector("[data-purchase-detail-outstanding-card]");
      if (outstandingCard) outstandingCard.classList.toggle("has-payable", order.outstanding > 0);
      const itemList = drawer.querySelector("[data-purchase-detail-items]");
      if (itemList) {
        itemList.scrollTop = 0;
        itemList.innerHTML = items.length ? items.map(item => `
          <div class="purchase-detail-item-row">
            <a class="purchase-detail-product" href="./products.html?productId=${encodeURIComponent(item.productId)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></a>
            <span><small>Số lượng</small><strong>${Number(item.quantity || 0)}</strong></span>
            <span><small>Đơn giá</small><strong>${money.format(item.unitCost)}</strong></span>
            <span class="purchase-detail-line-total"><small>Thành tiền</small><strong>${money.format(item.lineTotal)}</strong></span>
          </div>
        `).join("") : `<div class="empty compact">Phiếu chưa có hàng hóa.</div>`;
      }
      const noteSection = drawer.querySelector("[data-purchase-detail-note-section]");
      if (noteSection) noteSection.hidden = !order.note;
      const editAction = drawer.querySelector("[data-purchase-detail-edit]");
      const receiveAction = drawer.querySelector("[data-purchase-detail-receive]");
      const payAction = drawer.querySelector("[data-purchase-detail-pay]");
      const printAction = drawer.querySelector("[data-purchase-detail-print]");
      const canEditDraft = order.status === "draft" && canManagePurchasing();
      if (editAction) {
        editAction.href = `./purchase-create.html?edit=${encodeURIComponent(order.id)}`;
        editAction.hidden = !canEditDraft;
      }
      if (receiveAction) {
        receiveAction.dataset.receivePurchase = order.id;
        receiveAction.hidden = !canEditDraft;
      }
      if (payAction) {
        payAction.dataset.payPurchase = order.id;
        payAction.hidden = !(order.status === "received" && order.outstanding > 0 && canPayPurchases());
      }
      if (printAction) printAction.dataset.printPurchaseOrder = order.id;
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
