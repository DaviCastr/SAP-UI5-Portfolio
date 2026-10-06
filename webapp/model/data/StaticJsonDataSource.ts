import type { DataSource, DataSourceOptions, JsonFetcher } from "./DataSource";
import type { PortfolioContent } from "../types";

/** Arquivos que compoem o portfolio. */
export const CONTENT_FILES = {
    profile: "profile.json",
    experiences: "experiences.json",
    skills: "skills.json",
    projects: "projects.json",
    certificates: "certificates.json",
    education: "education.json",
    courses: "courses.json",
    github: "github.json",
    sections: "sections.json"
} as const;

export type ContentFileKey = keyof typeof CONTENT_FILES;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Le os arquivos JSON versionados em webapp/content.
 *
 * Regra de ouro para quem for editar o portfolio:
 *   cada secao da tela tem UM arquivo. Para acrescentar um item, basta
 *   duplicar um objeto do array - nenhuma view precisa ser alterada.
 */
export class StaticJsonDataSource implements DataSource {
    private readonly baseUrl: string;
    private readonly fetcher: JsonFetcher;

    constructor(options: Pick<DataSourceOptions, "baseUrl" | "fetcher">) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.fetcher = options.fetcher;
    }

    async load(): Promise<PortfolioContent> {
        const keys = Object.keys(CONTENT_FILES) as ContentFileKey[];
        const files = await Promise.all(
            keys.map(async (key) => {
                const url = `${this.baseUrl}/${CONTENT_FILES[key]}`;
                return [key, await this.fetcher(url)] as const;
            })
        );

        const data = Object.fromEntries(files) as Record<ContentFileKey, unknown>;

        // "sections.json" pode ser apenas { "sections": [...] } ou um array direto.
        const sections = Array.isArray(data.sections)
            ? data.sections
            : isPlainObject(data.sections)
              ? data.sections.sections
              : [];

        return {
            profile: (data.profile ?? {}) as PortfolioContent["profile"],
            experiences: (data.experiences ?? []) as PortfolioContent["experiences"],
            skills: (data.skills ?? []) as PortfolioContent["skills"],
            projects: (data.projects ?? []) as PortfolioContent["projects"],
            certificates: (data.certificates ?? []) as PortfolioContent["certificates"],
            education: (data.education ?? []) as PortfolioContent["education"],
            courses: (data.courses ?? []) as PortfolioContent["courses"],
            github: data.github as PortfolioContent["github"],
            sections: (sections ?? []) as PortfolioContent["sections"],
            meta: { mode: "static", updatedAt: new Date().toISOString().slice(0, 10) }
        };
    }
}

/**
 * Fonte remota: le um unico JSON de qualquer URL.
 *
 * Preparado para o futuro - se um dia houver um backend (CAP/OData), basta
 * apontar `remoteUrl` e implementar o mapeamento aqui, sem tocar nas views.
 */
export class RemoteJsonDataSource implements DataSource {
    private readonly url: string;
    private readonly fetcher: JsonFetcher;

    constructor(url: string, fetcher: JsonFetcher) {
        this.url = url;
        this.fetcher = fetcher;
    }

    async load(): Promise<PortfolioContent> {
        const payload = (await this.fetcher(this.url)) as Partial<PortfolioContent>;
        return {
            profile: (payload.profile ?? {}) as PortfolioContent["profile"],
            experiences: payload.experiences ?? [],
            skills: payload.skills ?? [],
            projects: payload.projects ?? [],
            certificates: payload.certificates ?? [],
            education: payload.education ?? [],
            courses: payload.courses ?? [],
            github: payload.github,
            sections: payload.sections ?? [],
            meta: { mode: "remote", remoteUrl: this.url }
        };
    }
}

/** Escolhe a fonte de dados conforme o arquivo content/source.json. */
export function createDataSource(
    source: { mode?: "static" | "remote"; remoteUrl?: string },
    options: { baseUrl: string; fetcher: JsonFetcher }
): DataSource {
    if (source.mode === "remote" && source.remoteUrl) {
        return new RemoteJsonDataSource(source.remoteUrl, options.fetcher);
    }

    return new StaticJsonDataSource(options);
}

/** Fetcher padrao do navegador (usado pelo app em runtime). */
export const browserFetcher: JsonFetcher = async (url: string) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
        throw new Error(`Falha ao carregar ${url} (HTTP ${response.status})`);
    }
    return response.json();
};

/** Conteudo de webapp/content/source.json: onde os dados sao lidos. */
export interface SourceConfig {
    /** "static" = JSONs locais (padrao). "remote" = uma unica URL. */
    mode?: "static" | "remote";
    /** URL usada quando mode = remote (prepare para um futuro backend). */
    remoteUrl?: string;
}

/**
 * Le o arquivo de configuracao da fonte de dados.
 *
 * Trocar a origem do portfolio (um dia: CAP/OData) e so alterar este arquivo -
 * nenhuma view nem controller precisa mudar.
 */
export async function loadSourceConfig(
    baseUrl: string,
    fetcher: JsonFetcher = browserFetcher
): Promise<SourceConfig> {
    try {
        const config = await fetcher(`${baseUrl.replace(/\/+$/, "")}/source.json`);
        return (config ?? {}) as SourceConfig;
    } catch {
        return { mode: "static" };
    }
}
