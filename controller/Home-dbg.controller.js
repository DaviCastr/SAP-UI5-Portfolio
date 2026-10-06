sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da home.
   *
   * A home e 100% dirigida pelos dados: nao ha aqui nenhuma regra de negocio,
   * apenas os atalhos de navegacao e o download do PDF do curriculo.
   */
  const HomeController = BaseController.extend("webapp.controller.HomeController", {
    /**
     * O card de repositorio e clicavel e abre a pagina do repositorio no GitHub.
     * A delegacao fica no controller da view: sem o override, so a aba de
     * Projetos teria o card clicavel e os cards da home seriam apenas texto.
     *
     * Na Home tambem ha cartoes de Certificados (fragmento CertificateCard),
     * que tambem tem campo "url". Por isso o seletor engloba repositorios e
     * certificados.
     */
    clickableCards: function _clickableCards() {
      return ".pf-repo, .pf-cert";
    },
    onCvPress: function _onCvPress() {
      this.navigate("cv");
    },
    onSkillsPress: function _onSkillsPress() {
      this.navigate("skills");
    },
    onProjectsPress: function _onProjectsPress() {
      this.navigate("projects");
    },
    onCertificatesPress: function _onCertificatesPress() {
      this.navigate("certificates");
    },
    /** Abre o cliente de e-mail com o endereco do portfolio. */onEmailPress: function _onEmailPress() {
      this.openLink(`mailto:${this.content().profile.email}`, true);
    },
    /**
     * Abre um link escolhido dentro de um dos cards da home.
     *
     * A home reaproveita os mesmos fragments das abas (ProjectCard e
     * CertificateCard), entao os handlers de link ficam aqui tambem - assim o
     * fragmento continua sem controller proprio.
     */
    onRepoPress: function _onRepoPress(event) {
      this.openLink(this.sourceContext(event)?.getProperty("repo"));
    },
    onUrlPress: function _onUrlPress(event) {
      this.openLink(this.sourceContext(event)?.getProperty("url"));
    },
    /** Abre o perfil do LinkedIn informado no JSON. */onLinkedinPress: function _onLinkedinPress() {
      const linkedin = (this.content().profile.links ?? []).find(link => link.id === "linkedin");
      this.openLink(linkedin?.url);
    },
    /** Baixa o PDF do curriculo, gerado na hora (ver BaseController.onDownloadPress). */onDownloadCvPress: function _onDownloadCvPress() {
      void this.onDownloadPress();
    }
  });
  return HomeController;
});
//# sourceMappingURL=Home-dbg.controller.js.map
