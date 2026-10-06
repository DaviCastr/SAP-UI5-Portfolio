sap.ui.define(["./BaseController", "./formatters"], function (__BaseController, ___formatters) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const sharedFormatters = ___formatters["sharedFormatters"];
  /**
   * Controller da pagina de curriculo.
   *
   * A tela segue o mesmo desenho do PDF (service/cvPdf.ts): cabecalho com foto,
   * barra lateral (contato, idiomas, competencias) e coluna principal. O download
   * e a impressao sao acoes da pagina e ficam na barra de secao (App.view.xml);
   * por isso os handlers vem do BaseController, compartilhado com o App.
   */
  const CvController = BaseController.extend("webapp.controller.CvController", {
    /** Cards de certificacao SAP abrem a credencial (URL do contexto). */clickableCards: function _clickableCards() {
      return ".pf-cvcert";
    },
    /** "SAP Certified - Back-End Developer - ABAP Cloud" -> "Back-End Developer - ABAP Cloud". */fCertShort: function _fCertShort(title) {
      return (title ?? "").replace(/^SAP Certified\s*[-–]\s*/i, "");
    },
    /** "2025-09-01" -> "set/2025" (o `fMonthYear` so aceita "2025-09"). */fIssued: function _fIssued(value) {
      return value ? sharedFormatters.monthYear(value.slice(0, 7)) : "";
    },
    /** "https://www.linkedin.com/in/x/" -> "linkedin.com/in/x". */fShortUrl: function _fShortUrl(url) {
      return (url ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    }
  });
  return CvController;
});
//# sourceMappingURL=Cv-dbg.controller.js.map
