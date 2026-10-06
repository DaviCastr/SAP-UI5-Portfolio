sap.ui.define(["./LocaleResolver"], function (___LocaleResolver) {
  "use strict";

  const DEFAULT_LOCALE = ___LocaleResolver["DEFAULT_LOCALE"];
  /** Chave que indica "objeto traduzido" em vez de "objeto de dados". */
  const LOCALE_KEY_PATTERN = /^[a-z]{2}(_[A-Z]{2})?$/;

  /**
   * Campos de dados que casam com o padrao de idioma, mas nunca sao idioma.
   *
   * `to` e `id` sao as duas palavras de 2 letras usadas no portfolio como campo de
   * dado (`period.to`, `id` de skills/certificados). Sem esta lista, um
   * `{ from: "2016-01", to: "2018-12" }` era lido como mapa de traducao e virava
   * a string `"2016-01"` - o que fazia `period/from` e `period/to` colapsarem
   * para `undefined` na hora de renderizar o chip de datas.
   */
  const RESERVED_DATA_KEYS = new Set(["to", "id"]);

  /** Ex.: "pt-BR" -> ["pt-BR", "pt"]. */
  function buildCandidateChain(locale, fallbackLocale) {
    const language = locale.split(/[-_]/)[0].toLowerCase();
    const fallbackLanguage = fallbackLocale.split(/[-_]/)[0].toLowerCase();
    return [...new Set([locale.toLowerCase(), language, fallbackLocale.toLowerCase(), fallbackLanguage])];
  }

  /**
   * Um objeto e considerado "traduzivel" quando TODOS os valores sao string
   * E alguma das chaves parece um codigo de idioma ("pt", "en", "pt_BR").
   * Isso evita confundir um objeto de dados (ex.: { name: "UI5" }) com um texto traduzido.
   */
  function isLocalizedMap(value) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return false;
    }
    const allStrings = entries.every(([, item]) => typeof item === "string");
    const hasLocaleKey = entries.some(([key]) => LOCALE_KEY_PATTERN.test(key) && !RESERVED_DATA_KEYS.has(key));
    return allStrings && hasLocaleKey;
  }

  /** Escolhe o melhor valor de um objeto traduzido. */
  function pickLocalized(map, locale, fallbackLocale) {
    const candidates = buildCandidateChain(locale, fallbackLocale);
    for (const candidate of candidates) {
      const value = map[candidate];
      if (typeof value === "string" && value.trim() !== "") {
        return value;
      }
    }

    // Ultimo recurso: qualquer idioma disponivel, em ordem alfabetica.
    const fallbackKey = Object.keys(map).sort()[0];
    return fallbackKey ? map[fallbackKey] : "";
  }

  /**
   * Percorre qualquer estrutura de dados e troca todo texto traduzido
   * ({ pt: ..., en: ... }) pela string do idioma atual.
   *
   * Ex.: localize({ role: { pt: "Consultor", en: "Consultant" } }, "en")
   *      -> { role: "Consultant" }
   *
   * Estruturas (arrays e objetos comuns) sao preservadas.
   */
  function localize(node, locale, fallbackLocale = DEFAULT_LOCALE) {
    return resolveNode(node, locale, fallbackLocale);
  }

  /** Resolve um unico no, sem saber se ele e traduzivel. */
  function localizeText(value, locale, fallbackLocale) {
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object") {
      return pickLocalized(value, locale, fallbackLocale ?? DEFAULT_LOCALE);
    }
    return "";
  }
  function resolveNode(node, locale, fallbackLocale) {
    if (node === null || node === undefined || typeof node !== "object") {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(item => resolveNode(item, locale, fallbackLocale));
    }
    if (isLocalizedMap(node)) {
      return pickLocalized(node, locale, fallbackLocale);
    }
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      result[key] = resolveNode(value, locale, fallbackLocale);
    }
    return result;
  }
  var __exports = {
    __esModule: true
  };
  __exports.pickLocalized = pickLocalized;
  __exports.localize = localize;
  __exports.localizeText = localizeText;
  return __exports;
});
//# sourceMappingURL=Localizer-dbg.js.map
