(function () {
  function create(runtime) {
    const { normalizeIncenseWish, normalizePricingLine, normalizePricingModel, normalizePricingScenario, normalizeSalesChannel, normalizeTeamAction, normalizeTeamDecision, normalizeTeamMeeting, normalizeTeamPlan, normalizeWorkspaceTask, apiRequest, byId, channelByIdOrCode, closeModal, currentUser, els, enhanceMoneyInputs, enhanceResponsiveTables, escapeAttribute, escapeHtml, formatDate, formatDateTime, formatDateTimeShort, hydrateIcons, icon, incenseKinds, incenseOfferings, localDateValue, money, ownerName, productHasShopPrice, productSearchText, qs, renderProductThumb, saveTeamItem, searchTerm, setBusy, showToast, state, teamFilters, teamStatuses, teamViews } = runtime;

    function teamOwners() {
      const values = new Set();
      [
        ...(state.teamMeetings || []),
        ...(state.teamPlans || []),
        ...(state.teamPricingModels || []),
        ...(state.teamDecisions || []),
        ...(state.workspaceTasks || [])
      ].forEach(item => {
        if (item.owner) values.add(item.owner);
        (item.actions || []).forEach(action => { if (action.owner) values.add(action.owner); });
      });
      (state.users || []).filter(user => user.status === "active").forEach(user => values.add(user.name || user.email));
      if (currentUser) values.add(currentUser.name || currentUser.email);
      return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
    }

    function teamWorkspaceTasks() {
      const standalone = (state.workspaceTasks || []).map(normalizeWorkspaceTask);
      const meetingTasks = (state.teamMeetings || []).map(normalizeTeamMeeting).flatMap(meeting =>
        (meeting.actions || []).map((action, index) => normalizeWorkspaceTask({
          id: `meeting-action:${meeting.id}:${action.id || index + 1}`,
          title: action.title,
          status: action.status,
          priority: "normal",
          owner: action.owner,
          sourceType: "meeting",
          sourceId: meeting.id,
          dueDate: action.dueDate,
          description: `Từ biên bản: ${meeting.title}`,
          createdAt: meeting.createdAt,
          updatedAt: meeting.updatedAt || meeting.meetingAt
        }))
      );
      const linkedMeetingKeys = new Set(standalone
        .filter(task => task.sourceType === "meeting" && task.sourceId)
        .map(task => `${task.sourceId}:${task.title.trim().toLowerCase()}`));
      return [
        ...standalone,
        ...meetingTasks.filter(task => !linkedMeetingKeys.has(`${task.sourceId}:${task.title.trim().toLowerCase()}`))
      ];
    }
    
    function teamDateInRange(value) {
      if (teamFilters.range === "all") return true;
      if (!value) return true;
      const date = new Date(value).getTime();
      if (!isFinite(date)) return true;
      const days = Math.max(1, Number(teamFilters.range || 30));
      return Date.now() - date <= days * 86400000;
    }
    
    function teamSearchText(item) {
      return [
        item.title, item.type, item.status, item.owner, ownerName(item.owner), item.attendees, item.agenda, item.notes,
        item.channels, item.focusProducts, item.tags, item.detail, item.note, item.links
      ].join(" ").toLowerCase();
    }
    
    function currentTeamItems() {
      const map = {
        meetings: (state.teamMeetings || []).map(normalizeTeamMeeting),
        tasks: teamWorkspaceTasks(),
        plans: (state.teamPlans || []).map(normalizeTeamPlan),
        pricing: (state.teamPricingModels || []).map(normalizePricingModel),
        decisions: (state.teamDecisions || []).map(normalizeTeamDecision)
      };
      const term = searchTerm.trim().toLowerCase();
      return (map[teamFilters.view] || [])
        .filter(item => item.status !== "deleted")
        .filter(item => teamFilters.status === "all" || item.status === teamFilters.status)
        .filter(item => teamFilters.owner === "all" || item.owner === teamFilters.owner || (item.actions || []).some(action => action.owner === teamFilters.owner))
        .filter(item => teamDateInRange(item.meetingAt || item.updatedAt || item.createdAt || item.decidedAt || item.period))
        .filter(item => !term || teamSearchText(item).includes(term))
        .sort((a, b) => String(b.meetingAt || b.decidedAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.meetingAt || a.decidedAt || a.updatedAt || a.createdAt || "")));
    }
    
    function setTeamOptions(select, entries, current, allLabel) {
      if (!select) return;
      select.innerHTML = `<option value="all">${allLabel}</option>${entries.map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join("")}`;
      select.value = entries.some(([value]) => value === current) ? current : "all";
    }
    
    function renderTeamFilters() {
      const items = {
        meetings: state.teamMeetings || [],
        tasks: teamWorkspaceTasks(),
        plans: state.teamPlans || [],
        pricing: state.teamPricingModels || [],
        decisions: state.teamDecisions || []
      }[teamFilters.view] || [];
      const statuses = [...new Set(items.map(item => item.status).filter(Boolean))]
        .map(status => [status, teamStatuses[status] || status]);
      setTeamOptions(els.teamStatusFilter, statuses, teamFilters.status, "Tất cả trạng thái");
      setTeamOptions(els.teamOwnerFilter, teamOwners().map(owner => [owner, ownerName(owner)]), teamFilters.owner, "Tất cả phụ trách");
      if (els.teamRangeFilter) els.teamRangeFilter.value = teamFilters.range;
    }
    
    function renderTeamHub() {
      if (!els.teamContent) return;
      renderTeamFilters();
      const teamCounts = {
        tasks: teamWorkspaceTasks().filter(item => item.status !== "deleted").length,
        meetings: (state.teamMeetings || []).filter(item => item.status !== "deleted").length,
        plans: (state.teamPlans || []).filter(item => item.status !== "deleted").length,
        decisions: (state.teamDecisions || []).filter(item => item.status !== "deleted").length
      };
      document.querySelectorAll("[data-team-view]").forEach(button => {
        const active = button.dataset.teamView === teamFilters.view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-team-tab-count]").forEach(counter => {
        counter.textContent = String(teamCounts[counter.dataset.teamTabCount] || 0);
      });
      const view = teamViews[teamFilters.view] || teamViews.tasks;
      if (els.teamPanelTitle) els.teamPanelTitle.textContent = view.title;
      if (els.teamPanelNote) els.teamPanelNote.textContent = view.note;
      const primary = qs("[data-team-primary-action]");
      if (primary) primary.innerHTML = `${icon("plus")} Tạo ${view.action}`;
      const renderers = {
        tasks: renderTeamTasks,
        meetings: renderTeamMeetings,
        plans: renderTeamPlans,
        decisions: renderTeamDecisions
      };
      els.teamContent.innerHTML = (renderers[teamFilters.view] || renderTeamTasks)();
      enhanceResponsiveTables(els.teamContent);
    }
    
    function selectedIncenseOfferings() {
      const selected = Array.from(document.querySelectorAll("[data-offering-choice].active"))
        .map(button => button.dataset.offeringChoice)
        .filter(key => Object.prototype.hasOwnProperty.call(incenseOfferings, key));
      return selected.length ? selected : ["banana"];
    }
    
    function syncIncenseOfferings() {
      if (els.incenseOfferings) {
        els.incenseOfferings.value = selectedIncenseOfferings().join(",");
      }
    }
    
    function renderOfferingTray(items) {
      if (!els.offeringTray) return;
      const selected = (items && items.length ? items : selectedIncenseOfferings()).slice(0, 6);
      els.offeringTray.innerHTML = selected.map(key => {
        const offering = incenseOfferings[key] || incenseOfferings.banana;
        return `<span class="offering-item offering-${escapeAttribute(key)}"><img src="../assets/images/offerings/${escapeAttribute(offering.image)}" alt="" /><small>${escapeHtml(offering.label)}</small></span>`;
      }).join("");
      els.offeringTray.classList.remove("is-offered");
      window.requestAnimationFrame(() => els.offeringTray.classList.add("is-offered"));
    }
    
    function renderIncense() {
      if (!els.incenseHistory) return;
      const wishes = (state.incenseWishes || []).map(normalizeIncenseWish)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      els.incenseHistory.innerHTML = wishes.length ? wishes.slice(0, 18).map(item => {
        const kind = incenseKinds[item.kind] || incenseKinds.sales;
        return `<article class="incense-wish-card">
          <span>${escapeHtml(kind[0])}</span>
          <strong>${escapeHtml(item.wish)}</strong>
          <small>${escapeHtml(item.actorName || "ArtFlow")} · ${item.createdAt ? formatDateTimeShort(item.createdAt) : "vừa xong"}</small>
        </article>`;
      }).join("") : `<div class="empty-state">Chưa ai thắp hôm nay.</div>`;
    }
    
    async function submitIncenseWish(form) {
      const button = form.querySelector("button[type='submit']");
      const data = Object.fromEntries(new FormData(form));
      const wish = String(data.wish || "").trim();
      const offerings = selectedIncenseOfferings();
      if (!wish) throw new Error("Nhập một câu ngắn thôi nha.");
      setBusy(button, true, "Đang thắp...");
      try {
        const response = await apiRequest("/incense/create", {
          method: "POST",
          body: JSON.stringify({ kind: data.kind || "sales", wish, offerings })
        });
        state.incenseWishes = (response.incenseWishes || [response.incenseWish]).filter(Boolean).map(normalizeIncenseWish);
        window.ArtFlowPosStore.save(state);
        if (els.incenseWish) els.incenseWish.value = "";
        if (els.incenseResult) {
          const kind = incenseKinds[data.kind] || incenseKinds.sales;
          els.incenseResult.textContent = kind[1];
        }
        const panel = form.closest(".incense-panel");
        if (panel) {
          panel.classList.remove("just-lit");
          window.requestAnimationFrame(() => panel.classList.add("just-lit"));
          window.setTimeout(() => panel.classList.remove("just-lit"), 950);
        }
        renderOfferingTray(offerings);
        renderIncense();
        showToast("Đã thắp một nén nhỏ.");
      } finally {
        setBusy(button, false);
      }
    }
    
    function teamStatusBadge(status) {
      return `<span class="badge team-status-${escapeAttribute(status)}">${escapeHtml(teamStatuses[status] || status || "—")}</span>`;
    }
    
    function renderTeamTasks() {
      const tasks = currentTeamItems().map(normalizeWorkspaceTask);
      return `
        <div class="team-task-board">
          ${tasks.length ? tasks.map(task => {
            const product = task.productId ? byId("products", task.productId) : null;
            const channel = task.channelId ? channelByIdOrCode(task.channelId) : null;
            const campaign = task.campaignId ? (state.campaigns || []).find(item => item.id === task.campaignId) : null;
            const fromMeeting = task.sourceType === "meeting" && task.sourceId;
            return `<article class="team-task-card ${task.priority}">
              <div class="task-card-main">
                <span class="status-chip ${task.status === "done" ? "success" : task.status === "blocked" ? "danger" : task.status === "doing" ? "info" : "warning"}">${teamStatuses[task.status] || task.status}</span>
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.description || "Chưa có mô tả.")}</p>
              </div>
              <div class="task-card-meta">
                <span>${icon("users")} ${escapeHtml(task.owner ? ownerName(task.owner) : "Chưa giao")}</span>
                <span>${icon("history")} ${task.dueDate ? formatDate(task.dueDate) : "Chưa có hạn"}</span>
                ${product ? `<span>${icon("package")} ${escapeHtml(product.sku)}</span>` : ""}
                ${channel ? `<span>${icon("truck")} ${escapeHtml(channel.name)}</span>` : ""}
                ${campaign ? `<span>${icon("sparkles")} ${escapeHtml(campaign.name)}</span>` : ""}
                ${fromMeeting ? `<span>${icon("clipboard")} Từ biên bản họp</span>` : ""}
              </div>
              <div class="task-card-actions row-actions">
                ${fromMeeting
                  ? `<button class="link-button icon-only" type="button" data-open-task-meeting="${escapeAttribute(task.sourceId)}" title="Mở biên bản" aria-label="Mở biên bản">${icon("externalLink")}</button>`
                  : `<button class="link-button icon-only action-edit" type="button" data-edit-workspace-task="${escapeAttribute(task.id)}" title="Sửa" aria-label="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-workspace-task="${escapeAttribute(task.id)}" title="Lưu trữ" aria-label="Lưu trữ">${icon("archive")}</button>`}
              </div>
            </article>`;
          }).join("") : `<div class="empty">Chưa có việc cần làm phù hợp.</div>`}
        </div>
      `;
    }
    
    function renderTeamMeetings() {
      const items = currentTeamItems();
      return `<div class="team-list">${items.length ? items.map(meeting => {
        const openActions = (meeting.actions || []).filter(action => action.status !== "done").length;
        const typeLabel = { weekly: "Họp tuần", planning: "Kế hoạch", product: "Sản phẩm", finance: "Tài chính", content: "Content", other: "Khác" }[meeting.type] || meeting.type;
        return `<article class="team-item">
          <div><strong>${escapeHtml(meeting.title)}</strong><small>${escapeHtml(typeLabel)} · ${meeting.meetingAt ? formatDateTimeShort(meeting.meetingAt) : "Chưa có lịch"} · ${escapeHtml(meeting.owner ? ownerName(meeting.owner) : "Chưa giao")}</small></div>
          <div>${teamStatusBadge(meeting.status)}<small>${openActions} việc mở · ${(meeting.decisions || []).length} quyết định</small></div>
          <div class="team-item-preview">${escapeHtml(meeting.agenda || meeting.notes || "Chưa có nội dung.").slice(0, 160)}</div>
          <div class="row-actions"><button class="link-button icon-only" type="button" data-view-team-meeting="${meeting.id}" title="Xem">${icon("eye")}</button><button class="link-button icon-only action-edit" type="button" data-edit-team-meeting="${meeting.id}" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-team-item="meetings:${meeting.id}" title="Lưu trữ">${icon("archive")}</button></div>
        </article>`;
      }).join("") : `<div class="empty">Chưa có biên bản phù hợp.</div>`}</div>`;
    }
    
    function renderTeamPlans() {
      const items = currentTeamItems();
      return `<div class="team-card-grid">${items.length ? items.map(plan => `<article class="team-plan-card">
        <div class="team-card-head"><div><strong>${escapeHtml(plan.title)}</strong><small>${escapeHtml(plan.period || "Chưa có kỳ")} · ${escapeHtml(plan.owner ? ownerName(plan.owner) : "Chưa giao")}</small></div>${teamStatusBadge(plan.status)}</div>
        <div class="team-money-grid"><span><small>Doanh thu mục tiêu</small><b>${money.format(plan.goalRevenue)}</b></span><span><small>Lợi nhuận mục tiêu</small><b>${money.format(plan.goalProfit)}</b></span><span><small>Ngân sách</small><b>${money.format(plan.budget)}</b></span></div>
        <p>${escapeHtml(plan.note || plan.risks || "Chưa có ghi chú.")}</p>
        <div class="row-actions"><button class="link-button icon-only action-edit" type="button" data-edit-team-plan="${plan.id}" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-team-item="plans:${plan.id}" title="Lưu trữ">${icon("archive")}</button></div>
      </article>`).join("") : `<div class="empty">Chưa có kế hoạch phù hợp.</div>`}</div>`;
    }
    
    function pricingLineAmount(line, baseCost, salePrice) {
      if (line.included === false || line.type === "note") return 0;
      if (line.type === "cost_percent") return baseCost * line.value / 100;
      if (line.type === "price_percent") return salePrice * line.value / 100;
      return line.value;
    }
    
    function roundedPricingValue(value, scenario = {}) {
      const mode = scenario.roundingMode || "step";
      const step = Math.max(1, Number(scenario.roundingStep || 1000));
      if (mode === "none") return Math.max(0, Math.round(value));
      if (mode === "tail9") {
        const ceiling = Math.ceil(Math.max(0, value) / step) * step;
        return Math.max(0, ceiling - Math.max(1, Math.round(step / 10)));
      }
      return Math.ceil(Math.max(0, value) / step) * step;
    }
    
    function calculatePricingScenario(model, scenario) {
      const normalizedModel = normalizePricingModel(model || {});
      const normalizedScenario = normalizePricingScenario(scenario || {});
      const baseCost = Math.max(0, Number(normalizedModel.baseCost || 0));
      const activeLines = normalizedModel.lines.filter(line => line.included !== false && line.type !== "note");
      const fixedCostTotal = activeLines
        .filter(line => line.type === "fixed")
        .reduce((sum, line) => sum + Math.max(0, Number(line.value || 0)), 0);
      const costPercentRate = activeLines
        .filter(line => line.type === "cost_percent")
        .reduce((sum, line) => sum + Math.max(0, Number(line.value || 0)), 0);
      const costPercentTotal = baseCost * costPercentRate / 100;
      const pricePercentRate = activeLines
        .filter(line => line.type === "price_percent")
        .reduce((sum, line) => sum + Math.max(0, Number(line.value || 0)), 0);
      const targetProfitAmount = Math.max(0, Number(normalizedScenario.targetProfitAmount || 0));
      const targetMargin = Math.max(0, Number(normalizedScenario.targetMargin || 0));
      const manualPrice = Math.max(0, Number(normalizedScenario.manualPrice || 0));
      const costBeforeSaleLinkedFees = baseCost + fixedCostTotal + costPercentTotal;
      const warnings = [];
      let rawSuggestedPrice = manualPrice;
    
      if (!baseCost) warnings.push("Sản phẩm chưa có giá vốn; kết quả chỉ mang tính tham khảo.");
      if (pricePercentRate >= 100) warnings.push("Tổng phí theo giá bán phải nhỏ hơn 100%.");
      if (!manualPrice) {
        const requiredRate = pricePercentRate + (targetProfitAmount > 0 ? 0 : targetMargin);
        const divisor = 1 - requiredRate / 100;
        if (divisor <= 0) {
          warnings.push("Tổng phí theo giá bán và biên lãi mục tiêu quá cao nên không thể tính giá hợp lệ.");
          rawSuggestedPrice = 0;
        } else {
          rawSuggestedPrice = targetProfitAmount > 0
            ? (costBeforeSaleLinkedFees + targetProfitAmount) / Math.max(0.01, 1 - pricePercentRate / 100)
            : costBeforeSaleLinkedFees / divisor;
        }
      }
    
      const roundedPrice = rawSuggestedPrice > 0 ? roundedPricingValue(rawSuggestedPrice, normalizedScenario) : 0;
      const pricePercentTotal = roundedPrice * pricePercentRate / 100;
      const totalCost = costBeforeSaleLinkedFees + pricePercentTotal;
      const expectedProfit = roundedPrice - totalCost;
      const expectedMargin = roundedPrice > 0 ? expectedProfit / roundedPrice * 100 : 0;
      if (roundedPrice > 0 && roundedPrice < baseCost) warnings.push("Giá sau làm tròn đang thấp hơn giá vốn.");
      if (roundedPrice > 0 && expectedProfit < 0) warnings.push("Kịch bản này đang tạo lợi nhuận âm.");
      if (!roundedPrice) warnings.push("Chưa tính được giá bán hợp lệ.");
    
      return {
        baseCost,
        fixedCostTotal,
        costPercentRate,
        costPercentTotal,
        pricePercentRate,
        pricePercentTotal,
        targetProfitAmount,
        targetMargin,
        rawSuggestedPrice,
        roundedPrice,
        expectedProfit,
        expectedMargin,
        totalCost,
        warnings
      };
    }
    
    function pricingTotals(model, scenario) {
      const result = calculatePricingScenario(model, scenario);
      return {
        ...result,
        salePrice: result.roundedPrice,
        grossProfit: result.expectedProfit,
        margin: result.expectedMargin,
        suggested: result.roundedPrice,
        fixedExtra: result.fixedCostTotal + result.costPercentTotal,
        priceLinkedCost: result.pricePercentTotal
      };
    }
    
    function renderTeamPricing() {
      const items = currentTeamItems();
      return `<div class="team-pricing-list">${items.length ? items.map(model => {
        const product = model.productId ? byId("products", model.productId) : null;
        const scenario = (model.scenarios || []).find(item => item.id === model.selectedScenarioId) || (model.scenarios || [])[0] || { targetMargin: 35, manualPrice: 0 };
        const totals = pricingTotals(model, scenario);
        return `<article class="team-pricing-card">
          <div class="team-card-head"><div><strong>${escapeHtml(model.title || (product ? "Tính giá " + product.name : "Bảng tính giá"))}</strong><small>${product ? `${escapeHtml(product.sku)} · ${escapeHtml(product.name)}` : "Không gắn sản phẩm"} · ${escapeHtml(model.owner || "Chưa giao")}</small></div>${teamStatusBadge(model.status)}</div>
          <div class="team-money-grid"><span><small>Tổng chi phí</small><b>${money.format(totals.totalCost)}</b></span><span><small>Giá gợi ý</small><b>${money.format(totals.suggested)}</b></span><span><small>Biên lãi</small><b class="${totals.margin < 20 ? "negative-text" : "positive-text"}">${totals.margin.toFixed(1)}%</b></span></div>
          <div class="team-cost-lines">${(model.lines || []).slice(0, 4).map(line => `<span>${escapeHtml(line.label)} <b>${line.type === "fixed" ? money.format(line.value) : line.value + "%"}</b></span>`).join("") || "<span>Chưa có chi phí thêm</span>"}</div>
          <div class="row-actions"><a class="link-button icon-only action-edit" href="./team-pricing.html?id=${encodeURIComponent(model.id)}" title="Sửa" aria-label="Sửa">${icon("edit")}</a><button class="link-button danger-link icon-only" type="button" data-archive-team-item="pricing:${model.id}" title="Lưu trữ">${icon("archive")}</button></div>
        </article>`;
      }).join("") : `<div class="empty">Chưa có bảng tính giá phù hợp.</div>`}</div>`;
    }
    
    function teamPricingPageContext() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id") || "";
      const productId = params.get("productId") || "";
      const existing = id ? (state.teamPricingModels || []).map(normalizePricingModel).find(item => item.id === id) : null;
      if (existing) return { existing, model: existing };
      const product = productId ? byId("products", productId) : null;
      return {
        existing: null,
        model: normalizePricingModel({
          title: product ? `Tính giá ${product.name}` : "",
          productId: product ? product.id : "",
          baseCost: product ? product.costPrice : 0,
          priceTarget: "offline",
          status: "draft",
          owner: currentUser ? currentUser.name : ""
        })
      };
    }
    
    function renderTeamPricingPage() {
      const container = qs("[data-team-pricing-page]");
      if (!container) return;
      const { existing, model } = teamPricingPageContext();
      if (els.title) els.title.textContent = existing ? "Cập nhật bảng tính giá" : "Tạo bảng tính giá";
      container.innerHTML = `
        <form class="team-pricing-page-form" data-team-pricing-page-form data-pricing-existing-id="${escapeAttribute(existing ? existing.id : "")}">
          ${renderPricingForm(model)}
          <footer class="team-pricing-page-actions">
            <a class="button ghost" href="./team.html">${icon("close")} Quay lại Team Hub</a>
            <button class="button primary" type="submit">${icon("check")} Lưu bảng tính giá</button>
          </footer>
        </form>
      `;
      hydrateIcons(container);
      const form = container.querySelector("[data-team-pricing-page-form]");
      updatePricingScopeFields(form);
      updateTeamPricingPreview(form);
      enhanceMoneyInputs(container);
    }
    
    async function submitTeamPricingPageForm(form) {
      validatePricingModel(pricingModelFromForm(form));
      const existingId = form.dataset.pricingExistingId || "";
      const existing = existingId ? (state.teamPricingModels || []).find(item => item.id === existingId) : null;
      const saved = await saveTeamItem("pricing", form, existing || null);
      const nextUrl = `./team-pricing.html?id=${encodeURIComponent(saved.id)}`;
      if (!existingId) window.history.replaceState(null, "", nextUrl);
      form.dataset.pricingExistingId = saved.id;
      renderTeamPricingPage();
      return saved;
    }
    
    function renderTeamDecisions() {
      const items = currentTeamItems();
      return `<div class="team-list">${items.length ? items.map(decision => `<article class="team-item compact">
        <div><strong>${escapeHtml(decision.title)}</strong><small>${decision.decidedAt ? formatDate(decision.decidedAt) : "Chưa có ngày"} · ${escapeHtml(decision.owner ? ownerName(decision.owner) : "Chưa giao")}${decision.tags ? ` · ${escapeHtml(decision.tags)}` : ""}</small></div>
        <div>${teamStatusBadge(decision.status)}<small>${decision.nextReviewAt ? "Xem lại " + formatDate(decision.nextReviewAt) : "Không lịch xem lại"}</small></div>
        <div class="team-item-preview">${escapeHtml(decision.detail || "Chưa có mô tả.")}</div>
        <div class="row-actions"><button class="link-button icon-only action-edit" type="button" data-edit-team-decision="${decision.id}" title="Sửa">${icon("edit")}</button><button class="link-button danger-link icon-only" type="button" data-archive-team-item="decisions:${decision.id}" title="Lưu trữ">${icon("archive")}</button></div>
      </article>`).join("") : `<div class="empty">Chưa có quyết định phù hợp.</div>`}</div>`;
    }
    
    function teamOwnerOptions(selected) {
      const values = teamOwners();
      if (selected && !values.includes(selected)) values.unshift(selected);
      return `<option value="">Chưa giao</option>${values.map(name => `<option value="${escapeAttribute(name)}" ${selected === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}`;
    }
    
    function teamProductOptions(selected) {
      const products = [...(state.products || [])].filter(product => product.status !== "deleted").sort((a, b) => a.name.localeCompare(b.name, "vi"));
      return `<option value="">Không gắn sản phẩm</option>${products.map(product => `<option value="${product.id}" ${selected === product.id ? "selected" : ""}>${escapeHtml(product.sku)} · ${escapeHtml(product.name)}</option>`).join("")}`;
    }
    
    function teamChannelOptions(selected = "", emptyLabel = "Shop/POS offline") {
      const channels = [...(state.salesChannels || [])].filter(channel => channel.status === "active");
      const fallback = [
        ["", emptyLabel],
        ["website", "Website"],
        ["shopee", "Shopee"],
        ["tiktok", "TikTok Shop"],
        ["lazada", "Lazada"],
        ["facebook", "Facebook"]
      ];
      const options = channels.length ? [["", emptyLabel], ...channels.map(channel => [channel.id, channel.name || channel.code])] : fallback;
      return options.map(([value, label]) => `<option value="${escapeAttribute(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    }
    
    function pricingMarketplaceChannels() {
      const channelsList = [...(state.salesChannels || [])]
        .map(normalizeSalesChannel)
        .filter(channel => channel.status === "active")
        .filter(channel => {
          const code = String(channel.code || "").toLowerCase();
          return ["shopee", "tiktok"].includes(code) || (channel.type === "marketplace" && !["lazada"].includes(code));
        });
      const priority = { shopee: 0, tiktok: 1 };
      return channelsList.sort((a, b) => {
        const aCode = String(a.code || "").toLowerCase();
        const bCode = String(b.code || "").toLowerCase();
        return (priority[aCode] ?? 10) - (priority[bCode] ?? 10) || String(a.name).localeCompare(String(b.name), "vi");
      });
    }
    
    function pricingChannelOptions(selected = "", emptyLabel = "Chọn kênh/sàn") {
      const available = pricingMarketplaceChannels();
      const fallback = [
        { id: "shopee", code: "shopee", name: "Shopee" },
        { id: "tiktok", code: "tiktok", name: "TikTok Shop" }
      ];
      const options = available.length ? available : fallback;
      return `<option value="">${escapeHtml(emptyLabel)}</option>${options.map(channel => `<option value="${escapeAttribute(channel.id)}" ${selected === channel.id || selected === channel.code ? "selected" : ""}>${escapeHtml(channel.name || channel.code)}</option>`).join("")}`;
    }
    
    function pricingTargetLabel(priceTarget, channelId) {
      if (priceTarget !== "channel") return "Shop/POS offline";
      const channel = channelByIdOrCode(channelId);
      return channel ? channel.name : "Kênh/sàn chưa chọn";
    }
    
    function pricingSuggestedTitle(product, priceTarget, channelId) {
      if (!product) return "";
      return `Tính giá ${product.name} - ${pricingTargetLabel(priceTarget, channelId)}`;
    }
    
    function renderTeamSourceAndComments(item) {
      const comments = Array.isArray(item.commentLog) ? item.commentLog : [];
      const sourceTypes = [
        ["manual", "Ghi chú riêng"],
        ["product", "Sản phẩm"],
        ["content", "Content"],
        ["order", "Đơn hàng"],
        ["pricing", "Bảng tính giá"],
        ["plan", "Kế hoạch"]
      ];
      return `
        <details class="content-details team-extra-details full">
          <summary><span>Liên kết và trao đổi<small>Nguồn tham chiếu, link liên quan và comment nội bộ.</small></span></summary>
          <div class="content-details-body">
            <div class="field"><label>Nguồn liên kết</label><select name="sourceType">${sourceTypes.map(([value, label]) => `<option value="${value}" ${item.sourceType === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
            <div class="field"><label>Mã/link nguồn</label><input name="sourceId" value="${escapeAttribute(item.sourceId || "")}" placeholder="SKU, mã đơn, link Docs/Drive..." /></div>
            <div class="content-form-box full"><strong>Lịch sử trao đổi</strong>${comments.length ? `<div class="content-comment-log">${comments.slice(-6).map(comment => `<p><span>${escapeHtml(comment.author || "Team")} · ${escapeHtml(formatDateTime(comment.createdAt || ""))}</span>${escapeHtml(comment.text || "")}</p>`).join("")}</div>` : `<p class="content-empty">Chưa có trao đổi.</p>`}<textarea name="newComment" rows="2" placeholder="Thêm comment, cảnh báo, số liệu cần theo dõi..."></textarea></div>
          </div>
        </details>
      `;
    }
    
    function appendTeamCommentLog(existing, data) {
      const comments = Array.isArray(existing && existing.commentLog) ? [...existing.commentLog] : [];
      const text = String(data.newComment || "").trim();
      delete data.newComment;
      if (text) {
        comments.push({
          text,
          author: currentUser ? currentUser.name : "Team",
          createdAt: new Date().toISOString()
        });
      }
      return comments;
    }
    
    function actionRowsFromText(text) {
      return String(text || "").split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
        const parts = line.split("|").map(part => part.trim());
        const dateMatch = String(parts[2] || "").match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        const dueDate = dateMatch
          ? `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, "0")}-${String(dateMatch[1]).padStart(2, "0")}`
          : parts[2] || "";
        return normalizeTeamAction({ title: parts[0] || "", owner: parts[1] || "", dueDate, status: parts[3] || "todo" });
      });
    }
    
    function textFromActionRows(actions) {
      return (actions || []).map(action => [action.title, action.owner, action.dueDate ? formatDate(action.dueDate) : "", action.status].filter(Boolean).join(" | ")).join("\n");
    }
    
    function localDateTimeValue(value) {
      const date = value ? new Date(value) : new Date();
      if (!isFinite(date.getTime())) return "";
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }
    
    function meetingTypeOptions(selected) {
      return [["weekly", "Họp tuần"], ["planning", "Kế hoạch"], ["product", "Sản phẩm"], ["finance", "Tài chính"], ["content", "Content"], ["other", "Khác"]]
        .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
    }
    
    function meetingStatusOptions(selected) {
      return [["draft", "Nháp"], ["scheduled", "Đã lên lịch"], ["completed", "Hoàn tất"], ["cancelled", "Hủy"]]
        .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
    }
    
    function actionStatusOptions(selected) {
      return [["todo", "Cần làm"], ["doing", "Đang làm"], ["done", "Xong"]]
        .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
    }
    
    function splitListText(text) {
      return String(text || "")
        .split(/\n+/)
        .map(line => line.replace(/^\s*(?:[-*•]+|\d+[.)]|[a-z][.)])\s*/i, "").trim())
        .filter(Boolean);
    }
    
    function meetingMinutesIdFromUrl() {
      return new URLSearchParams(window.location.search).get("id") || "";
    }
    
    function setMeetingMinutesUrl(id) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("id", id);
      else url.searchParams.delete("id");
      window.history.replaceState({}, "", url);
    }
    
    function renderMinutesTextRows(container, items, type) {
      if (!container) return;
      container.innerHTML = (items.length ? items : [""]).map(item => `
        <div class="minutes-row" data-minutes-${type}-row>
          <input value="${escapeAttribute(item)}" placeholder="${type === "agenda" ? "Nội dung agenda" : type === "decision" ? "Quyết định đã chốt" : "Link hoặc ghi chú link"}" />
          <button class="icon-button" type="button" data-minutes-remove-row title="Xóa">${icon("trash")}</button>
        </div>
      `).join("");
      hydrateIcons(container);
    }
    
    function renderMinutesActions(container, actions) {
      if (!container) return;
      const rows = actions.length ? actions : [normalizeTeamAction({ title: "", owner: "", dueDate: "", status: "todo" })];
      container.innerHTML = rows.map(action => `
        <div class="minutes-action-row" data-minutes-action-row>
          <input data-action-title value="${escapeAttribute(action.title)}" placeholder="Việc cần làm" />
          <select data-action-owner>${teamOwnerOptions(action.owner)}</select>
          <input data-action-due type="date" value="${escapeAttribute(action.dueDate)}" />
          <select data-action-status>${actionStatusOptions(action.status || "todo")}</select>
          <button class="icon-button" type="button" data-minutes-remove-row title="Xóa">${icon("trash")}</button>
        </div>
      `).join("");
      hydrateIcons(container);
    }
    
    function renderMinutesAttendees(form, attendeesText) {
      const host = form?.querySelector("[data-minutes-attendees]");
      const hidden = form?.querySelector("[data-minutes-attendees-hidden]");
      if (!host || !hidden) return;
      const attendees = String(attendeesText || "")
        .split(/[,;\n]+/)
        .map(item => item.trim())
        .filter(Boolean);
      hidden.value = attendees.join(", ");
      host.innerHTML = attendees.length ? attendees.map(name => `
        <button class="minutes-chip" type="button" data-minutes-remove-attendee="${escapeAttribute(name)}">${escapeHtml(name)} ${icon("close")}</button>
      `).join("") : `<span class="muted">Chưa thêm ai.</span>`;
    }
    
    function renderMeetingMinutesForm(meeting) {
      const form = els.minutesForm;
      if (!form) return;
      const fields = form.elements;
      const item = normalizeTeamMeeting(meeting || {});
      const isNew = !item.id || item.id.indexOf("meeting_") === 0;
      form.dataset.meetingId = isNew ? "" : item.id;
      fields.title.value = item.title || "";
      fields.type.innerHTML = meetingTypeOptions(item.type || "weekly");
      fields.status.innerHTML = meetingStatusOptions(item.status || "draft");
      fields.meetingAt.value = item.meetingAt ? localDateTimeValue(item.meetingAt) : localDateTimeValue();
      fields.owner.innerHTML = teamOwnerOptions(item.owner || (currentUser ? currentUser.name : ""));
      fields.notes.value = item.notes || "";
      fields.sourceType.value = item.sourceType || "manual";
      fields.sourceId.value = item.sourceId || "";
      fields.newComment.value = "";
      const attendeeSelect = form.querySelector("[data-minutes-attendee-select]");
      if (attendeeSelect) attendeeSelect.innerHTML = `<option value="">Chọn nhân viên</option>${teamOwners().map(name => `<option value="${escapeAttribute(name)}">${escapeHtml(name)}</option>`).join("")}`;
      renderMinutesAttendees(form, item.attendees || "");
      renderMinutesTextRows(els.minutesAgendaList, splitListText(item.agenda), "agenda");
      renderMinutesTextRows(els.minutesDecisionsList, item.decisions || [], "decision");
      renderMinutesTextRows(els.minutesLinksList, splitListText(item.links), "link");
      renderMinutesActions(els.minutesActionsList, item.actions || []);
      syncMeetingMinutesForm();
      if (els.minutesTitle) els.minutesTitle.textContent = isNew ? "Biên bản mới" : item.title || "Biên bản họp";
      if (els.minutesSubtitle) {
        els.minutesSubtitle.textContent = isNew
          ? "Ghi nhanh, hệ thống sẽ tự chuẩn hóa agenda, quyết định và việc cần làm."
          : `${teamStatuses[item.status] || item.status || "Nháp"} · ${item.meetingAt ? formatDateTimeShort(item.meetingAt) : "Chưa có lịch"}`;
      }
    }
    
    function renderMeetingMinutesList(activeId) {
      if (!els.minutesList) return;
      const meetings = (state.teamMeetings || []).map(normalizeTeamMeeting)
        .filter(item => item.status !== "deleted")
        .sort((a, b) => String(b.meetingAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.meetingAt || a.updatedAt || a.createdAt || "")));
      els.minutesList.innerHTML = meetings.length ? meetings.map(item => {
        const openActions = (item.actions || []).filter(action => action.status !== "done").length;
        return `<button type="button" class="${item.id === activeId ? "active" : ""}" data-minutes-select="${escapeAttribute(item.id)}">
          <strong>${escapeHtml(item.title || "Biên bản chưa đặt tên")}</strong>
          <span>${item.meetingAt ? formatDateTimeShort(item.meetingAt) : "Chưa có lịch"} · ${escapeHtml(item.owner || "Chưa giao")}</span>
          <small>${openActions} việc mở · ${(item.decisions || []).length} quyết định</small>
        </button>`;
      }).join("") : `<div class="empty">Chưa có biên bản.</div>`;
    }
    
    function renderMeetingMinutesPage() {
      if (!els.minutesForm) return;
      const id = meetingMinutesIdFromUrl();
      const meeting = id ? (state.teamMeetings || []).find(item => item.id === id) : null;
      renderMeetingMinutesList(id);
      renderMeetingMinutesForm(meeting || {});
    }
    
    function valuesFromMinutesRows(selector) {
      return [...document.querySelectorAll(selector)]
        .map(row => row.querySelector("input")?.value.trim() || "")
        .filter(Boolean);
    }
    
    function syncMeetingMinutesForm() {
      if (!els.minutesForm) return;
      if (els.minutesHiddenAgenda) els.minutesHiddenAgenda.value = valuesFromMinutesRows("[data-minutes-agenda-row]").join("\n");
      if (els.minutesHiddenDecisions) els.minutesHiddenDecisions.value = valuesFromMinutesRows("[data-minutes-decision-row]").join("\n");
      if (els.minutesHiddenLinks) els.minutesHiddenLinks.value = valuesFromMinutesRows("[data-minutes-link-row]").join("\n");
      if (els.minutesHiddenActions) {
        els.minutesHiddenActions.value = [...document.querySelectorAll("[data-minutes-action-row]")]
          .map(row => [
            row.querySelector("[data-action-title]")?.value.trim() || "",
            row.querySelector("[data-action-owner]")?.value.trim() || "",
            row.querySelector("[data-action-due]")?.value.trim() || "",
            row.querySelector("[data-action-status]")?.value.trim() || "todo"
          ])
          .filter(parts => parts[0])
          .map(parts => parts.join(" | "))
          .join("\n");
      }
    }
    
    function addMinutesTextRow(type, value = "") {
      const container = {
        agenda: els.minutesAgendaList,
        decision: els.minutesDecisionsList,
        link: els.minutesLinksList
      }[type];
      if (!container) return;
      container.insertAdjacentHTML("beforeend", `
        <div class="minutes-row" data-minutes-${type}-row>
          <input value="${escapeAttribute(value)}" placeholder="${type === "agenda" ? "Nội dung agenda" : type === "decision" ? "Quyết định đã chốt" : "Link hoặc ghi chú link"}" />
          <button class="icon-button" type="button" data-minutes-remove-row title="Xóa">${icon("trash")}</button>
        </div>
      `);
      hydrateIcons(container);
      container.querySelector(".minutes-row:last-child input")?.focus();
    }
    
    function addMinutesAction(action = {}) {
      if (!els.minutesActionsList) return;
      const item = normalizeTeamAction({ status: "todo", ...action });
      els.minutesActionsList.insertAdjacentHTML("beforeend", `
        <div class="minutes-action-row" data-minutes-action-row>
          <input data-action-title value="${escapeAttribute(item.title)}" placeholder="Việc cần làm" />
          <select data-action-owner>${teamOwnerOptions(item.owner)}</select>
          <input data-action-due type="date" value="${escapeAttribute(item.dueDate)}" />
          <select data-action-status>${actionStatusOptions(item.status || "todo")}</select>
          <button class="icon-button" type="button" data-minutes-remove-row title="Xóa">${icon("trash")}</button>
        </div>
      `);
      hydrateIcons(els.minutesActionsList);
      els.minutesActionsList.querySelector(".minutes-action-row:last-child input")?.focus();
    }
    
    function applyMeetingTemplate(template) {
      const templates = {
        weekly: ["Kết quả tuần trước", "Vướng mắc cần gỡ", "Việc ưu tiên tuần này", "Người phụ trách và deadline"],
        planning: ["Mục tiêu", "Nguồn lực/ngân sách", "Rủi ro", "Mốc triển khai", "Quyết định cần chốt"],
        content: ["Ý tưởng/chủ đề", "Kênh đăng", "Asset cần chuẩn bị", "Deadline", "Số liệu cần theo dõi"],
        finance: ["Số liệu hiện tại", "Khoản cần xử lý", "Chênh lệch/rủi ro", "Quyết định", "Người phụ trách"]
      };
      renderMinutesTextRows(els.minutesAgendaList, templates[template] || templates.weekly, "agenda");
      syncMeetingMinutesForm();
    }
    
    function parseQuickMeetingNote() {
      const text = els.minutesQuickNote?.value || "";
      if (!text.trim()) return;
      const noteLines = [];
      splitListText(text).forEach(line => {
        const clean = line.replace(/^(quyết định|quyet dinh|chốt|chot|decision|qd)\s*[:\-]\s*/i, "").trim();
        if (/^(quyết định|quyet dinh|chốt|chot|decision|qd)\s*[:\-]/i.test(line)) {
          addMinutesTextRow("decision", clean);
        } else if (/^(việc|viec|todo|action|làm|lam)\s*[:\-]/i.test(line)) {
          const actionText = line.replace(/^(việc|viec|todo|action|làm|lam)\s*[:\-]\s*/i, "").trim();
          const dueMatch = actionText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
          addMinutesAction({
            title: actionText.replace(/\s*(trước|truoc|deadline|hạn|han)?\s*20\d{2}-\d{2}-\d{2}\b/i, "").trim(),
            dueDate: dueMatch ? dueMatch[1] : ""
          });
        } else if (/https?:\/\/|drive\.google|docs\.google|sheets\.google/i.test(line)) {
          addMinutesTextRow("link", line);
        } else {
          noteLines.push(line);
        }
      });
      if (noteLines.length && els.minutesForm?.notes) {
        els.minutesForm.elements.notes.value = [els.minutesForm.elements.notes.value.trim(), noteLines.join("\n")].filter(Boolean).join("\n");
      }
      els.minutesQuickNote.value = "";
      syncMeetingMinutesForm();
    }
    
    function cleanMeetingMinutesText() {
      if (!els.minutesForm) return;
      ["notes"].forEach(name => {
        if (els.minutesForm.elements[name]) els.minutesForm.elements[name].value = splitListText(els.minutesForm.elements[name].value).join("\n");
      });
      ["agenda", "decision", "link"].forEach(type => {
        document.querySelectorAll(`[data-minutes-${type}-row] input`).forEach(input => {
          input.value = splitListText(input.value).join(" ");
        });
      });
      syncMeetingMinutesForm();
    }
    
    async function submitMeetingMinutesForm(form) {
      syncMeetingMinutesForm();
      const id = form.dataset.meetingId || "";
      const existing = id ? (state.teamMeetings || []).find(item => item.id === id) : null;
      const saved = await saveTeamItem("meeting", form, existing || null);
      if (saved?.id) setMeetingMinutesUrl(saved.id);
      showToast("Đã lưu biên bản họp.");
    }
    
    function renderMeetingForm(meeting) {
      const item = normalizeTeamMeeting(meeting || {});
      return `
        <div class="field"><label for="teamMeetingTitle">Tên cuộc họp</label><input id="teamMeetingTitle" name="title" value="${escapeAttribute(item.title)}" placeholder="Họp kế hoạch tháng 7" required /></div>
        <div class="field"><label for="teamMeetingType">Loại họp</label><select id="teamMeetingType" name="type">${[["weekly", "Họp tuần"], ["planning", "Kế hoạch"], ["product", "Sản phẩm"], ["finance", "Tài chính"], ["content", "Content"], ["other", "Khác"]].map(([value, label]) => `<option value="${value}" ${item.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label for="teamMeetingAt">Thời gian</label><input id="teamMeetingAt" name="meetingAt" type="datetime-local" value="${escapeAttribute(item.meetingAt)}" /></div>
        <div class="field"><label for="teamMeetingStatus">Trạng thái</label><select id="teamMeetingStatus" name="status">${[["draft", "Nháp"], ["scheduled", "Đã lên lịch"], ["completed", "Hoàn tất"], ["cancelled", "Hủy"]].map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label for="teamMeetingOwner">Người chủ trì</label><select id="teamMeetingOwner" name="owner">${teamOwnerOptions(item.owner)}</select></div>
        <div class="field"><label for="teamMeetingAttendees">Thành viên</label><input id="teamMeetingAttendees" name="attendees" value="${escapeAttribute(item.attendees)}" placeholder="Nguyên, Linh, Kho..." /></div>
        <div class="field full"><label for="teamMeetingAgenda">Agenda</label><textarea id="teamMeetingAgenda" name="agenda" rows="4" placeholder="1. Kết quả tuần trước&#10;2. Vấn đề cần chốt&#10;3. Việc tuần này">${escapeHtml(item.agenda)}</textarea></div>
        <div class="field full"><label for="teamMeetingNotes">Nội dung biên bản</label><textarea id="teamMeetingNotes" name="notes" rows="6" placeholder="Ghi nhanh diễn biến, số liệu, bối cảnh...">${escapeHtml(item.notes)}</textarea></div>
        <div class="field full"><label for="teamMeetingDecisions">Quyết định đã chốt</label><textarea id="teamMeetingDecisions" name="decisionsText" rows="3" placeholder="Mỗi dòng một quyết định">${escapeHtml((item.decisions || []).join("\n"))}</textarea></div>
        <div class="field full"><label for="teamMeetingActions">Việc cần làm</label><textarea id="teamMeetingActions" name="actionsText" rows="4" placeholder="Nội dung | Người phụ trách | DD/MM/YYYY | todo/doing/done">${escapeHtml(textFromActionRows(item.actions))}</textarea><small>Mỗi dòng một việc. Có thể bỏ trống người phụ trách/deadline nếu chưa chốt.</small></div>
        <div class="field full"><label for="teamMeetingLinks">Link liên quan</label><textarea id="teamMeetingLinks" name="links" rows="2" placeholder="Google Drive, tài liệu, sản phẩm, content...">${escapeHtml(item.links)}</textarea></div>
        ${renderTeamSourceAndComments(item)}
      `;
    }
    
    function renderPlanForm(plan) {
      const item = normalizeTeamPlan(plan || {});
      return `
        <div class="field"><label for="teamPlanTitle">Tên kế hoạch</label><input id="teamPlanTitle" name="title" value="${escapeAttribute(item.title)}" placeholder="Kế hoạch bán Back to School" required /></div>
        <div class="field"><label for="teamPlanPeriod">Kỳ</label><input id="teamPlanPeriod" name="period" value="${escapeAttribute(item.period)}" placeholder="07/2026 hoặc Q3/2026" /></div>
        <div class="field"><label for="teamPlanStatus">Trạng thái</label><select id="teamPlanStatus" name="status">${[["idea", "Ý tưởng"], ["active", "Đang chạy"], ["paused", "Tạm dừng"], ["done", "Xong"], ["archived", "Lưu trữ"]].map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label for="teamPlanOwner">Phụ trách</label><select id="teamPlanOwner" name="owner">${teamOwnerOptions(item.owner)}</select></div>
        <div class="field"><label for="teamPlanRevenue">Doanh thu mục tiêu</label><input id="teamPlanRevenue" name="goalRevenue" type="number" min="0" step="1000" value="${item.goalRevenue}" /></div>
        <div class="field"><label for="teamPlanProfit">Lợi nhuận mục tiêu</label><input id="teamPlanProfit" name="goalProfit" type="number" min="0" step="1000" value="${item.goalProfit}" /></div>
        <div class="field"><label for="teamPlanBudget">Ngân sách</label><input id="teamPlanBudget" name="budget" type="number" min="0" step="1000" value="${item.budget}" /></div>
        <div class="field"><label for="teamPlanChannels">Kênh triển khai</label><input id="teamPlanChannels" name="channels" value="${escapeAttribute(item.channels)}" placeholder="POS, Shopee, TikTok..." /></div>
        <div class="field full"><label for="teamPlanProducts">Sản phẩm trọng tâm</label><input id="teamPlanProducts" name="focusProducts" value="${escapeAttribute(item.focusProducts)}" placeholder="SKU hoặc nhóm sản phẩm" /></div>
        <div class="field full"><label for="teamPlanMilestones">Milestone</label><textarea id="teamPlanMilestones" name="milestonesText" rows="4" placeholder="Mỗi dòng: Việc cần đạt | Deadline | Phụ trách">${escapeHtml((item.milestones || []).map(m => [m.title, m.dueDate, m.owner].filter(Boolean).join(" | ")).join("\n"))}</textarea></div>
        <div class="field full"><label for="teamPlanRisks">Rủi ro / giả định</label><textarea id="teamPlanRisks" name="risks" rows="3">${escapeHtml(item.risks)}</textarea></div>
        <div class="field full"><label for="teamPlanNote">Ghi chú</label><textarea id="teamPlanNote" name="note" rows="3">${escapeHtml(item.note)}</textarea></div>
        ${renderTeamSourceAndComments(item)}
      `;
    }
    
    function renderPricingForm(model) {
      const item = normalizePricingModel(model || {});
      const selectedProduct = item.productId ? byId("products", item.productId) : null;
      const lines = item.lines.length ? item.lines : [
        { label: "Bao bì", type: "fixed", value: 1000 },
        { label: "Phí thanh toán", type: "price_percent", value: 3 },
        { label: "Dự phòng rủi ro", type: "price_percent", value: 2 }
      ].map(normalizePricingLine);
      const scenarios = item.scenarios.length ? item.scenarios : [
        { label: "Giá shop đề xuất", targetMargin: 35, manualPrice: 0, roundingStep: 1000 }
      ].map(normalizePricingScenario);
      const selectedScenarioId = scenarios.some(scenario => scenario.id === item.selectedScenarioId)
        ? item.selectedScenarioId
        : scenarios[0]?.id || "";
      const suggestedTitle = pricingSuggestedTitle(selectedProduct, item.priceTarget, item.channelId || item.channelCode || "");
      const pricingTitle = !item.title || String(item.title).startsWith("Tính giá ") ? suggestedTitle || item.title : item.title;
      return `
        <div class="pricing-workbench full">
          <section class="pricing-block pricing-header-block">
            <div class="field"><label for="teamPricingTitle">Tên bảng tính</label><input id="teamPricingTitle" name="title" value="${escapeAttribute(pricingTitle)}" placeholder="Tính giá bộ màu nước 24 màu" required /></div>
            <div class="field"><label for="teamPricingStatus">Trạng thái</label><select id="teamPricingStatus" name="status">${[["draft", "Nháp"], ["active", "Đang dùng"], ["approved", "Đã duyệt"], ["archived", "Lưu trữ"]].map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
            <div class="field"><label for="teamPricingOwner">Phụ trách</label><select id="teamPricingOwner" name="owner">${teamOwnerOptions(item.owner)}</select></div>
            <div class="field full"><label for="teamPricingNote">Ghi chú</label><textarea id="teamPricingNote" name="note" rows="2">${escapeHtml(item.note)}</textarea></div>
          </section>
          <section class="pricing-block pricing-product-block">
            <div class="team-editor-head"><div><strong>Sản phẩm và nơi áp giá</strong><small>Giá vốn lấy từ danh mục và vẫn có thể điều chỉnh riêng cho bản tính này.</small></div></div>
            <div class="pricing-product-layout">
              <div class="field pricing-product-field">
                <label>Sản phẩm</label>
                <input type="hidden" name="productId" value="${escapeAttribute(item.productId)}" data-team-pricing-product />
                <div class="pricing-selected-product" data-pricing-selected-product>
                  ${renderPricingSelectedProduct(selectedProduct)}
                </div>
                <button class="button ghost" type="button" data-open-pricing-product-picker>${icon("package")} ${selectedProduct ? "Đổi sản phẩm" : "Thêm sản phẩm"}</button>
              </div>
              <div class="pricing-scope-panel ${item.priceTarget === "channel" ? "is-channel" : "is-offline"}" data-pricing-scope-panel>
                <div class="field"><label for="teamPricingBaseCost">Giá vốn một sản phẩm</label><input id="teamPricingBaseCost" name="baseCost" type="number" min="0" step="1" value="${item.baseCost}" data-team-pricing-input /></div>
                <div class="field"><label for="teamPricingQuantity">Số lượng tham chiếu</label><input id="teamPricingQuantity" name="quantity" type="number" min="1" step="1" value="${item.quantity}" data-team-pricing-input /><small>Chỉ dùng để tham khảo tổng lãi, không nhân vào giá bán đơn vị.</small></div>
                <div class="field pricing-target-field" data-pricing-target-field><label for="teamPricingTarget">Nơi muốn áp giá</label><select id="teamPricingTarget" name="priceTarget" data-team-pricing-input><option value="offline" ${item.priceTarget !== "channel" ? "selected" : ""}>Shop/POS offline</option><option value="channel" ${item.priceTarget === "channel" ? "selected" : ""}>Kênh/sàn bán hàng</option></select></div>
                <div class="field pricing-channel-field" data-pricing-channel-field ${item.priceTarget === "channel" ? "" : "hidden"}><label for="teamPricingChannel">Kênh/sàn muốn áp giá</label><select id="teamPricingChannel" name="channelId" data-team-pricing-input>${pricingChannelOptions(item.channelId || item.channelCode || "")}</select><a class="field-helper-link" href="./channels.html" target="_blank" rel="noopener">${icon("plus")} Quản lý hoặc thêm sàn khác</a></div>
              </div>
            </div>
          </section>
          <section class="pricing-block pricing-cost-block">
            <div class="team-editor-head"><div><strong>Cấu phần chi phí</strong><small>Chi phí được cộng vào giá của một sản phẩm.</small></div><button class="button ghost compact-button" type="button" data-add-pricing-line>${icon("plus")} Thêm dòng</button></div>
            <div class="pricing-presets" aria-label="Mẫu chi phí nhanh">
              ${[["Bao bì", "fixed"], ["Nhân công", "fixed"], ["Phí sàn", "price_percent"], ["Phí thanh toán", "price_percent"], ["Marketing/Ads", "price_percent"], ["Voucher/khuyến mãi", "price_percent"], ["Affiliate", "price_percent"], ["Dự phòng rủi ro", "price_percent"]].map(([name, type]) => `<button type="button" data-add-pricing-preset data-preset-name="${escapeAttribute(name)}" data-preset-type="${type}">+ ${escapeHtml(name)}</button>`).join("")}
            </div>
            <div class="pricing-row-labels pricing-line-labels"><span>Dùng</span><span>Tên chi phí</span><span>Cách tính</span><span>Giá trị</span><span>Ghi chú</span><span></span></div>
            <div data-pricing-lines>${lines.map((line, index) => renderPricingLineInput(line, index)).join("")}</div>
          </section>
          <section class="pricing-block pricing-scenario-block">
            <div class="team-editor-head"><div><strong>Kịch bản giá</strong><small>Chọn một kịch bản để xem và áp dụng kết quả tương ứng.</small></div><button class="button ghost compact-button" type="button" data-add-pricing-scenario>${icon("plus")} Thêm kịch bản</button></div>
            <input type="hidden" name="selectedScenarioId" value="${escapeAttribute(selectedScenarioId)}" data-selected-pricing-scenario />
            <div class="pricing-scenario-list" data-pricing-scenarios>${scenarios.map((scenario, index) => renderPricingScenarioInput(scenario, index, selectedScenarioId)).join("")}</div>
          </section>
          <section class="pricing-block pricing-result-block">
            <div class="team-editor-head"><div><strong>Kết quả tính giá</strong><small>Thay đổi đầu vào ở trên, kết quả sẽ cập nhật ngay mà không tải lại trang.</small></div></div>
            <div class="team-pricing-preview" data-team-pricing-preview></div>
          </section>
        </div>
        ${renderTeamSourceAndComments(item)}
      `;
    }
    
    function renderPricingSelectedProduct(product) {
      if (!product) {
        return `<div class="pricing-product-empty"><strong>Chưa chọn sản phẩm</strong><small>Bấm Thêm sản phẩm để chọn từ danh mục shop.</small></div>`;
      }
      return `
        <div class="pricing-product-summary">
          ${renderProductThumb(product, "cart-product-thumb")}
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <small>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small>
            <small>Giá vốn hiện tại: <b>${money.format(product.costPrice)}</b> · Giá shop: ${productHasShopPrice(product) ? money.format(product.salePrice) : "chưa có"}</small>
          </div>
        </div>
      `;
    }
    
    function renderPricingProductPicker() {
      const products = [...(state.products || [])]
        .filter(product => product.status !== "deleted")
        .sort((a, b) => a.name.localeCompare(b.name, "vi"));
      const categories = Array.from(new Set(products.map(product => String(product.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
      const brands = Array.from(new Set(products.map(product => String(product.brand || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
      return `
        <div class="product-picker pricing-product-picker full">
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
            <select data-product-picker-filter="price"><option value="">Tất cả trạng thái giá</option><option value="missing">Chưa có giá shop</option><option value="ready">Đã có giá shop</option></select>
            <select data-product-picker-filter="stock"><option value="">Tất cả tồn kho</option><option value="available">Còn hàng</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select>
            <select data-product-picker-sort><option value="name">Tên A-Z</option><option value="stock">Tồn kho nhiều</option><option value="priceAsc">Giá thấp</option><option value="priceDesc">Giá cao</option><option value="margin">Biên lãi cao</option></select>
            <button class="button ghost icon-only" type="button" data-reset-product-picker aria-label="Làm mới" title="Làm mới">${icon("refresh")}</button>
          </div>
          <div class="product-picker-list" data-product-picker-list>
            ${products.map(renderPricingProductPickerCard).join("") || `<div class="empty">Chưa có sản phẩm trong danh mục.</div>`}
            <div class="product-picker-empty" data-product-picker-empty hidden>Không tìm thấy sản phẩm phù hợp.</div>
          </div>
        </div>
      `;
    }
    
    function renderPricingProductPickerCard(product) {
      const stockClass = product.stock <= 0 ? "draft" : (product.stock <= product.lowStock ? "low" : "active");
      const margin = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0;
      const stockState = product.stock <= 0 ? "out" : (product.stock <= product.lowStock ? "low" : "available");
      return `
        <button class="product-card product-card-rich" type="button" data-product-picker-card data-select-pricing-product="${product.id}" data-product-search="${escapeAttribute(productSearchText(product))}" data-category="${escapeAttribute(product.category || "")}" data-brand="${escapeAttribute(product.brand || "")}" data-stock-state="${stockState}" data-price-state="${productHasShopPrice(product) ? "ready" : "missing"}" data-name="${escapeAttribute(product.name || "")}" data-price="${Number(product.salePrice || 0)}" data-stock="${Number(product.stock || 0)}" data-margin="${margin}">
          ${renderProductThumb(product)}
          <span class="product-card-main">
            <strong>${escapeHtml(product.name)}</strong>
            <small>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ""}</small>
            <span class="product-card-tags"><em>Vốn ${money.format(product.costPrice)}</em><small>${productHasShopPrice(product) ? `Giá shop ${money.format(product.salePrice)}` : "Chưa có giá shop"}</small></span>
          </span>
          <span class="product-card-side">
            <small class="badge ${stockClass}">${product.stock} còn</small>
            <small>${product.status === "active" ? "Đang bán" : "Ngừng bán"}</small>
          </span>
        </button>
      `;
    }
    
    function selectPricingProduct(productId) {
      const product = byId("products", productId);
      const form = qs("[data-team-pricing-page-form]") || els.modalForm;
      if (!product || !form) return;
      const hidden = form.querySelector("[data-team-pricing-product]");
      const selected = form.querySelector("[data-pricing-selected-product]");
      if (hidden) hidden.value = product.id;
      if (selected) selected.innerHTML = renderPricingSelectedProduct(product);
      if (form.baseCost) form.baseCost.value = product.costPrice || 0;
      syncPricingTitle(form, true);
      updateTeamPricingPreview(form);
      closeModal();
      showToast(`Đã chọn ${product.name} và cập nhật giá vốn.`);
    }
    
    function renderPricingLineInput(line, index) {
      const item = normalizePricingLine(line || {});
      return `<div class="team-dynamic-row pricing-line-row ${item.included ? "" : "is-excluded"}" data-pricing-line-row data-pricing-line-id="${escapeAttribute(item.id)}">
        <label class="pricing-row-toggle" title="Tính chi phí này"><input type="checkbox" data-pricing-line-included ${item.included ? "checked" : ""} data-team-pricing-input /><span>${icon("check")}</span></label>
        <label class="pricing-row-field"><span>Tên chi phí</span><input data-pricing-line-name value="${escapeAttribute(item.name)}" placeholder="VD: Bao bì, phí sàn..." aria-label="Tên chi phí" /></label>
        <label class="pricing-row-field"><span>Cách tính</span><select data-pricing-line-type data-team-pricing-input aria-label="Cách tính chi phí"><option value="fixed" ${item.type === "fixed" ? "selected" : ""}>Số tiền cố định</option><option value="cost_percent" ${item.type === "cost_percent" ? "selected" : ""}>% giá vốn</option><option value="price_percent" ${item.type === "price_percent" ? "selected" : ""}>% giá bán</option><option value="note" ${item.type === "note" ? "selected" : ""}>Chỉ ghi chú</option></select></label>
        <label class="pricing-row-field"><span>Giá trị</span><input data-pricing-line-value type="number" min="0" max="${item.type.includes("percent") ? "99" : "999999999"}" step="0.1" value="${item.value}" data-team-pricing-input placeholder="0" aria-label="Giá trị chi phí" ${item.type === "note" ? "disabled" : ""} /></label>
        <label class="pricing-row-field"><span>Ghi chú</span><input data-pricing-line-note value="${escapeAttribute(item.note)}" placeholder="Không bắt buộc" aria-label="Ghi chú chi phí" /></label>
        <button class="icon-button" type="button" data-remove-pricing-row title="Xóa">${icon("trash")}</button>
      </div>`;
    }
    
    function renderPricingScenarioInput(scenario, index, selectedScenarioId = "") {
      const item = normalizePricingScenario(scenario || {});
      const selected = item.id === selectedScenarioId || (!selectedScenarioId && index === 0);
      return `<article class="pricing-scenario-card ${selected ? "is-selected" : ""}" data-pricing-scenario-row data-pricing-scenario-id="${escapeAttribute(item.id)}">
        <header>
          <label class="pricing-scenario-choice"><input type="radio" name="pricingScenarioChoice" value="${escapeAttribute(item.id)}" ${selected ? "checked" : ""} data-select-pricing-scenario /><span></span></label>
          <label class="pricing-scenario-name"><span>Tên kịch bản</span><input data-pricing-scenario-name data-team-pricing-input value="${escapeAttribute(item.name)}" placeholder="VD: Giá shop, giá Shopee..." aria-label="Tên kịch bản giá" required /></label>
          <button class="icon-button" type="button" data-remove-pricing-row title="Xóa kịch bản">${icon("trash")}</button>
        </header>
        <div class="pricing-scenario-fields">
          <label class="pricing-row-field"><span>Kênh áp dụng</span><select data-pricing-scenario-channel data-team-pricing-input>${pricingChannelOptions(item.channelId, "Theo nơi áp giá ở trên")}</select></label>
          <label class="pricing-row-field"><span>Biên lãi mục tiêu (%)</span><input data-pricing-scenario-margin type="number" min="0" max="95" step="0.1" value="${item.targetMargin}" data-team-pricing-input /></label>
          <label class="pricing-row-field"><span>Lãi mục tiêu (đ)</span><input data-pricing-scenario-profit type="number" min="0" step="1" value="${item.targetProfitAmount}" data-team-pricing-input placeholder="0 = dùng biên lãi" /></label>
          <label class="pricing-row-field"><span>Giá tự nhập (đ)</span><input data-pricing-scenario-price type="number" min="0" step="1" value="${item.manualPrice}" data-team-pricing-input placeholder="0 = tự tính" /></label>
          <label class="pricing-row-field"><span>Quy tắc làm tròn</span><select data-pricing-scenario-rounding data-team-pricing-input><option value="none" ${item.roundingMode === "none" ? "selected" : ""}>Không làm tròn</option><option value="step" ${item.roundingMode === "step" ? "selected" : ""}>Làm tròn lên theo bước</option><option value="tail9" ${item.roundingMode === "tail9" ? "selected" : ""}>Giá đuôi 9</option></select></label>
          <label class="pricing-row-field"><span>Bước làm tròn</span><select data-pricing-scenario-step data-team-pricing-input><option value="1000" ${item.roundingStep === 1000 ? "selected" : ""}>1.000đ</option><option value="5000" ${item.roundingStep === 5000 ? "selected" : ""}>5.000đ</option><option value="10000" ${item.roundingStep === 10000 ? "selected" : ""}>10.000đ</option><option value="100" ${item.roundingStep === 100 ? "selected" : ""}>100đ</option></select></label>
        </div>
      </article>`;
    }
    
    function renderDecisionForm(decision) {
      const item = normalizeTeamDecision(decision || {});
      return `
        <div class="field"><label for="teamDecisionTitle">Quyết định</label><input id="teamDecisionTitle" name="title" value="${escapeAttribute(item.title)}" placeholder="Chốt giá bán lẻ bộ màu nước 24 màu" required /></div>
        <div class="field"><label for="teamDecisionStatus">Trạng thái</label><select id="teamDecisionStatus" name="status">${[["active", "Có hiệu lực"], ["archived", "Lưu trữ"]].map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label for="teamDecisionOwner">Phụ trách</label><select id="teamDecisionOwner" name="owner">${teamOwnerOptions(item.owner)}</select></div>
        <div class="field"><label for="teamDecisionAt">Ngày chốt</label><input id="teamDecisionAt" name="decidedAt" type="date" value="${escapeAttribute(item.decidedAt)}" /></div>
        <div class="field"><label for="teamDecisionReview">Ngày xem lại</label><input id="teamDecisionReview" name="nextReviewAt" type="date" value="${escapeAttribute(item.nextReviewAt)}" /></div>
        <div class="field"><label for="teamDecisionTags">Tag</label><input id="teamDecisionTags" name="tags" value="${escapeAttribute(item.tags)}" placeholder="giá bán, nhập hàng, marketing" /></div>
        <div class="field full"><label for="teamDecisionDetail">Nội dung chi tiết</label><textarea id="teamDecisionDetail" name="detail" rows="6">${escapeHtml(item.detail)}</textarea></div>
        ${renderTeamSourceAndComments(item)}
      `;
    }
    
    function collectPricingLines(form) {
      return [...form.querySelectorAll("[data-pricing-line-row]")].map(row => normalizePricingLine({
        id: row.dataset.pricingLineId,
        name: row.querySelector("[data-pricing-line-name]")?.value || "",
        type: row.querySelector("[data-pricing-line-type]")?.value || "fixed",
        value: row.querySelector("[data-pricing-line-value]")?.value || 0,
        note: row.querySelector("[data-pricing-line-note]")?.value || "",
        included: row.querySelector("[data-pricing-line-included]")?.checked !== false
      })).filter(line => line.label);
    }
    
    function collectPricingScenarios(form) {
      return [...form.querySelectorAll("[data-pricing-scenario-row]")].map(row => normalizePricingScenario({
        id: row.dataset.pricingScenarioId,
        name: row.querySelector("[data-pricing-scenario-name]")?.value || "",
        channelId: row.querySelector("[data-pricing-scenario-channel]")?.value || "",
        targetMargin: row.querySelector("[data-pricing-scenario-margin]")?.value || 0,
        targetProfitAmount: row.querySelector("[data-pricing-scenario-profit]")?.value || 0,
        manualPrice: row.querySelector("[data-pricing-scenario-price]")?.value || 0,
        roundingMode: row.querySelector("[data-pricing-scenario-rounding]")?.value || "step",
        roundingStep: row.querySelector("[data-pricing-scenario-step]")?.value || 1000
      })).filter(scenario => scenario.label);
    }
    
    function refreshPricingBuilderState(form) {
      if (!form) return;
      const lineContainer = form.querySelector("[data-pricing-lines]");
      const scenarioContainer = form.querySelector("[data-pricing-scenarios]");
      [lineContainer, scenarioContainer].forEach(container => {
        if (!container) return;
        container.querySelector("[data-pricing-empty]")?.remove();
      });
      if (lineContainer && !lineContainer.querySelector("[data-pricing-line-row]")) {
        lineContainer.insertAdjacentHTML("beforeend", `<div class="pricing-empty-hint" data-pricing-empty>Chưa có chi phí thêm. Giá sẽ được tính từ giá vốn và mục tiêu lợi nhuận.</div>`);
      }
      if (scenarioContainer && !scenarioContainer.querySelector("[data-pricing-scenario-row]")) {
        scenarioContainer.insertAdjacentHTML("beforeend", `<div class="pricing-empty-hint" data-pricing-empty>Thêm ít nhất một kịch bản để tính và áp dụng giá.</div>`);
      }
    }
    
    function updatePricingScopeFields(form) {
      if (!form) return;
      const isChannel = form.priceTarget?.value === "channel";
      const channelField = form.querySelector("[data-pricing-channel-field]");
      const scopePanel = form.querySelector("[data-pricing-scope-panel]");
      if (channelField) channelField.hidden = !isChannel;
      if (scopePanel) {
        scopePanel.classList.toggle("is-channel", isChannel);
        scopePanel.classList.toggle("is-offline", !isChannel);
      }
      if (form.channelId) {
        form.channelId.disabled = !isChannel;
        form.channelId.required = isChannel;
      }
      syncPricingTitle(form);
    }
    
    function syncPricingTitle(form, force = false) {
      if (!form?.title) return;
      const product = form.productId?.value ? byId("products", form.productId.value) : null;
      const suggested = pricingSuggestedTitle(product, form.priceTarget?.value || "offline", form.channelId?.value || "");
      const current = String(form.title.value || "").trim();
      if (suggested && (force || !current || current.startsWith("Tính giá "))) form.title.value = suggested;
    }
    
    function updatePricingLineState(source) {
      const row = source?.closest("[data-pricing-line-row]");
      if (!row) return;
      const type = row.querySelector("[data-pricing-line-type]")?.value || "fixed";
      const value = row.querySelector("[data-pricing-line-value]");
      const included = row.querySelector("[data-pricing-line-included]")?.checked !== false;
      row.classList.toggle("is-excluded", !included);
      if (value) {
        value.disabled = type === "note";
        value.max = type.includes("percent") ? "99" : "999999999";
        if (type === "note") value.value = "0";
      }
    }
    
    function selectPricingScenario(form, scenarioId) {
      if (!form || !scenarioId) return;
      const hidden = form.querySelector("[data-selected-pricing-scenario]");
      if (hidden) hidden.value = scenarioId;
      form.querySelectorAll("[data-pricing-scenario-row]").forEach(row => {
        const selected = row.dataset.pricingScenarioId === scenarioId;
        row.classList.toggle("is-selected", selected);
        const radio = row.querySelector("[data-select-pricing-scenario]");
        if (radio) radio.checked = selected;
      });
      updateTeamPricingPreview(form);
    }
    
    function updateTeamPricingPreview(form) {
      if (!form) return;
      const output = form.querySelector("[data-team-pricing-preview]");
      if (!output) return;
      const priceTarget = form.priceTarget?.value || "offline";
      const model = normalizePricingModel({
        productId: form.productId?.value || "",
        baseCost: Number(form.baseCost?.value || 0),
        quantity: Number(form.quantity?.value || 1),
        priceTarget,
        channelId: priceTarget === "channel" ? form.channelId?.value || "" : "",
        selectedScenarioId: form.querySelector("[data-selected-pricing-scenario]")?.value || "",
        lines: collectPricingLines(form),
        scenarios: collectPricingScenarios(form)
      });
      const product = model.productId ? byId("products", model.productId) : null;
      const selectedId = model.scenarios.some(scenario => scenario.id === model.selectedScenarioId)
        ? model.selectedScenarioId
        : model.scenarios[0]?.id || "";
      if (selectedId && model.selectedScenarioId !== selectedId) {
        const selectedInput = form.querySelector("[data-selected-pricing-scenario]");
        if (selectedInput) selectedInput.value = selectedId;
      }
      output.innerHTML = model.scenarios.length ? model.scenarios.map(scenario => {
        const result = calculatePricingScenario(model, scenario);
        const isSelected = scenario.id === selectedId;
        const channelId = scenario.channelId || model.channelId;
        const channel = channelId ? channelByIdOrCode(channelId) : null;
        const targetLabel = channel ? channel.name : (model.priceTarget === "channel" ? "Chưa chọn kênh" : "Shop/POS offline");
        return `<article class="pricing-result-card ${isSelected ? "is-selected" : ""}" data-pricing-result="${escapeAttribute(scenario.id)}">
          <header><div><span>${escapeHtml(scenario.name)}</span><small>${escapeHtml(product ? `${product.sku} · ${product.name}` : "Chưa chọn sản phẩm")} · ${escapeHtml(targetLabel)}</small></div>${isSelected ? `<em>Đang chọn</em>` : `<button type="button" class="button ghost compact-button" data-choose-pricing-result="${escapeAttribute(scenario.id)}">Chọn</button>`}</header>
          <div class="pricing-result-price"><small>Giá đề xuất sau làm tròn</small><strong>${money.format(result.roundedPrice)}</strong><span>Trước làm tròn ${money.format(result.rawSuggestedPrice)}</span></div>
          <div class="pricing-result-metrics">
            <span><small>Giá vốn</small><b>${money.format(result.baseCost)}</b></span>
            <span><small>Chi phí cố định</small><b>${money.format(result.fixedCostTotal)}</b></span>
            <span><small>% theo giá vốn</small><b>${money.format(result.costPercentTotal)} (${result.costPercentRate.toFixed(1)}%)</b></span>
            <span><small>% theo giá bán</small><b>${money.format(result.pricePercentTotal)} (${result.pricePercentRate.toFixed(1)}%)</b></span>
            <span><small>Lãi dự kiến / SP</small><b class="${result.expectedProfit < 0 ? "negative-text" : "positive-text"}">${money.format(result.expectedProfit)}</b></span>
            <span><small>Biên lãi dự kiến</small><b class="${result.expectedMargin < 0 ? "negative-text" : "positive-text"}">${result.expectedMargin.toFixed(1)}%</b></span>
          </div>
          ${model.quantity > 1 ? `<p class="pricing-quantity-note">Với ${model.quantity} sản phẩm: lãi dự kiến ${money.format(result.expectedProfit * model.quantity)}.</p>` : ""}
          ${result.warnings.length ? `<div class="pricing-warnings">${result.warnings.map(message => `<span>${icon("alertTriangle")} ${escapeHtml(message)}</span>`).join("")}</div>` : ""}
          <footer><button class="button primary" type="button" data-apply-pricing-scenario="${escapeAttribute(scenario.id)}" data-apply-pricing-target="offline">${icon("check")} Áp dụng giá shop</button><button class="button channel-action" type="button" data-apply-pricing-scenario="${escapeAttribute(scenario.id)}" data-apply-pricing-target="channel">${icon("truck")} Áp dụng giá kênh</button></footer>
        </article>`;
      }).join("") : `<p class="content-empty">Thêm ít nhất một kịch bản giá để xem gợi ý.</p>`;
      refreshPricingBuilderState(form);
    }
    
    function teamApiCollection(type) {
      return {
        meeting: ["teamMeetings", normalizeTeamMeeting],
        plan: ["teamPlans", normalizeTeamPlan],
        pricing: ["teamPricingModels", normalizePricingModel],
        decision: ["teamDecisions", normalizeTeamDecision]
      }[type] || ["teamMeetings", normalizeTeamMeeting];
    }
    
    function teamApiItemType(type) {
      return {
        meeting: "meeting",
        plan: "plan",
        pricing: "pricing",
        decision: "decision"
      }[type] || "meeting";
    }
    
    function pricingModelFromForm(form) {
      const priceTarget = form.priceTarget?.value || "offline";
      return normalizePricingModel({
        title: form.title?.value || "",
        productId: form.productId?.value || "",
        status: form.status?.value || "draft",
        owner: form.owner?.value || "",
        baseCost: form.baseCost?.value || 0,
        quantity: form.quantity?.value || 1,
        priceTarget,
        channelId: priceTarget === "channel" ? form.channelId?.value || "" : "",
        selectedScenarioId: form.querySelector("[data-selected-pricing-scenario]")?.value || "",
        note: form.note?.value || "",
        lines: collectPricingLines(form),
        scenarios: collectPricingScenarios(form)
      });
    }
    
    function validatePricingModel(model) {
      if (model.baseCost < 0 || !Number.isFinite(model.baseCost)) throw new Error("Giá vốn chưa hợp lệ.");
      model.lines.forEach(line => {
        if (!Number.isFinite(line.value) || line.value < 0) throw new Error(`Giá trị chi phí “${line.name || "chưa đặt tên"}” chưa hợp lệ.`);
        if (["cost_percent", "price_percent"].includes(line.type) && line.value >= 100) throw new Error(`Tỷ lệ “${line.name || "chi phí"}” phải nhỏ hơn 100%.`);
      });
      if (!model.scenarios.length) throw new Error("Cần có ít nhất một kịch bản giá.");
      model.scenarios.forEach(scenario => {
        if (scenario.targetMargin < 0 || scenario.targetMargin > 95) throw new Error(`Biên lãi của “${scenario.name}” phải từ 0% đến 95%.`);
      });
    }

    return { teamOwners, teamDateInRange, teamSearchText, currentTeamItems, setTeamOptions, renderTeamFilters, renderTeamHub, selectedIncenseOfferings, syncIncenseOfferings, renderOfferingTray, renderIncense, submitIncenseWish, teamStatusBadge, renderTeamTasks, renderTeamMeetings, renderTeamPlans, pricingLineAmount, roundedPricingValue, calculatePricingScenario, pricingTotals, renderTeamPricing, teamPricingPageContext, renderTeamPricingPage, submitTeamPricingPageForm, renderTeamDecisions, teamOwnerOptions, teamProductOptions, teamChannelOptions, pricingMarketplaceChannels, pricingChannelOptions, pricingTargetLabel, pricingSuggestedTitle, renderTeamSourceAndComments, appendTeamCommentLog, actionRowsFromText, textFromActionRows, localDateTimeValue, meetingTypeOptions, meetingStatusOptions, actionStatusOptions, splitListText, meetingMinutesIdFromUrl, setMeetingMinutesUrl, renderMinutesTextRows, renderMinutesActions, renderMinutesAttendees, renderMeetingMinutesForm, renderMeetingMinutesList, renderMeetingMinutesPage, valuesFromMinutesRows, syncMeetingMinutesForm, addMinutesTextRow, addMinutesAction, applyMeetingTemplate, parseQuickMeetingNote, cleanMeetingMinutesText, submitMeetingMinutesForm, renderMeetingForm, renderPlanForm, renderPricingForm, renderPricingSelectedProduct, renderPricingProductPicker, renderPricingProductPickerCard, selectPricingProduct, renderPricingLineInput, renderPricingScenarioInput, renderDecisionForm, collectPricingLines, collectPricingScenarios, refreshPricingBuilderState, updatePricingScopeFields, syncPricingTitle, updatePricingLineState, selectPricingScenario, updateTeamPricingPreview, teamApiCollection, teamApiItemType, pricingModelFromForm, validatePricingModel };
  }

  function init() {
    document.querySelectorAll("[data-team-view-switch], .team-tabs").forEach(nav => window.ArtFlowUI?.bindHorizontalWheel(nav));
  }
  document.addEventListener("DOMContentLoaded", init, { once: true });

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.team = Object.freeze({ create, init });
}());
