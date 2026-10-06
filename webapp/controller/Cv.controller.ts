import BaseController from "./BaseController";

/**
 * Curriculo (mesmo desenho do PDF, ver pdf/cvPdf.ts).
 *
 * "Ver PDF" e "Imprimir" ficam na barra de secao (App.view.xml) e usam os
 * handlers do BaseController.
 */
export default class CvController extends BaseController {
    /** Cartoes das certificacoes SAP abrem a credencial. */
    protected override clickableCards(): string {
        return ".pf-cvcert";
    }
}
