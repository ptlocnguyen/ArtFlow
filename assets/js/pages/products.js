(function () {
  function create(runtime) {
    const {
      canManageProducts, els, escapeAttribute, escapeHtml, filtered, icon, money,
      productAssetsComplete, productChannelPrices, productFilters, productGrossProfit,
      productHasShopPrice, productImageUrl, productMarginRate, qs, state, statusLabel
    } = runtime;

    function renderProducts() {
      if (!els.productsTable) return;
      const products = state.products.filter(product => product.status !== "deleted");
      const missingAssets = products.filter(product => !productAssetsComplete(product));
      document.querySelectorAll("[data-provision-missing-products]").forEach(button => {
        button.disabled = !missingAssets.length;
        const label = missingAssets.length ? `Tạo tài nguyên hàng loạt (${missingAssets.length})` : "Tài nguyên đã đầy đủ";
        button.setAttribute("title", label);
        button.setAttribute("aria-label", label);
      });
      if (els.productCategoryFilter) {
        const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
        els.productCategoryFilter.innerHTML = `<option value="all">Tất cả danh mục</option>${categories.map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`).join("")}`;
        els.productCategoryFilter.value = categories.includes(productFilters.category) ? productFilters.category : "all";
        productFilters.category = els.productCategoryFilter.value;
      }
      [
        [els.productStatusFilter, "status"],
        [els.productStockFilter, "stock"],
        [els.productMarginFilter, "margin"],
        [els.productContentFilter, "content"],
        [els.productAssetsFilter, "assets"],
        [els.productSort, "sort"]
      ].forEach(([select, key]) => {
        if (select) select.value = productFilters[key];
      });

      const termFiltered = filtered(products, ["sku", "name", "category", "brand", "barcode", "contentOwner", "seoKeywords", "websiteProductUrl", "shopeeProductUrl", "tiktokProductUrl", "facebookProductUrl", "contentPostLinks"]);
      const rows = termFiltered.filter(product => {
        const margin = productMarginRate(product);
        const grossProfit = productGrossProfit(product);
        const stockMatch = productFilters.stock === "all" ||
          (productFilters.stock === "out" && product.stock <= 0) ||
          (productFilters.stock === "low" && product.stock > 0 && product.stock <= product.lowStock) ||
          (productFilters.stock === "healthy" && product.stock > product.lowStock);
        const marginMatch = productFilters.margin === "all" ||
          (productFilters.margin === "loss" && productHasShopPrice(product) && grossProfit <= 0) ||
          (productFilters.margin === "low" && grossProfit > 0 && margin < 20) ||
          (productFilters.margin === "good" && margin >= 20 && margin < 40) ||
          (productFilters.margin === "high" && margin >= 40);
        const assetsComplete = productAssetsComplete(product);
        const activeForPreset = product.status === "active";
        const presetMatch = productFilters.preset === "all" ||
          (productFilters.preset === "attention" && activeForPreset && (product.stock <= product.lowStock || !productHasShopPrice(product) || (productHasShopPrice(product) && grossProfit <= 0) || !assetsComplete)) ||
          (productFilters.preset === "out" && activeForPreset && product.stock <= 0) ||
          (productFilters.preset === "missing" && activeForPreset && !assetsComplete) ||
          (productFilters.preset === "low_margin" && activeForPreset && productHasShopPrice(product) && (grossProfit <= 0 || margin < 20));
        return presetMatch && (productFilters.category === "all" || product.category === productFilters.category) &&
          (productFilters.status === "all" || product.status === productFilters.status) && stockMatch && marginMatch &&
          (productFilters.content === "all" || product.contentStatus === productFilters.content) &&
          (productFilters.assets === "all" || (productFilters.assets === "complete" ? assetsComplete : !assetsComplete));
      }).sort((a, b) => {
        if (productFilters.sort === "margin_desc") return productMarginRate(b) - productMarginRate(a);
        if (productFilters.sort === "stock_asc") return a.stock - b.stock || a.name.localeCompare(b.name, "vi");
        if (productFilters.sort === "price_desc") return b.salePrice - a.salePrice;
        if (productFilters.sort === "updated_desc") return String(b.updatedAt).localeCompare(String(a.updatedAt));
        return a.name.localeCompare(b.name, "vi");
      });
      const resultCount = qs("[data-product-result-count]");
      if (resultCount) resultCount.textContent = rows.length;
      document.querySelectorAll("[data-product-preset]").forEach(button => {
        button.classList.toggle("active", button.dataset.productPreset === productFilters.preset);
      });
      els.productsTable.innerHTML = rows.length ? rows.map(product => {
        const channelCount = productChannelPrices(product.id).length;
        return `
        <tr class="data-row-clickable ${product.status === "archived" ? "product-row-archived" : ""}" data-view-product="${product.id}" tabindex="0" aria-label="Xem chi tiết ${escapeAttribute(product.name)}">
          <td><div class="resource-primary-cell">${product.imageUrl ? `<img class="product-table-image" src="${escapeAttribute(productImageUrl(product.imageUrl))}" alt="" loading="lazy" />` : `<span class="product-table-image placeholder">${icon("image")}</span>`}<span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small></span></div></td>
          <td><strong>${escapeHtml(product.sku)}</strong></td>
          <td><strong>${productHasShopPrice(product) ? money.format(product.salePrice) : "Chưa có giá"}</strong>${channelCount ? `<br><small>${channelCount} giá theo kênh</small>` : ""}</td>
          <td><span class="badge ${product.stock <= 0 ? "margin-loss" : product.stock <= product.lowStock ? "low" : "active"}">${product.stock}</span><br><small>Ngưỡng ${product.lowStock}</small></td>
          <td><span class="badge ${product.status}">${statusLabel(product.status)}</span></td>
          <td>
            <div class="row-actions">
              <button class="link-button action-view icon-only" data-view-product="${product.id}" aria-label="Chi tiết" title="Chi tiết">${icon("eye")}</button>
              ${canManageProducts() ? `<button class="link-button action-edit icon-only" data-open-pricing-for-product="${product.id}" aria-label="Tính giá" title="Tính giá">${icon("calculator")}</button><button class="link-button action-edit icon-only" data-edit-product="${product.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button><button class="link-button icon-only ${product.status === "active" ? "action-archive" : "action-activate"}" data-archive-product="${product.id}" data-next-status="${product.status === "active" ? "archived" : "active"}" aria-label="${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}" title="${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}">${icon(product.status === "active" ? "archive" : "check")}</button>` : ""}
            </div>
          </td>
        </tr>
      `;
      }).join("") : `<tr><td colspan="6" class="empty">${products.length ? "Không có sản phẩm phù hợp bộ lọc." : "Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên."}</td></tr>`;
    }

    return { renderProducts };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.products = Object.freeze({ create });
}());
