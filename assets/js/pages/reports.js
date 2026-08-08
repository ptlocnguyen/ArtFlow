(function () {
  function create(runtime) {
    const { byId, channelLabel, channels, comparisonText, els, money, orderCost, profitSnapshot, reportDayKey, reportFilters, returnedOrderItemQuantity } = runtime;

    function renderReports() {
      const snapshot = profitSnapshot(reportFilters.range, reportFilters.channel);
      const previous = profitSnapshot(reportFilters.range, reportFilters.channel, true);
      if (els.reportComparison) {
        els.reportComparison.textContent = reportFilters.range === "all"
          ? `${snapshot.orders.length} đơn đã ghi nhận`
          : comparisonText(snapshot, previous, "netProfit", "Lãi ròng");
      }
    
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
      const products = Object.values(productRows).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
      if (els.productProfitTable) {
        els.productProfitTable.innerHTML = products.length ? products.map(row => {
          const profit = row.revenue - row.cost;
          const margin = row.revenue > 0 ? profit / row.revenue : 0;
          return `<tr><td><strong>${row.name}</strong><small>${row.sku}</small></td><td>${row.quantity}</td><td>${money.format(row.revenue)}</td><td>${money.format(row.cost)}</td><td><strong>${money.format(profit)}</strong></td><td><span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span></td></tr>`;
        }).join("") : `<tr><td colspan="6" class="empty">Chưa có dữ liệu sản phẩm trong kỳ.</td></tr>`;
      }
    
      const channelRows = Object.keys(channels).map(channel => {
        const orders = snapshot.orders.filter(order => order.channel === channel);
        const revenue = orders.reduce((sum, order) => sum + order.netTotal, 0);
        const cost = orders.reduce((sum, order) => sum + orderCost(order), 0);
        return { channel, orders: orders.length, revenue, profit: revenue - cost };
      }).filter(row => row.orders > 0).sort((a, b) => b.profit - a.profit);
      if (els.channelProfitTable) {
        els.channelProfitTable.innerHTML = channelRows.length ? channelRows.map(row => {
          const margin = row.revenue > 0 ? row.profit / row.revenue : 0;
          return `<tr><td><span class="badge">${channelLabel(row.channel)}</span></td><td>${row.orders}</td><td>${money.format(row.revenue)}</td><td><strong>${money.format(row.profit)}</strong></td><td><span class="margin-value ${margin < 0 ? "negative" : ""}">${(margin * 100).toFixed(1)}%</span></td></tr>`;
        }).join("") : `<tr><td colspan="5" class="empty">Chưa có dữ liệu kênh trong kỳ.</td></tr>`;
      }
    
      if (els.expenseBreakdown) {
        const byCategory = snapshot.transactions.reduce((map, transaction) => {
          const category = byId("accountingCategories", transaction.categoryId);
          const label = category ? category.name : "Chưa phân loại";
          map[label] = (map[label] || 0) + transaction.amount * snapshot.expenseRatio;
          return map;
        }, {});
        const expenses = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        const maxExpense = Math.max(...expenses.map(entry => entry[1]), 1);
        els.expenseBreakdown.innerHTML = expenses.length ? expenses.map(([label, amount]) => `
          <div class="expense-row"><div><strong>${label}</strong><span>${money.format(amount)}</span></div><i style="--expense-width:${Math.round(amount / maxExpense * 100)}%"></i></div>
        `).join("") : `<div class="empty">Chưa phát sinh chi phí vận hành trong kỳ.</div>`;
      }
    
      if (els.profitChart) {
        const dayMap = {};
        snapshot.orders.forEach(order => {
          const day = reportDayKey(order.createdAt);
          const row = dayMap[day] || { revenue: 0, profit: 0 };
          row.revenue += order.netTotal;
          row.profit += order.netTotal - orderCost(order);
          dayMap[day] = row;
        });
        const days = Object.keys(dayMap).sort();
        const maxValue = Math.max(...days.map(day => Math.max(dayMap[day].revenue, dayMap[day].profit)), 1);
        els.profitChart.innerHTML = days.length ? days.map(day => {
          const row = dayMap[day];
          return `<div class="profit-chart-day"><div class="profit-bars"><i class="revenue" style="--value:${Math.max(3, Math.round(row.revenue / maxValue * 100))}%" title="Doanh thu ${money.format(row.revenue)}"></i><i class="profit" style="--value:${Math.max(3, Math.round(Math.max(0, row.profit) / maxValue * 100))}%" title="Lãi gộp ${money.format(row.profit)}"></i></div><span>${day.slice(5).replace("-", "/")}</span></div>`;
        }).join("") : `<div class="empty">Chưa có doanh thu trong kỳ.</div>`;
      }
    }

    return { renderReports };
  }

  function selectReportView(view) {
    const selected = ["business", "products", "channels", "expenses"].includes(view) ? view : "business";
    document.querySelectorAll("[data-report-view]").forEach(button => button.classList.toggle("active", button.dataset.reportView === selected));
    document.querySelectorAll("[data-report-view-panel]").forEach(panel => { panel.hidden = panel.dataset.reportViewPanel !== selected; });
  }

  function init() {
    document.querySelectorAll(".analytics-filterbar").forEach(bar => window.ArtFlowUI?.bindHorizontalWheel(bar));
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
