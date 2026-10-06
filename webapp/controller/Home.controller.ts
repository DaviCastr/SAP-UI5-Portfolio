import BaseController from "./BaseController";

/** Pagina inicial: hero, destaques e atalhos para as demais secoes. */
export default class HomeController extends BaseController {
    /** Certificados e repositorios em destaque abrem a pagina oficial. */
    protected override clickableCards(): string {
        return ".pf-repo, .pf-cert";
    }

    public onSkillsPress(): void {
        this.navigate("skills");
    }

    public onProjectsPress(): void {
        this.navigate("projects");
    }

    public onCertificatesPress(): void {
        this.navigate("certificates");
    }

    public onLinkedinPress(): void {
        this.openLink(this.content().profile.links?.find((link) => link.id === "linkedin")?.url);
    }

    /** "Ver curriculo em PDF". */
    public onDownloadCvPress(): void {
        this.onDownloadPress();
    }
}
