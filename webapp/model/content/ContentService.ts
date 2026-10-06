import type { DataSource } from "../data/DataSource";
import { localize, localizeText } from "./Localizer";
import { computeMetrics, type PortfolioMetrics } from "./metrics";
import { sortEducationByRecency, sortProjectsByRecency } from "./ordering";
import type {
    ChipItem,
    ContentIssue,
    ContentLocale,
    LocalizedText,
    PortfolioContent,
    SectionDefinition
} from "../types";
import { validateContent } from "./validator";
import { ContentNotLoadedError } from "../errors";

/** Conteudo vazio usado quando a carga falha (a tela mostra aviso em vez de quebrar). */
export function emptyContent(): PortfolioContent {
    return {
        profile: {
            id: "profile",
            name: "",
            role: "",
            headline: "",
            summary: "",
            about: [],
            avatar: "images/profile-placeholder.svg",
            email: "",
            location: "",
            languages: [],
            links: [],
            focusSkills: []
        },
        experiences: [],
        skills: [],
        projects: [],
        certificates: [],
        education: [],
        courses: [],
        sections: [],
        meta: {}
    };
}

export interface ContentServiceOptions {
    dataSource: DataSource;
    locale: ContentLocale;
}

/**
 * Prepara as listas de chips (tags, stacks, modulos, highlights, topicos).
 *
 * O JSON e a fonte da verdade e guarda strings, mas a view precisa de objetos:
 * em uma agregacao do UI5 1.153 o binding `{this>}` de uma string chega vazio
 * na Text, e a chip aparecia como uma pilula sem texto. Convertendo para
 * `{ label }`, o mesmo padrao que ja funciona nos filtros, resolve.
 *
 * As listas originais sao preservadas: quem faz logica (filtros, metricas,
 * gerador do CV) continua lendo `string[]`.
 */
function withChipItems(content: PortfolioContent, locale: string): PortfolioContent {
    const chips = (values: readonly (string | LocalizedText)[] | undefined): ChipItem[] =>
        (values ?? [])
            .map((value) => localizeText(value, locale))
            .filter(Boolean)
            .map((label) => ({ label }));

    return {
        ...content,
        profile: { ...content.profile, aboutItems: chips(content.profile.about) },
        experiences: content.experiences.map((item) => ({
            ...item,
            highlightsItems: chips(item.highlights),
            stackItems: chips(item.stack),
            modulesItems: chips(item.modules)
        })),
        skills: content.skills.map((item) => ({ ...item, tagItems: chips(item.tags) })),
        projects: content.projects.map((project) => ({
            ...project,
            tagItems: chips(project.tags),
            stackItems: chips(project.stack),
            highlightsItems: chips(project.highlights)
        })),
        education: content.education.map((item) => ({ ...item, tagItems: chips(item.tags) })),
        github: content.github
            ? {
                  ...content.github,
                  repos: (content.github.repos ?? []).map((repo) => ({
                      ...repo,
                      topicItems: chips(repo.topics)
                  }))
              }
            : content.github
    };
}

/**
 * Ponto unico de acesso ao conteudo do portfolio.
 *
 * Responsabilidades:
 *   1. carregar o JSON (via DataSource - swapavel)
 *   2. validar e coletar problemas (exibidos como aviso na tela)
 *   3. traduzir todo o documento para o idioma escolhido
 *   4. expor metricas derivadas para a home
 */
export class ContentService {
    private static instance: ContentService | null = null;

    private metricsCache: PortfolioMetrics | null = null;

    private constructor(
        private readonly raw: PortfolioContent,
        private readonly localized: PortfolioContent,
        private readonly validationIssues: ContentIssue[],
        private readonly activeLocale: ContentLocale
    ) {}

