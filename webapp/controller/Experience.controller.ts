import BaseController from "./BaseController";
import { ALL, filterExperiences } from "../model/content/filters";

/** Experiencia profissional com filtro por natureza (tudo / vinculos / projetos). */
export default class ExperienceController extends BaseController {
    public override onInit(): void {
        this.applyFilter(ALL);
    }

    public onAllPress(): void {
        this.applyFilter(ALL);
    }

    public onJobPress(): void {
        this.applyFilter("job");
    }

    public onProjectPress(): void {
        this.applyFilter("project");
    }

    private applyFilter(kind: string): void {
        this.model("content")?.setProperty(
            "/filteredExperiences",
            filterExperiences(this.content().experiences, kind)
        );
        this.model("ui")?.setProperty("/experienceKind", kind);
    }
}
