import { browserFetcher, createDataSource, loadSourceConfig } from "../data/StaticJsonDataSource";
import { ContentLoadError } from "../errors";
import type { ContentLocale } from "../types";
import { ContentService } from "./ContentService";
import { buildViewData } from "./viewData";

/** Pasta dos JSON do portfolio (relativa a webapp/). */
const CONTENT_BASE_URL = "content";

/** Resultado do carregamento: o que vai para o model "content" + titulos das secoes. */
export interface LoadedPortfolio {
    /** Documento traduzido + dados derivados das views, num objeto so (um setData). */
    modelData: Record<string, unknown>;
    /** route -> titulo traduzido (barra de secao abaixo do topo). */
    sectionTitles: Record<string, string>;
}

/**
 * Carrega o portfolio no navegador: escolhe a fonte (content/source.json),
 * valida, traduz para `locale` e calcula os dados derivados das views.
 *
 * Falha de rede/arquivo vira `ContentLoadError` (ver model/errors.ts).
 *
 * E o unico ponto de entrada de dados da app - o App.controller so chama esta
 * funcao e publica o resultado. Trocar JSON por um backend (CAP) e trocar a
 * fonte em `source.json`, sem tocar em controller nem view.
 */
export async function loadPortfolio(locale: ContentLocale): Promise<LoadedPortfolio> {
    let service: ContentService;
    try {
        const source = await loadSourceConfig(CONTENT_BASE_URL, browserFetcher);
        const dataSource = createDataSource(source, { baseUrl: CONTENT_BASE_URL, fetcher: browserFetcher });
        service = await ContentService.boot({ dataSource, locale });
    } catch (error) {
        // Rede fora, JSON ausente ou invalido: um erro so, com mensagem para o usuario.
        throw new ContentLoadError(error);
    }

    return {
        // Um unico objeto: dois setData seguidos apagariam o documento e
        // deixariam so as derivacoes.
        modelData: { ...service.content, ...buildViewData(service) },
        // `nav` e LocalizedText no tipo, mas ja chega traduzido aqui.
        sectionTitles: Object.fromEntries(
            service.activeSections.map((section) => [section.route, String(section.nav ?? "")])
        )
    };
}
