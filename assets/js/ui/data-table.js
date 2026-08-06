(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  function enhance(scope) {
    (scope || document).querySelectorAll("tbody tr[data-order-id], tbody tr[data-product-id], tbody tr[data-customer-id], tbody tr[data-purchase-order-row]").forEach(row => {
      if (!row.hasAttribute("tabindex")) row.tabIndex = 0;
      row.addEventListener("keydown", event => { if (event.key === "Enter") row.click(); }, { once: true });
    });
  }
  root.dataTable = { enhance };
  new MutationObserver(() => enhance()).observe(document.documentElement, { childList: true, subtree: true });
})();
