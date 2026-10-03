import type { ContentLocale } from "./types";

/** Idiomas suportados pelo portfolio. */
export const SUPPORTED_LOCALES: ContentLocale[] = ["pt", "en"];

/** Idioma usado quando nao ha preferencia definida. */
export const DEFAULT_LOCALE: ContentLocale = "pt";

/**
 * Reduz "pt-BR", "PT_br", "pt" para o codigo de idioma suportado ("pt" | "en").
 * Retorna null quando o idioma nao e suportado.
 */
export function normalizeLocale(value: string | null | undefined): ContentLocale | null {
    if (!value) {
        return null;
    }

    const language = value.toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LOCALES.includes(language as ContentLocale) ? (language as ContentLocale) : null;
}

/**
 * Define o idioma do portfolio.
 *
 * Ordem de precedencia:
 *   1. query string (?lang=en) - permite gerar links diretos
 *   2. preferencia do navegador (navigator.language)
 *   3. idioma padrao (portugues)
 *
 * @param search query string da URL (ex.: "?lang=en")
 * @param browserLanguage idioma do navegador (ex.: "en-US")
 */
export function resolveLocale(
    search?: string | null,
    browserLanguage?: string | null,
    fallback: ContentLocale = DEFAULT_LOCALE
): ContentLocale {
    const fromQuery = normalizeLocale(readQueryParam(search, "lang") ?? readQueryParam(search, "locale"));
    if (fromQuery) {
        return fromQuery;
    }

    const fromBrowser = normalizeLocale(browserLanguage);
    if (fromBrowser) {
        return fromBrowser;
    }

    return fallback;
}

function readQueryParam(search: string | null | undefined, key: string): string | null {
    if (!search) {
        return null;
    }

    const query = search.charAt(0) === "?" ? search.slice(1) : search;
    const found = query.split("&").find((part) => part.split("=")[0] === key);
    return found ? decodeURIComponent(found.split("=")[1] ?? "") : null;
}
