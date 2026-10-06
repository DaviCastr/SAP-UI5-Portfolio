import BaseController from "./BaseController";
import { sharedFormatters } from "./formatters";

/**
 * Controller da pagina de curriculo.
 *
 * A tela segue o mesmo desenho do PDF (service/cvPdf.ts): cabecalho com foto,
 * barra lateral (contato, idiomas, competencias) e coluna principal. O download
 * e a impressao sao acoes da pagina e ficam na barra de secao (App.view.xml);
 * por isso os handlers vem do BaseController, compartilhado com o App.
 */
export default class CvController extends BaseController {
    /** Cards de certificacao SAP abrem a credencial (URL do contexto). */
    protected override clickableCards(): string {
        return ".pf-cvcert";
    }

    /** "SAP Certified - Back-End Developer - ABAP Cloud" -> "Back-End Developer - ABAP Cloud". */
    public fCertShort(title: string | undefined): string {
        return (title ?? "").replace(/^SAP Certified\s*[-–]\s*/i, "");
    }

    /** "2025-09-01" -> "set/2025" (o `fMonthYear` so aceita "2025-09"). */
    public fIssued(value: string | undefined): string {
        return value ? sharedFormatters.monthYear(value.slice(0, 7)) : "";
    }

    /** "https://www.linkedin.com/in/x/" -> "linkedin.com/in/x". */
    public fShortUrl(url: string | undefined): string {
        return (url ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    }
}
