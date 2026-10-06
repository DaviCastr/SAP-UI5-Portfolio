sap.ui.define(["./LocaleResolver"], function (___LocaleResolver) {
  "use strict";

  const resolveLocale = ___LocaleResolver["resolveLocale"];
  /**
   * Idioma ativo do portfolio.
   *
   * O idioma nao e trocado em runtime: quem decide e o i18n do UI5, que usa o
   * idioma do navegador. Aqui so resolvemos o mesmo idioma para carregar o JSON
   * traduzido. A ordem e "?lang=en" > navegador > portugues, a mesma aplicada pelo
   * index.html antes do sap-ui-core carregar (evita "piscar" de idioma).
   */
  class LocaleService {
    /** Idioma ativo (query string > navegador > padrao). */
    static getActive() {
      return resolveLocale(window.location.search, navigator.language);
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.LocaleService = LocaleService;
  return __exports;
});
//# sourceMappingURL=LocaleService-dbg.js.map
