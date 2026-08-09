(function () {
  const reportViews = {
    business: "Kinh doanh",
    products: "Sản phẩm",
    channels: "Kênh bán",
    expenses: "Chi phí"
  };

  function create(runtime) {
    const { byId, channelLabel, channels, comparisonText, els, formatDate, money, orderCost, profitSnapshot, reportDayKey, reportFilters, returnedOrderItemQuantity } = runtime;

    function productReportRows(snapshot) {
      const rows = {};
      snapshot.orders.forEach(order => {
        const remainingItems = (order.items || []).map(item => ({
          item,
          quantity: Math.max(0, item.quantity - returnedOrderItemQuantity(item.id))
        })).filter(entry => entry.quantity > 0);
        const lineRevenue = remainingItems.reduce((sum, entry) => sum + entry.quantity * entry.item.unitPrice, 0);
        remainingItems.forEach(entry => {
          const row = rows[entry.item.productId] || { name: entry.item.name, sku: entry.item.sku, quantity: 0, revenue: 0, cost: 0 };
          const rawRevenue = entry.quantity * entry.item.unitPrice;
          row.quantity += entry.quantity;
          row.revenue += lineRevenue > 0 ? rawRevenue * order.netTotal / lineRevenue : 0;
          row.cost += entry.quantity * entry.item.costPrice;
          rows[entry.item.productId] = row;
        });
      });
      return Object.values(rows).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
    }

    function businessReportRows(snapshot) {
      const rows = {};
      snapshot.orders.forEach(order => {
        const day = reportDayKey(order.createdAt);
        const row = rows[day] || { day, orders: 0, revenue: 0, cost: 0 };
        row.orders += 1;
        row.revenue += order.netTotal;
        row.cost += orderCost(order);
        rows[day] = row;
      });
      return Object.values(rows).sort((a, b) => b.day.localeCompare(a.day));
    }

    function channelReportRows(snapshot) {
      return Object.keys(channels).map(channel => {
        const orders = snapshot.orders.filter(order => order.channel === channel);
        const revenue = orders.reduce((sum, order) => sum + order.netTotal, 0);
        const cost = orders.reduce((sum, order) => sum + orderCost(order), 0);
        return { channel, orders: orders.length, revenue, cost, profit: revenue - cost };
      }).filter(row => row.orders > 0).sort((a, b) => b.profit - a.profit);
    }

    function expenseReportRows(snapshot) {
      const rows = {};
      snapshot.transactions.forEach(transaction => {
        const category = byId("accountingCategories", transaction.categoryId);
        const label = category ? category.name : "Chưa phân loại";
        const row = rows[label] || { label, count: 0, amount: 0 };
        row.count += 1;
        row.amount += transaction.amount * snapshot.expenseRatio;
        rows[label] = row;
      });
      return Object.values(rows).sort((a, b) => b.amount - a.amount);
    }

    function marginCell(revenue, profit) {
      const margin = revenue > 0 ? profit / revenue : 0;
      return `<span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span>`;
    }

    function currentView() {
      return document.querySelector("[data-report-view].active")?.dataset.reportView || "business";
    }

    function updateResultMeta(count) {
      const resultCount = document.querySelector("[data-report-result-count]");
      if (resultCount) resultCount.textContent = `${count} dòng`;
    }

    function renderReports() {
      const snapshot = profitSnapshot(reportFilters.range, reportFilters.channel);
      const previous = profitSnapshot(reportFilters.range, reportFilters.channel, true);
      const view = currentView();
      if (els.reportComparison) {
        els.reportComparison.textContent = reportFilters.range === "all"
          ? `${snapshot.orders.length} đơn đã thanh toán`
          : comparisonText(snapshot, previous, "netProfit", "Lãi ròng");
      }

      const businessRows = businessReportRows(snapshot);
      const businessTable = document.querySelector("[data-business-report-table]");
      if (businessTable) {
        businessTable.innerHTML = businessRows.length ? businessRows.map(row => {
          const profit = row.revenue - row.cost;
          return `<tr><td><strong>${formatDate(row.day)}</strong></td><td>${row.orders}</td><td>${money.format(row.revenue)}</td><td>${money.format(row.cost)}</td><td><strong>${money.format(profit)}</strong></td><td>${marginCell(row.revenue, profit)}</td></tr>`;
        }).join("") : `<tr><td colspan="6" class="empty">Chưa có đơn đã thanh toán trong kỳ đã chọn.</td></tr>`;
      }

      const products = productReportRows(snapshot);
      if (els.productProfitTable) {
        els.productProfitTable.innerHTML = products.length ? products.map(row => {
          const profit = row.revenue - row.cost;
          return `<tr><td><strong>${row.name}</strong><small>${row.sku}</small></td><td>${row.quantity}</td><td>${money.format(row.revenue)}</td><td>${money.format(row.cost)}</td><td><strong>${money.format(profit)}</strong></td><td>${marginCell(row.revenue, profit)}</td></tr>`;
        }).join("") : `<tr><td colspan="6" class="empty">Chưa có dữ liệu sản phẩm trong kỳ đã chọn.</td></tr>`;
      }

      const channelRows = channelReportRows(snapshot);
      if (els.channelProfitTable) {
        els.channelProfitTable.innerHTML = channelRows.length ? channelRows.map(row => `<tr><td><span class="badge">${channelLabel(row.channel)}</span></td><td>${row.orders}</td><td>${money.format(row.revenue)}</td><td>${money.format(row.cost)}</td><td><strong>${money.format(row.profit)}</strong></td><td>${marginCell(row.revenue, row.profit)}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">Chưa có dữ liệu kênh trong kỳ đã chọn.</td></tr>`;
      }

      const expenses = expenseReportRows(snapshot);
      const expenseTable = document.querySelector("[data-expense-report-table]");
      if (expenseTable) {
        const total = expenses.reduce((sum, row) => sum + row.amount, 0);
        expenseTable.innerHTML = expenses.length ? expenses.map(row => `<tr><td><strong>${row.label}</strong></td><td>${row.count}</td><td><strong>${money.format(row.amount)}</strong></td><td>${total > 0 ? (row.amount / total * 100).toFixed(1) : "0.0"}%</td></tr>`).join("") : `<tr><td colspan="4" class="empty">Chưa phát sinh chi phí vận hành trong kỳ đã chọn.</td></tr>`;
      }

      const counts = { business: businessRows.length, products: products.length, channels: channelRows.length, expenses: expenses.length };
      updateResultMeta(counts[view] || 0);
    }

    return { renderReports };
  }

  function selectReportView(view) {
    const selected = reportViews[view] ? view : "business";
    document.querySelectorAll("[data-report-view]").forEach(button => button.classList.toggle("active", button.dataset.reportView === selected));
    document.querySelectorAll("[data-report-view-panel]").forEach(panel => { panel.hidden = panel.dataset.reportViewPanel !== selected; });
    const heading = document.querySelector("[data-report-heading]");
    if (heading) heading.textContent = reportViews[selected];
    const visibleBody = document.querySelector(`[data-report-view-panel="${selected}"] tbody`);
    const rows = visibleBody ? [...visibleBody.rows].filter(row => !row.querySelector(".empty")).length : 0;
    const resultCount = document.querySelector("[data-report-result-count]");
    if (resultCount) resultCount.textContent = `${rows} dòng`;
  }

  function init() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-report-view]");
      if (button) selectReportView(button.dataset.reportView);
    });
    selectReportView(new URLSearchParams(window.location.search).get("view"));
  }
  document.addEventListener("DOMContentLoaded", init, { once: true });

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.reports = Object.freeze({ create, init });
}());
