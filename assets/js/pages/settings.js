(function () {
  function create(runtime) {
    const { els, getReceiptSettings } = runtime;
    const textFields = [
      "storeName", "legalName", "phone", "taxCode", "email", "website",
      "representative", "businessRegistration", "storeInfo", "address",
      "bankName", "bankAccount", "bankOwner", "invoiceSeries", "footer",
      "invoiceLegalNotice"
    ];
    const booleanFields = ["showSku", "showCustomer", "showPoints", "showUnitPrice"];

    function formControl(form, name) {
      return form?.elements?.namedItem(name) || null;
    }

    function hydrateSettingsForm(settings = getReceiptSettings()) {
      const form = els.settingsForm;
      if (!form) return;
      textFields.forEach(name => {
        const control = formControl(form, name);
        if (control) control.value = settings[name] || "";
      });
      booleanFields.forEach(name => {
        const control = formControl(form, name);
        if (control) control.checked = Boolean(settings[name]);
      });
      const paperSize = formControl(form, "paperSize");
      if (paperSize) {
        const requested = settings.paperSize || (settings.paperWidth ? `thermal${settings.paperWidth}` : "thermal80");
        paperSize.value = Array.from(paperSize.options).some(option => option.value === requested) ? requested : "thermal80";
      }
    }

    function setPreviewText(selector, value) {
      const node = els.settingsPreview?.querySelector(selector);
      if (node) node.textContent = value;
    }

    function setOptionalPreview(selector, value) {
      const node = els.settingsPreview?.querySelector(selector);
      if (!node) return;
      node.textContent = value || "";
      node.hidden = !value;
    }

    function renderSettingsPreview(settings = getReceiptSettings()) {
      if (!els.settingsPreview) return;
      setPreviewText("[data-settings-preview-store]", settings.storeName || "ArtFlow");
      setPreviewText("[data-settings-preview-legal]", settings.legalName || settings.storeName || "ArtFlow");
      setPreviewText("[data-settings-preview-contact]", `${settings.taxCode ? `MST: ${settings.taxCode} · ` : ""}${settings.phone || "Chưa có SĐT"}`);
      setPreviewText("[data-settings-preview-address]", settings.address || "Chưa có địa chỉ");
      setOptionalPreview("[data-settings-preview-online]", [settings.email, settings.website].filter(Boolean).join(" · "));
      setOptionalPreview("[data-settings-preview-bank]", settings.bankAccount ? `CK: ${settings.bankAccount}${settings.bankName ? ` - ${settings.bankName}` : ""}` : "");
      setPreviewText("[data-settings-preview-notice]", settings.invoiceLegalNotice || "");
    }

    function renderSettingsPage() {
      if (!els.settingsForm) return;
      const settings = getReceiptSettings();
      hydrateSettingsForm(settings);
      renderSettingsPreview(settings);
    }

    return { hydrateSettingsForm, renderSettingsPage, renderSettingsPreview };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.settings = Object.freeze({ create });
}());
