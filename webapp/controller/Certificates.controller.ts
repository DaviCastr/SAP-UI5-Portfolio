import BaseController from "./BaseController";
import type { Certificate } from "../service/types";

/**
 * Controller da galeria de certificacoes.
 *
 * As credenciais vem do JSON (gerado pela ferramenta `npm run scrape:certificates`),
 * que tambem sabe de onde veio cada uma - por isso o filtro por ano e por validade.
 */
export default class CertificatesController extends BaseController {
    public override onInit(): void {
        this.applyFilter("all");
    }

    /** Todas as credenciais. */
    public onAllPress(): void {
        this.applyFilter("all");
    }

    /** Apenas credenciais ainda vigentes. */
    public onValidPress(): void {
        this.applyFilter("valid");
    }

    /** Credenciais emitidas em determinado ano. */
    public onYearPress(event: sap.ui.base.Event): void {
        const year = (this.sourceContext(event)?.getProperty("year") ?? "all") as string;
        this.applyFilter(year);
    }

    /** Abre a credencial no site que a emitiu. */
    public onCertificatePress(event: sap.ui.base.Event): void {
        this.openExternal((this.sourceContext(event)?.getProperty("url") ?? "") as string);
    }

    private applyFilter(filter: string): void {
        let items: Certificate[] = this.content().certificates;

        if (filter === "valid") {
            items = items.filter(
                (certificate) => certificate.expiresAt && !this.isExpired(certificate.expiresAt)
            );
        } else if (filter !== "all") {
            items = items.filter((certificate) => (certificate.issuedAt ?? "").startsWith(filter));
        }

        this.model("content")?.setProperty("/filteredCertificates", items);
        this.model("ui")?.setProperty("/certificateFilter", filter);
    }

    private isExpired(expiresAt: string): boolean {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return new Date(expiresAt).getTime() < today.getTime();
    }
}
