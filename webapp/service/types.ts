/* ==========================================================================
 * types.ts - Contratos de dados do portfolio
 *
 * Toda a informacao exibida na tela vive nos arquivos JSON de webapp/content.
 * Estes tipos sao a "documentacao executavel": se voce acrescentar um campo novo
 * no JSON, o TypeScript avisa onde ele precisa ser usado.
 *
 * REGRA DE OURO (ver Localizer.ts):
 *   - Campos que sao IGUAIS nos dois idiomas  -> string simples.
 *   - Campos com TEXTO traduzido              -> { "pt": "...", "en": "..." }.
 * ========================================================================== */

/** Idioma de conteudo suportado. */
export type ContentLocale = "pt" | "en";

/**
 * Texto traduzido.
 * Aceita string (mesmo em todos os idiomas) ou mapa de idioma.
 */
export type LocalizedText = string | Partial<Record<string, string>>;

/** Link externo (LinkedIn, GitHub, profile.sap.com...). */
export interface ExternalLink {
    id: string;
    /** Texto exibido (quando o link aparece com rotulo). */
    label?: LocalizedText;
    /** URL absoluta. */
    url: string;
    /** Icone SAP UI5 (ex.: "linkedin"). */
    icon?: string;
    /** Destaca o link como acao principal. */
    primary?: boolean;
}

/** Idioma falado, exibido na secao "Sobre". */
export interface Language {
    id: string;
    name: LocalizedText;
    /** "Nativo", "Avancado", "Intermediario"... */
    level: LocalizedText;
}

/** Curso livre ou certificacao de fornecedor (area "Formacao"). */
export interface Course {
    id: string;
    name: LocalizedText;
    issuer?: string;
    /** YYYY-MM-DD */
    issuedAt?: string;
    url?: string;
}

/**
 * Chip de tag/topico no formato que a view consegue renderizar.
 *
 * O JSON guarda listas de strings, mas no UI5 1.153 `{this>}` em uma agregacao
 * de strings resolve vazio. O ContentService converte para `{ label }`.
 */
export interface ChipItem {
    label: string;
}

/**
 * Repositorio publico do GitHub, sincronizado por "npm run sync:github".
 *
 * A diferenca para `Project` e a origem: um `Project` e escrito a mao e conta a
 * historia do trabalho; um `GitHubRepo` e o que existe de fato na conta e nao
 * tem traducao propria (a descricao e o texto do proprio repositorio).
 */
export interface GitHubRepo {
    /** Nome do repositorio, como no GitHub ("SAP-UI5-Portfolio"). */
    name: string;
    /** Pagina publica do repositorio. */
    url: string;
    /** Descricao do repositorio, quando o autor escreveu uma. */
    description?: string;
    /** Linguagem principal segundo o GitHub. */
    language?: string;
    stars?: number;
    forks?: number;
    /** Topics do repositorio. */
    topics?: string[];
    /** Topics como `{ label }`, para os chips da view (ver `Project.tagItems`). */
    topicItems?: ChipItem[];
    /** YYYY-MM do ultimo push. */
    pushedAt?: string;
    /** Site declarado no campo "website" do repositorio. */
    homepage?: string;
}

/** Dados do GitHub usados na aba de projetos (preenchidos pelo sync). */
export interface GitHubInfo {
    /** Login do usuario. */
    login: string;
    /** Perfil publico. */
    profileUrl: string;
    /** ISO date da ultima sincronizacao. */
    syncedAt?: string;
    /** Total de repositorios publicos sincronizados. */
    repoCount?: number;
    /** Repositorios proprios, sem fork e sem arquivado. */
    repos?: GitHubRepo[];
}

