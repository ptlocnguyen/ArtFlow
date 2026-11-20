(function () {
  function create(runtime) {
    const {
      els, escapeAttribute, escapeHtml, filtered, formatDateTime, getSearchTerm,
      icon, inventoryFilters, money, renderProductThumb, state, statusLabel
    } = runtime;

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

    function activeInventoryProducts() {
      return (state.products || []).filter(product => product.status === "active");
    }

    function renderInventoryProductOptions(selectedId = "") {
      return activeInventoryProducts()
        .map(product => {
          const selected = product.id === selectedId ? " selected" : "";
          const label = `${product.sku} · ${product.name} (${Number(product.stock || 0)} hiện có)`;
          return `<option value="${escapeAttribute(product.id)}"${selected}>${escapeHtml(label)}</option>`;
        })
        .join("");
    }

    function selectedInventoryProduct(selectedProductId = "") {
      const products = activeInventoryProducts();
      return products.find(product => product.id === selectedProductId) || products[0] || null;
    }

    function renderStockReceiveForm(selectedProductId = "") {
      const product = selectedInventoryProduct(selectedProductId);
      const summary = product ? `
        <div class="modal-summary full">
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.sku)} · Tồn hiện tại ${Number(product.stock || 0)} · Ngưỡng ${Number(product.lowStock || 0)}</span>
        </div>` : "";
      return `
        ${summary}
        <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptions(product ? product.id : selectedProductId)}</select></div>
        <div class="field"><label for="quantity">Số lượng nhập thêm</label><input id="quantity" name="quantity" type="number" min="1" step="1" value="${product ? Math.max(1, inventoryRestockSuggestion(product)) : 1}" required /></div>
        <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" value="Nhập kho bổ sung" placeholder="Nhập hàng từ nhà cung cấp" /></div>
      `;
    }

    function renderStockAdjustForm(selectedProductId = "") {
      const product = selectedInventoryProduct(selectedProductId);
      const summary = product ? `
        <div class="modal-summary full">
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.sku)} · Tồn hệ thống ${Number(product.stock || 0)} · Ngưỡng ${Number(product.lowStock || 0)}</span>
        </div>` : "";
      return `
        ${summary}
        <div class="field full"><label for="productId">Sản phẩm</label><select id="productId" name="productId" required>${renderInventoryProductOptions(product ? product.id : selectedProductId)}</select></div>
        <div class="field"><label for="stock">Tồn thực tế sau kiểm</label><input id="stock" name="stock" type="number" min="0" step="1" value="${product ? Number(product.stock || 0) : 0}" required /></div>
        <div class="field"><label for="reason">Lý do</label><input id="reason" name="reason" type="text" value="Điều chỉnh kiểm kho" placeholder="Kiểm kho định kỳ, hàng lỗi, thất lạc..." /></div>
      `;
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
      const term = getSearchTerm().trim().toLowerCase();
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

    return {
      closeInventoryMovements, inventoryRestockSuggestion, inventoryStockState,
      openInventoryMovements, renderInventory, renderStockAdjustForm,
      renderStockMovements, renderStockReceiveForm
    };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.inventory = Object.freeze({ create });
}());
