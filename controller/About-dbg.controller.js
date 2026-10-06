sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da aba "Sobre".
   *
   * A tela e totalmente dirigida pelos dados (perfil, links, foco de
   * competencias). O controller existe apenas para os formatadores herdados e
   * para abrir os links de contato.
   */
  const AboutController = BaseController.extend("webapp.controller.AboutController", {
    /** Abre um link do cartao de contato (e-mail, LinkedIn, GitHub...). */onLinkPress: function _onLinkPress(event) {
      const context = this.sourceContext(event);
      this.openLink(context?.getProperty("url"), context?.getProperty("isMail"));
    }
  });
  return AboutController;
});
//# sourceMappingURL=About-dbg.controller.js.map
