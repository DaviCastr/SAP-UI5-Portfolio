import BaseController from "./BaseController";
import { ALL, filterProjects, filterRepos, repoLanguages } from "../model/content/filters";

/**
 * Projetos + repositorios do GitHub.
 *
 * Dois conjuntos independentes na mesma tela:
 *   1. projects.json - projetos com historia, papel e stack (filtro por tag);
 *   2. github.json   - repositorios reais da conta, gravados pelo
 *      `npm run sync:github` (filtro por linguagem, paginado).
 */
export default class ProjectsController extends BaseController {
    /** Repositorios visiveis antes de "Mostrar todos" (a conta tem dezenas). */
    private static readonly REPO_PAGE = 9;

    public override onInit(): void {
        this.model("content")?.setProperty("/repoLanguages", repoLanguages(this.repos()));
        this.applyProjectFilter(ALL);
        this.applyRepoFilter(ALL);
    }

    /** O cartao de repositorio inteiro abre o GitHub. */
    protected override clickableCards(): string {
        return ".pf-repo";
    }

    // --------------------------------------------------------------- projetos

    public onAllPress(): void {
        this.applyProjectFilter(ALL);
    }

    public onTagPress(event: sap.ui.base.Event): void {
        this.applyProjectFilter(this.sourceProperty(event, "tag") ?? ALL);
    }

    // ----------------------------------------------------------- repositorios

    public onAllReposPress(): void {
        this.applyRepoFilter(ALL);
    }

    public onRepoLanguagePress(event: sap.ui.base.Event): void {
        this.applyRepoFilter(this.sourceProperty(event, "language") ?? ALL);
    }

    public onShowAllReposPress(): void {
        this.applyRepoFilter(this.model("ui")?.getProperty("/repoLanguageFilter") ?? ALL, true);
    }

    public onGitHubPress(): void {
        this.openLink(this.content().github?.profileUrl);
    }

    // ---------------------------------------------------------------- interno

    private repos() {
        return this.content().github?.repos ?? [];
    }

    private applyProjectFilter(tag: string): void {
        this.model("content")?.setProperty("/filteredProjects", filterProjects(this.content().projects, tag));
        this.model("ui")?.setProperty("/projectFilter", tag);
    }

    private applyRepoFilter(language: string, showAll = false): void {
        const { visible, hidden } = filterRepos(
            this.repos(),
            language,
            showAll ? undefined : ProjectsController.REPO_PAGE
        );
        const content = this.model("content");
        content?.setProperty("/filteredRepos", visible);
        // O botao "Mostrar todos (N)" some quando nao ha nada escondido.
        content?.setProperty("/hiddenRepoCount", hidden);
        this.model("ui")?.setProperty("/repoLanguageFilter", language);
    }
}
