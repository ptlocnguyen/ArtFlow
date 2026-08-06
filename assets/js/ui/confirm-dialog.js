(function () {
  window.ArtFlowUI = window.ArtFlowUI || {};
  window.ArtFlowUI.confirmDialog = { ask(message) { return Promise.resolve(window.confirm(message)); } };
})();
