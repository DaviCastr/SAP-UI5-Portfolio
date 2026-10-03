import { LocaleService } from "../service/LocaleService";
import { formatDate, formatMonthYear, isExpired, yearOf } from "../service/formatters";
import type { Period } from "../service/types";

/**
 * Formatadores compartilhados pelas views.
 *
 * Ficam aqui (e nao em cada controller) para que o mesmo dado seja formatado
 * de forma identica em todas as telas - e para respeitar o idioma ativo.
 */
export const sharedFormatters = {
    /** "2024-09" -> "set/2024" */
    monthYear(value: string): string {
        return formatMonthYear(value, LocaleService.getActive());
    },

    /** { from: "2020-01", to: null } -> "jan/2020 – atual" */
    period(period: Period | undefined, resourceBundle?: { getText(key: string): string }): string {
        if (!period?.from) {
            return "";
        }
        const from = formatMonthYear(period.from, LocaleService.getActive());
        const to = period.to
            ? formatMonthYear(period.to, LocaleService.getActive())
            : (resourceBundle?.getText("period.current") ?? "atual");

        return `${from} – ${to}`;
    },

    /** "2025-09-01" -> "01/09/2025" */
    date(value: string): string {
        return formatDate(value, LocaleService.getActive());
    },

    /** "2025-09-01" -> "2025" */
    year(value: string): string {
        return yearOf(value);
    },

    /** "2025-09-01T10:30:00Z" -> "01/09/2025, 10:30" */
    dateTime(value: string | undefined): string {
        if (!value) {
            return "";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return `${formatDate(value, LocaleService.getActive())}, ${date.toLocaleTimeString(
            LocaleService.getActive(),
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )}`;
    },

    /** 4 -> "4/5" */
    level(value: number): string {
        return `${value ?? 0}/5`;
    },

    /** 4 -> "80" (largura da barra de nivel, em %) */
    levelPercent(value: number): string {
        return `${Math.max(0, Math.min(100, ((value ?? 0) / 5) * 100))}%`;
    },

    /** true quando a credencial ainda esta vigente. */
    valid(expiresAt: string | null | undefined): boolean {
        return !isExpired(expiresAt);
    },

    /** true quando a credencial venceu (para exibir o selo de expirada). */
    expired(expiresAt: string | null | undefined): boolean {
        return isExpired(expiresAt);
    },

    /** Nome de icone do catalogo UI5; usa "action-settings" como padrao. */
    icon(name: string | undefined): string {
        return `sap-icon://${name || "action-settings"}`;
    },

    /** Texto curto: corta em 140 caracteres adicionando reticencias. */
    summary(value: string, max: number = 140): string {
        const text = (value ?? "").trim();
        return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
    },

    /** (85988512382) -> "+55 (85) 98851-2382" */
    phone(value: string): string {
        const digits = (value ?? "").replace(/\D/g, "");
        if (digits.length === 11) {
            return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }
        if (digits.length === 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        }
        return value ?? "";
    },

    /** Caminho de imagem alternativo quando a credencial nao tem imagem. */
    certImage(value: string | undefined): string {
        return value || "images/certificates/placeholder.svg";
    }
};

export default sharedFormatters;