/** Bloco principal do portfolio: quem e o Davi. */
export interface Profile {
    id: string;
    name: string;
    /** Cargo / assinatura profissional. */
    role: LocalizedText;
    /** Frase de impacto (linha unica) exibida no hero. */
    headline: LocalizedText;
    /** Resumo curto (2 a 3 frases) usado no hero e no SEO. */
    summary: LocalizedText;
    /** Biografia completa: um item por paragrafo (pagina "Sobre"). */
    about: LocalizedText[];
    /** `about` como `{ label }`, para a view (ver `ChipItem`). */
    aboutItems?: ChipItem[];
    /** Caminho da foto (relativo a webapp/). */
    avatar: string;
    /** Texto do selo "disponivel para novos projetos". */
    availability?: LocalizedText;
    email: string;
    /** Apenas digitos, com codigo do pais (ex.: 5585988512382). */
    phone?: string;
    /** Data no formato YYYY-MM-DD. */
    birthday?: string;
    /** "Fortaleza, CE". */
    location?: LocalizedText;
    languages: Language[];
    links: ExternalLink[];
    /** Ids das skills destacadas no hero (ver skills.json). */
    focusSkills: string[];
    /** Tecnologias em destaque no hero da Home (chips), na ordem do JSON. */
    stackHighlights?: string[];
}

/** Periodo de trabalho. `to: null` significa "atual". */
export interface Period {
    /** YYYY-MM */
    from: string;
    /** YYYY-MM ou null para a empresa atual. */
    to: string | null;
}

/** Uma experiencia profissional (emprego ou projeto relevante). */
export interface Experience {
    id: string;
    company: string;
    logo?: string;
    /** Cargo exercido. */
    role: LocalizedText;
    location?: LocalizedText;
    /** "Remoto", "Hibrido", "Presencial"... */
    workplace?: LocalizedText;
    period: Period;
    summary: LocalizedText;
    /** Principais atuacoes/resultados. */
    highlights: LocalizedText[];
    /** Tecnologias utilizadas. */
    stack: string[];
    /** Modulos SAP atuados (MM, SD, FI...). */
    modules?: string[];
    /** Copies de `highlights`/`stack`/`modules` como `{ label }` (ver `ChipItem`). */
    highlightsItems?: ChipItem[];
    stackItems?: ChipItem[];
    modulesItems?: ChipItem[];
    /** Marca a experiencia como projeto (aparece no filtro "Projetos"). */
    kind?: "job" | "project";
    /** Destaque na home. */
    featured?: boolean;
}

/** Competencia tecnica com nivel de 1 a 5. */
export interface Skill {
    id: string;
    /**
     * Nome da competencia.
     *
     * Aceita `{ pt, en }` porque soft skills como "Resolução de Problemas" nao
     * fazem sentido em ingles so com o nome em portugues - no curriculum isso
     * aparecia traduzido na descricao e nao no titulo. Nomes proprios
     * ("TypeScript", "SQL") podem seguir como string simples.
     */
    name: LocalizedText;
    /**
     * Agrupamento usado como titulo de card.
     *
     * Traduzivel pelo mesmo motivo de `name` ("Banco de dados" / "Databases").
     */
    category: LocalizedText;
    /** Nome do icone SAP UI5. */
    icon?: string;
    /** 1 = iniciante ... 5 = especialista. */
    level: number;
    description?: LocalizedText;
    /** Tags livres (ex.: "Fiori", "Cloud", "Integracao"). */
    tags?: string[];
    /** `tags` como `{ label }`, para os chips da view (ver `ChipItem`). */
    tagItems?: ChipItem[];
    featured?: boolean;
}

