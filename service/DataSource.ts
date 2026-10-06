import type { PortfolioContent, ContentLocale } from "./types";

/** Funcao que busca um JSON por URL (injetavel: facilitates testes e modo remoto). */
export type JsonFetcher = (url: string) => Promise<unknown>;

/**
 * Fonte de dados do portfolio.
 *
 * O app NUNCA le JSON diretamente: ele sempre passa por esta interface.
 * Trocar a origem dos dados (local -> OData/CAP no futuro) significa criar
 * outra implementacao e mudar UMA linha no Component.ts.
 */
export interface DataSource {
    /** Carrega o documento completo do portfolio. */
    load(): Promise<PortfolioContent>;
}

/** Opcoes de construcao de uma fonte de dados. */
export interface DataSourceOptions {
    /** Prefixo dos arquivos (ex.: "content/"). */
    baseUrl: string;
    fetcher: JsonFetcher;
    locale?: ContentLocale;
}
