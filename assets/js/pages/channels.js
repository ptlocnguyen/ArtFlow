(function () {
  function create(runtime) {
    const { normalizeChannelProduct, normalizeInventoryReservation, normalizeProduct, normalizeSalesChannel, channelSettingsFilters, channels, enhanceResponsiveTables, escapeAttribute, escapeHtml, getSearchTerm, hydrateIcons, icon, money, omniFilters, qs, state } = runtime;

    function activeSalesChannels() {
      const list = (state.salesChannels || []).map(normalizeSalesChannel).filter(channel => channel.status !== "deleted");
      if (list.length) return list;
      return Object.entries(channels).map(([code, name]) => normalizeSalesChannel({
        id: `channel-${code}`,
        code,
        name,
        type: code === "pos" ? "pos" : (code === "facebook" ? "social" : "marketplace"),
        status: "active",
        syncMode: "manual"
      }));
    }

    function channelByIdOrCode(value) {
      const key = String(value || "");
      return activeSalesChannels().find(channel => channel.id === key || channel.code === key) || null;
    }

    function reservedStockForProduct(productId) {
      return (state.inventoryReservations || [])
        .map(normalizeInventoryReservation)
        .filter(item => item.productId === productId && item.status === "active")
        .reduce((sum, item) => sum + item.quantity, 0);
    }
    
    function channelProductRows() {
      const mappings = (state.channelProducts || []).map(normalizeChannelProduct).filter(item => item.status !== "deleted");
      const products = (state.products || []).map(normalizeProduct).filter(product => product.status !== "deleted");
      return products.map(product => {
        const productMappings = mappings.filter(item => item.productId === product.id);
        const channelStocks = productMappings.map(item => item.channelStock);
        const mismatch = productMappings.some(item => Number(item.channelStock || 0) !== Number(product.stock || 0));
        return {
          product,
          mappings: productMappings,
          mappedCount: productMappings.length,
          reserved: reservedStockForProduct(product.id),
          available: Math.max(0, Number(product.stock || 0) - reservedStockForProduct(product.id)),
          mismatch,
          minChannelStock: channelStocks.length ? Math.min(...channelStocks) : null
        };
      });
    }

    function filteredChannelProductRows() {
      const term = getSearchTerm().trim().toLowerCase();
      return channelProductRows()
        .filter(row => omniFilters.channel === "all" || row.mappings.some(item => item.channelId === omniFilters.channel || (channelByIdOrCode(item.channelId) || {}).code === omniFilters.channel))
        .filter(row => omniFilters.stock === "low" ? row.product.stock <= row.product.lowStock : omniFilters.stock === "out" ? row.product.stock <= 0 : omniFilters.stock === "reserved" ? row.reserved > 0 : true)
        .filter(row => omniFilters.issue === "missing" ? row.mappedCount === 0 : omniFilters.issue === "mismatch" ? row.mismatch : true)
        .filter(row => {
          if (!term) return true;
          const mappingText = row.mappings.flatMap(item => {
            const channel = channelByIdOrCode(item.channelId);
            return [item.channelSku, item.channelName, channel?.name, channel?.code];
          });
          return [row.product.sku, row.product.name, row.product.category, row.product.brand, row.product.barcode, ...mappingText]
            .join(" ")
            .toLowerCase()
            .includes(term);
        });
    }

    function renderStaticOmniWorkspace(rootNode, channelsList) {
      const filteredRows = filteredChannelProductRows();
      const channelFilter = rootNode.querySelector("[data-omni-channel-filter]");
      if (channelFilter) {
        channelFilter.innerHTML = `<option value="all">Tất cả kênh</option>${channelsList.map(channel => `<option value="${channel.id}">${escapeHtml(channel.name)}</option>`).join("")}`;
        channelFilter.value = omniFilters.channel;
      }
      rootNode.querySelectorAll("[data-omni-filter]").forEach(select => {
        if (select.dataset.omniFilter !== "channel") select.value = omniFilters[select.dataset.omniFilter];
      });
      const count = rootNode.querySelector("[data-omni-result-count]");
      if (count) count.textContent = `${filteredRows.length} SKU`;
      rootNode.querySelectorAll("[data-omni-quick-filter]").forEach(button => {
        const value = button.dataset.omniQuickFilter;
        const active = value === "all"
          ? omniFilters.stock === "all" && omniFilters.issue === "all"
          : ["missing", "mismatch"].includes(value)
            ? omniFilters.issue === value && omniFilters.stock === "all"
            : omniFilters.stock === value && omniFilters.issue === "all";
        button.classList.toggle("active", active);
      });
      const table = rootNode.querySelector("[data-omni-table]");
      if (table) table.innerHTML = filteredRows.length ? filteredRows.map(row => {
        const issue = row.mappedCount === 0 ? "Chưa map" : row.mismatch ? "Lệch tồn" : row.product.stock <= row.product.lowStock ? "Sắp hết" : "Ổn";
        const issueClass = row.mappedCount === 0 || row.mismatch ? "danger" : row.product.stock <= row.product.lowStock ? "warning" : "success";
        return `<tr><td><strong>${escapeHtml(row.product.name)}</strong><small>${escapeHtml(row.product.sku)} · ${escapeHtml(row.product.category || "")}</small></td><td><strong>${row.product.stock}</strong><small>Ngưỡng ${row.product.lowStock}</small></td><td><strong>${row.available}</strong><small>Giữ ${row.reserved}</small></td><td>${row.mappings.length ? row.mappings.map(item => { const channel = channelByIdOrCode(item.channelId); return `<span class="omni-channel-pill">${escapeHtml(channel ? channel.name : item.channelId)} · tồn ${item.channelStock} · ${Number(item.channelPrice || 0) > 0 ? money.format(item.channelPrice) : "chưa có giá"}</span>`; }).join("") : `<span class="muted">Chưa map kênh</span>`}</td><td><span class="status-chip ${issueClass}">${issue}</span></td><td><div class="row-actions"><a class="button ghost icon-only" href="./team-pricing.html?productId=${encodeURIComponent(row.product.id)}" title="Tính giá kênh" aria-label="Tính giá kênh">${icon("calculator")}</a><button class="button ghost icon-only" type="button" data-open-channel-product-form data-product-id="${row.product.id}" title="Map SKU" aria-label="Map SKU">${icon("edit")}</button></div></td></tr>`;
      }).join("") : `<tr><td colspan="6" class="empty">Không có sản phẩm phù hợp.</td></tr>`;
      hydrateIcons(rootNode);
      enhanceResponsiveTables(rootNode);
    }
    
    function renderChannelSettings(settingsNode, channelsList) {
      if (!settingsNode) return;
      const term = channelSettingsFilters.search.trim().toLowerCase();
      const visible = channelsList.filter(channel => (channelSettingsFilters.status === "all" || channel.status === channelSettingsFilters.status) && (!term || [channel.name, channel.code, channel.type].join(" ").toLowerCase().includes(term)));
      settingsNode.innerHTML = visible.length ? visible.map(channel => `<article class="channel-setting-row"><span><strong>${escapeHtml(channel.name)}</strong><small>${escapeHtml(channel.code)} · ${escapeHtml(channel.type || "marketplace")}</small></span><span><small>Chế độ đồng bộ</small><b>${escapeHtml(channel.syncMode || "manual")}</b></span><span class="status-chip ${channel.status === "active" ? "success" : "warning"}">${channel.status === "active" ? "Đang dùng" : "Tạm ngừng"}</span><button class="button ghost icon-only" type="button" data-open-channel-form data-channel-id="${channel.id}" aria-label="Sửa ${escapeAttribute(channel.name)}" title="Sửa">${icon("edit")}</button></article>`).join("") : `<div class="management-empty">Không có kênh phù hợp bộ lọc.</div>`;
      hydrateIcons(settingsNode);
    }
    
    function renderOmniWorkspace() {
      const channelsList = activeSalesChannels();
      renderChannelSettings(qs("[data-channel-settings-list]"), channelsList);
      const rootNode = qs("[data-omni-workspace]");
      if (rootNode) renderStaticOmniWorkspace(rootNode, channelsList);
    }

    return { activeSalesChannels, channelByIdOrCode, reservedStockForProduct, channelProductRows, filteredChannelProductRows, renderStaticOmniWorkspace, renderChannelSettings, renderOmniWorkspace };
  }

  function selectQuickFilter(value) {
    const issue = document.querySelector("[data-omni-filter=\'issue\']");
    const stock = document.querySelector("[data-omni-filter=\'stock\']");
    if (["missing", "mismatch"].includes(value) && issue) issue.value = value;
    if (["out", "reserved"].includes(value) && stock) stock.value = value;
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.channels = Object.freeze({ create, selectQuickFilter });
}());
