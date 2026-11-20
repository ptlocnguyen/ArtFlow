(function () {
  function create(runtime) {
    const { els, icon } = runtime;

    function setAuthState(name) {
      if (!els.loginForm) return;
      els.loginForm.querySelectorAll("[data-auth-state]").forEach(node => {
        node.hidden = node.dataset.authState !== name;
      });
    }

    function renderApiMissing(message) {
      if (!els.loginForm) return;
      els.loginForm.dataset.mode = "";
      const output = els.loginForm.querySelector("[data-auth-backend-message]");
      if (output) output.textContent = message || "Hãy chạy Cloudflare Worker và điền Worker URL vào assets/js/config.js.";
      setAuthState("backend-error");
    }

    function renderAuthForm(mode) {
      const form = els.loginForm;
      if (!form) return;
      const setup = mode === "setup";
      form.reset();
      form.dataset.mode = mode;
      const nameField = form.querySelector("[data-auth-name-field]");
      const nameInput = form.elements.namedItem("name");
      const password = form.elements.namedItem("password");
      const errorBox = form.querySelector("[data-login-error]");
      const submitIcon = form.querySelector("[data-auth-submit-icon]");
      const values = setup ? {
        eyebrow: "Thiết lập lần đầu",
        title: "Khởi tạo quản trị viên",
        note: "Tạo tài khoản admin đầu tiên trực tiếp trên hệ thống D1.",
        submit: "Tạo tài khoản admin"
      } : {
        eyebrow: "Quyền truy cập nội bộ",
        title: "Đăng nhập",
        note: "Tài khoản do admin cấp, không có đăng ký công khai.",
        submit: "Đăng nhập"
      };
      const setText = (selector, value) => {
        const node = form.querySelector(selector);
        if (node) node.textContent = value;
      };
      setText("[data-auth-eyebrow]", values.eyebrow);
      setText("[data-auth-title]", values.title);
      setText("[data-auth-note]", values.note);
      setText("[data-auth-submit-label]", values.submit);
      if (nameField) nameField.hidden = !setup;
      if (nameInput) {
        nameInput.disabled = !setup;
        nameInput.required = setup;
      }
      if (password) {
        password.autocomplete = setup ? "new-password" : "current-password";
        password.placeholder = setup ? "Tạo mật khẩu" : "Nhập mật khẩu";
        password.minLength = setup ? 8 : 1;
      }
      if (submitIcon) submitIcon.innerHTML = icon(setup ? "userPlus" : "check");
      if (errorBox) {
        errorBox.textContent = "";
        errorBox.hidden = true;
      }
      setAuthState("form");
    }

    return { renderApiMissing, renderAuthForm };
  }

  window.ArtFlowPageModules = window.ArtFlowPageModules || {};
  window.ArtFlowPageModules.auth = Object.freeze({ create });
}());
