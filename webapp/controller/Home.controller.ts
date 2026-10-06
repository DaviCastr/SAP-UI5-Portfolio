import BaseController from "./BaseController";
import { Route } from "../model/constants";

/** Pagina inicial: hero, destaques e atalhos para as demais secoes. */
export default class HomeController extends BaseController {
    /** Certificados e repositorios em destaque abrem a pagina oficial. */
    protected override clickableCards(): string {
        return ".pf-repo, .pf-cert";
    }

    public onSkillsPress(): void {
        this.navigate(Route.SKILLS);
    }

    public onProjectsPress(): void {
        this.navigate(Route.PROJECTS);
    }

    public onCertificatesPress(): void {
        this.navigate(Route.CERTIFICATES);
    }

    public onLinkedinPress(): void {
        this.openLink(this.content().profile.links?.find((link) => link.id === "linkedin")?.url);
    }

    /** "Ver curriculo em PDF". */
    public onDownloadCvPress(): void {
        this.onDownloadPress();
    }
}
