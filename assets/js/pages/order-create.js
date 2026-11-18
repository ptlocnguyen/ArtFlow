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
            ${products.map(renderProductPickerCard).join("")}
          </div>
        </div>
      `;
    }

    function renderProductPickerCard(product) {
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
              <div class="panel-header"><div><h2>Giỏ hàng</h2><p>Sản phẩm đã chọn trong hóa đơn hiện tại.</p></div><button class="button primary" type="button" data-open-product-picker>Thêm sản phẩm</button></div>
              <div class="order-builder-layout"><div class="order-cart-panel"><div class="order-cart-heading"><strong>Sản phẩm đã chọn</strong><span data-order-cart-count>0 dòng</span></div><div class="order-empty-cart" data-order-empty-cart>Bấm “Thêm sản phẩm” để tìm và thêm hàng vào hóa đơn.</div><div class="order-items order-items-large" data-order-items></div></div></div>
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
          <aside class="order-summary-panel"><section class="panel order-compose-section sticky-summary">
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
              <details class="order-extra-settings full"><summary>Giao hàng / vận đơn</summary><div class="form-grid summary-subgrid"><div class="field"><label for="shippingStatus">Vận chuyển</label><select id="shippingStatus" name="shippingStatus" required>${renderOptions(shippingStatuses, "none")}</select></div><div class="field"><label for="carrier">Đơn vị giao</label><select id="carrier" name="carrier">${renderOptions(carriers, "none")}</select></div><div class="field full"><label for="trackingCode">Mã vận đơn</label><input id="trackingCode" name="trackingCode" type="text" placeholder="SPXVN..., GHTK..., GHN..." /></div></div></details>
              <div class="field checkbox-field receipt-actions full"><label><input type="checkbox" name="printAfterSave" checked /> In phiếu</label><label><input type="checkbox" name="receiptPdf" checked /> Lưu PDF</label><button class="link-button icon-only" type="button" data-open-receipt-settings aria-label="Cài đặt phiếu in" title="Cài đặt phiếu in">${icon("settings")}</button></div>
            </div>
            <div class="summary-lines"><div><span>Tạm tính</span><strong data-summary-subtotal>${money.format(0)}</strong></div><div><span>Giảm từng dòng</span><strong data-summary-line-discount>${money.format(0)}</strong></div><div><span>Giảm giá</span><strong data-summary-discount>${money.format(0)}</strong></div><div><span>Đổi điểm</span><strong data-summary-loyalty>${money.format(0)}</strong></div><div><span>Phí giao hàng</span><strong data-summary-shipping>${money.format(0)}</strong></div><div><span>Làm tròn</span><strong data-summary-rounding>${money.format(0)}</strong></div><div><span>Tiền nhận</span><strong data-summary-received>${money.format(0)}</strong></div><div><span>Tiền thối</span><strong data-summary-change>${money.format(0)}</strong></div><div class="summary-total"><span>Tổng thanh toán</span><strong data-summary-total>${money.format(0)}</strong></div></div>
            <div class="form-actions order-submit-actions"><a class="button ghost" href="./orders.html">Hủy</a><button class="button primary" type="submit">Tạo đơn hàng</button></div>
          </section></aside>
          <div class="order-product-popup" data-order-product-popup hidden><div class="order-product-popup-panel"><div class="order-product-popup-header"><div><h2>Thêm sản phẩm</h2><p>Tìm SKU, tên, danh mục hoặc thương hiệu rồi bấm sản phẩm để thêm vào giỏ.</p></div><button class="icon-button" type="button" data-close-product-picker aria-label="Đóng">${icon("close")}</button></div>${renderProductPicker()}</div></div>
        </section>
      `;
      updateOrderTotalPreview(els.orderCreateForm);
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
