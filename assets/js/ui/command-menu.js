(function () {
  const root = window.ArtFlowUI = window.ArtFlowUI || {};
  const routes = [
    ["Tạo đơn bán", "./order-create.html"], ["Tạo phiếu mua", "./purchase-create.html"],
    ["Ghi thu hoặc chi", "./accounting.html?view=ledger"], ["Tạo công việc", "./team.html?view=tasks"]
  ];
  function search(term) {
    const value = String(term || "").trim().toLocaleLowerCase("vi");
    return routes.filter(item => !value || item[0].toLocaleLowerCase("vi").includes(value));
  }
  root.commandMenu = { search, routes };
})();
