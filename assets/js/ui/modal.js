(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  let previous = null;
  const observer = new MutationObserver(records => records.forEach(record => {
    if (record.target.matches?.("[data-modal-backdrop]") && !record.target.hidden) {
      previous = document.activeElement;
      document.body.classList.add("overlay-open");
    }
  }));
  function initialize() {
    const backdrop = document.querySelector("[data-modal-backdrop]");
    if (backdrop) observer.observe(backdrop, { attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("keydown", event => {
      const active = document.querySelector("[data-modal-backdrop]:not([hidden])");
      if (active && event.key === "Escape") active.querySelector("[data-close-modal]")?.click();
    });
    document.addEventListener("click", event => {
      if (event.target.closest("[data-close-modal]")) {
        document.body.classList.remove("overlay-open");
        window.setTimeout(() => previous?.focus?.(), 0);
      }
    });
  }
  root.modal = { initialize };
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})();
