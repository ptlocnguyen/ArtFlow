(function () {
  window.ArtFlowUI = window.ArtFlowUI || {};
  window.ArtFlowUI.bottomSheet = {
    open(selector, trigger) { window.ArtFlowUI.sideSheet?.open(document.querySelector(selector), trigger); },
    close(sheet) { window.ArtFlowUI.sideSheet?.close(sheet); }
  };
})();
