import type { ContentLocale } from "./types";

/**
 * Datas do portfolio em texto ("2024-09" -> "set/2024"), sem depender de UI5
 * nem do idioma ativo: o formatter das views e o gerador do PDF usam as mesmas.
 */

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function months(locale: ContentLocale): string[] {
    return locale === "en" ? MONTHS_EN : MONTHS_PT;
}

/** Converte "2024-09" em { year, month }. */
function splitPeriod(value: string): { year: number; month: number } | null {
    const match = /^(\d{4})-(\d{2})/.exec(value ?? "");
    if (!match) {
        return null;
    }
    return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * "2024-09" -> "set/2024" (pt) | "Sep 2024" (en)
 * Valores invalidos sao devolvidos como estao (para nao quebrar a tela).
 */
export function formatMonthYear(value: string, locale: ContentLocale): string {
    const parsed = splitPeriod(value);
    if (!parsed) {
        return value ?? "";
    }

    const name = months(locale)[parsed.month - 1];
    return locale === "en" ? `${name} ${parsed.year}` : `${name}/${parsed.year}`;
}

/**
 * "2024-09" -> "01/09/2024" (pt) | "Sep 1, 2024" (en)
 */
export function formatDate(value: string, locale: ContentLocale): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
    if (!match) {
        return value ?? "";
    }

    const [, year, month, day] = match;
    return locale === "en"
        ? `${months(locale)[Number(month) - 1]} ${Number(day)}, ${year}`
        : `${day}/${month}/${year}`;
}

/** Uma credencial esta vencida? */
export function isExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
    if (!expiresAt) {
        return false;
    }
    return new Date(`${expiresAt}T23:59:59`).getTime() < now.getTime();
}
