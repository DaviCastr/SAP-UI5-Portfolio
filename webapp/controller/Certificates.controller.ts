import BaseController from "./BaseController";
import { ALL, filterCertificates } from "../model/content/filters";

/** Galeria de certificacoes com filtro por ano e por validade. */
export default class CertificatesController extends BaseController {
    public override onInit(): void {
        this.applyFilter(ALL);
    }

    /** Cada cartao abre a credencial oficial (Credly). */
    protected override clickableCards(): string {
        return ".pf-cert";
    }

    public onAllPress(): void {
        this.applyFilter(ALL);
    }

    public onValidPress(): void {
        this.applyFilter("valid");
    }

    public onYearPress(event: sap.ui.base.Event): void {
        this.applyFilter(this.sourceProperty(event, "year") ?? ALL);
    }

    private applyFilter(filter: string): void {
        this.model("content")?.setProperty(
            "/filteredCertificates",
            filterCertificates(this.content().certificates, filter)
        );
        this.model("ui")?.setProperty("/certificateFilter", filter);
    }
}
