(function () {
  const accountingViews = Object.freeze(["overview", "ledger", "receivables", "payouts", "payroll", "tax"]);

  function normalizeAccountingView(value) {
    return accountingViews.includes(String(value || "")) ? String(value) : "overview";
  }

  function closeMobileSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  function bindLocalNavigation(container) {
    if (!container) return;
    window.ArtFlowUI?.bindHorizontalWheel(container);
    container.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) closeMobileSidebar();
    });
  }

  window.ArtFlowNavigation = Object.freeze({ accountingViews, bindLocalNavigation, closeMobileSidebar, normalizeAccountingView });
}());
