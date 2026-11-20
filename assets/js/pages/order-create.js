(function () {
  function create(runtime) {
    const {
      apiRequest, byId, canCreateOrder, canManageOrders, carriers, channels, clampNumber,
      els, ensureOrderReceiptPdf, escapeAttribute, escapeHtml, icon, loadCustomers,
      loadProducts, loyaltyPointsForCustomer, loyaltyRules, money,
      openReceiptPdf, openReceiptPrintWindow, paymentStatuses, printReceipt,
      productHasShopPrice, productSearchText, renderOptions, renderPage,
      renderProductThumb, saveOrderToState, shippingStatuses, showToast, state
    } = runtime;

    function renderProductPicker(form) {
      const products = state.products
        .filter(product => product.status === "active")
        .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));
      const categories = Array.from(new Set(products.map(product => String(product.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const brands = Array.from(new Set(products.map(product => String(product.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const category = form?.querySelector('[data-product-picker-filter="category"]');
      const brand = form?.querySelector('[data-product-picker-filter="brand"]');
      const list = form?.querySelector("[data-product-picker-list]");
      const count = form?.querySelector("[data-product-picker-count]");
      if (category) category.innerHTML = `<option value="">Tất cả danh mục</option>${categories.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
      if (brand) brand.innerHTML = `<option value="">Tất cả hãng</option>${brands.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
      if (list) list.innerHTML = products.map(renderProductPickerCard).join("");
      if (count) count.textContent = `${products.length} sản phẩm`;
    }

    function renderProductPickerCard(product) {
      const stockClass = product.stock <= 0 ? "draft" : (product.stock <= product.lowStock ? "low" : "active");
      const disabled = product.stock <= 0 ? "disabled" : "";
      const margin = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0;
      const stockState = product.stock <= 0 ? "out" : (product.stock <= product.lowStock ? "low" : "available");
      return `
        <button class="product-card product-card-rich" type="button" data-product-picker-card data-add-product-to-order="${escapeAttribute(product.id)}" data-product-search="${escapeAttribute(productSearchText(product))}" data-category="${escapeAttribute(product.category || "")}" data-brand="${escapeAttribute(product.brand || "")}" data-stock-state="${stockState}" data-name="${escapeAttribute(product.name || "")}" data-price="${Number(product.salePrice || 0)}" data-stock="${Number(product.stock || 0)}" data-margin="${margin}" ${disabled}>
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

    function renderOrderItemRow(productId, values = {}) {
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
            <input type="hidden" name="productId" value="${escapeAttribute(product.id)}" data-order-product required />
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
        list.insertAdjacentHTML("beforeend", renderOrderItemRow(product.id));
      }
      updateOrderTotalPreview(form);
    }

    function updateOrderTotalPreview(form) {
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
      const totals = updateOrderTotalPreview(form);
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
      let finalOrder = savedOrder;

      if (shouldPrint || shouldSavePdf) {
        try {
          finalOrder = await ensureOrderReceiptPdf(savedOrder, { force: true });
        } catch (error) {
          showToast(`Đã tạo đơn, nhưng chưa lưu được PDF hóa đơn: ${error.message}`, "error");
        }
      }

      await Promise.all([loadProducts({ quiet: true }), loadCustomers({ quiet: true })]);
      window.ArtFlowPosStore.save(state);

      if (shouldPrint) {
        if (finalOrder.receiptPdfUrl) openReceiptPdf(finalOrder, printWindow);
        else if (printWindow && !printWindow.closed) printReceipt(finalOrder, printWindow);
        else showToast("Đơn đã được tạo nhưng cửa sổ in đã bị đóng hoặc bị chặn.", "error");
      }

      renderPage();
      showToast("Đã tạo đơn và trừ tồn kho.");
      return finalOrder;
    }

    function renderOrderCreatePage() {
      const form = els.orderCreateForm;
      if (!form) return;
      const editor = form.querySelector("[data-order-create-editor]");
      const setPageState = name => {
        form.querySelectorAll("[data-order-create-state]").forEach(node => {
          node.hidden = node.dataset.orderCreateState !== name;
        });
        if (editor) editor.hidden = name !== "editor";
      };
      if (!canManageOrders()) {
        setPageState("unauthorized");
        return;
      }
      if (!canCreateOrder()) {
        setPageState("missing-data");
        return;
      }
      setPageState("editor");
      form.reset();
      const items = form.querySelector("[data-order-items]");
      if (items) items.innerHTML = "";
      const popup = form.querySelector("[data-order-product-popup]");
      if (popup) popup.hidden = true;
      const customerOptions = state.customers
        .filter(customer => customer.status === "active")
        .map(customer => `<option value="${escapeAttribute(customer.id)}">${escapeHtml(customer.name)} · ${escapeHtml(customer.phone)}</option>`)
        .join("");
      const customerSelect = form.querySelector("[data-order-customer-options]");
      const channelSelect = form.querySelector("[data-order-channel-options]");
      const paymentSelect = form.querySelector("[data-order-payment-options]");
      const shippingSelect = form.querySelector("[data-order-shipping-options]");
      const carrierSelect = form.querySelector("[data-order-carrier-options]");
      if (customerSelect) customerSelect.innerHTML = customerOptions;
      if (channelSelect) channelSelect.innerHTML = renderOptions(channels, "pos");
      if (paymentSelect) paymentSelect.innerHTML = renderOptions(paymentStatuses, "paid");
      if (shippingSelect) shippingSelect.innerHTML = renderOptions(shippingStatuses, "none");
      if (carrierSelect) carrierSelect.innerHTML = renderOptions(carriers, "none");
      renderProductPicker(form);
      updateOrderTotalPreview(form);
    }

    return {
      addProductToOrder,
      renderOrderCreatePage,
      renderOrderItemRow,
      submitOrderForm,
      updateOrderTotalPreview
    };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.orderCreate = Object.freeze({ create });
}());
