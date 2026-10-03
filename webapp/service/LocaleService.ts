import { normalizeLocale, resolveLocale } from "./LocaleResolver";
import type { ContentLocale } from "./types";

/**
 * Idioma ativo do portfolio.
 *
 * Decisao de arquitetura: a troca de idioma acontece pela URL (?lang=en) e nao
 * em runtime. Motivos:
 *   1. a preferencia e compartilhavel (link direto para ingles/portugues);
 *   2. evita depender de APIs internas do ResourceModel;
 *   3. o index.html ja aplica data-sap-ui-language antes do sap-ui-core carregar,
 *      entao nao existe "piscar" de idioma.
 */
export class LocaleService {
    /** Idioma ativo (query string > navegador > padrao). */
    static getActive(): ContentLocale {
        return resolveLocale(window.location.search, navigator.language);
    }

    /** URL da pagina atual no idioma informado (usado nos botoes de troca). */
    static buildUrl(locale: ContentLocale): string {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", locale);
        return url.toString();
    }

    /** Troca o idioma e recarrega a aplicacao. */
    static switchTo(locale: ContentLocale): void {
        if (normalizeLocale(locale) === LocaleService.getActive()) {
            return;
        }
        window.location.assign(LocaleService.buildUrl(locale));
    }
}
