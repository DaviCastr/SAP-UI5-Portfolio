import BaseController from "./BaseController";
import type { Project } from "../service/types";

/**
 * Controller da galeria de projetos.
 *
 * O filtro por tag e calculado no controller para poder ser reaproveitado pelo
 * gerador do PDF sem duplicar regras.
 */
export default class ProjectsController extends BaseController {
    public override onInit(): void {
        this.applyFilter("all");
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
}
