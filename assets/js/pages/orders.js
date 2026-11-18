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

    return { renderOrderDetail, renderOrdersRows };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.orders = Object.freeze({ create });
}());
