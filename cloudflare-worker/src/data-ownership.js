// Business data is owned by D1. These actions must never silently fall back to
// the legacy Google Sheets implementation because the two stores are not kept
// in lockstep after a D1 mutation.
export const D1_OWNED_ACTIONS = new Set([
  "getPageData",
  "listProducts",
  "listCustomers",
  "listOrders",
  "listStockMovements",
  "listAuditLogs",
  "exportD1Snapshot",

  "createProduct",
  "updateProduct",
  "archiveProduct",
  "importProducts",
  "provisionProductContent",
  "provisionMissingProductContent",
  "createProductOption",
  "updateProductOption",
  "toggleProductOption",
  "createCustomer",
  "updateCustomer",
  "archiveCustomer",
  "importCustomers",
  "receiveStock",
  "adjustStock",

  "createOrder",
  "updateOrderStatus",
  "updateOrderFulfillment",
  "cancelOrder",
  "returnOrder",
  "refundOrder",
  // The PDF bytes are created by Apps Script, but the receipt payload must
  // always be anchored to the current D1 order.
  "createOrderReceiptPdf",

  "getAccountingData",
  "createCashTransaction",
  "updateCashTransaction",
  "archiveCashTransaction",
  "createAccountingAccount",
  "updateAccountingAccount",
  "archiveAccountingAccount",
  "createAccountingReconciliation",
  "createAccountingCategory",
  "updateAccountingCategory",
  "archiveAccountingCategory",
  "createPlatformPayout",
  "updatePlatformPayout",
  "addPlatformPayoutItem",
  "autoMatchPlatformPayout",
  "postPlatformPayout",
  "resolvePlatformPayoutMismatch",
  "updateAccountingSettings",

  "getPurchasingData",
  "createSupplier",
  "updateSupplier",
  "archiveSupplier",
  "createPurchaseOrder",
  "updatePurchaseOrder",
  "receivePurchaseOrder",
  "payPurchaseOrder",
  "cancelPurchaseOrder",
  "returnPurchaseOrder",
  "applySupplierCredit",

  "getContentWorkspaceData",
  "createContentItem",
  "updateContentItem",
  "archiveContentItem",
  "provisionContentItemAssets",
  "getTeamWorkspaceData",
  "createTeamItem",
  "updateTeamItem",
  "archiveTeamItem",
  "getIncenseData",
  "createIncenseWish",
  "getAppSettings",
  "updateAppSettings",

  "getOmniWorkspaceData",
  "upsertSalesChannel",
  "archiveSalesChannel",
  "upsertChannelProduct",
  "archiveChannelProduct",
  "upsertCampaign",
  "archiveCampaign",
  "upsertWorkspaceTask",
  "archiveWorkspaceTask",

  "getTikTokConnection",
  "startTikTokAuthorization",
  "refreshTikTokConnection",
  "disconnectTikTokShop",
  "syncTikTokCatalog",
  "syncTikTokInventory"
]);

export function isD1OwnedAction(action) {
  return D1_OWNED_ACTIONS.has(String(action || ""));
}

export function isD1CapacityOrAvailabilityError(value) {
  const message = String(value?.error || value?.message || value || "").toLowerCase();
  return message.includes("d1_error") ||
    message.includes("exceeded d1") ||
    message.includes("free tier daily row") ||
    message.includes("too many api requests") ||
    message.includes("database is locked") ||
    message.includes("database unavailable") ||
    message.includes("storage unavailable") ||
    message.includes("overloaded") ||
    message.includes("sqlite_busy") ||
    message.includes("sqlite_ioerr");
}
