import type { LocalizedText } from "./types";
import { DEFAULT_LOCALE } from "./LocaleResolver";

/** Chave que indica "objeto traduzido" em vez de "objeto de dados". */
const LOCALE_KEY_PATTERN = /^[a-z]{2}(_[A-Z]{2})?$/;

/** Ex.: "pt-BR" -> ["pt-BR", "pt"]. */
function buildCandidateChain(locale: string, fallbackLocale: string): string[] {
    const language = locale.split(/[-_]/)[0].toLowerCase();
    const fallbackLanguage = fallbackLocale.split(/[-_]/)[0].toLowerCase();
    return [...new Set([locale.toLowerCase(), language, fallbackLocale.toLowerCase(), fallbackLanguage])];
}

/**
 * Um objeto e considerado "traduzivel" quando TODOS os valores sao string
 * E alguma das chaves parece um codigo de idioma ("pt", "en", "pt_BR").
 * Isso evita confundir um objeto de dados (ex.: { name: "UI5" }) com um texto traduzido.
 */
function isLocalizedMap(value: unknown): value is Record<string, string> {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
        return false;
    }

    const allStrings = entries.every(([, item]) => typeof item === "string");
    const hasLocaleKey = entries.some(([key]) => LOCALE_KEY_PATTERN.test(key));
    return allStrings && hasLocaleKey;
}

/** Escolhe o melhor valor de um objeto traduzido. */
export function pickLocalized(map: Record<string, string>, locale: string, fallbackLocale: string): string {
    const candidates = buildCandidateChain(locale, fallbackLocale);

    for (const candidate of candidates) {
        const value = map[candidate];
        if (typeof value === "string" && value.trim() !== "") {
            return value;
        }
    }

    // Ultimo recurso: qualquer idioma disponivel, em ordem alfabetica.
    const fallbackKey = Object.keys(map).sort()[0];
    return fallbackKey ? map[fallbackKey] : "";
}

/**
 * Percorre qualquer estrutura de dados e troca todo texto traduzido
 * ({ pt: ..., en: ... }) pela string do idioma atual.
 *
 * Ex.: localize({ role: { pt: "Consultor", en: "Consultant" } }, "en")
 *      -> { role: "Consultant" }
 *
 * Estruturas (arrays e objetos comuns) sao preservadas.
 */
export function localize<T>(node: T, locale: string, fallbackLocale: string = DEFAULT_LOCALE): T {
    return resolveNode(node, locale, fallbackLocale) as T;
}

/** Resolve um unico no, sem saber se ele e traduzivel. */
export function localizeText(value: LocalizedText, locale: string, fallbackLocale?: string): string {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object") {
        return pickLocalized(value as Record<string, string>, locale, fallbackLocale ?? DEFAULT_LOCALE);
    }

    return "";
}

function resolveNode(node: unknown, locale: string, fallbackLocale: string): unknown {
    if (node === null || node === undefined || typeof node !== "object") {
        return node;
    }

    if (Array.isArray(node)) {
        return node.map((item) => resolveNode(item, locale, fallbackLocale));
    }

    if (isLocalizedMap(node)) {
        return pickLocalized(node, locale, fallbackLocale);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        result[key] = resolveNode(value, locale, fallbackLocale);
    }
    return result;
}
