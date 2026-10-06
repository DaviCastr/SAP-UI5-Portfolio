import type { Certificate, GitHubInfo, GitHubRepo } from "../types";

/**
 * Conversao dos payloads externos (Credly e GitHub) para os tipos do portfolio.
 *
 * Este modulo e o **unico** lugar onde os formatos externos (Credly e GitHub)
 * viram tipos do portfolio. Roda no build (`tools/credly/scrape.ts`,
 * `tools/github/sync.ts`, `tools/cv/generate-pdf.ts`) e no browser (ordem e
 * filtro das certificacoes), por isso nao usa API do Node nem do DOM: sao
 * funcoes puras.
 *
 * A razao de extrair isso dos scripts e evitar que o portfolio mostre uma coisa
 * no dia a dia e outra no PDF: as duas pontas usam as mesmas regras.
 */

// ==========================================================================
// Credly
// ==========================================================================

/** Endereco publico de badges de um usuario do Credly. */
export const CREDLY_BADGES_URL = "https://www.credly.com/users/";

/** Campos usados do payload do Credly (Badgr). */
export interface CredlyBadge {
    id: string;
    issued_at_date?: string;
    expires_at_date?: string;
    badge_template?: {
        name?: string;
        url?: string;
        image_url?: string;
        vanity_slug?: string;
    };
    issuer?: {
        summary?: string;
        entities?: { entity?: { name?: string } }[];
    };
    vanity_slug?: string;
}

export interface CredlyResponse {
    data?: CredlyBadge[];
}

/** Emissor mais legivel: prefere o nome da organizacao ao texto "issued by X". */
export function readIssuer(badge: CredlyBadge): string {
    const organization = badge.issuer?.entities?.find((item) => item.entity?.name)?.entity?.name;
    const summary = badge.issuer?.summary ?? "";
    const cleaned = summary.replace(/^issued by\s+/i, "").trim();
    return organization ?? (cleaned || "Credly");
}

/** "SAP Certified - ..." vira categoria "Certification". */
export function readCategory(title: string): string {
    if (/record of achievement/i.test(title)) {
        return "Achievement";
    }
    if (/certified|certification/i.test(title)) {
        return "Certification";
    }
    return "Course";
}

/**
 * URL publica da credencial no Credly.
 *
 * Preferimos o **UUID da badge** (`/badges/{id}`): e a unica URL que abre a
 * credencial *no nome de quem recebeu* - as demais (`/badges/{vanity_slug}` ou
 * `/org/{org}/badge/{slug}`) caem na pagina generica do curso, sem o titulo nem
 * o nome do titular.
 *
 * O `vanity_slug` nao serve como fallback confiavel: o Credly trunca o valor em
 * 50 caracteres, o que gerava URLs quebradas (`...-record-of-achievem`). O id
 * sempre existe, por isso e a unica fonte usada aqui.
 */
