sap.ui.define([], function () {
  "use strict";

  const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /** Rotulo usado quando o periodo ainda esta em andamento (chave i18n da view). */
  const PERIOD_CURRENT_KEY = "period.current";
  function months(locale) {
    return locale === "en" ? MONTHS_EN : MONTHS_PT;
  }

  /** Converte "2024-09" em { year, month }. */
  function splitPeriod(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
    if (!match) {
      return null;
    }
    return {
      year: Number(match[1]),
      month: Number(match[2])
    };
  }

  /**
   * "2024-09" -> "set/2024" (pt) | "Sep 2024" (en)
   * Valores invalidos sao devolvidos como estao (para nao quebrar a tela).
   */
  function formatMonthYear(value, locale) {
    const parsed = splitPeriod(value);
    if (!parsed) {
      return value ?? "";
    }
    const name = months(locale)[parsed.month - 1];
    return locale === "en" ? `${name} ${parsed.year}` : `${name}/${parsed.year}`;
  }

  /**
   * "2024-09" -> "01/09/2024" (pt) | "Sep 1, 2024" (en)
   */
  function formatDate(value, locale) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
    if (!match) {
      return value ?? "";
    }
    const [, year, month, day] = match;
    return locale === "en" ? `${months(locale)[Number(month) - 1]} ${Number(day)}, ${year}` : `${day}/${month}/${year}`;
  }

  /** Ano de uma data completa ("2025-09-01" -> "2025"). */
  function yearOf(value) {
    return (value ?? "").slice(0, 4);
  }

  /**
   * Formata um periodo.
   * Quando o periodo esta aberto (`to: null`), devolve `currentKey` como marcador
   * para que a view aplique o texto traduzido de "Atual" / "Present".
   */
  function formatPeriod(period, locale, currentKey = PERIOD_CURRENT_KEY) {
    if (!period?.from) {
      return "";
    }
    const from = formatMonthYear(period.from, locale);
    if (!period.to) {
      return `${from} - ${currentKey}`;
    }
    return `${from} - ${formatMonthYear(period.to, locale)}`;
  }

  /** Uma credencial esta vencida? */
  function isExpired(expiresAt, now = new Date()) {
    if (!expiresAt) {
      return false;
    }
    return new Date(`${expiresAt}T23:59:59`).getTime() < now.getTime();
  }
  var __exports = {
    __esModule: true
  };
  __exports.PERIOD_CURRENT_KEY = PERIOD_CURRENT_KEY;
  __exports.formatMonthYear = formatMonthYear;
  __exports.formatDate = formatDate;
  __exports.yearOf = yearOf;
  __exports.formatPeriod = formatPeriod;
  __exports.isExpired = isExpired;
  return __exports;
});
//# sourceMappingURL=formatters-dbg.js.map
