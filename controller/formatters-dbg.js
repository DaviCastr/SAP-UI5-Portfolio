sap.ui.define(["../service/LocaleService", "../service/formatters"], function (___service_LocaleService, ___service_formatters) {
  "use strict";

  const LocaleService = ___service_LocaleService["LocaleService"];
  const formatDate = ___service_formatters["formatDate"];
  const formatMonthYear = ___service_formatters["formatMonthYear"];
  const isExpired = ___service_formatters["isExpired"];
  const yearOf = ___service_formatters["yearOf"];
  /**
   * Formatadores compartilhados pelas views.
   *
   * Ficam aqui (e nao em cada controller) para que o mesmo dado seja formatado
   * de forma identica em todas as telas - e para respeitar o idioma ativo.
   */
  const sharedFormatters = {
    /** "2024-09" -> "set/2024" */
    monthYear(value) {
      return formatMonthYear(value, LocaleService.getActive());
    },
    /**
     * { from: "2020-01", to: null } -> "jan/2020 – atual" ("Present" em ingles).
     *
     * No XML, passe o rotulo do i18n como segunda parte - um formatter com uma
     * so parte nao recebe o resource bundle, e o texto ficava sempre "atual":
     *   text="{parts: ['period', 'i18n>period.current'], formatter: '.fPeriod'}"
     */
    period(period, current) {
      if (!period?.from) {
        return "";
      }
      const locale = LocaleService.getActive();
      const currentLabel = typeof current === "string" ? current : current?.getText("period.current") ?? (locale === "en" ? "Present" : "atual");
      const from = formatMonthYear(period.from, locale);
      const to = period.to ? formatMonthYear(period.to, locale) : currentLabel;
      return `${from} – ${to}`;
    },
    /** "2025-09-01" -> "01/09/2025" */
    date(value) {
      return formatDate(value, LocaleService.getActive());
    },
    /** "2025-09-01" -> "2025" */
    year(value) {
      return yearOf(value);
    },
    /** "2025-09-01T10:30:00Z" -> "01/09/2025, 10:30" */
    dateTime(value) {
      if (!value) {
        return "";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return `${formatDate(value, LocaleService.getActive())}, ${date.toLocaleTimeString(LocaleService.getActive(), {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    },
    /** 4 -> "4/5" */
    level(value) {
      return `${value ?? 0}/5`;
    },
    /** 4 -> "80" (largura da barra de nivel, em %) */
    levelPercent(value) {
      return `${Math.max(0, Math.min(100, (value ?? 0) / 5 * 100))}%`;
    },
    /**
     * Classe CSS do titulo de uma certificacao no curriculum.
     *
     * `featured` marca as credenciais que valem destaque (no portfolio, as 3
     * "SAP Certified"); as demais sao "Records of Achievement" de curso curto e
     * ficam em linha menor para caber todas sem ocupar a pagina inteira.
     *
     * Devolve so as classes que o curriculum usa, para nao colidir com as do
     * `sap.m` - um `class` escrito por expression substitui todo o atributo.
     */
    certTitleClass(featured) {
      return featured ? "pf-sheet__item-title" : "pf-small";
    },
    /** true quando a credencial ainda esta vigente. */
    valid(expiresAt) {
      return !isExpired(expiresAt);
    },
    /** true quando a credencial venceu (para exibir o selo de expirada). */
    expired(expiresAt) {
      return isExpired(expiresAt);
    },
    /** Nome de icone do catalogo UI5; usa "action-settings" como padrao. */
    icon(name) {
      return `sap-icon://${name || "action-settings"}`;
    },
    /** Texto curto: corta em 140 caracteres adicionando reticencias. */
    summary(value, max = 140) {
      const text = (value ?? "").trim();
      return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
    },
    /**
     * Telefone brasileiro em formato de leitura: "+55 (85) 988512382".
     *
     * O numero do JSON vem so com digitos (13 com o 55 do pais, 11 sem), e o
     * hifen foi removido de proposito: em tela pequena o celular ocupa menos
     * espaco e continua legivel.
     */
    phone(value) {
      const digits = (value ?? "").replace(/\D/g, "");
      if (digits.length === 13 && digits.startsWith("55")) {
        return `+55 (${digits.slice(2, 4)}) ${digits.slice(4)}`;
      }
      if (digits.length === 11) {
        return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
      }
      if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      }
      return value ?? "";
    },
    /** Caminho de imagem alternativo quando a credencial nao tem imagem. */
    certImage(value) {
      return value || "images/certificates/placeholder.svg";
    }
  };
  sharedFormatters.sharedFormatters = sharedFormatters;
  return sharedFormatters;
});
//# sourceMappingURL=formatters-dbg.js.map
