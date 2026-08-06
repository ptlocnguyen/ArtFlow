(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  const compactKey = "artflow.ui.navCompact";

  function initialize() {
    if (localStorage.getItem(compactKey) === "true") document.body.classList.add("nav-compact");
    document.addEventListener("click", event => {
      const toggle = event.target.closest("[data-context-toggle]");
      const close = event.target.closest("[data-context-close], [data-menu-close]");
      const compact = event.target.closest("[data-rail-collapse]");
      if (toggle) document.body.classList.toggle("context-open");
      if (close || event.target.closest(".context-nav .nav-link")) document.body.classList.remove("context-open");
      if (compact) {
        document.body.classList.toggle("nav-compact");
        localStorage.setItem(compactKey, String(document.body.classList.contains("nav-compact")));
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") document.body.classList.remove("context-open");
    });
  }

  root.appShell = { initialize };
  initialize();
})();
