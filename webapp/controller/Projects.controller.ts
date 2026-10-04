import BaseController from "./BaseController";
import type { Project } from "../service/types";

/**
 * Controller da galeria de projetos.
 *
 * Sao dois conjuntos independentes na mesma tela:
 *
 * 1. `projects.json` - projetos escritos a mao, com historia, stack e highlights.
 * 2. `github.json` - repositorios reais da conta, gravados pelo
 *    "npm run sync:github". Nao tem traducao nem highlights: e o retrato do que
 *    existe no GitHub, e por isso fica numa secao propria, com filtro por
 *    linguagem em vez do filtro por tag dos projetos.
 *
 * Os filtros sao calculados aqui para poderem ser reaproveitados pelo gerador do
 * PDF sem duplicar regras.
 */
export default class ProjectsController extends BaseController {
    /** Emojis por linguagem, para o card nao ficar so com um nome. */
    private static readonly LANGUAGE_ICONS: Record<string, string> = {
        TypeScript: "javascript",
        JavaScript: "javascript",
        HTML: "code",
        CSS: "code",
        "Jupyter Notebook": "source-code",
        ABAP: "log"
    };

    public override onInit(): void {
        this.publishRepoLanguages();
        this.applyFilter("all");
        this.applyRepoFilter("all");
    }

    /**
     * nesta view o card clicavel e o de repositorio; os certificados ficam em
     * outra aba e nao usam esta delegacao.
     */
    protected override clickableCards(): string {
        return ".pf-repo";
    }

    /** Todos os projetos. */
    public onAllPress(): void {
        this.applyFilter("all");
    }

    /** Filtra pela tag escolhida. */
    public onTagPress(event: sap.ui.base.Event): void {
        const tag = (this.sourceContext(event)?.getProperty("tag") ?? "all") as string;
        this.applyFilter(tag);
    }

    /** Todos os repositorios. */
    public onAllReposPress(): void {
        this.applyRepoFilter("all");
    }

    /** Filtra os repositorios pela linguagem escolhida. */
    public onRepoLanguagePress(event: sap.ui.base.Event): void {
        const language = (this.sourceContext(event)?.getProperty("language") ?? "all") as string;
        this.applyRepoFilter(language);
    }

    /** Abre o repositório do projeto. */
    public onRepoPress(event: sap.ui.base.Event): void {
        this.openExternal((this.sourceContext(event)?.getProperty("repo") ?? "") as string);
    }

    /** Abre o site de demonstracao do projeto. */
    public onUrlPress(event: sap.ui.base.Event): void {
        this.openExternal((this.sourceContext(event)?.getProperty("url") ?? "") as string);
    }

    /** Abre o perfil publico no GitHub. */
    public onGitHubPress(): void {
        const profileUrl = this.content().github?.profileUrl;
        if (profileUrl) {
            this.openExternal(profileUrl);
        }
    }

    private applyFilter(tag: string): void {
        const items: Project[] =
            tag === "all"
                ? this.content().projects
                : this.content().projects.filter((project) => project.tags?.includes(tag));

        this.model("content")?.setProperty("/filteredProjects", items);
        this.model("ui")?.setProperty("/projectFilter", tag);
    }

    private applyRepoFilter(language: string): void {
        const repos = this.content().github?.repos ?? [];
        const items = language === "all" ? repos : repos.filter((repo) => repo.language === language);

        this.model("content")?.setProperty("/filteredRepos", items);
        this.model("ui")?.setProperty("/repoLanguageFilter", language);
    }

    /**
     * Linguagens dos repositorios, da mais usada para a menos usada.
     *
     * A contagem vem junto porque o chip mostra "TypeScript (12)", e o icone e
     * um emoji porque o SAP-icons nao tem marca de linguagem.
     */
    private publishRepoLanguages(): void {
        const repos = this.content().github?.repos ?? [];
        const counter = new Map<string, number>();

        repos.forEach((repo) => {
            const language = repo.language;
            if (language) {
                counter.set(language, (counter.get(language) ?? 0) + 1);
            }
        });

        const languages = [...counter.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([language, count]) => ({
                language,
                count,
                label: `${language} (${count})`,
                icon: ProjectsController.LANGUAGE_ICONS[language] ?? "source-code"
            }));

        this.model("content")?.setProperty("/repoLanguages", languages);
    }
}
