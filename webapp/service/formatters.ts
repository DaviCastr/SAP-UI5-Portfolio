import type { ContentLocale, Period } from "./types";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Rotulo usado quando o periodo ainda esta em andamento (chave i18n da view). */
export const PERIOD_CURRENT_KEY = "period.current";

function months(locale: ContentLocale): string[] {
    return locale === "en" ? MONTHS_EN : MONTHS_PT;
}

/** Converte "2024-09" em { year, month }. */
function splitPeriod(value: string): { year: number; month: number } | null {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
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

/** Ano de uma data completa ("2025-09-01" -> "2025"). */
export function yearOf(value: string): string {
    return (value ?? "").slice(0, 4);
}

/**
 * Formata um periodo.
 * Quando o periodo esta aberto (`to: null`), devolve `currentKey` como marcador
 * para que a view aplique o texto traduzido de "Atual" / "Present".
 */
export function formatPeriod(
    period: Period | undefined,
    locale: ContentLocale,
    currentKey: string = PERIOD_CURRENT_KEY
): string {
    if (!period?.from) {
        return "";
    }

    const from = formatMonthYear(period.from, locale);
    if (!period.to) {
        return `${from} - ${currentKey}`;
    }

    return `${from} - ${formatMonthYear(period.to, locale)}`;
}

/** Uma credencial esta vencida? */
export function isExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
    if (!expiresAt) {
        return false;
    }
    return new Date(`${expiresAt}T23:59:59`).getTime() < now.getTime();
}
