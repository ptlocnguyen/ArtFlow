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
      const template = document.querySelector("[data-customer-detail-template]");
      return customer && template ? template.innerHTML : "";
    }

    function hydrateCustomerDetail(host, customer) {
      if (!host || !customer) return;
      const orders = (state.orders || [])
        .filter(order => order.customerId === customer.id && order.status !== "cancelled")
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      const points = loyaltyPointsForCustomer(customer);
      const latestOrders = orders.slice(0, 5);
      const setText = (selector, value) => {
        const node = host.querySelector(selector);
        if (node) node.textContent = value;
      };
      setText("[data-customer-detail-avatar]", String(customer.name || "K").trim().charAt(0).toUpperCase());
      setText("[data-customer-detail-name]", customer.name);
      setText("[data-customer-detail-group]", customer.group || "Khách hàng");
      setText("[data-customer-detail-spent]", money.format(customer.totalSpent || 0));
      setText("[data-customer-detail-points]", Number(points || 0).toLocaleString("vi-VN"));
      setText("[data-customer-detail-order-count]", String(orders.length));
      setText("[data-customer-detail-phone]", customer.phone || "—");
      setText("[data-customer-detail-email]", customer.email || "—");
      setText("[data-customer-detail-last-order]", customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—");
      setText("[data-customer-detail-note]", customer.note || "Chưa có ghi chú.");
      const status = host.querySelector("[data-customer-detail-status]");
      if (status) {
        status.className = `badge ${customer.status}`;
        status.textContent = statusLabel(customer.status);
      }
      const ordersLink = host.querySelector("[data-customer-detail-orders-link]");
      if (ordersLink) ordersLink.href = `./orders.html?customer=${encodeURIComponent(customer.id)}`;
      const ordersHost = host.querySelector("[data-customer-detail-orders]");
      if (ordersHost) {
        ordersHost.innerHTML = latestOrders.length
          ? `<div class="detail-activity-list">${latestOrders.map(order => `<a href="./orders.html?orderId=${encodeURIComponent(order.id)}"><span><strong>${escapeHtml(order.code)}</strong><small>${formatDateTimeShort(order.createdAt)}</small></span><b>${money.format(order.netTotal)}</b></a>`).join("")}</div>`
          : `<p class="resource-empty-copy">Khách hàng chưa có đơn mua.</p>`;
      }
      const actions = host.querySelector("[data-customer-detail-actions]");
      const editButton = actions?.querySelector("[data-edit-customer]");
      if (actions) actions.hidden = !canManageCustomers();
      if (editButton) editButton.dataset.editCustomer = customer.id;
    }

    return { hydrateCustomerDetail, renderCustomerDetail, renderCustomers };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.customers = Object.freeze({ create });
}());
