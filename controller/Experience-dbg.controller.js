sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da linha do tempo profissional.
   *
   * O filtro e feito aqui (e nao com binding filters) para que a mesma logica
   * possa ser reutilizada pela geracao do PDF do curriculo.
   */
  const ExperienceController = BaseController.extend("webapp.controller.ExperienceController", {
    onInit: function _onInit() {
      this.applyFilter("all");
    },
    /** Todos os registros (vínculos e projetos). */onAllPress: function _onAllPress() {
      this.applyFilter("all");
    },
    /** Apenas vínculos formais. */onJobPress: function _onJobPress() {
      this.applyFilter("job");
    },
    /** Apenas projetos específicos. */onProjectPress: function _onProjectPress() {
      this.applyFilter("project");
    },
    applyFilter: function _applyFilter(kind) {
      const items = kind === "all" ? this.content().experiences : this.content().experiences.filter(item => (item.kind ?? "job") === kind);
      this.model("content")?.setProperty("/filteredExperiences", items);
      this.model("ui")?.setProperty("/experienceKind", kind);
    }
  });
  return ExperienceController;
});
//# sourceMappingURL=Experience-dbg.controller.js.map
