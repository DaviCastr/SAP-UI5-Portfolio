sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da aba de competencias.
   *
   * Nao ha logica propria: os agrupamentos por categoria ja vem prontos em
   * /content>/skillsByCategory (ver service/viewData.ts).
   */
  const SkillsController = BaseController.extend("webapp.controller.SkillsController", {});
  return SkillsController;
});
//# sourceMappingURL=Skills-dbg.controller.js.map
