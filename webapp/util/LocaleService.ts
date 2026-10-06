import { DEFAULT_LOCALE, resolveLocale } from "./LocaleResolver";
import type { ContentLocale } from "../model/types";

/**
 * Idioma ativo do portfolio.
 *
 * O idioma nao e trocado em runtime: quem decide e o i18n do UI5, que usa o
 * idioma do navegador. Aqui so resolvemos o mesmo idioma para carregar o JSON
 * traduzido. A ordem e "?lang=en" > navegador > portugues, a mesma aplicada pelo
 * index.html antes do sap-ui-core carregar (evita "piscar" de idioma).
 */
export class LocaleService {
    /** Idioma ativo (query string > navegador > padrao). */
    static getActive(): ContentLocale {
        // Fora do navegador (testes, scripts Node) nao ha URL nem navigator.
        if (typeof window === "undefined") {
            return DEFAULT_LOCALE;
        }
        return resolveLocale(window.location.search, navigator.language);
    }
}
