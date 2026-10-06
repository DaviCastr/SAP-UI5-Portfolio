sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da aba de formacao.
   *
   * Os registros vem prontos de education.json (formacao, pos e monitoria) e de
   * courses.json (cursos livres) - aqui nao ha regra de negocio.
   */
  const EducationController = BaseController.extend("webapp.controller.EducationController", {
    /**
     * Abre o documento do registro (ex.: diploma em PDF).
     *
     * O `url` vem do JSON do proprio item do template, entao nao precisa ser
     * guardado em propriedade: o parametro do evento ja traz o binding.
     */
    onDocumentPress: function _onDocumentPress(event) {
      const context = this.sourceContext(event);
      this.openLink(context?.getProperty("url"));
    }
  });
  return EducationController;
});
//# sourceMappingURL=Education-dbg.controller.js.map
