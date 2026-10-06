sap.ui.define(["sap/ui/core/UIComponent", "./model/models", "./service/LocaleService", "./service/ThemeService"], function (UIComponent, __models, ___service_LocaleService, ___service_ThemeService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const models = _interopRequireDefault(__models);
  const LocaleService = ___service_LocaleService["LocaleService"];
  const ThemeService = ___service_ThemeService["ThemeService"];
  /**
   * Componente raiz do portfolio.
   *
   * Responsabilidades (mantidas propositalmente poucas):
   *   1. criar os models (device, ui, content);
   *   2. aplicar o tema salvo.
   *
   * O router NAO e inicializado aqui: ele so pode comecar depois que a view raiz
   * (e portanto o NavContainer) existir de fato. Quem faz isso e o App.controller,
   * no primeiro onAfterRendering. O carregamento do conteudo JSON tambem fica no
   * App.controller, porque precisa ser assincrono.
   */
  const Component = UIComponent.extend("webapp.Component", {
    init: function _init() {
      UIComponent.prototype.init.call(this);
      this.setModel(models.createDeviceModel(), "device");
      this.setModel(models.createUiStateModel(), "ui");

      // O mesmo model e registrado duas vezes: com nome (para bindings de
      // propriedade como "{content>/profile/name}") e como model padrao. O padrao
      // e obrigatorio nas AGREGACOES: no UI5 1.153 um path com prefixo de model
      // ("content>/navSections") resolve os dados, mas o contexto nao e repassado
      // para os itens criados a partir do template - eles nascem sem contexto e
      // todo texto/filtro derivado do template sai vazio. Sem prefixo, usando o
      // model padrao, os itens recebem o contexto corretamente.
      const contentModel = models.createContentModel();
      this.setModel(contentModel, "content");
      this.setModel(contentModel);
      const uiModel = this.getModel("ui");
      const locale = LocaleService.getActive();
      const theme = ThemeService.getMode();
      uiModel.setProperty("/locale", locale);
      uiModel.setProperty("/theme", theme);
      ThemeService.apply(theme);
    }
  });
  return Component;
});
//# sourceMappingURL=Component-dbg.js.map
