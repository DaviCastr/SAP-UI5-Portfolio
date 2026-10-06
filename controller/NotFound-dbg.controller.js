sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /** Controller da rota de fallback ("catchAll"). */
  const NotFoundController = BaseController.extend("webapp.controller.NotFoundController", {
    /** Volta para a home. */onHomePress: function _onHomePress() {
      this.navigate("home");
    },
    /** Abre o cliente de e-mail com o endereco do portfolio. */onContactPress: function _onContactPress() {
      window.location.href = `mailto:${this.content().profile.email}`;
    }
  });
  return NotFoundController;
});
//# sourceMappingURL=NotFound-dbg.controller.js.map
