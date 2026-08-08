(function () {
  function setDrawerState(drawer, open) {
    if (!drawer) return;
    drawer.hidden = !open;
    document.body.classList.toggle("has-management-drawer", Boolean(open));
  }

  function closeDrawers(root) {
    (root || document).querySelectorAll(".management-drawer").forEach(function (drawer) {
      setDrawerState(drawer, false);
      drawer.innerHTML = "";
    });
  }

  function syncPressedState(nodes, value, key) {
    Array.from(nodes || []).forEach(function (node) {
      const selected = node.dataset[key] === value;
      node.classList.toggle("active", selected);
      node.setAttribute("aria-pressed", String(selected));
    });
  }

  function bindHorizontalWheel(container) {
    if (!container || container.dataset.horizontalWheelBound) return;
    container.dataset.horizontalWheelBound = "true";
    container.addEventListener("wheel", function (event) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || container.scrollWidth <= container.clientWidth) return;
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  }

  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  Object.assign(root, { bindHorizontalWheel, closeDrawers, setDrawerState, syncPressedState });
}());
