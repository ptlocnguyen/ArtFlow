(function () {
  function create(runtime) {
    const { accountTypeLabel, accountingExportRange, accountingFilters, accountingPayrollRows, accountingRangeLabel, accountingTransactionTarget, accountingTypeLabel, byId, canManageAccounting, channelByIdOrCode, channels, collectedForOrder, els, escapeAttribute, escapeHtml, formatDate, getAccountingAccount, getAccountingCategory, getCustomer, getSupplier, icon, isPayrollTransaction, localDateValue, money, orderAgeDays, orderCost, outstandingForOrder, page, profitSnapshot, purchaseDueDays, reportDayKey, returnedOrderItemQuantity, searchTerm, shiftDateValue, state } = runtime;

    function syncAccountingView() {
      const viewTitles = {
        ledger: "Dòng tiền",
        receivables: "Công nợ",
        payouts: "Đối soát sàn",
        payroll: "Tiền lương",
        tax: "Thuế & chứng từ"
      };
      const currentTitle = document.querySelector("[data-accounting-current-title]");
      if (currentTitle) currentTitle.textContent = viewTitles[accountingFilters.view] || viewTitles.ledger;
      document.querySelectorAll("[data-accounting-view-filter]").forEach(button => {
        const active = button.dataset.accountingViewFilter === accountingFilters.view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-accounting-section]").forEach(section => {
        section.hidden = section.dataset.accountingSection !== accountingFilters.view;
      });
    }
    
    function commerceChannelLabel(codeOrId) {
      const channel = channelByIdOrCode(codeOrId);
      return channel?.name || channels[codeOrId] || codeOrId || "Chưa rõ sàn";
    }
    
    function payoutStatusMeta(status) {
      return {
        draft: ["Chờ đối soát", "neutral"], matched: ["Đã khớp", "success"],
        mismatch: ["Đang lệch", "warning"], posted: ["Đã ghi sổ", "success"]
      }[status] || [status || "Chưa rõ", "neutral"];
    }
    
    function renderCommerceAccounting() {
      const payouts = state.platformPayouts || [];
      const currentMonth = localDateValue().slice(0, 7);
      const postedOrderIds = new Set(payouts.filter(item => item.status === "posted").flatMap(item => item.items.map(line => line.orderId).filter(Boolean)));
      const platformOrders = (state.orders || []).filter(order => ["shopee","tiktok","lazada","facebook","website"].includes(order.channel) && ["paid","completed"].includes(order.status) && !postedOrderIds.has(order.id));
    
      const channelFilter = document.querySelector("[data-payout-channel-filter]");
      if (channelFilter) {
        channelFilter.innerHTML = `<option value="all">Tất cả sàn</option>${["shopee","tiktok","lazada","facebook","website"].map(code => `<option value="${code}">${commerceChannelLabel(code)}</option>`).join("")}`;
        channelFilter.value = accountingFilters.payoutChannel;
      }
      const statusFilter = document.querySelector("[data-payout-status-filter]"); if (statusFilter) statusFilter.value = accountingFilters.payoutStatus;
      const rangeFilter = document.querySelector("[data-payout-range-filter]"); if (rangeFilter) rangeFilter.value = accountingFilters.payoutRange;
      const payoutCutoff = accountingFilters.payoutRange === "all" ? "" : shiftDateValue(localDateValue(), -Number(accountingFilters.payoutRange));
      const visiblePayouts = payouts.filter(item => (accountingFilters.payoutChannel === "all" || [item.channelCode,item.channelId].includes(accountingFilters.payoutChannel)) && (accountingFilters.payoutStatus === "all" || item.status === accountingFilters.payoutStatus) && (!payoutCutoff || item.payoutDate >= payoutCutoff));
      const payoutTable = document.querySelector("[data-platform-payout-table]");
      if (payoutTable) payoutTable.innerHTML = visiblePayouts.length ? visiblePayouts.map(item => {
        const meta = payoutStatusMeta(item.status);
        return `<tr><td><strong>${escapeHtml(commerceChannelLabel(item.channelId || item.channelCode))}</strong><small>${escapeHtml(item.payoutCode)} · ${item.items.length} đơn</small></td><td>${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}</td><td>${money.format(item.expectedAmount)}</td><td><strong>${money.format(item.actualAmount)}</strong></td><td class="${item.difference ? "negative" : "positive"}">${money.format(item.difference)}</td><td><span class="badge ${meta[1]}">${meta[0]}</span></td><td><div class="table-actions"><button class="link-button icon-only" type="button" data-view-platform-payout="${item.id}" title="Chi tiết">${icon("eye")}</button>${item.status !== "posted" ? `<button class="link-button icon-only" type="button" data-match-platform-payout="${item.id}" title="Ghép đơn">${icon("refresh")}</button><button class="button small primary icon-only" type="button" data-post-platform-payout="${item.id}" title="Ghi nhận tiền về">${icon("wallet")}</button>` : ""}</div></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="empty">Chưa có payout phù hợp bộ lọc.</td></tr>`;
    
      const channelRevenue = document.querySelector("[data-accounting-channel-revenue]"); if (channelRevenue) { const totals={}; (state.orders||[]).filter(order=>String(order.createdAt).slice(0,7)===currentMonth).forEach(order=>totals[order.channel]=(totals[order.channel]||0)+order.netTotal); channelRevenue.innerHTML=Object.entries(totals).map(([channel,total])=>`<article><span>${commerceChannelLabel(channel)}</span><b>${money.format(total)}</b></article>`).join("")||`<div class="empty compact">Chưa có doanh thu tháng này.</div>`; }
      document.querySelectorAll("[data-accounting-debt-view]").forEach(button => button.classList.toggle("active", button.dataset.accountingDebtView === accountingFilters.debtView));
      const debtSection = document.querySelector("[data-accounting-section='receivables']");
      if (debtSection) {
        const titles = {
          platform: ["SÀN THƯƠNG MẠI ĐIỆN TỬ", "Công nợ sàn", "Các đơn sàn đã hoàn tất nhưng chưa nằm trong payout đã ghi sổ."],
          customer: ["PHẢI THU KHÁCH HÀNG", "Công nợ khách hàng", "Theo dõi đơn còn thiếu tiền và ưu tiên khoản quá hạn."],
          supplier: ["PHẢI TRẢ NHÀ CUNG CẤP", "Công nợ nhà cung cấp", "Theo dõi từng phiếu đã nhận hàng còn phải thanh toán."]
        }[accountingFilters.debtView];
        const kicker = debtSection.querySelector(".panel-header .section-kicker");
        const heading = debtSection.querySelector(".panel-header h2");
        const note = debtSection.querySelector(".panel-header h2 + p");
        if (kicker) kicker.textContent = titles[0];
        if (heading) heading.textContent = titles[1];
        if (note) note.textContent = titles[2];
      }
      const debtOps = document.querySelector("[data-accounting-debt-operations]");
      document.querySelectorAll(".accounting-local-toolbar, [data-accounting-receivables]").forEach(node => { node.hidden = accountingFilters.debtView !== "customer"; });
      if (debtOps) {
        debtOps.hidden = accountingFilters.debtView === "customer";
        if (accountingFilters.debtView === "platform") {
          const grouped = {};
          platformOrders.forEach(order => { const key=order.channel||"other"; grouped[key] ||= {count:0,total:0,oldest:0}; grouped[key].count+=1; grouped[key].total+=Number(order.netTotal||order.total||0); grouped[key].oldest=Math.max(grouped[key].oldest,orderAgeDays(order)); });
          debtOps.innerHTML = Object.entries(grouped).map(([channel,item])=>`<article class="accounting-debt-row"><span><strong>${commerceChannelLabel(channel)}</strong><small>${item.count} đơn · tuổi nợ cao nhất ${item.oldest} ngày</small></span><b>${money.format(item.total)}</b><span class="badge ${item.oldest>7?"warning":"neutral"}">${item.oldest>7?"Cần kiểm tra":"Chờ kỳ trả"}</span></article>`).join("") || `<div class="empty">Không có đơn sàn đang chờ payout.</div>`;
        } else if (accountingFilters.debtView === "supplier") {
          const payableOrders = (state.purchaseOrders || [])
            .filter(order => order.status === "received" && order.paymentStatus !== "paid" && order.outstanding > 0)
            .sort((a,b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")) || String(b.receivedAt).localeCompare(String(a.receivedAt)));
          debtOps.innerHTML = payableOrders.map(order => {
            const supplier = getSupplier(order);
            const receivedTime = new Date(order.receivedAt || order.createdAt).getTime();
            const age = isFinite(receivedTime) ? Math.max(0, Math.floor((Date.now() - receivedTime) / 86400000)) : 0;
            const dueDays = purchaseDueDays(order);
            const statusText = order.paidAmount > 0 || order.creditAppliedAmount > 0 ? "Trả một phần" : "Chưa thanh toán";
            return `<article class="supplier-payable-card ${dueDays !== null && dueDays > 0 ? "overdue" : ""}" data-supplier-payable-order="${order.id}">
              <div class="supplier-payable-head"><div><strong>${escapeHtml(order.code)}</strong><small>${escapeHtml(supplier.name)} · nhận ${formatDate(order.receivedAt)}</small></div><span class="badge ${order.paidAmount > 0 ? "pending" : "neutral"}">${statusText}</span></div>
              <div class="supplier-payable-values"><span><small>Tổng phiếu</small><b>${money.format(order.netTotal)}</b></span><span><small>Đã trả</small><b>${money.format(order.paidAmount)}</b></span><span><small>Đã bù trừ</small><b>${money.format(order.creditAppliedAmount)}</b></span><span class="outstanding"><small>Còn phải trả</small><b>${money.format(order.outstanding)}</b></span></div>
              <div class="supplier-payable-foot"><span>${order.dueDate ? `Hạn ${formatDate(order.dueDate)}${dueDays > 0 ? ` · quá ${dueDays} ngày` : ""}` : "Chưa đặt hạn"} · tuổi nợ ${age} ngày</span><div class="row-actions"><a class="link-button" href="./purchasing.html?purchaseOrderId=${encodeURIComponent(order.id)}">Xem phiếu mua</a>${canManageAccounting() ? `<button class="button primary compact-button" type="button" data-accounting-pay-purchase="${order.id}">${icon("receipt")} Thanh toán</button>` : ""}</div></div>
            </article>`;
          }).join("") || `<div class="empty">Không có phiếu mua đã nhận hàng còn phải trả.</div>`;
        }
      }
      const settingsForm = document.querySelector("[data-accounting-settings-form]");
      if (settingsForm) {
        const settings = state.accountingSettings || {};
        settingsForm.tolerance.value = Number(settings.tolerance ?? 1000);
        settingsForm.autoAdjustment.checked = Boolean(settings.autoAdjustment);
        settingsForm.payrollKeywords.value = settings.payrollKeywords || "lương, cộng tác viên, payroll";
        settingsForm.querySelectorAll("[data-accounting-setting-account]").forEach(select => {
          const selected = select.name === "shopeeAccountId" ? settings.shopeeAccountId : settings.tiktokAccountId;
          select.innerHTML = `<option value="">Chưa chọn</option>${(state.accountingAccounts || []).filter(item=>item.status==="active").map(account=>`<option value="${account.id}" ${selected===account.id?"selected":""}>${escapeHtml(account.name)}</option>`).join("")}`;
        });
      }
    }
    
    function renderAccounting() {
      const accountingRoot = document.querySelector(".accounting-view, .accounting-settings-page");
      if (!accountingRoot) return;
      if (page === "accounting") syncAccountingView();
      renderCommerceAccounting();
      const term = searchTerm.trim().toLowerCase();
      if (els.accountingTypeSelect) els.accountingTypeSelect.value = accountingFilters.type;
      if (els.accountingAccountFilter) {
        const current = accountingFilters.accountId;
        els.accountingAccountFilter.innerHTML = `<option value="all">Tất cả tài khoản</option>${(state.accountingAccounts || []).map(account => `<option value="${account.id}">${account.name}</option>`).join("")}`;
        els.accountingAccountFilter.value = current;
      }
      if (els.accountingRangeFilter) els.accountingRangeFilter.value = accountingFilters.range;
      if (els.accountingProfitRange) els.accountingProfitRange.value = accountingFilters.range;
    
      const cutoff = accountingFilters.range === "all" ? null : (() => {
        return shiftDateValue(localDateValue(), -Number(accountingFilters.range));
      })();
      const transactions = [...(state.cashTransactions || [])]
        .filter(transaction => {
          if (accountingFilters.type !== "all" && transaction.type !== accountingFilters.type) return false;
          if (accountingFilters.accountId !== "all" && transaction.accountId !== accountingFilters.accountId) return false;
          if (cutoff && String(transaction.transactionDate || transaction.createdAt).slice(0, 10) < cutoff) return false;
          if (!term) return true;
          const account = getAccountingAccount(transaction.accountId);
          const category = getAccountingCategory(transaction.categoryId);
          return [
            transaction.type,
            accountingTypeLabel(transaction.type),
            transaction.description,
            transaction.referenceType,
            transaction.referenceId,
            account.name,
            category.name
          ].join(" ").toLowerCase().includes(term);
        })
        .sort((a, b) => String(b.transactionDate || b.createdAt).localeCompare(String(a.transactionDate || a.createdAt)));
      const receivableOrders = state.orders
        .map(order => ({
          order,
          customer: getCustomer(order),
          collected: collectedForOrder(order),
          outstanding: outstandingForOrder(order),
          ageDays: orderAgeDays(order)
        }))
        .filter(item => item.outstanding > 0);
      if (els.accountingLedgerCount) {
        els.accountingLedgerCount.innerHTML = `<strong>${transactions.length}</strong><span>giao dịch phù hợp</span>`;
      }
    
      if (els.accountingAccounts) {
        els.accountingAccounts.innerHTML = (state.accountingAccounts || []).length ? state.accountingAccounts.map(account => {
          const accountTransactions = (state.cashTransactions || []).filter(transaction => transaction.accountId === account.id && transaction.status !== "deleted");
          const latestReconciliation = (state.accountingReconciliations || [])
            .filter(item => item.accountId === account.id)
            .sort((a, b) => String(b.reconciledAt || b.createdAt).localeCompare(String(a.reconciledAt || a.createdAt)))[0];
          const isArchived = account.status === "archived";
          const differenceClass = latestReconciliation && latestReconciliation.difference !== 0 ? "has-difference" : "is-balanced";
          return `
            <article class="account-card ${isArchived ? "archived" : ""}">
              <div class="account-card-head">
                <div><strong>${account.name}</strong><span>${accountTypeLabel(account.type)} · ${isArchived ? "Đang ẩn" : "Đang dùng"}</span></div>
                <b>${money.format(account.currentBalance)}</b>
              </div>
              <div class="account-card-meta">
                <span><small>Đầu kỳ</small><b>${money.format(account.openingBalance)}</b></span>
                <span><small>Giao dịch</small><b>${accountTransactions.length}</b></span>
                <span class="${differenceClass}"><small>Chênh lệch gần nhất</small><b>${latestReconciliation ? money.format(latestReconciliation.difference) : "Chưa đối soát"}</b></span>
              </div>
              <div class="account-card-actions">
                <button class="link-button icon-only" type="button" data-edit-accounting-account="${account.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button>
                ${isArchived ? "" : `<button class="link-button icon-only" type="button" data-reconcile-account="${account.id}" aria-label="Đối soát" title="Đối soát">${icon("calculator")}</button>`}
                <button class="link-button icon-only ${isArchived ? "" : "danger-link"}" type="button" data-archive-accounting-account="${account.id}" data-next-status="${isArchived ? "active" : "archived"}" aria-label="${isArchived ? "Kích hoạt" : "Ẩn"}" title="${isArchived ? "Kích hoạt" : "Ẩn"}">${icon(isArchived ? "check" : "archive")}</button>
              </div>
            </article>
          `;
        }).join("") : `<div class="empty">Chưa có tài khoản tiền.</div>`;
        els.accountingAccounts.scrollTop = 0;
      }
    
      if (els.accountingReconciliations) {
        const recentReconciliations = [...(state.accountingReconciliations || [])]
          .sort((a, b) => String(b.reconciledAt || b.createdAt).localeCompare(String(a.reconciledAt || a.createdAt)))
          .slice(0, 6);
        els.accountingReconciliations.innerHTML = recentReconciliations.length ? recentReconciliations.map(item => {
          const account = getAccountingAccount(item.accountId);
          const differenceClass = item.difference === 0 ? "is-balanced" : "has-difference";
          return `
            <article class="reconciliation-item ${differenceClass}">
              <div><strong>${account.name}</strong><small>${formatDate(item.reconciledAt)} · Sổ ${money.format(item.systemBalance)} · Thực tế ${money.format(item.actualBalance)}</small></div>
              <div><b>${item.difference > 0 ? "+" : ""}${money.format(item.difference)}</b><small>${item.note || (item.difference === 0 ? "Đã khớp" : "Cần kiểm tra")}</small></div>
            </article>
          `;
        }).join("") : `<div class="empty compact-empty">Chưa có lần đối soát nào.</div>`;
      }
    
      if (els.accountingReceivables) {
        const receivables = receivableOrders
          .filter(item => {
            if (accountingFilters.receivable === "overdue") return item.ageDays > 7;
            if (accountingFilters.receivable === "watch") return item.ageDays > 3 && item.ageDays <= 7;
            if (accountingFilters.receivable === "new") return item.ageDays <= 3;
            if (accountingFilters.receivable === "high") return item.outstanding >= 1000000;
            return true;
          })
          .sort((a, b) => b.ageDays - a.ageDays || String(a.order.createdAt).localeCompare(String(b.order.createdAt)))
          .slice(0, 8);
        els.accountingReceivables.innerHTML = receivables.length ? receivables.map(item => {
          const order = item.order;
          const ageLabel = item.ageDays === 0 ? "Hôm nay" : `${item.ageDays} ngày`;
          const ageClass = item.ageDays > 7 ? "danger" : item.ageDays > 3 ? "warning" : "";
          return `
            <article class="todo-item ${ageClass}">
              <div>
                <strong>${order.code}</strong>
                <small>${item.customer.name} · ${formatDate(order.createdAt)} · ${ageLabel}</small>
                <small>Đã thu ${money.format(item.collected)}</small>
              </div>
              <div>
                <b>${money.format(item.outstanding)}</b>
                ${canManageAccounting() ? `<button class="link-button icon-only" type="button" data-record-order-payment="${order.id}" aria-label="Ghi thu" title="Ghi thu">${icon("receipt")}</button>` : ""}
              </div>
            </article>
          `;
        }).join("") : `<div class="empty">Không còn khoản phải thu phù hợp bộ lọc.</div>`;
      }
    
      if (els.accountingPayrollTable) {
        if (els.accountingPayrollRange) els.accountingPayrollRange.value = accountingFilters.payrollRange;
        if (els.accountingPayrollSearch && els.accountingPayrollSearch.value !== accountingFilters.payrollSearch) {
          els.accountingPayrollSearch.value = accountingFilters.payrollSearch;
        }
        const payrollRows = accountingPayrollRows();
        els.accountingPayrollTable.innerHTML = payrollRows.length ? payrollRows.map(transaction => `
          <tr>
            <td>${formatDate(transaction.transactionDate || transaction.createdAt)}</td>
            <td><strong>${escapeHtml(transaction.description || "Chi lương")}</strong><small>${escapeHtml(getAccountingCategory(transaction.categoryId).name)}</small></td>
            <td>${escapeHtml(getAccountingAccount(transaction.accountId).name)}</td>
            <td>${escapeHtml(transaction.referenceId || "—")}</td>
            <td><strong class="danger-text">${money.format(transaction.amount)}</strong></td>
          </tr>
        `).join("") : `<tr><td colspan="5" class="empty">Chưa có khoản lương phù hợp bộ lọc.</td></tr>`;
      }
    
      if (els.accountingCategories || els.accountingCategoriesIncome || els.accountingCategoriesExpense) {
        const categoryTotalsByType = (state.cashTransactions || []).reduce((totals, transaction) => {
          if (transaction.status === "deleted") return totals;
          totals[transaction.type] = (totals[transaction.type] || 0) + transaction.amount;
          return totals;
        }, {});
        const renderCategoryColumn = (target, type) => {
          if (!target) return;
          const categories = (state.accountingCategories || []).filter(category => {
            if (type) return category.type === type;
            return accountingFilters.categoryType === "all" || category.type === accountingFilters.categoryType;
          });
          target.innerHTML = categories.length ? categories.map(category => {
          const relatedTransactions = (state.cashTransactions || []).filter(transaction => transaction.categoryId === category.id && transaction.status !== "deleted");
          const totalAmount = relatedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
          const categoryTotal = categoryTotalsByType[category.type] || 0;
          const share = categoryTotal > 0 ? Math.round((totalAmount / categoryTotal) * 1000) / 10 : 0;
          const lastUsed = relatedTransactions
            .map(transaction => transaction.transactionDate || transaction.createdAt)
            .filter(Boolean)
            .sort()
            .pop();
          const isArchived = category.status === "archived";
          return `
            <article class="category-chip ${category.type} ${isArchived ? "archived" : ""}">
              <div class="category-chip-main">
                <div>
                  <strong>${category.name}</strong>
                  <small>${accountingTypeLabel(category.type)} · ${isArchived ? "Đang ẩn" : "Đang dùng"}</small>
                </div>
                <span>${relatedTransactions.length} GD</span>
              </div>
              <div class="category-chip-stats">
                <span><small>Phát sinh</small><b>${money.format(totalAmount)}</b></span>
                <span><small>Tỷ trọng</small><b>${share}% ${accountingTypeLabel(category.type)}</b></span>
                <span><small>Gần nhất</small><b>${lastUsed ? formatDate(lastUsed) : "Chưa dùng"}</b></span>
              </div>
              <div class="category-share-bar" aria-label="Tỷ trọng ${share}%"><span style="width: ${Math.min(100, share)}%"></span></div>
              ${canManageAccounting() ? `
                <div class="category-chip-actions">
                  <button class="link-button icon-only" type="button" data-edit-accounting-category="${category.id}" aria-label="Sửa" title="Sửa">${icon("edit")}</button>
                  <button class="link-button icon-only ${isArchived ? "" : "danger-link"}" type="button" data-archive-accounting-category="${category.id}" data-next-status="${isArchived ? "active" : "archived"}" aria-label="${isArchived ? "Kích hoạt" : "Ẩn"}" title="${isArchived ? "Kích hoạt" : "Ẩn"}">${icon(isArchived ? "check" : "archive")}</button>
                </div>
              ` : ""}
            </article>
          `;
          }).join("") : `<div class="empty">Chưa có danh mục ${type === "income" ? "thu" : type === "expense" ? "chi" : "thu/chi"}.</div>`;
        };
        renderCategoryColumn(els.accountingCategories, "");
        renderCategoryColumn(els.accountingCategoriesIncome, "income");
        renderCategoryColumn(els.accountingCategoriesExpense, "expense");
      }
    
      if (els.accountingTransactionsTable) {
        els.accountingTransactionsTable.innerHTML = transactions.length ? transactions.map(transaction => {
          const category = getAccountingCategory(transaction.categoryId);
          const account = getAccountingAccount(transaction.accountId);
          const signedAmount = transaction.type === "income" ? transaction.amount : -transaction.amount;
          return `
            <tr data-transaction-row="${transaction.id}" class="${transaction.id === accountingTransactionTarget ? "deep-link-highlight" : ""}">
              <td><strong>${formatDate(transaction.transactionDate)}</strong><br><small>${transaction.referenceType || "manual"}</small></td>
              <td><span class="badge ${transaction.type === "income" ? "active" : "pending"}">${accountingTypeLabel(transaction.type)}</span></td>
              <td><strong>${category.name}</strong><br><small>${account.name}</small></td>
              <td>${escapeHtml(transaction.description)}${transaction.referenceType === "purchase_order" && transaction.referenceId ? `<br><a class="reference-link" href="./purchasing.html?purchaseOrderId=${encodeURIComponent(transaction.referenceId)}">${icon("external")} Phiếu mua ${escapeHtml(transaction.referenceId)}</a>` : ""}</td>
              <td>${transaction.documentUrl ? `<a class="document-link" href="${escapeAttribute(transaction.documentUrl)}" target="_blank" rel="noopener" title="Mở chứng từ">${icon("file")} <span>Mở file</span></a>` : `<span class="badge warning">Chưa có</span>`}</td>
              <td class="money-cell ${transaction.type === "income" ? "positive-money" : "negative-money"}"><strong>${money.format(signedAmount)}</strong></td>
              <td><div class="row-actions">${canManageAccounting() ? `<button class="link-button icon-only" data-edit-cash-transaction="${transaction.id}" aria-label="Chỉnh sửa giao dịch" title="Chỉnh sửa giao dịch">${icon("edit")}</button>${(!transaction.referenceType || transaction.referenceType === "manual") ? `<button class="link-button danger-link icon-only" data-archive-cash-transaction="${transaction.id}" aria-label="Xóa" title="Xóa">${icon("trash")}</button>` : ""}` : ""}</div></td>
            </tr>
          `;
        }).join("") : `<tr><td colspan="7" class="empty">Chưa có giao dịch thu/chi.</td></tr>`;
      }
    
      renderAccountingProfit();
    }
    
    function productProfitRowsFromSnapshot(snapshot) {
      const productRows = {};
      snapshot.orders.forEach(order => {
        const remainingItems = (order.items || []).map(item => ({
          item,
          quantity: Math.max(0, item.quantity - returnedOrderItemQuantity(item.id))
        })).filter(entry => entry.quantity > 0);
        const lineRevenue = remainingItems.reduce((sum, entry) => sum + entry.quantity * entry.item.unitPrice, 0);
        remainingItems.forEach(entry => {
          const row = productRows[entry.item.productId] || { name: entry.item.name, sku: entry.item.sku, quantity: 0, revenue: 0, cost: 0 };
          const rawRevenue = entry.quantity * entry.item.unitPrice;
          row.quantity += entry.quantity;
          row.revenue += lineRevenue > 0 ? rawRevenue * order.netTotal / lineRevenue : 0;
          row.cost += entry.quantity * entry.item.costPrice;
          productRows[entry.item.productId] = row;
        });
      });
      return Object.values(productRows).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
    }
    
    function renderAccountingProfit() {
      if (!els.accountingProductProfitTable && !els.accountingProfitChart && !els.accountingProfitInsights) return;
      const range = els.accountingProfitRange ? els.accountingProfitRange.value || accountingFilters.range : accountingFilters.range;
      const snapshot = profitSnapshot(range, "all");
      const payrollExpense = snapshot.transactions.reduce((sum, transaction) => {
        const category = byId("accountingCategories", transaction.categoryId);
        return /lương|luong|cộng tác viên|cong tac vien|payroll/i.test(String(category ? category.name : "") + " " + String(transaction.description || ""))
          ? sum + transaction.amount
          : sum;
      }, 0);
      if (els.accountingProfitInsights) {
        const products = productProfitRowsFromSnapshot(snapshot);
        const topProduct = products[0];
        const expenseRatio = snapshot.revenue > 0 ? snapshot.operatingExpenses / snapshot.revenue : 0;
        const negativeProducts = products.filter(row => row.revenue - row.cost < 0).length;
        const insights = [
          {
            icon: "package",
            title: topProduct ? `Dẫn đầu: ${topProduct.name}` : "Chưa có sản phẩm dẫn đầu",
            note: topProduct ? `Lãi gộp ${money.format(topProduct.revenue - topProduct.cost)}` : "Cần thêm đơn đã thanh toán."
          },
          {
            icon: "calculator",
            title: `Chi phí chiếm ${(expenseRatio * 100).toFixed(1)}% doanh thu`,
            note: payrollExpense > 0 ? `Tiền lương trong kỳ: ${money.format(payrollExpense)}` : "Chưa phát sinh chi phí lương."
          },
          {
            icon: negativeProducts ? "alertTriangle" : "check",
            title: negativeProducts ? `${negativeProducts} sản phẩm đang bán lỗ` : "Không có sản phẩm bán lỗ",
            note: negativeProducts ? "Mở bảng sản phẩm để kiểm tra giá vốn và giá bán." : "Biên lãi sản phẩm trong kỳ đang dương."
          }
        ];
        els.accountingProfitInsights.innerHTML = insights.map(item => `
          <article><span>${icon(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.note)}</small></div></article>
        `).join("");
      }
      if (els.accountingExpenseBreakdown) {
        const byCategory = snapshot.transactions.reduce((map, transaction) => {
          const category = byId("accountingCategories", transaction.categoryId);
          const label = category ? category.name : "Chưa phân loại";
          map[label] = (map[label] || 0) + transaction.amount * snapshot.expenseRatio;
          return map;
        }, {});
        const expenses = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        const maxExpense = Math.max(...expenses.map(entry => entry[1]), 1);
        els.accountingExpenseBreakdown.innerHTML = expenses.length ? expenses.map(([label, amount]) => {
          const share = snapshot.operatingExpenses > 0 ? amount / snapshot.operatingExpenses * 100 : 0;
          return `
            <div class="expense-row accounting-expense-row">
              <div><strong>${escapeHtml(label)}</strong><span>${money.format(amount)} · ${share.toFixed(1)}%</span></div>
              <i style="--expense-width:${Math.round(amount / maxExpense * 100)}%"></i>
            </div>
          `;
        }).join("") : `<div class="empty">Chưa phát sinh chi phí vận hành trong kỳ.</div>`;
      }
      if (els.accountingProductProfitTable) {
        const products = productProfitRowsFromSnapshot(snapshot);
        if (els.accountingProfitCount) els.accountingProfitCount.textContent = `${products.length} sản phẩm`;
        els.accountingProductProfitTable.innerHTML = products.length ? products.slice(0, 12).map(row => {
          const profit = row.revenue - row.cost;
          const margin = row.revenue > 0 ? profit / row.revenue : 0;
          return `<tr><td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.sku)} · ${row.quantity} SP</small></td><td>${money.format(row.revenue)}</td><td><strong>${money.format(profit)}</strong></td><td><span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span></td></tr>`;
        }).join("") : `<tr><td colspan="4" class="empty">Chưa có dữ liệu sản phẩm trong kỳ.</td></tr>`;
      }
      if (els.accountingProfitChart) {
        const dayMap = {};
        snapshot.orders.forEach(order => {
          const day = reportDayKey(order.createdAt);
          const row = dayMap[day] || { revenue: 0, profit: 0 };
          row.revenue += order.netTotal;
          row.profit += order.netTotal - orderCost(order);
          dayMap[day] = row;
        });
        const days = Object.keys(dayMap).sort();
        const maxValue = Math.max(...days.map(day => Math.max(dayMap[day].revenue, Math.max(0, dayMap[day].profit))), 1);
        els.accountingProfitChart.innerHTML = days.length ? days.map(day => {
          const row = dayMap[day];
          return `<div class="profit-chart-day"><div class="profit-bars"><i class="revenue" style="--value:${Math.max(3, Math.round(row.revenue / maxValue * 100))}%" title="Doanh thu ${money.format(row.revenue)}"></i><i class="profit" style="--value:${Math.max(3, Math.round(Math.max(0, row.profit) / maxValue * 100))}%" title="Lãi gộp ${money.format(row.profit)}"></i></div><span>${day.slice(5).replace("-", "/")}</span></div>`;
        }).join("") : `<div class="empty">Chưa có doanh thu trong kỳ.</div>`;
      }
    }
    
    function renderAccountingLedgerAnalysis() {
      const cutoff = accountingFilters.range === "all"
        ? ""
        : shiftDateValue(localDateValue(), -Number(accountingFilters.range));
      const transactions = (state.cashTransactions || []).filter(transaction => {
        if (transaction.status === "deleted") return false;
        if (accountingFilters.accountId !== "all" && transaction.accountId !== accountingFilters.accountId) return false;
        return !cutoff || String(transaction.transactionDate || transaction.createdAt).slice(0, 10) >= cutoff;
      });
      const income = transactions.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
      const expenses = transactions.filter(item => item.type === "expense");
      const expense = expenses.reduce((sum, item) => sum + item.amount, 0);
      const missingDocuments = expenses.filter(item => !item.documentUrl).length;
      const byCategory = expenses.reduce((groups, transaction) => {
        const category = getAccountingCategory(transaction.categoryId);
        const label = category.name || "Chưa phân loại";
        groups[label] = (groups[label] || 0) + transaction.amount;
        return groups;
      }, {});
      const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const maxExpense = Math.max(...categories.map(item => item[1]), 1);
      const account = accountingFilters.accountId === "all"
        ? "Tất cả tài khoản"
        : getAccountingAccount(accountingFilters.accountId).name;
      return `
        <div class="modal-summary full"><strong>${escapeHtml(accountingRangeLabel(accountingFilters.range))}</strong><span>${escapeHtml(account)} · phân tích theo bộ lọc Dòng tiền hiện tại.</span></div>
        <div class="profit-detail-flow ledger-analysis-metrics full">
          <article><span>Tổng thu</span><strong>${money.format(income)}</strong><small>${transactions.filter(item => item.type === "income").length} giao dịch</small></article>
          <article><span>Tổng chi</span><strong>${money.format(expense)}</strong><small>${expenses.length} giao dịch</small></article>
          <article><span>Dòng tiền ròng</span><strong>${money.format(income - expense)}</strong><small>Thu trừ chi</small></article>
          <article><span>Thiếu chứng từ</span><strong>${missingDocuments}</strong><small>Khoản chi cần bổ sung</small></article>
        </div>
        <div class="modal-section full">
          <div class="modal-section-heading"><h3>Cơ cấu khoản chi</h3><p>Xếp từ danh mục chi lớn nhất trong phạm vi đang chọn.</p></div>
          <div class="expense-breakdown compact">
            ${categories.length ? categories.map(([label, amount]) => {
              const share = expense > 0 ? amount / expense * 100 : 0;
              return `<div class="expense-row"><div><strong>${escapeHtml(label)}</strong><span>${money.format(amount)} · ${share.toFixed(1)}%</span></div><i style="--expense-width:${Math.round(amount / maxExpense * 100)}%"></i></div>`;
            }).join("") : `<div class="empty">Chưa phát sinh khoản chi trong phạm vi đang chọn.</div>`}
          </div>
        </div>
      `;
    }
    
    function renderAccountingProfitDetails() {
      const range = accountingExportRange();
      const snapshot = profitSnapshot(range, "all");
      const payrollExpense = snapshot.transactions.filter(isPayrollTransaction).reduce((sum, transaction) => sum + transaction.amount, 0);
      const netMargin = snapshot.revenue > 0 ? snapshot.netProfit / snapshot.revenue : 0;
      const byCategory = snapshot.transactions.reduce((map, transaction) => {
        const category = getAccountingCategory(transaction.categoryId);
        const label = category.name || "Chưa phân loại";
        map[label] = (map[label] || 0) + transaction.amount * snapshot.expenseRatio;
        return map;
      }, {});
      const expenses = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const maxExpense = Math.max(...expenses.map(entry => entry[1]), 1);
      const metrics = [
        ["Doanh thu thuần", snapshot.revenue, "Doanh thu đơn đã thanh toán sau hàng trả"],
        ["Giá vốn", snapshot.cost, "Giá vốn thực tế của sản phẩm đã bán"],
        ["Lãi gộp", snapshot.grossProfit, `${(snapshot.grossMargin * 100).toFixed(1)}% doanh thu`],
        ["Chi phí vận hành", snapshot.operatingExpenses, payrollExpense ? `Gồm ${money.format(payrollExpense)} tiền lương` : "Không gồm nhập hàng và hoàn tiền"],
        ["Lãi ròng", snapshot.netProfit, `${(netMargin * 100).toFixed(1)}% doanh thu`]
      ];
      return `
        <div class="modal-summary full"><strong>${escapeHtml(accountingRangeLabel(range))}</strong><span>Cấu thành lợi nhuận và các khoản chi ảnh hưởng trực tiếp đến kết quả kinh doanh.</span></div>
        <div class="profit-detail-flow full">
          ${metrics.map(([label, value, note], index) => `<article data-tone="${index}"><span>${label}</span><strong>${money.format(value)}</strong><small>${note}</small></article>`).join("")}
        </div>
        <div class="modal-section full">
          <div class="modal-section-heading"><h3>Chi phí theo danh mục</h3><p>Tỷ trọng được tính trên tổng chi phí vận hành trong kỳ.</p></div>
          <div class="expense-breakdown compact">
            ${expenses.length ? expenses.map(([label, amount]) => {
              const share = snapshot.operatingExpenses > 0 ? amount / snapshot.operatingExpenses * 100 : 0;
              return `<div class="expense-row"><div><strong>${escapeHtml(label)}</strong><span>${money.format(amount)} · ${share.toFixed(1)}%</span></div><i style="--expense-width:${Math.round(amount / maxExpense * 100)}%"></i></div>`;
            }).join("") : `<div class="empty">Chưa phát sinh chi phí vận hành trong kỳ.</div>`}
          </div>
        </div>
      `;
    }

    return { syncAccountingView, commerceChannelLabel, payoutStatusMeta, renderCommerceAccounting, renderAccounting, productProfitRowsFromSnapshot, renderAccountingProfit, renderAccountingLedgerAnalysis, renderAccountingProfitDetails };
  }

  function init() {
    document.querySelectorAll(".accounting-local-nav").forEach(nav => window.ArtFlowNavigation?.bindLocalNavigation(nav));
    document.querySelectorAll(".settings-anchor-nav").forEach(nav => {
      window.ArtFlowUI?.bindHorizontalWheel(nav);
      const syncActiveAnchor = hash => {
        const selectedHash = hash || "#accounts";
        nav.querySelectorAll("a[href^='#']").forEach(link => link.classList.toggle("active", link.getAttribute("href") === selectedHash));
      };
      nav.addEventListener("click", event => {
        const link = event.target.closest("a[href^='#']");
        if (link) syncActiveAnchor(link.getAttribute("href"));
      });
      window.addEventListener("hashchange", () => syncActiveAnchor(window.location.hash));
      syncActiveAnchor(window.location.hash);
    });
  }
  document.addEventListener("DOMContentLoaded", init, { once: true });

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.accounting = Object.freeze({ create, init });
}());
