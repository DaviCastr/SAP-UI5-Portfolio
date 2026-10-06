sap.ui.define([], function () {
  "use strict";

  /** Idiomas suportados pelo portfolio. */
  const SUPPORTED_LOCALES = ["pt", "en"];

  /** Idioma usado quando nao ha preferencia definida. */
  const DEFAULT_LOCALE = "pt";

  /**
   * Reduz "pt-BR", "PT_br", "pt" para o codigo de idioma suportado ("pt" | "en").
   * Retorna null quando o idioma nao e suportado.
   */
  function normalizeLocale(value) {
    if (!value) {
      return null;
    }
    const language = value.toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LOCALES.includes(language) ? language : null;
  }

  /**
   * Define o idioma do portfolio.
   *
   * Ordem de precedencia:
   *   1. query string (?lang=en) - permite gerar links diretos
   *   2. preferencia do navegador (navigator.language)
   *   3. idioma padrao (portugues)
   *
   * @param search query string da URL (ex.: "?lang=en")
   * @param browserLanguage idioma do navegador (ex.: "en-US")
   */
  function resolveLocale(search, browserLanguage, fallback = DEFAULT_LOCALE) {
    const fromQuery = normalizeLocale(readQueryParam(search, "lang") ?? readQueryParam(search, "locale"));
    if (fromQuery) {
      return fromQuery;
    }
    const fromBrowser = normalizeLocale(browserLanguage);
    if (fromBrowser) {
      return fromBrowser;
    }
    return fallback;
  }
  function readQueryParam(search, key) {
    if (!search) {
      return null;
    }
    const query = search.charAt(0) === "?" ? search.slice(1) : search;
    const found = query.split("&").find(part => part.split("=")[0] === key);
    return found ? decodeURIComponent(found.split("=")[1] ?? "") : null;
  }
  var __exports = {
    __esModule: true
  };
  __exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
  __exports.DEFAULT_LOCALE = DEFAULT_LOCALE;
  __exports.normalizeLocale = normalizeLocale;
  __exports.resolveLocale = resolveLocale;
  return __exports;
});
//# sourceMappingURL=LocaleResolver-dbg.js.map
