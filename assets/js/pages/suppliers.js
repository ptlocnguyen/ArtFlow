(function () {
  function openDrawer(drawer) {
    window.ArtFlowUI?.setDrawerState(drawer, true);
  }
  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.suppliers = Object.freeze({ openDrawer });
}());
