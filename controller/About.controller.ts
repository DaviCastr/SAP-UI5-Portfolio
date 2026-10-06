import BaseController from "./BaseController";

/**
 * Controller da aba "Sobre".
 *
 * A tela e totalmente dirigida pelos dados (perfil, links, foco de
 * competencias). O controller existe apenas para os formatadores herdados e
 * para abrir os links de contato.
 */
export default class AboutController extends BaseController {
    /** Abre um link do cartao de contato (e-mail, LinkedIn, GitHub...). */
    public onLinkPress(event: sap.ui.base.Event): void {
        const context = this.sourceContext(event);
        this.openLink(context?.getProperty("url"), context?.getProperty("isMail"));
    }
}
