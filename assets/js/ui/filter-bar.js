(function () {
  window.ArtFlowUI = window.ArtFlowUI || {};
  window.ArtFlowUI.filterBar = {
    reset(container) { container?.querySelectorAll("select, input").forEach(control => { control.value = control.tagName === "SELECT" ? "all" : ""; control.dispatchEvent(new Event("change", { bubbles: true })); }); }
  };
})();
