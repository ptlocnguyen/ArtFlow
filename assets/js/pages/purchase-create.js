(function () {
  function create(runtime) {
    const {
      canCreatePurchase, els, escapeAttribute, escapeHtml, getPageDataReady,
      getPurchaseEditId, icon, money, normalizeSearchText, productSearchText,
      renderProductThumb, renderPurchaseItemRow, state, syncPurchaseSupplierContext,
      updatePurchaseTotalPreview
    } = runtime;

    function setPageState(name) {
      if (!els.purchaseCreateForm) return;
      els.purchaseCreateForm.querySelectorAll("[data-purchase-page-state]").forEach(node => {
        node.hidden = node.dataset.purchasePageState !== name;
      });
      const editor = els.purchaseCreateForm.querySelector("[data-purchase-editor]");
      if (editor) editor.hidden = name !== "editor";
    }

    function activeProducts() {
      return (state.products || [])
        .filter(product => product.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    function renderPickerOptions(select, values, allLabel) {
      if (!select) return;
      select.innerHTML = `<option value="all">${allLabel}</option>${values.map(value => `<option value="${escapeAttribute(normalizeSearchText(value))}">${escapeHtml(value)}</option>`).join("")}`;
      select.value = "all";
    }

    function renderPurchaseProductPicker(form) {
      const products = activeProducts();
      const categories = Array.from(new Set(products.map(product => String(product.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
      const brands = Array.from(new Set(products.map(product => String(product.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
      renderPickerOptions(form.querySelector("[data-purchase-product-category]"), categories, "Tất cả danh mục");
      renderPickerOptions(form.querySelector("[data-purchase-product-brand]"), brands, "Tất cả hãng");
      const list = form.querySelector("[data-purchase-product-list]");
      if (list) {
        list.innerHTML = products.map(product => `
          <button class="product-card product-card-rich purchase-product-card" type="button" data-add-product-to-purchase="${escapeAttribute(product.id)}" data-product-search="${escapeAttribute(productSearchText(product))}" data-product-category="${escapeAttribute(normalizeSearchText(product.category || ""))}" data-product-brand="${escapeAttribute(normalizeSearchText(product.brand || ""))}" data-product-stock="${Number(product.stock || 0) > 0 ? "available" : "empty"}" data-product-low-stock="${Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.lowStock || 0) ? "true" : "false"}" aria-pressed="false">
            ${renderProductThumb(product)}
            <span class="product-card-main"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku)} · ${escapeHtml(product.category || "Chưa phân loại")}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small><span class="product-card-tags"><em class="${Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.lowStock || 0) ? "is-low" : ""}">${Number(product.stock || 0)} tồn</em><span class="purchase-stock-threshold ${Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.lowStock || 0) ? "is-low" : ""}">Ngưỡng ${Number(product.lowStock || 0)}</span><span>Giá vốn ${money.format(product.costPrice)}</span></span><small class="purchase-supplier-history" data-purchase-supplier-history>Chọn nhà cung cấp để xem lịch sử nhập</small></span>
            <span class="purchase-product-state" data-purchase-product-state>${icon("plus")} Thêm</span>
          </button>
        `).join("");
      }
      const count = form.querySelector("[data-purchase-product-count]");
      if (count) count.textContent = `${products.length} sản phẩm`;
    }

    function resetEditor(form) {
      form.reset();
      form.dataset.purchaseOrderId = "";
      const items = form.querySelector("[data-purchase-items]");
      if (items) items.innerHTML = "";
      const popup = form.querySelector("[data-purchase-product-popup]");
      if (popup) popup.hidden = true;
      const submit = form.querySelector("button[type='submit']");
      if (submit) {
        submit.textContent = "Lưu phiếu mua";
        submit.dataset.originalHtml = "Lưu phiếu mua";
      }
    }

    function renderPurchaseCreatePage() {
      const form = els.purchaseCreateForm;
      if (!form) return;
      const purchaseEditId = getPurchaseEditId();
      const editingOrder = purchaseEditId ? (state.purchaseOrders || []).find(order => order.id === purchaseEditId) : null;
      if (purchaseEditId && getPageDataReady() && !editingOrder) {
        setPageState("not-found");
        return;
      }
      if (editingOrder && editingOrder.status !== "draft") {
        setPageState("locked");
        return;
      }
      if (!canCreatePurchase()) {
        setPageState("missing-data");
        return;
      }

      setPageState("editor");
      resetEditor(form);
      if (els.title) els.title.textContent = editingOrder ? `Sửa ${editingOrder.code}` : "Tạo phiếu mua";
      const supplierSelect = form.querySelector("[data-purchase-supplier]");
      if (supplierSelect) {
        supplierSelect.innerHTML = (state.suppliers || [])
          .filter(supplier => supplier.status === "active")
          .map(supplier => `<option value="${escapeAttribute(supplier.id)}">${escapeHtml(supplier.name)} · ${escapeHtml(supplier.phone || "")}</option>`)
          .join("");
      }
      renderPurchaseProductPicker(form);

      if (editingOrder) {
        form.dataset.purchaseOrderId = editingOrder.id;
        form.supplierId.value = editingOrder.supplierId;
        form.invoiceNumber.value = editingOrder.invoiceNumber;
        form.dueDate.value = editingOrder.dueDate;
        form.note.value = editingOrder.note;
        form.discount.value = editingOrder.discount;
        form.shippingFee.value = editingOrder.shippingFee;
        const itemList = form.querySelector("[data-purchase-items]");
        if (itemList) itemList.innerHTML = editingOrder.items.map(item => renderPurchaseItemRow(item.productId, item)).join("");
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) {
          submitButton.textContent = "Lưu thay đổi";
          submitButton.dataset.originalHtml = "Lưu thay đổi";
        }
      }
      syncPurchaseSupplierContext(form);
      updatePurchaseTotalPreview(form);
    }

    return { renderPurchaseCreatePage };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.purchaseCreate = Object.freeze({ create });
}());
