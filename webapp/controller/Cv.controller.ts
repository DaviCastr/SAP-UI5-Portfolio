import BaseController from "./BaseController";

/**
 * Controller da pagina de curriculo.
 *
 * O PDF e gerado por `npm run cv:pdf` a partir do mesmo JSON - esta tela apenas
 * mostra a mesma informacao em A4 e oferece o download e a impressao.
 */
export default class CvController extends BaseController {
    /** Caminho do PDF gerado pelos dados do portfolio. */
    public static readonly PDF_URL = "cv/davi-castro-cv.pdf";

    /** Abre/baixa o PDF ja gerado. */
    public onDownloadPress(): void {
        window.open(CvController.PDF_URL, "_blank");
    }

    /** Imprime a pagina (o CSS de impressao remove menus e ajusta para A4). */
    public onPrintPress(): void {
        window.print();
    }
}
