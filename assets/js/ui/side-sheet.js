(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  let restoreFocus = null;

  function focusable(container) {
    return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => !node.hidden);
  }

  function close(sheet) {
    const overlay = sheet?.closest(".ui-overlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("overlay-open");
    restoreFocus?.focus?.();
  }

  function open(sheet, trigger) {
    if (!sheet) return;
    const overlay = sheet.closest(".ui-overlay");
    restoreFocus = trigger || document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("overlay-open");
    (focusable(sheet)[0] || sheet).focus();
  }

  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-side-sheet]");
    const closer = event.target.closest("[data-close-side-sheet]");
    if (opener) open(document.querySelector(opener.dataset.openSideSheet), opener);
    if (closer) close(closer.closest(".side-sheet"));
    if (event.target.matches(".ui-overlay")) close(event.target.querySelector(".side-sheet"));
  });

  document.addEventListener("keydown", event => {
    const sheet = document.querySelector(".ui-overlay:not([hidden]) .side-sheet");
    if (!sheet) return;
    if (event.key === "Escape") return close(sheet);
    if (event.key !== "Tab") return;
    const items = focusable(sheet);
    if (!items.length) return event.preventDefault();
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  root.sideSheet = { open, close };
})();
