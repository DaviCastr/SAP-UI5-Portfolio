import type { DataSource } from "./DataSource";
import { localize } from "./Localizer";
import { computeMetrics, type PortfolioMetrics } from "./metrics";
import type { ContentIssue, ContentLocale, PortfolioContent, SectionDefinition } from "./types";
import { validateContent } from "./validator";

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
            const raw = await dataSource.load();
            const issues = validateContent(raw);
            const localized = localize(raw, locale) as PortfolioContent;

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
            throw new Error("ContentService.boot() precisa ser chamado antes do primeiro acesso.");
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

    get hasIssues(): boolean {
        return this.issues.length > 0;
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
        const featured = this.localized.projects.filter((item) => item.featured);
        const rest = this.localized.projects.filter((item) => !item.featured);
        return [...featured, ...rest];
    }
}
