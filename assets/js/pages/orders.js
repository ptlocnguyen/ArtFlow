(function () {
  function create(runtime) {
    const {
      canManageOrders, canReturnOrder, carrierLabel, channelLabel, collectedForOrder,
      els, escapeAttribute, escapeHtml, formatDateTime, formatDateTimeShort, getCustomer,
      icon, isAdmin, money, orderItemSummary, outstandingForOrder, paymentLabel,
      refundableForOrder, shippingLabel, statusLabel
    } = runtime;

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
      const template = document.querySelector("[data-order-detail-template]");
      return order && template ? template.innerHTML : "";
    }

    function hydrateOrderDetail(host, order) {
      if (!host || !order) return;
      const customer = getCustomer(order);
      const collected = collectedForOrder(order);
      const outstanding = outstandingForOrder(order);
      const lineDiscount = (order.items || []).reduce((sum, item) => {
        const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        return sum + Math.max(0, gross - Number(item.lineTotal || 0));
      }, 0);
      const setText = (selector, value) => {
        const node = host.querySelector(selector);
        if (node) node.textContent = value;
      };
      setText("[data-order-detail-code]", order.code);
      setText("[data-order-detail-dates]", `Tạo lúc ${formatDateTime(order.createdAt)} · Cập nhật ${formatDateTime(order.updatedAt)}`);
      setText("[data-order-detail-customer]", customer.name || "Khách lẻ");
      setText("[data-order-detail-customer-contact]", customer.phone || customer.email || "");
      setText("[data-order-detail-channel]", channelLabel(order.channel));
      setText("[data-order-detail-payment-method]", order.paymentMethod || "cash");
      setText("[data-order-detail-status]", statusLabel(order.status));
      setText("[data-order-detail-payment-status]", paymentLabel(order.paymentStatus));
      setText("[data-order-detail-shipping-status]", shippingLabel(order.shippingStatus));
      setText("[data-order-detail-shipping-meta]", [carrierLabel(order.carrier), order.trackingCode].filter(Boolean).join(" · "));
      setText("[data-order-detail-note]", order.note || "Không có ghi chú.");
      setText("[data-order-detail-pdf-status]", `PDF: ${order.receiptPdfUrl ? "Đã lưu trên Drive" : "Chưa tạo"}`);
      setText("[data-order-detail-subtotal]", money.format(order.subtotal));
      setText("[data-order-detail-line-discount]", money.format(lineDiscount));
      setText("[data-order-detail-order-discount]", money.format(Number(order.discount || 0) + Number(order.loyaltyDiscount || 0)));
      setText("[data-order-detail-shipping-fee]", money.format(order.shippingFee));
      setText("[data-order-detail-rounding]", money.format(order.roundingAmount));
      setText("[data-order-detail-collected]", money.format(collected || order.cashReceived || 0));
      setText("[data-order-detail-outstanding]", money.format(outstanding));
      setText("[data-order-detail-total]", money.format(order.netTotal));
      const pdfLink = host.querySelector("[data-order-detail-pdf-link]");
      if (pdfLink) {
        pdfLink.href = order.receiptPdfUrl || "";
        pdfLink.hidden = !order.receiptPdfUrl;
      }
      const receiptButton = host.querySelector("[data-order-detail-receipt]");
      if (receiptButton) receiptButton.dataset.orderReceiptPdf = order.id;
      setText("[data-order-detail-receipt-label]", order.receiptPdfUrl ? "In lại PDF" : "Tạo PDF");
      const receiptIcon = host.querySelector("[data-order-detail-receipt-icon]");
      if (receiptIcon) receiptIcon.dataset.icon = order.receiptPdfUrl ? "printer" : "download";
      const regenerateButton = host.querySelector("[data-order-detail-regenerate]");
      if (regenerateButton) regenerateButton.dataset.orderReceiptRegenerate = order.id;
      const itemRows = host.querySelector("[data-order-detail-items]");
      if (itemRows) {
        itemRows.innerHTML = (order.items || []).length ? order.items.map(item => {
          const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
          const lineDiscountAmount = Math.max(0, gross - Number(item.lineTotal || 0));
          return `<tr><td><div class="order-detail-product"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></div></td><td>${item.quantity}</td><td>${money.format(item.unitPrice)}</td><td>${Number(item.discountPercent || 0) ? `${Number(item.discountPercent).toFixed(1)}%` : "0%"}</td><td>${lineDiscountAmount ? money.format(lineDiscountAmount) : "—"}</td><td><strong>${money.format(item.lineTotal)}</strong></td></tr>`;
        }).join("") : `<tr><td colspan="6" class="empty">Không có sản phẩm.</td></tr>`;
      }
    }

    return { hydrateOrderDetail, renderOrderDetail, renderOrdersRows };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.orders = Object.freeze({ create });
}());