export function readBadgeUrl(badge: CredlyBadge): string | undefined {
    if (badge.id) {
        return `https://www.credly.com/badges/${badge.id}`;
    }

    const templateUrl = badge.badge_template?.url;
    if (templateUrl && /^https:\/\/www\.credly\.com\/org\//.test(templateUrl)) {
        return templateUrl.replace(/\/org\/[^/]+\/badge\//, "/badges/");
    }

    return templateUrl;
}

/**
 * Uma "SAP Certified" e o que o recrutador procura primeiro no portfolio.
 *
 * O separador entre "SAP" e "Certified" e tolerado (` `, `-`, `_` ou nada):
 * a marca e a mesma, e um titulo variante nao pode fazer a credencial perder
 * o destaque so por causa de um hifen.
 */
export function isSapCertified(title: string): boolean {
    return /SAP[-_\s]*Certified/i.test(title ?? "");
}

/**
 * Converte o payload do Credly na lista de certificacoes do portfolio.
 *
 * `previous` (o que ja esta no `certificates.json`) e usado para preservar o
 * que so existe localmente: imagem baixada, destaque manual e a posicao dos
 * itens cadastrados a mao (`source = "manual"`, que nunca vem do Credly).
 *
 * O resultado sai ordenado da mais recente para a mais antiga, com as "SAP
 * Certified" na frente - ver `orderCertificates`.
 */
export function mapCredlyBadges(payload: unknown, previous: Certificate[] = []): Certificate[] {
    const data = (payload as CredlyResponse)?.data ?? [];
    const before = new Map(previous.map((item) => [item.id, item]));

    const synced: Certificate[] = [];
    for (const badge of data) {
        const title = badge.badge_template?.name;
        if (!badge.id || !title) {
            // Badge sem id ou sem nome nao tem como virar entrada estavel.
            continue;
        }

        const previousBadge = before.get(badge.id);
        synced.push({
            id: badge.id,
            title,
            issuer: readIssuer(badge),
            issuedAt: badge.issued_at_date ?? "",
            expiresAt: badge.expires_at_date || null,
            url: readBadgeUrl(badge),
            image: previousBadge?.image ?? badge.badge_template?.image_url,
            source: "credly",
            category: readCategory(title),
            featured: previousBadge?.featured ?? /certified/i.test(title)
        });
    }

    return orderCertificates([...previous.filter((item) => item.source !== "credly"), ...synced]);
}

/**
 * Ordem de exibicao das certificacoes.
 *
 * 1. "SAP Certified" primeiro - e o que pesa em uma triagem;
 * 2. demais certificacoes da mais recente para a mais antiga;
 * 3. items sem data (RoA, por exemplo) no fim, para nao competirem com o resto;
 * 4. nome como desempate, para a lista nao pular de lugar entre dois carregamentos.
 */
export function orderCertificates(certificates: Certificate[]): Certificate[] {
    const sap = (item: Certificate): number => (isSapCertified(item.title) ? 0 : 1);
    const date = (item: Certificate): string => item.issuedAt ?? "";

    return [...certificates].sort(
        (a, b) =>
            sap(a) - sap(b) ||
            // Sem data vai para o fim: "" ordenaria antes de tudo.
            (date(a) && date(b) ? date(b).localeCompare(date(a)) : date(a) ? -1 : date(b) ? 1 : 0) ||
            a.title.localeCompare(b.title)
    );
}

// ==========================================================================
// GitHub
// ==========================================================================

/** Base da API publica do GitHub. */
export const GITHUB_API = "https://api.github.com";

/** Campos do usuario do GitHub usados aqui. */
export interface GhUser {
    login: string;
    html_url: string;
}

/** Campos do repositorio do GitHub usados aqui. */
export interface GhRepo {
    name: string;
    html_url: string;
    fork: boolean;
    archived: boolean;
    stargazers_count: number;
    forks_count: number;
    language?: string;
    pushed_at?: string;
    description?: string;
    homepage?: string;
    topics?: string[];
}

/** Extrai "DaviCastr/repo" de qualquer forma de URL do GitHub. */
export function repoKey(url: string | undefined): string | undefined {
    const match = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(url ?? "");
    return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : undefined;
}

/** Texto opcional: string vazia vira undefined para nao inflar o JSON. */
export function optional(value: string | undefined): string | undefined {
    const text = value?.trim();
    return text ? text : undefined;
}

/** Ultimo push no formato YYYY-MM, que e o formato dos cards da aba Projetos. */
export function toMonth(iso: string | undefined): string | undefined {
    return iso ? iso.slice(0, 7) : undefined;
}

/** Data completa do GitHub (ISO) como YYYY-MM-DD. */
export function toDate(iso: string | undefined): string | undefined {
    return iso ? iso.slice(0, 10) : undefined;
}

/**
 * Converte um repositorio da API no formato do portfolio.
 *
 * `homepage` so e aceito com http(s): o GitHub aceita valor livre nesse campo e
 * um "javascript:..." ali viraria um link clicavel no card.
 */
export function toRepo(repo: GhRepo): GitHubRepo {
    return {
        name: repo.name,
        url: repo.html_url,
        description: optional(repo.description),
        language: optional(repo.language),
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        topics: repo.topics?.length ? repo.topics : undefined,
        pushedAt: toMonth(repo.pushed_at),
        homepage: /^https?:\/\//i.test(repo.homepage ?? "") ? repo.homepage : undefined
    };
}

/**
 * Monta o `github.json` a partir do perfil e da lista de repositorios.
 *
 * Fork e repositorio arquivado ficam de fora: nenhum dos dois e trabalho do
 * portfolio (o primeiro e codigo de outra pessoa, o segundo esta parado).
 */
export function mapGitHubInfo(user: GhUser, repos: GhRepo[], syncedAt?: string): GitHubInfo {
    const own = (repos ?? []).filter((repo) => !repo.fork && !repo.archived);
    return {
        login: user.login,
        profileUrl: user.html_url,
        syncedAt: syncedAt ?? new Date().toISOString(),
        repoCount: own.length,
        repos: own.map(toRepo)
    };
}