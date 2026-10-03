import BaseController from "./BaseController";
import type { Experience } from "../service/types";

/**
 * Controller da linha do tempo profissional.
 *
 * O filtro e feito aqui (e nao com binding filters) para que a mesma logica
 * possa ser reutilizada pela geracao do PDF do curriculo.
 */
export default class ExperienceController extends BaseController {
    public override onInit(): void {
        this.applyFilter("all");
    }

    /** Todos os registros (vínculos e projetos). */
    public onAllPress(): void {
        this.applyFilter("all");
    }

    /** Apenas vínculos formais. */
    public onJobPress(): void {
        this.applyFilter("job");
    }

    /** Apenas projetos específicos. */
    public onProjectPress(): void {
        this.applyFilter("project");
    }

    private applyFilter(kind: string): void {
        const items: Experience[] =
            kind === "all"
                ? this.content.experiences
                : this.content.experiences.filter((item) => (item.kind ?? "job") === kind);

        this.getModel("content")?.setProperty("/filteredExperiences", items);
        this.getModel("ui")?.setProperty("/experienceKind", kind);
    }
}
