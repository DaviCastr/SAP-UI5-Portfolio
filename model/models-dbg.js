sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/Device"], function (JSONModel, Device) {
  "use strict";

  /**
   * Models do componente.
   *
   * - device : device/sistema (isPhone, isTablet, system language...)
   * - ui     : estado da interface (tema ativo, idioma, carregando, filtros)
   * - content: documento do portfolio (perfil, experiencias, skills...)
   */
  var __exports = {
    /** Model padrao de device (usado por bindings responsivos). */
    createDeviceModel() {
      // No UI5 1.153 o modulo "sap/ui/Device" devolve o namespace estatico
      // sap.ui.Device (system/support/media) e NAO um sap.ui.model.Model --
      //entao ele nao pode ser registrado via setModel. O app expoe um retrato
      // simples em JSON, suficiente para bindings device>/system/... .
      return new JSONModel({
        system: {
          ...Device.system
        },
        support: {
          ...Device.support
        }
      });
    },
    /** Estado global da interface. */
    createUiStateModel() {
      return new JSONModel({
        busy: true,
        theme: "light",
        locale: "pt",
        /**
         * Abas da barra so com icone. Com rotulo as sete abas nao cabem em
         * telas estreitas e o overflow escondia botoes; o `matchMedia` no
         * App.controller mantem este flag em dia com o resize.
         */
        compactNav: false,
        /** Titulo da secao atual, mostrado na barra fixa abaixo do topo. */
        currentSectionTitle: ""
      });
    },
    /** Documento do portfolio (preenchido pelo ContentService). */
    createContentModel() {
      return new JSONModel({
        profile: {},
        experiences: [],
        skills: [],
        projects: [],
        certificates: [],
        education: [],
        sections: [],
        issues: []
      });
    }
  };
  return __exports;
});
//# sourceMappingURL=models-dbg.js.map
