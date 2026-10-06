import BaseController from "./BaseController";
import { Model, Filter } from "../model/constants";
import { ALL, experienceTimeline } from "../model/content/filters";

/** Experiencia: linha do tempo de vinculos e projetos (filtro tudo / vinculos / projetos). */
export default class ExperienceController extends BaseController {
    public override onInit(): void {
        this.applyFilter(ALL);
    }

    public onAllPress(): void {
        this.applyFilter(ALL);
    }

    public onJobPress(): void {
        this.applyFilter(Filter.JOB);
    }

    public onProjectPress(): void {
        this.applyFilter(Filter.PROJECT);
    }

    private applyFilter(kind: string): void {
        this.model(Model.CONTENT)?.setProperty(
            "/filteredExperiences",
            experienceTimeline(this.content().experiences, this.content().projects, kind)
        );
        this.model(Model.UI)?.setProperty("/experienceKind", kind);
    }
}
