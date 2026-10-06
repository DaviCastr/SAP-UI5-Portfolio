import BaseController from "./BaseController";

/**
 * Controller da aba de formacao.
 *
 * Os registros vem prontos de education.json (formacao, pos e monitoria) e de
 * courses.json (cursos livres) - aqui nao ha regra de negocio.
 */
export default class EducationController extends BaseController {
    /**
     * Abre o documento do registro (ex.: diploma em PDF).
     *
     * O `url` vem do JSON do proprio item do template, entao nao precisa ser
     * guardado em propriedade: o parametro do evento ja traz o binding.
     */
    public onDocumentPress(event: sap.ui.base.Event): void {
        const context = this.sourceContext(event);
        this.openLink(context?.getProperty("url"));
    }
}