/** Projeto tecnico / portfolio de codigo. */
export interface Project {
    id: string;
    /** Texto fixo ou `{ pt, en }` (nomes de projetos de cliente costumam ser traduzidos). */
    name: LocalizedText;
    description: LocalizedText;
    /** Papel exercido no projeto. */
    role?: LocalizedText;
    /** URL de apresentacao (site/live demo). */
    url?: string;
    /** Repositorio GitHub. */
    repo?: string;
    stack: string[];
    tags: string[];
    /**
     * Tags no formato de objeto, para os chips da view.
     *
     * O JSON guarda `string[]`, mas no UI5 1.153 `{this>}` em uma agregacao de
     * strings resolve vazio (a chip saia sem texto). O ContentService preenche
     * este campo com `{ label }`, o mesmo formato ja usado nos filtros.
     */
    tagItems?: ChipItem[];
    /** Copias de `stack` e `highlights` como `{ label }` (ver `ChipItem`). */
    stackItems?: ChipItem[];
    highlightsItems?: ChipItem[];
    period?: Period;
    /** Icone SAP UI5 do card (ex.: "iphone"). */
    icon?: string;
    /** Projeto em andamento sem data conhecida (conta como o mais recente). */
    current?: boolean;
    /** Empresa pela qual o projeto foi feito (ex.: "Accenture Brasil"). */
    company?: string;
    highlights?: LocalizedText[];
    /** Aparece na home. */
    featured?: boolean;
    /** Preenchido pelo "npm run sync:github". */
    stars?: number;
    forks?: number;
    language?: string;
    updatedAt?: string;
}

/** Certificacao / credencial. */
export interface Certificate {
    id: string;
    title: string;
    issuer: string;
    /** YYYY-MM-DD */
    issuedAt: string;
    /** YYYY-MM-DD ou null quando nao expira. */
    expiresAt: string | null;
    /** Pagina publica da credencial. */
    url?: string;
    /** Imagem local (baixada pelo scraper) ou remota. */
    image?: string;
    /** Origem do dado. */
    source?: "credly" | "manual";
    /** Agrupamento usado nos filtros. */
    category?: string;
    /** Codigo da credencial (quando informado). */
    credentialCode?: string;
    featured?: boolean;
}

/** Registro de formacao / pos /_monitoria. */
export interface Education {
    id: string;
    institution: string;
    degree: LocalizedText;
    period?: Period;
    description?: LocalizedText;
    url?: string;
    logo?: string;
    kind?: "education" | "monitor" | "course";
    /** Disciplinas, concentraoes ou palavras-chave. */
    tags?: string[];
    /** `tags` como `{ label }`, para os chips da view (ver `ChipItem`). */
    tagItems?: ChipItem[];
}

/** Definicao de uma secao do portfolio (registro de navegacao). */
export interface SectionDefinition {
    /** Usado na rota e como chave de binding. */
    id: string;
    /** Rotulo exibido na barra de navegacao. */
    nav: LocalizedText;
    /** Icone SAP UI5. */
    icon: string;
    /** Route name declarado no manifest.json. */
    route: string;
    /** Ordem na barra de navegacao. */
    order: number;
    /** Desligar a secao sem apagar o conteudo. */
    enabled: boolean;
    /** Exibir a secao na barra de navegacao (padrao: true). */
    showInNav?: boolean;
    /** Descricao exibida no cabecalho da pagina. */
    description?: LocalizedText;
    /** Arquivo JSON que alimenta a secao (referencia/documentacao). */
    dataFile?: string;
}

/** Informacoes de origem dos dados. */
export interface ContentMeta {
    /** "static" (JSON local) ou "remote" (URL externa - preparado para futuro backend). */
    mode?: "static" | "remote";
    /** URL usada quando mode = remote. */
    remoteUrl?: string;
    updatedAt?: string;
}

/** Documento completo montado pelo ContentService. */
export interface PortfolioContent {
    profile: Profile;
    experiences: Experience[];
    skills: Skill[];
    projects: Project[];
    certificates: Certificate[];
    education: Education[];
    courses: Course[];
    github?: GitHubInfo;
    sections: SectionDefinition[];
    meta: ContentMeta;
}

/** Erro de validacao de conteudo, com caminho do problema. */
export interface ContentIssue {
    /** Caminho do campo, ex.: "experiences[1].period.from". */
    path: string;
    message: string;
}

/** Resultado da carga de conteudo. */
export interface ContentLoadResult {
    content: PortfolioContent;
    issues: ContentIssue[];
    locale: ContentLocale;
}
