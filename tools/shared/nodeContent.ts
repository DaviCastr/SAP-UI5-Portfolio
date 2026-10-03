import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ContentService } from "../../webapp/service/ContentService";
import { StaticJsonDataSource } from "../../webapp/service/StaticJsonDataSource";
import type { ContentLocale, PortfolioContent } from "../../webapp/service/types";

/**
 * Raiz do repositorio (a pasta que contem package.json).
 *
 * Os scripts npm sempre rodam a partir da raiz do projeto, entao `cwd` e a
 * forma simples e sem `import.meta` (que exigiria rodar como ESM) de chegar
 * nos arquivos do portfolio.
 */
export const REPO_ROOT = process.cwd();

/** Pasta com os JSON versionados do portfolio. */
export const CONTENT_DIR = resolve(REPO_ROOT, "webapp", "content");

/** Pasta de imagens do portfolio. */
export const IMAGES_DIR = resolve(REPO_ROOT, "webapp", "images");

/**
 * Fetcher equivalente ao do navegador, porem lendo do disco.
 *
 * Como a app usa StaticJsonDataSource com um fetcher injetavel, as ferramentas
 * de linha de comando reaproveitam exatamente o mesmo carregamento - assim o
 * Node e o browser nunca interpretam os JSONs de formas diferentes.
 */
export async function nodeFetcher(url: string): Promise<unknown> {
    const fileName = url.split("/").pop() ?? "";
    const raw = await readFile(resolve(CONTENT_DIR, fileName), "utf8");
    return JSON.parse(raw);
}

/** DataSource de disco, com os mesmos arquivos usados em runtime. */
export function createFileDataSource(): StaticJsonDataSource {
    return new StaticJsonDataSource({ baseUrl: "content", fetcher: nodeFetcher });
}

/** Carrega o portfolio e devolve o servico (permite ler raw e localizado). */
export async function loadContentService(locale: ContentLocale = "pt"): Promise<ContentService> {
    return ContentService.boot({ dataSource: createFileDataSource(), locale });
}

/** Conteudo original, com os textos ainda como { pt, en }. */
export async function loadRawContent(locale: ContentLocale = "pt"): Promise<PortfolioContent> {
    return (await loadContentService(locale)).rawContent;
}

/** Conteudo ja traduzido para o idioma informado. */
export async function loadLocalizedContent(locale: ContentLocale = "pt"): Promise<PortfolioContent> {
    return (await loadContentService(locale)).content;
}

/** Le um JSON de webapp/content. */
export async function readContentFile<T>(fileName: string, fallback: T): Promise<T> {
    try {
        return JSON.parse(await readFile(resolve(CONTENT_DIR, fileName), "utf8")) as T;
    } catch {
        return fallback;
    }
}

/** Grava um JSON de webapp/content com indentacao e quebra de linha final. */
export async function writeContentFile(fileName: string, data: unknown): Promise<string> {
    const filePath = resolve(CONTENT_DIR, fileName);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    return filePath;
}

/** Le um argumento do tipo --chave=valor da linha de comando. */
export function readFlag(name: string, argv: string[] = process.argv.slice(2)): string | undefined {
    const prefix = `--${name}`;
    const found = argv.find((arg) => arg === prefix || arg.startsWith(`${prefix}=`));
    if (!found) {
        return undefined;
    }
    return found.includes("=") ? found.slice(found.indexOf("=") + 1) : "true";
}

/** true quando a flag foi informada sem valor (ex.: --download-images). */
export function hasFlag(name: string, argv: string[] = process.argv.slice(2)): boolean {
    return argv.includes(`--${name}`);
}

/** Executa o `main` de uma ferramenta, com saida de erro padronizada. */
export async function run(tool: string, main: () => Promise<void>): Promise<void> {
    try {
        await main();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n${tool}: ${message}`);
        process.exitCode = 1;
    }
}
