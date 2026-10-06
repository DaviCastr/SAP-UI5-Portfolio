import { LocaleService } from "../util/LocaleService";
import { formatDate, formatMonthYear, isExpired } from "./dates";
import type { Period } from "./types";

/**
 * Formatadores das views - o UNICO lugar onde um dado vira texto de tela.
 *
 * Padrao UI5: o BaseController expoe este objeto como `formatter`, e o XML usa
 *   text="{path: 'issuedAt', formatter: '.formatter.date'}"
 *
 * Regras:
 *   - funcoes puras (sem `this`): o UI5 chama o formatter com o controle como
 *     contexto, entao nada aqui pode depender dele;
 *   - o idioma vem do LocaleService (mesma regra do i18n do UI5);
 *   - texto traduzivel chega como parte do binding (ex.: 'i18n>period.current'),
 *     nunca fixo no codigo.
 *
 * As funcoes de data "cruas" (sem idioma ativo) ficam em `format.ts`, que o
 * gerador de PDF tambem usa.
 */
const formatter = {
    // ------------------------------------------------------------ datas

    /** "2024-09" ou "2024-09-15" -> "set/2024" */
    monthYear(value: string | undefined): string {
        return value ? formatMonthYear(value.slice(0, 7), LocaleService.getActive()) : "";
    },

    /**
     * { from: "2020-01", to: null } -> "jan/2020 – atual" ("Present" em ingles).
     *
     * Passe o rotulo do i18n como segunda parte do binding - com uma parte so o
     * formatter nao tem o texto traduzido:
     *   text="{parts: ['period', 'i18n>period.current'], formatter: '.formatter.period'}"
     */
    period(period: Period | undefined, currentLabel?: string): string {
        if (!period?.from) {
            return "";
        }
        const locale = LocaleService.getActive();
        const current = currentLabel || (locale === "en" ? "Present" : "atual");
        const from = formatMonthYear(period.from, locale);
        const to = period.to ? formatMonthYear(period.to, locale) : current;

        return `${from} – ${to}`;
    },

    /** "2025-09-01" -> "01/09/2025" */
    date(value: string | undefined): string {
        return value ? formatDate(value, LocaleService.getActive()) : "";
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
        const locale = LocaleService.getActive();
        const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
        return `${formatDate(value, locale)}, ${time}`;
    },

    /** true quando a credencial venceu (selo "Vencida"). */
    expired(expiresAt: string | null | undefined): boolean {
        return isExpired(expiresAt);
    },

    // ------------------------------------------------------------ niveis

    /** 4 -> "4/5" */
    level(value: number | undefined): string {
        return `${value ?? 0}/5`;
    },

    /** 4 -> "80%" (largura da barra de nivel) */
    levelPercent(value: number | undefined): string {
        return `${Math.max(0, Math.min(100, ((value ?? 0) / 5) * 100))}%`;
    },

    // ------------------------------------------------------------ textos

    /** ("Consultor", "Accenture") -> "Consultor · Accenture"; ignora vazios. */
    joinDot(...parts: (string | undefined | null)[]): string {
        return parts.filter((part) => typeof part === "string" && part.trim()).join(" · ");
    },

    /** ("Mostrar todos", 45) -> "Mostrar todos (45)"; sem numero quando 0. */
    count(label: string, count: number | undefined): string {
        return count ? `${label} (${count})` : label;
    },

    /** Texto curto: corta em `max` caracteres com reticencias. */
    summary(value: string | undefined, max = 140): string {
        const text = (value ?? "").trim();
        return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
    },

    /** "SAP Certified - Back-End Developer - ABAP Cloud" -> "Back-End Developer - ABAP Cloud" */
    certShort(title: string | undefined): string {
        return (title ?? "").replace(/^SAP Certified\s*[-–]\s*/i, "");
    },

    /** "https://www.linkedin.com/in/x/" -> "linkedin.com/in/x" */
    shortUrl(url: string | undefined): string {
        return (url ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    },

    /**
     * Telefone brasileiro em formato de leitura: "+55 (85) 988512382".
     *
     * O JSON guarda so digitos (13 com o 55 do pais, 11 sem). O hifen fica de
     * fora de proposito: em tela pequena ocupa menos espaco e segue legivel.
     */
    phone(value: string | undefined): string {
        const digits = (value ?? "").replace(/\D/g, "");

        if (digits.length === 13 && digits.startsWith("55")) {
            return `+55 (${digits.slice(2, 4)}) ${digits.slice(4)}`;
        }
        if (digits.length === 11) {
            return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
        }
        if (digits.length === 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        }
        return value ?? "";
    },

    // ------------------------------------------------------------ recursos

    /** Nome do catalogo SAP-icons -> URI; "action-settings" quando vazio. */
    icon(name: string | undefined): string {
        return `sap-icon://${name || "action-settings"}`;
    },

    /** Imagem da credencial, com placeholder quando ela nao tem imagem. */
    certImage(value: string | undefined): string {
        return value || "images/certificates/placeholder.svg";
    }
};

export type Formatter = typeof formatter;
export default formatter;
