(function () {
  function create(runtime) {
    const {
      auditFilters, els, escapeAttribute, escapeHtml, filtered, formatDate,
      formatDateTime, getAuditHealth, getAuditLogs, getCurrentUser, getSearchTerm,
      getStaffUsers, icon, roleLabel, statusLabel, userFilters
    } = runtime;

    function renderUsers() {
      if (!els.usersTable) return;
      const staffUsers = getStaffUsers();
      const currentUser = getCurrentUser();
      const rows = filtered(staffUsers, ["name", "email", "role", "status"]).filter(user => {
        return (userFilters.role === "all" || user.role === userFilters.role) &&
          (userFilters.status === "all" || user.status === userFilters.status);
      });
      if (els.userResultCount) els.userResultCount.textContent = String(rows.length);
      els.usersTable.innerHTML = rows.length ? rows.map(user => {
        const isCurrent = user.id === currentUser?.id;
        return `
        <tr class="${isCurrent ? "is-current-user" : ""}">
          <td><strong>${escapeHtml(user.name)}</strong>${isCurrent ? `<small class="current-user-label">Tài khoản của bạn</small>` : ""}</td>
          <td>${escapeHtml(user.email)}</td>
          <td><span class="badge">${roleLabel(user.role)}</span></td>
          <td><span class="badge ${user.status}">${statusLabel(user.status)}</span></td>
          <td>${formatDate(user.lastLoginAt)}</td>
          <td>
            ${isCurrent ? `<span class="current-user-label">Được bảo vệ</span>` : `<div class="row-actions">
              <button class="link-button icon-only user-action-toggle ${user.status === "active" ? "" : "is-enable"}" data-toggle-user="${escapeAttribute(user.id)}" aria-label="${user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}" title="${user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}">${icon(user.status === "active" ? "archive" : "check")}</button>
              <button class="link-button icon-only user-action-delete" data-delete-user="${escapeAttribute(user.id)}" aria-label="Xóa tài khoản" title="Xóa tài khoản">${icon("trash")}</button>
            </div>`}
          </td>
        </tr>
      `;
      }).join("") : `<tr><td colspan="6" class="empty">${staffUsers.length ? "Không có tài khoản phù hợp bộ lọc hiện tại." : "Chưa có tài khoản nhân viên."}</td></tr>`;
    }

    function auditEntityLabel(type) {
      return {
        user: "Nhân viên", session: "Phiên đăng nhập", product: "Sản phẩm", product_import: "Nhập sản phẩm",
        customer: "Khách hàng", customer_import: "Nhập khách hàng", order: "Đơn hàng", sales_return: "Khách trả hàng",
        order_refund: "Hoàn tiền", stock_movement: "Kho hàng", cash_transaction: "Thu chi",
        accounting_account: "Tài khoản tiền", accounting_category: "Danh mục thu chi", reconciliation: "Đối soát",
        supplier: "Nhà cung cấp", purchase_order: "Phiếu mua", supplier_payment: "Thanh toán NCC",
        purchase_return: "Trả hàng NCC", supplier_credit: "Bù trừ NCC",
        content_item: "Content", team_item: "Team Hub", incense_wish: "Xin vía",
        app_setting: "Cài đặt", product_option: "Thuộc tính sản phẩm",
        product_content_batch: "Tài nguyên sản phẩm", sales_channel: "Kênh bán",
        channel_product: "Sản phẩm theo kênh", campaign: "Chiến dịch",
        workspace_task: "Công việc liên kênh", d1_entity: "Dữ liệu hệ thống"
      }[type] || type || "Hệ thống";
    }

    function auditActionLabel(action) {
      return {
        createProduct: "Tạo sản phẩm", updateProduct: "Cập nhật sản phẩm",
        archiveProduct: "Đổi trạng thái sản phẩm", createProductOption: "Tạo thuộc tính sản phẩm",
        updateProductOption: "Cập nhật thuộc tính sản phẩm", toggleProductOption: "Đổi trạng thái thuộc tính sản phẩm",
        createCustomer: "Tạo khách hàng", updateCustomer: "Cập nhật khách hàng",
        archiveCustomer: "Đổi trạng thái khách hàng", createOrder: "Tạo đơn hàng",
        updateOrderStatus: "Cập nhật trạng thái đơn hàng", updateOrderFulfillment: "Cập nhật giao hàng",
        cancelOrder: "Hủy đơn hàng", returnOrder: "Ghi nhận khách trả hàng",
        refundOrder: "Hoàn tiền đơn hàng", createContentItem: "Tạo chủ đề content",
        updateContentItem: "Cập nhật chủ đề content", archiveContentItem: "Lưu trữ chủ đề content",
        createTeamItem: "Tạo nội dung Team Hub", updateTeamItem: "Cập nhật nội dung Team Hub",
        archiveTeamItem: "Lưu trữ nội dung Team Hub", createIncenseWish: "Thắp hương xin vía",
        updateAppSettings: "Cập nhật cài đặt hệ thống", updateMyProfile: "Cập nhật hồ sơ cá nhân",
        changeMyPassword: "Đổi mật khẩu", createOrderReceiptPdf: "Tạo PDF hóa đơn",
        provisionContentItemAssets: "Tạo tài nguyên Drive cho content",
        createWorkspaceTask: "Tạo việc cần làm", updateWorkspaceTask: "Cập nhật việc cần làm",
        archiveWorkspaceTask: "Lưu trữ việc cần làm", createSalesChannel: "Tạo kênh bán",
        updateSalesChannel: "Cập nhật kênh bán", createCampaign: "Tạo chiến dịch",
        updateCampaign: "Cập nhật chiến dịch", updateTeamPricing: "Cập nhật bảng tính giá"
      }[action] || action || "Hoạt động hệ thống";
    }

    function renderAuditLogs() {
      if (!els.auditTable) return;
      const auditLogs = getAuditLogs();
      const auditHealth = getAuditHealth();
      const cutoff = auditFilters.range === "all" ? 0 : Date.now() - Number(auditFilters.range || 30) * 24 * 60 * 60 * 1000;
      const term = getSearchTerm().trim().toLowerCase();
      const rows = auditLogs.filter(log => {
        const matchesEntity = auditFilters.entityType === "all" || log.entityType === auditFilters.entityType;
        const matchesDate = !cutoff || new Date(log.createdAt).getTime() >= cutoff;
        const text = [log.description, auditActionLabel(log.action), log.action, log.actorName, log.actorEmail, auditEntityLabel(log.entityType), log.entityType, log.entityId].join(" ").toLowerCase();
        return matchesEntity && matchesDate && (!term || text.includes(term));
      });

      if (els.auditResultCount) els.auditResultCount.textContent = String(rows.length);

      if (els.auditHealth) {
        const healthy = !Number(auditHealth.pending || 0) && !Number(auditHealth.failed || 0);
        els.auditHealth.classList.toggle("has-warning", !healthy);
        els.auditHealth.innerHTML = healthy
          ? `${icon("check")} Nhật ký D1 đang đồng bộ`
          : `${icon("alertTriangle")} ${Number(auditHealth.pending || 0)} đang chờ · ${Number(auditHealth.failed || 0)} lỗi`;
      }

      els.auditTable.innerHTML = rows.length ? rows.map(log => {
        const actionLabel = log.description && log.description !== log.action ? log.description : auditActionLabel(log.action);
        return `
        <tr>
          <td><strong>${escapeHtml(formatDateTime(log.createdAt))}</strong><small>Giờ Việt Nam</small></td>
          <td><strong>${escapeHtml(actionLabel)}</strong><small>${escapeHtml(log.action)}</small></td>
          <td><span class="badge">${escapeHtml(auditEntityLabel(log.entityType))}</span></td>
          <td><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmail)}</small></td>
          <td><code class="audit-reference">${escapeHtml(log.entityId || "—")}</code></td>
          <td><button class="link-button icon-only" type="button" data-view-audit="${escapeAttribute(log.id)}" aria-label="Xem chi tiết" title="Xem chi tiết">${icon("eye")}</button></td>
        </tr>
      `;
      }).join("") : `<tr><td colspan="6" class="empty">${auditLogs.length ? "Không có hoạt động phù hợp bộ lọc hiện tại." : "Chưa có hoạt động nào được ghi nhận."}</td></tr>`;
    }

    function renderAuditDetail(log) {
      return `
        <div class="audit-detail">
          <div class="audit-detail-summary">
            <div><span>Thời gian</span><strong>${escapeHtml(formatDateTime(log.createdAt))}</strong></div>
            <div><span>Người thực hiện</span><strong>${escapeHtml(log.actorName)}</strong><small>${escapeHtml(log.actorEmail)}</small></div>
            <div><span>Đối tượng</span><strong>${escapeHtml(auditEntityLabel(log.entityType))}</strong><small>${escapeHtml(log.entityId || "Không có ID")}</small></div>
          </div>
          <div><h3>Dữ liệu ghi nhận</h3><pre>${escapeHtml(JSON.stringify(log.detail || {}, null, 2))}</pre></div>
        </div>`;
    }

    return { auditActionLabel, auditEntityLabel, renderAuditDetail, renderAuditLogs, renderUsers };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.admin = Object.freeze({ create });
}());
