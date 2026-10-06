import BaseController from "./BaseController";

/**
 * Controller da home.
 *
 * A home e 100% dirigida pelos dados: nao ha aqui nenhuma regra de negocio,
 * apenas os atalhos de navegacao e o download do PDF do curriculo.
 */
export default class HomeController extends BaseController {
    /**
     * O card de repositorio e clicavel e abre a pagina do repositorio no GitHub.
     * A delegacao fica no controller da view: sem o override, so a aba de
     * Projetos teria o card clicavel e os cards da home seriam apenas texto.
     *
     * Na Home tambem ha cartoes de Certificados (fragmento CertificateCard),
     * que tambem tem campo "url". Por isso o seletor engloba repositorios e
     * certificados.
     */
    protected override clickableCards(): string {
        return ".pf-repo, .pf-cert";
    }

    public onCvPress(): void {
        this.navigate("cv");
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

    /** Abre o cliente de e-mail com o endereco do portfolio. */
    public onEmailPress(): void {
        this.openLink(`mailto:${this.content().profile.email}`, true);
    }

    /**
     * Abre um link escolhido dentro de um dos cards da home.
     *
     * A home reaproveita os mesmos fragments das abas (ProjectCard e
     * CertificateCard), entao os handlers de link ficam aqui tambem - assim o
     * fragmento continua sem controller proprio.
     */
    public onRepoPress(event: sap.ui.base.Event): void {
        this.openLink(this.sourceContext(event)?.getProperty("repo"));
    }

    public onUrlPress(event: sap.ui.base.Event): void {
        this.openLink(this.sourceContext(event)?.getProperty("url"));
    }

    /** Abre o perfil do LinkedIn informado no JSON. */
    public onLinkedinPress(): void {
        const linkedin = (this.content().profile.links ?? []).find((link) => link.id === "linkedin");
        this.openLink(linkedin?.url);
    }

    /** Baixa o PDF do curriculo, gerado na hora (ver BaseController.onDownloadPress). */
    public onDownloadCvPress(): void {
        void this.onDownloadPress();
    }
}
