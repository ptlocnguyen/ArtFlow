(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  function closeAll(except) { document.querySelectorAll("[data-popover]:not([hidden])").forEach(node => { if (node !== except) node.hidden = true; }); }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-popover-trigger]");
    if (trigger) {
      const popover = document.querySelector(trigger.dataset.popoverTrigger);
      if (!popover) return;
      const next = popover.hidden;
      closeAll(popover);
      popover.hidden = !next;
      if (next) {
        const rect = trigger.getBoundingClientRect();
        popover.style.top = `${Math.min(window.innerHeight - popover.offsetHeight - 12, rect.bottom + 6)}px`;
        popover.style.left = `${Math.max(12, Math.min(window.innerWidth - popover.offsetWidth - 12, rect.right - popover.offsetWidth))}px`;
      }
      return;
    }
    if (!event.target.closest("[data-popover]")) closeAll();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeAll(); });
  root.popover = { closeAll };
})();
