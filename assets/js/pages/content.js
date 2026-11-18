(function () {
  function create(runtime) {
    const {
      apiRequest, byId, canManageContent, contentBriefTemplates, contentChannels,
      contentFilters, contentItemStatuses, contentItemTypes, contentPriorities,
      defaultContentAssetChecklist, defaultContentChecklist, els, escapeAttribute,
      escapeHtml, formatDate, formatDateTime, formatDateTimeShort, getCurrentUser,
      getSearchTerm, icon, normalizeContentItem, ownerName, renderPage, showToast, state
    } = runtime;
  function getContentProduct(item) {
    return item && item.productId ? byId("products", item.productId) : null;
  }

  function contentAssetsComplete(item) {
    return Boolean(item && item.contentDocUrl && item.mediaFolderUrl);
  }

  function contentDueTone(item) {
    if (!item || !item.dueDate || ["published", "archived"].includes(item.status)) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(item.dueDate);
    if (Number.isNaN(due.getTime())) return "";
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return "overdue";
    if (diff <= 2) return "soon";
    return "";
  }

  function contentSearchText(item) {
    const product = getContentProduct(item);
    return [
      item.title, item.type, item.channel, item.status, item.priority, item.owner,
      item.collaborators, item.tags, item.campaign, item.targetMetric, item.brief, item.note, item.publishUrl,
      product ? product.sku : "", product ? product.name : "", product ? product.category : ""
    ].join(" ").toLowerCase();
  }

  function contentOwnerOptions(selected) {
    const owners = [...(state.contentOwners || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
    const values = owners.map(user => user.name || user.email).filter(Boolean);
    if (selected && !values.includes(selected)) values.unshift(selected);
    return `<option value="">Chưa giao</option>${values.map(name => `<option value="${escapeAttribute(name)}" ${selected === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}`;
  }

  function contentProductOptions(selected) {
    const products = [...(state.products || [])].filter(product => product.status !== "deleted").sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return `<option value="">Không gắn sản phẩm</option>${products.map(product => `<option value="${product.id}" ${selected === product.id ? "selected" : ""}>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</option>`).join("")}`;
  }

  function renderContentFilters(items) {
    const setOptions = (select, options, current, allLabel) => {
      if (!select) return;
      select.innerHTML = `<option value="all">${allLabel}</option>${options.map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join("")}`;
      select.value = options.some(([value]) => value === current) ? current : "all";
    };
    setOptions(els.contentStatusFilter, Object.entries(contentItemStatuses), contentFilters.status, "Tất cả trạng thái");
    setOptions(els.contentTypeFilter, Object.entries(contentItemTypes), contentFilters.type, "Tất cả loại");
    setOptions(els.contentChannelFilter, Object.entries(contentChannels), contentFilters.channel, "Tất cả kênh");
    const owners = [...new Set(items.map(item => item.owner).filter(Boolean))].sort((a, b) => ownerName(a).localeCompare(ownerName(b), "vi")).map(name => [name, ownerName(name)]);
    setOptions(els.contentOwnerFilter, owners, contentFilters.owner, "Tất cả phụ trách");
    const products = (state.products || []).filter(product => product.status !== "deleted").map(product => [product.id, `${product.sku} · ${product.name}`]);
    setOptions(els.contentProductFilter, products, contentFilters.product, "Tất cả sản phẩm");
    setOptions(els.contentScheduleFilter, [["overdue", "Quá hạn"], ["today", "Hôm nay"], ["week", "7 ngày tới"], ["unscheduled", "Chưa có lịch"]], contentFilters.schedule, "Tất cả lịch đăng");
  }

  function filteredContentItems() {
    const items = (state.contentItems || []).filter(item => item.status !== "deleted");
    const term = getSearchTerm().trim().toLowerCase();
    return items.filter(item => {
      return (contentFilters.status === "all" || item.status === contentFilters.status) &&
        (contentFilters.type === "all" || item.type === contentFilters.type) &&
        (contentFilters.owner === "all" || item.owner === contentFilters.owner) &&
        (contentFilters.channel === "all" || item.channel === contentFilters.channel) &&
        (contentFilters.product === "all" || item.productId === contentFilters.product) &&
        contentScheduleMatches(item) &&
        (!term || contentSearchText(item).includes(term));
    });
  }

  function contentScheduleMatches(item) {
    const filter = contentFilters.schedule || "all";
    if (filter === "all") return true;
    if (!item.publishAt) return filter === "unscheduled";
    const publishTime = new Date(item.publishAt).getTime();
    if (Number.isNaN(publishTime)) return filter === "unscheduled";
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endToday = startToday + 24 * 60 * 60 * 1000;
    const endWeek = startToday + 7 * 24 * 60 * 60 * 1000;
    if (filter === "overdue") return publishTime < now.getTime() && item.status !== "published";
    if (filter === "today") return publishTime >= startToday && publishTime < endToday;
    if (filter === "week") return publishTime >= startToday && publishTime < endWeek;
    return true;
  }

  function renderContentCard(item) {
    const product = getContentProduct(item);
    const dueTone = contentDueTone(item);
    return `
      <article class="content-card ${dueTone ? `content-due-${dueTone}` : ""}">
        <div class="content-card-head">
          <span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span>
          <span class="badge priority-${item.priority}">${contentPriorities[item.priority] || item.priority}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.brief || item.note || "Chưa có brief.")}</p>
        <div class="content-meta">
          <span>${icon("file")} ${contentItemTypes[item.type] || item.type}</span>
          <span>${icon("external")} ${contentChannels[item.channel] || item.channel}</span>
          ${product ? `<span>${icon("package")} ${escapeHtml(product.sku)}</span>` : ""}
          ${item.dueDate ? `<span>${icon("history")} ${formatDate(item.dueDate)}</span>` : ""}
        </div>
        <div class="content-card-foot">
          <small>${escapeHtml(item.owner || "Chưa giao")}${item.tags ? ` · ${escapeHtml(item.tags)}` : ""}</small>
          <div class="row-actions">
            ${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" aria-label="Mở Docs" title="Mở Docs">${icon("external")}</a>` : ""}
            ${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button><button class="link-button icon-only" type="button" data-provision-content-item="${item.id}" aria-label="Tạo tài nguyên" title="Tạo tài nguyên">${icon("folderPlus")}</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function renderContentTopicCard(item) {
    const product = getContentProduct(item);
    const dueTone = contentDueTone(item);
    return `
      <article class="content-topic-card ${dueTone ? `content-due-${dueTone}` : ""}">
        <div class="content-topic-main">
          <div class="content-topic-title">
            <span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.brief || item.note || "Chưa có brief.")}</p>
          </div>
          <div class="content-topic-meta">
            <span>${icon("file")} ${contentItemTypes[item.type] || item.type}</span>
            <span>${icon("external")} ${contentChannels[item.channel] || item.channel}</span>
            <span>${icon("users")} ${escapeHtml(item.owner || "Chưa giao")}</span>
            ${product ? `<span>${icon("package")} ${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</span>` : ""}
            ${item.dueDate ? `<span>${icon("history")} ${formatDate(item.dueDate)}</span>` : ""}
          </div>
        </div>
        <div class="content-topic-side">
          <span class="badge priority-${item.priority}">${contentPriorities[item.priority] || item.priority}</span>
          <span class="${contentAssetsComplete(item) ? "assets-complete" : "assets-missing"}">${contentAssetsComplete(item) ? "Đủ tài nguyên" : "Thiếu tài nguyên"}</span>
          <div class="row-actions">
            ${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" title="Mở Docs">${icon("external")}</a>` : ""}
            ${item.mediaFolderUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.mediaFolderUrl)}" target="_blank" rel="noopener" title="Mở Drive">${icon("folderPlus")}</a>` : ""}
            ${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-content="${item.id}" title="Ẩn">${icon("archive")}</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function contentChecklistItems(item, key, defaults) {
    const values = Array.isArray(item && item[key]) && item[key].length ? item[key] : defaults.map(label => ({ label, done: false }));
    return values.map(entry => {
      if (typeof entry === "string") return { label: entry, done: false, link: "" };
      return { label: entry.label || "", done: Boolean(entry.done), link: entry.link || "" };
    }).filter(entry => entry.label);
  }

  function renderContentChecklist(name, title, items, withLink) {
    return `
      <div class="content-form-box full">
        <strong>${title}</strong>
        <div class="content-checklist">
          ${items.map((entry, index) => `
            <label class="content-check-item ${withLink ? "has-link" : ""}">
              <input type="checkbox" data-content-${name}-done="${index}" ${entry.done ? "checked" : ""} />
              <input type="text" data-content-${name}-label="${index}" value="${escapeAttribute(entry.label)}" />
              ${withLink ? `<input type="url" data-content-${name}-link="${index}" value="${escapeAttribute(entry.link || "")}" placeholder="Link" />` : ""}
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }

  function collectContentChecklist(form, name, withLink) {
    return Array.from(form.querySelectorAll(`[data-content-${name}-label]`)).map(input => {
      const index = input.dataset[`content${name[0].toUpperCase()}${name.slice(1)}Label`];
      const done = form.querySelector(`[data-content-${name}-done="${index}"]`)?.checked || false;
      const link = withLink ? form.querySelector(`[data-content-${name}-link="${index}"]`)?.value.trim() || "" : "";
      return { label: input.value.trim(), done, link };
    }).filter(item => item.label);
  }

  function contentPromptFor(item, product) {
    const channel = contentChannels[item.channel] || item.channel || "đa kênh";
    const productText = product ? `\nSản phẩm: ${product.sku} - ${product.name}\nDanh mục: ${product.category}\nĐiểm nổi bật: ${product.keyFeatures || ""}\nMô tả ngắn: ${product.shortDescription || ""}` : "";
    return `Bạn là content creator cho cửa hàng họa cụ ArtFlow. Hãy tạo nội dung cho kênh ${channel}.\nChủ đề: ${item.title}\nLoại nội dung: ${contentItemTypes[item.type] || item.type}\nBrief:\n${item.brief || ""}${productText}\nYêu cầu: viết rõ hook, nội dung chính, CTA, hashtag/SEO nếu phù hợp.`;
  }


  function preferredContentTemplate(type, channel, current) {
    if (current && current !== "blank") return current;
    if (channel && contentBriefTemplates[channel]) return channel;
    if (type && contentBriefTemplates[type]) return type;
    return "blank";
  }

  function contentProductContext(product) {
    if (!product) return "";
    return [
      "",
      "Thông tin sản phẩm:",
      `- SKU: ${product.sku}`,
      `- Tên: ${product.name}`,
      `- Danh mục: ${product.category || "Chưa có"}`,
      `- Thương hiệu: ${product.brand || "Chưa có"}`,
      product.shortDescription ? `- Mô tả ngắn: ${product.shortDescription}` : "",
      product.keyFeatures ? `- Điểm nổi bật: ${product.keyFeatures}` : "",
      product.targetAudience ? `- Khách hàng mục tiêu: ${product.targetAudience}` : "",
      product.seoKeywords ? `- Từ khóa: ${product.seoKeywords}` : ""
    ].filter(Boolean).join("\n");
  }

  function setContentChecklistValues(form, name, labels) {
    Array.from(form.querySelectorAll(`[data-content-${name}-label]`)).forEach((input, index) => {
      if (labels[index]) input.value = labels[index];
    });
  }

  function contentAutoTitle(type, channel, product) {
    if (product) {
      if (type === "video" || channel === "tiktok") return "Video giới thiệu " + product.name;
      if (channel === "shopee") return "Mô tả bán hàng " + product.name;
      if (channel === "website") return "Bài SEO " + product.name;
      return "Content cho " + product.name;
    }
    if (type === "campaign") return "Chiến dịch content mới";
    if (type === "video") return "Kịch bản video mới";
    return "Chủ đề content mới";
  }

  function applyContentAutomation(form, mode) {
    if (!form) return;
    const product = byId("products", form.productId?.value || "");
    const type = form.type?.value || "campaign";
    const channel = form.channel?.value || "multi";
    const templateKey = preferredContentTemplate(type, channel, form.template?.value || "");
    const template = contentBriefTemplates[templateKey] || contentBriefTemplates.blank;
    if (form.template && (!form.template.value || mode === "template")) form.template.value = templateKey;
    if (form.title && (!form.title.value.trim() || mode === "product")) form.title.value = contentAutoTitle(type, channel, product);
    if (form.campaign && !form.campaign.value.trim() && type === "campaign") form.campaign.value = form.title?.value || "";
    if (form.tags && (!form.tags.value.trim() || mode === "product")) {
      form.tags.value = [product?.category, product?.brand, channel !== "multi" ? contentChannels[channel] : "", template.label].filter(Boolean).join(", ");
    }
    if (form.targetMetric && (!form.targetMetric.value.trim() || mode === "template")) {
      form.targetMetric.value = template.kpi || "1 nội dung hoàn chỉnh, có CTA rõ và link đăng";
    }
    const brief = form.querySelector("[data-content-brief]");
    if (brief && (!brief.value.trim() || mode !== "gentle")) {
      brief.value = [template.brief || "", contentProductContext(product)].filter(Boolean).join("\n");
    }
    setContentChecklistValues(form, "checklist", template.checklist || defaultContentChecklist);
    setContentChecklistValues(form, "asset", template.assets || defaultContentAssetChecklist);
    const prompt = form.querySelector("[data-content-prompt]");
    if (prompt) {
      prompt.value = contentPromptFor({
        title: form.title?.value || "",
        type,
        channel,
        brief: brief ? brief.value : ""
      }, product);
    }
  }

  function renderContentWorkspace() {
    if (!els.contentTable) return;
    const items = (state.contentItems || []).filter(item => item.status !== "deleted");
    renderContentFilters(items);
    const visibleItems = filteredContentItems().sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (els.contentResultCount) els.contentResultCount.textContent = String(visibleItems.length);
    const advancedFilterCount = ["type", "owner", "product"].filter(key => contentFilters[key] !== "all").length;
    if (els.contentAdvancedFilterButton) els.contentAdvancedFilterButton.classList.toggle("has-active-filters", advancedFilterCount > 0);
    if (els.contentAdvancedFilterLabel) els.contentAdvancedFilterLabel.textContent = advancedFilterCount ? `Bộ lọc (${advancedFilterCount})` : "Bộ lọc";
    if (els.contentTable) {
      els.contentTable.innerHTML = visibleItems.length ? visibleItems.map(item => {
        const product = getContentProduct(item);
        return `<tr><td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(contentItemTypes[item.type] || item.type)}${product ? ` · ${escapeHtml(product.sku)}` : ""}</small></td><td><span class="badge content-${item.status}">${contentItemStatuses[item.status] || item.status}</span></td><td>${escapeHtml(contentChannels[item.channel] || item.channel)}</td><td>${escapeHtml(ownerName(item.owner) || "—")}</td><td>${item.dueDate ? formatDate(item.dueDate) : "—"}${item.publishAt ? `<br><small>Đăng: ${escapeHtml(formatDateTimeShort(item.publishAt))}</small>` : ""}</td><td>${contentAssetsComplete(item) ? `<span class="assets-complete">Đủ</span>` : `<span class="assets-missing">Thiếu</span>`}</td><td><div class="row-actions">${item.contentDocUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.contentDocUrl)}" target="_blank" rel="noopener" aria-label="Mở Docs" title="Mở Docs">${icon("external")}</a>` : ""}${item.mediaFolderUrl ? `<a class="link-button icon-only" href="${escapeAttribute(item.mediaFolderUrl)}" target="_blank" rel="noopener" aria-label="Mở Drive" title="Mở Drive">${icon("folderPlus")}</a>` : ""}${canManageContent() ? `<button class="link-button icon-only" type="button" data-edit-content="${item.id}" aria-label="Sửa chủ đề" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-content="${item.id}" aria-label="Ẩn chủ đề" title="Ẩn">${icon("archive")}</button>` : ""}</div></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="empty">Chưa có chủ đề content phù hợp.</td></tr>`;
    }
  }

  function renderContentItemForm(item, defaults = {}) {
    const selectedProductId = item ? item.productId : (defaults.productId || "");
    const defaultProduct = selectedProductId ? byId("products", selectedProductId) : null;
    const value = key => escapeAttribute(item ? item[key] : (defaults[key] || ""));
    const selectedTemplate = item ? (item.template || "blank") : (defaults.template || "blank");
    const briefValue = item ? item.brief : (defaults.brief || contentBriefTemplates[selectedTemplate]?.brief || (defaultProduct ? `${defaultProduct.shortDescription || ""}\n\nĐiểm nổi bật:\n${defaultProduct.keyFeatures || ""}` : ""));
    const checklistItems = contentChecklistItems(item, "checklist", defaultContentChecklist);
    const assetItems = contentChecklistItems(item, "assetChecklist", defaultContentAssetChecklist);
    const comments = Array.isArray(item && item.commentLog) ? item.commentLog : [];
    const promptText = item && item.promptText ? item.promptText : contentPromptFor({
      title: item ? item.title : (defaults.title || (defaultProduct ? "Content cho " + defaultProduct.name : "")),
      type: item ? item.type : (defaults.type || (selectedProductId ? "product" : "campaign")),
      channel: item ? item.channel : (defaults.channel || "multi"),
      brief: briefValue
    }, defaultProduct);
    return `
      <div class="field"><label for="contentTitle">Tiêu đề</label><input id="contentTitle" name="title" value="${value("title") || (defaultProduct ? escapeAttribute("Content cho " + defaultProduct.name) : "")}" placeholder="VD: Video hướng dẫn dùng màu nước cho người mới" required /></div>
      <div class="field"><label for="contentTemplate">Mẫu brief</label><select id="contentTemplate" name="template" data-content-template>${Object.entries(contentBriefTemplates).map(([key, template]) => `<option value="${key}" ${selectedTemplate === key ? "selected" : ""}>${template.label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentType">Loại</label><select id="contentType" name="type">${Object.entries(contentItemTypes).map(([key, label]) => `<option value="${key}" ${(item ? item.type : defaults.type || (selectedProductId ? "product" : "campaign")) === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentProductId">Sản phẩm liên quan</label><select id="contentProductId" name="productId">${contentProductOptions(selectedProductId)}</select></div>
      <div class="field"><label for="contentChannel">Kênh</label><select id="contentChannel" name="channel">${Object.entries(contentChannels).map(([key, label]) => `<option value="${key}" ${(item ? item.channel : defaults.channel || "multi") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentStatus">Trạng thái</label><select id="contentStatus" name="status">${Object.entries(contentItemStatuses).filter(([key]) => key !== "archived").map(([key, label]) => `<option value="${key}" ${(item ? item.status : defaults.status || "idea") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="contentPriority">Ưu tiên</label><select id="contentPriority" name="priority">${Object.entries(contentPriorities).map(([key, label]) => `<option value="${key}" ${(item ? item.priority : defaults.priority || "normal") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="content-automation-box full">
        <div><strong>Trợ lý tạo nhanh</strong><small>Tự điền brief, KPI, checklist và prompt theo loại nội dung, kênh và sản phẩm.</small></div>
        <div class="content-automation-actions">
          <button class="button ghost compact-button" type="button" data-content-auto="template">Tạo từ mẫu</button>
          <button class="button ghost compact-button" type="button" data-content-auto="product">Đồng bộ sản phẩm</button>
          <button class="button ghost compact-button" type="button" data-content-auto="gentle">Chỉ gợi ý chỗ trống</button>
        </div>
      </div>
      <div class="field"><label for="contentDueDate">Deadline</label><input id="contentDueDate" name="dueDate" type="date" value="${value("dueDate")}" /></div>
      <div class="field"><label for="contentPublishAt">Lịch đăng</label><input id="contentPublishAt" name="publishAt" type="datetime-local" value="${value("publishAt")}" /></div>
      <div class="field"><label for="contentOwner">Người phụ trách</label><select id="contentOwner" name="owner">${contentOwnerOptions(item ? item.owner : defaults.owner || "")}</select></div>
      <div class="field full"><label for="contentCollaborators">Người phối hợp</label><input id="contentCollaborators" name="collaborators" value="${value("collaborators")}" placeholder="Tên thành viên, phân tách bằng dấu phẩy" /></div>
      <div class="field"><label for="contentCampaign">Campaign / series</label><input id="contentCampaign" name="campaign" value="${value("campaign")}" placeholder="Back to School, ra mắt sản phẩm..." /></div>
      <div class="field"><label for="contentTargetMetric">Mục tiêu KPI</label><input id="contentTargetMetric" name="targetMetric" value="${value("targetMetric")}" placeholder="VD: 2.000 views, 20 inbox, 5 đơn" /></div>
      <div class="field full"><label for="contentTags">Tag</label><input id="contentTags" name="tags" value="${value("tags") || (defaultProduct ? escapeAttribute([defaultProduct.category, defaultProduct.brand].filter(Boolean).join(", ")) : "")}" placeholder="launch, hướng dẫn, back-to-school..." /></div>
      <div class="field full"><label for="contentBrief">Brief</label><textarea id="contentBrief" name="brief" rows="6" data-content-brief placeholder="Mục tiêu, insight, thông điệp chính, format, yêu cầu hình ảnh/video...">${escapeHtml(briefValue)}</textarea></div>
      ${renderContentChecklist("checklist", "Checklist xử lý", checklistItems, false)}
      ${renderContentChecklist("asset", "Asset cần chuẩn bị", assetItems, true)}
      <div class="field full"><label for="contentPromptText">Prompt hỗ trợ viết</label><textarea id="contentPromptText" name="promptText" rows="5" data-content-prompt>${escapeHtml(promptText)}</textarea><button class="button ghost compact-button" type="button" data-copy-content-prompt>Copy prompt</button></div>
      <div class="content-form-box full"><strong>Góp ý / comment</strong>${comments.length ? `<div class="content-comment-log">${comments.slice(-5).map(comment => `<p><span>${escapeHtml(comment.author || "Team")} · ${escapeHtml(formatDateTime(comment.createdAt || ""))}</span>${escapeHtml(comment.text || "")}</p>`).join("")}</div>` : `<p class="content-empty">Chưa có góp ý.</p>`}<textarea name="newComment" rows="2" placeholder="Thêm góp ý mới..."></textarea></div>
      <div class="content-form-box full"><strong>Kết quả sau đăng</strong><div class="content-result-grid"><label>Lượt xem<input name="resultViews" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.views || 0 : 0)}" /></label><label>Tương tác<input name="resultEngagement" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.engagement || 0 : 0)}" /></label><label>Inbox/lead<input name="resultLeads" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.leads || 0 : 0)}" /></label><label>Đơn hàng<input name="resultOrders" type="number" min="0" step="1" value="${Number(item && item.result ? item.result.orders || 0 : 0)}" /></label></div></div>
      <div class="field full"><label for="contentNote">Ghi chú nội bộ</label><textarea id="contentNote" name="note" rows="3">${escapeHtml(item ? item.note : defaults.note || "")}</textarea></div>
      <div class="field full"><label for="contentPublishUrl">Link đã đăng</label><input id="contentPublishUrl" name="publishUrl" type="url" value="${value("publishUrl")}" placeholder="https://..." /></div>
      ${item ? "" : `<div class="field checkbox-field full"><label><input type="checkbox" name="createAssets" checked /> Tạo Google Docs và folder Drive ngay khi lưu</label></div>`}
    `;
  }

  function contentDetailsSection(title, note, nodes, open) {
    const details = document.createElement("details");
    details.className = "content-details full";
    if (open) details.open = true;
    const summary = document.createElement("summary");
    const summaryText = document.createElement("span");
    summaryText.textContent = title;
    const summaryNote = document.createElement("small");
    summaryNote.textContent = note;
    summaryText.appendChild(summaryNote);
    summary.appendChild(summaryText);
    const body = document.createElement("div");
    body.className = "content-details-body";
    nodes.filter(Boolean).forEach(node => body.appendChild(node));
    details.append(summary, body);
    return details;
  }

  function compactContentItemForm(form) {
    if (!form || form.dataset.contentCompacted === "true") return;
    const checklistBoxes = Array.from(form.querySelectorAll(".content-form-box.full")).slice(0, 2);
    const promptField = form.querySelector("[data-content-prompt]")?.closest(".field");
    const formBoxes = Array.from(form.querySelectorAll(".content-form-box.full"));
    const commentBox = formBoxes[2];
    const resultBox = formBoxes[3];
    const noteField = form.querySelector("#contentNote")?.closest(".field");
    const publishUrlField = form.querySelector("#contentPublishUrl")?.closest(".field");
    const firstAdvancedNode = checklistBoxes[0] || promptField || noteField;
    if (!firstAdvancedNode) return;
    const marker = document.createComment("content advanced sections");
    form.insertBefore(marker, firstAdvancedNode);

    const sections = [
      contentDetailsSection("Checklist và tài nguyên", "Việc cần làm, asset cần chuẩn bị và link Drive liên quan.", checklistBoxes, false),
      contentDetailsSection("Prompt và góp ý", "Prompt hỗ trợ viết, lịch sử comment và góp ý mới.", [promptField, commentBox], false),
      contentDetailsSection("Ghi chú và link xuất bản", "Thông tin nội bộ và đường dẫn bài đã đăng.", [resultBox, noteField, publishUrlField], false)
    ];
    sections.forEach(section => form.insertBefore(section, marker));
    marker.remove();
    form.dataset.contentCompacted = "true";
  }

  async function saveContentItem(form, item) {
    const data = Object.fromEntries(new FormData(form));
    const commentLog = Array.isArray(item && item.commentLog) ? [...item.commentLog] : [];
    const newComment = String(data.newComment || "").trim();
    if (newComment) {
      commentLog.push({
        text: newComment,
        author: getCurrentUser() ? getCurrentUser().name : "Team",
        createdAt: new Date().toISOString()
      });
    }
    const path = item ? "/content/update" : "/content/create";
    const response = await apiRequest(path, {
      method: "POST",
      body: JSON.stringify({
        id: item ? item.id : "",
        ...data,
        checklistJson: JSON.stringify(collectContentChecklist(form, "checklist", false)),
        assetChecklistJson: JSON.stringify(collectContentChecklist(form, "asset", true)),
        commentLogJson: JSON.stringify(commentLog),
        resultJson: JSON.stringify({
          views: Number(data.resultViews || 0),
          engagement: Number(data.resultEngagement || 0),
          leads: Number(data.resultLeads || 0),
          orders: Number(data.resultOrders || 0)
        }),
        createAssets: item ? "false" : Boolean(data.createAssets)
      })
    });
    const saved = normalizeContentItem(response.contentItem);
    state.contentItems = state.contentItems || [];
    const index = state.contentItems.findIndex(entry => entry.id === saved.id);
    if (index >= 0) state.contentItems[index] = saved;
    else state.contentItems.unshift(saved);
    window.ArtFlowPosStore.save(state);
    renderPage();
    if (response.assetWarning) showToast("Đã lưu content, nhưng chưa tạo được tài nguyên Drive: " + response.assetWarning, "error");
    else showToast(item ? "Đã cập nhật content." : "Đã tạo chủ đề content.");
  }

  async function provisionContentItem(itemId) {
    const response = await apiRequest("/content/provision-assets", {
      method: "POST",
      body: JSON.stringify({ id: itemId })
    });
    const saved = normalizeContentItem(response.contentItem);
    state.contentItems = (state.contentItems || []).map(item => item.id === saved.id ? saved : item);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã tạo tài nguyên content.");
    return saved;
  }

  async function archiveContentItem(itemId) {
    await apiRequest("/content/archive", {
      method: "POST",
      body: JSON.stringify({ id: itemId })
    });
    state.contentItems = (state.contentItems || []).filter(item => item.id !== itemId);
    window.ArtFlowPosStore.save(state);
    renderPage();
    showToast("Đã ẩn chủ đề content.");
  }

    return {
      applyContentAutomation, archiveContentItem, compactContentItemForm,
      filteredContentItems, getContentProduct, provisionContentItem, renderContentItemForm,
      renderContentWorkspace, saveContentItem
    };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.content = Object.freeze({ create });
}());
