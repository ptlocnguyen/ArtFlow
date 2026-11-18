(function () {
  function create(runtime) {
    const {
      canManageCustomers, els, escapeAttribute, escapeHtml, filtered, formatDate,
      formatDateTime, formatDateTimeShort, icon, loyaltyPointsForCustomer, money,
      state, statusLabel
    } = runtime;

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

    return { renderCustomerDetail, renderCustomers };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.customers = Object.freeze({ create });
}());
