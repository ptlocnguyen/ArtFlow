(function () {
  const config = window.ARTFLOW_POS_CONFIG;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createInitialState() {
    return {
      products: clone(window.ArtFlowPosSeed.products),
      customers: clone(window.ArtFlowPosSeed.customers),
      orders: clone(window.ArtFlowPosSeed.orders),
      accountingAccounts: clone(window.ArtFlowPosSeed.accountingAccounts || []),
      accountingCategories: clone(window.ArtFlowPosSeed.accountingCategories || []),
      accountingReconciliations: clone(window.ArtFlowPosSeed.accountingReconciliations || []),
      cashTransactions: clone(window.ArtFlowPosSeed.cashTransactions || []),
      suppliers: clone(window.ArtFlowPosSeed.suppliers || []),
      purchaseOrders: clone(window.ArtFlowPosSeed.purchaseOrders || []),
      supplierPayments: clone(window.ArtFlowPosSeed.supplierPayments || []),
      purchaseReturns: clone(window.ArtFlowPosSeed.purchaseReturns || []),
      users: clone(window.ArtFlowPosSeed.users),
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeState(state) {
    const initial = createInitialState();
    return {
      ...initial,
      ...state,
      products: Array.isArray(state.products) ? state.products : initial.products,
      customers: Array.isArray(state.customers) ? state.customers : initial.customers,
      orders: Array.isArray(state.orders) ? state.orders : initial.orders,
      accountingAccounts: Array.isArray(state.accountingAccounts) ? state.accountingAccounts : initial.accountingAccounts,
      accountingCategories: Array.isArray(state.accountingCategories) ? state.accountingCategories : initial.accountingCategories,
      accountingReconciliations: Array.isArray(state.accountingReconciliations) ? state.accountingReconciliations : initial.accountingReconciliations,
      cashTransactions: Array.isArray(state.cashTransactions) ? state.cashTransactions : initial.cashTransactions,
      suppliers: Array.isArray(state.suppliers) ? state.suppliers : initial.suppliers,
      purchaseOrders: Array.isArray(state.purchaseOrders) ? state.purchaseOrders : initial.purchaseOrders,
      supplierPayments: Array.isArray(state.supplierPayments) ? state.supplierPayments : initial.supplierPayments,
      purchaseReturns: Array.isArray(state.purchaseReturns) ? state.purchaseReturns : initial.purchaseReturns,
      users: Array.isArray(state.users) ? state.users : initial.users
    };
  }

  function load() {
    const raw = localStorage.getItem(config.storageKey);
    if (!raw) {
      const initial = createInitialState();
      save(initial);
      return initial;
    }

    try {
      const parsed = normalizeState(JSON.parse(raw));
      save(parsed);
      return parsed;
    } catch {
      const initial = createInitialState();
      save(initial);
      return initial;
    }
  }

  function save(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(config.storageKey, JSON.stringify(state));
  }

  function reset() {
    const initial = createInitialState();
    save(initial);
    return initial;
  }

  function getSessionUserId() {
    return sessionStorage.getItem(`${config.storageKey}.sessionUserId`) || "";
  }

  function setSessionUserId(userId) {
    if (userId) {
      sessionStorage.setItem(`${config.storageKey}.sessionUserId`, userId);
      return;
    }

    sessionStorage.removeItem(`${config.storageKey}.sessionUserId`);
  }

  window.ArtFlowPosStore = {
    load,
    save,
    reset,
    getSessionUserId,
    setSessionUserId
  };
})();
