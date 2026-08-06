(function () {
  window.ArtFlowUI = window.ArtFlowUI || {};
  window.ArtFlowUI.toast = { announce(message) { const node = document.querySelector("[data-toast]"); if (node) node.setAttribute("aria-label", String(message || "")); } };
})();
