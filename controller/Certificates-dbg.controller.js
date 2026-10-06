sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da galeria de certificacoes.
   *
   * As credenciais vem do JSON (gerado pela ferramenta `npm run scrape:certificates`),
   * que tambem sabe de onde veio cada uma - por isso o filtro por ano e por validade.
   */
  const CertificatesController = BaseController.extend("webapp.controller.CertificatesController", {
    onInit: function _onInit() {
      this.applyFilter("all");
    },
    /** Todas as credenciais. */onAllPress: function _onAllPress() {
      this.applyFilter("all");
    },
    /** Apenas credenciais ainda vigentes. */onValidPress: function _onValidPress() {
      this.applyFilter("valid");
    },
    /** Credenciais emitidas em determinado ano. */onYearPress: function _onYearPress(event) {
      const year = this.sourceContext(event)?.getProperty("year") ?? "all";
      this.applyFilter(year);
    },
    applyFilter: function _applyFilter(filter) {
      let items = this.content().certificates;
      if (filter === "valid") {
        items = items.filter(certificate => certificate.expiresAt && !this.isExpired(certificate.expiresAt));
      } else if (filter !== "all") {
        items = items.filter(certificate => (certificate.issuedAt ?? "").startsWith(filter));
      }
      this.model("content")?.setProperty("/filteredCertificates", items);
      this.model("ui")?.setProperty("/certificateFilter", filter);
    },
    isExpired: function _isExpired(expiresAt) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return new Date(expiresAt).getTime() < today.getTime();
    }
  });
  return CertificatesController;
});
//# sourceMappingURL=Certificates-dbg.controller.js.map