    /** Carrega e inicializa o servico (uma unica vez por sessao da app). */
    static async boot(options: ContentServiceOptions): Promise<ContentService> {
        const { dataSource, locale } = options;

        try {
            // Somente os JSONs versionados. As certificacoes e os repositorios
            // sao atualizados pelo workflow `.github/workflows/sync-content.yml`,
            // no deploy - e nao por uma chamada do browser.
            //
            // A tentativa anterior de buscar ao vivo foi removida de proposito: o
            // `credly.com` nao envia cabecalho de CORS, entao dependia de um proxy
            // publico que abortava a requisicao, e o boot esperava esse proxy
            // terminar - a tela ficava travada antes de aparecer qualquer coisa.
            const raw = await dataSource.load();

            const issues = validateContent(raw);
            const localized = withChipItems(localize(raw, locale) as PortfolioContent, locale);

            // A formacao e a unica lista cuja ordem de leitura nao pode ser a do
            // JSON: em `education.json` ela esta em ordem cronologica (a mais
            // antiga primeiro, como se escreve uma linha do tempo), mas quem
            // consulta quer o contrario - o mais recente primeiro. Aplicado aqui,
            // e nao na view, para que aba, curriculum e PDF mostrem a mesma
            // ordem sem cada um ter de lembrar de ordenar.
            localized.education = sortEducationByRecency(localized.education);
            raw.education = sortEducationByRecency(raw.education);

            ContentService.instance = new ContentService(raw, localized, issues, locale);
            return ContentService.instance;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const service = new ContentService(
                emptyContent(),
                emptyContent(),
                [{ path: "content", message: `Nao foi possível carregar o conteudo: ${message}` }],
                locale
            );
            ContentService.instance = service;
            return service;
        }
    }

    /** Instancia ativa (lancando erro se o boot ainda nao aconteceu). */
    static get(): ContentService {
        if (!ContentService.instance) {
            throw new ContentNotLoadedError();
        }
        return ContentService.instance;
    }

    /** Instancia ativa ou null (util em asserts e testes). */
    static peek(): ContentService | null {
        return ContentService.instance;
    }

    /** Limpa a instancia (usado em testes). */
    static reset(): void {
        ContentService.instance = null;
    }

    /** Conteudo ja traduzido para o idioma ativo. */
    get content(): PortfolioContent {
        return this.localized;
    }

    /** Conteudo original, com os mapas de idioma intactos (usado pelo gerador de PDF). */
    get rawContent(): PortfolioContent {
        return this.raw;
    }

    get locale(): ContentLocale {
        return this.activeLocale;
    }

    get issues(): ContentIssue[] {
        return this.validationIssues;
    }

    get metrics(): PortfolioMetrics {
        if (!this.metricsCache) {
            this.metricsCache = computeMetrics(this.localized);
        }
        return this.metricsCache;
    }

    /** Secoes ativas (enabled = true), ordenadas para a barra de navegacao. */
    get activeSections(): SectionDefinition[] {
        return [...this.localized.sections]
            .filter((section) => section.enabled !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    /** Secoes visiveis na barra de navegacao, ja ordenadas. */
    get navSections(): SectionDefinition[] {
        return this.activeSections.filter((section) => section.showInNav !== false);
    }

    /** Secao pela rota declarada no manifest.json. */
    getSectionByRoute(route: string): SectionDefinition | undefined {
        return this.activeSections.find((section) => section.route === route);
    }

    /** Competencias em destaque (usadas no hero e na home). */
    get focusSkills() {
        const focusIds = this.localized.profile.focusSkills ?? [];
        if (focusIds.length === 0) {
            return this.localized.skills.filter((skill) => skill.featured).slice(0, 8);
        }
        return focusIds
            .map((id) => this.localized.skills.find((skill) => skill.id === id))
            .filter((skill): skill is NonNullable<typeof skill> => !!skill);
    }

    /** Certificacoes em destaque (ordem manual, depois as mais recentes). */
    get featuredCertificates() {
        const featured = this.localized.certificates.filter((item) => item.featured);
        const rest = this.localized.certificates
            .filter((item) => !item.featured)
            .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""));
        return [...featured, ...rest];
    }

    /** Projetos em destaque (ordem manual, depois os demais). */
    get featuredProjects() {
        // Destaques primeiro, cada grupo do mais recente para o mais antigo.
        const projects = sortProjectsByRecency(this.localized.projects);
        const featured = projects.filter((item) => item.featured);
        const rest = projects.filter((item) => !item.featured);
        return [...featured, ...rest];
    }
}
