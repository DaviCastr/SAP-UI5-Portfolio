import type { ContentIssue, PortfolioContent } from "./types";

const MONTH_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const FULL_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function issue(path: string, message: string): ContentIssue {
    return { path, message };
}

function validatePeriod(
    period: unknown,
    path: string,
    issues: ContentIssue[],
    options: { allowOpen?: boolean } = {}
): void {
    if (!period || typeof period !== "object") {
        issues.push(issue(path, "periodo ausente"));
        return;
    }

    const { from, to } = period as { from?: unknown; to?: unknown };

    if (typeof from !== "string" || !MONTH_PERIOD.test(from)) {
        issues.push(issue(`${path}.from`, "use o formato YYYY-MM (ex.: 2024-09)"));
    }

    if (to !== null && to !== undefined) {
        if (typeof to !== "string" || !MONTH_PERIOD.test(to)) {
            issues.push(issue(`${path}.to`, "use o formato YYYY-MM ou null para a empresa atual"));
        } else if (typeof from === "string" && to < from) {
            issues.push(issue(`${path}.to`, "periodo final anterior ao inicial"));
        }
    } else if (!options.allowOpen) {
        issues.push(issue(`${path}.to`, "informe o periodo final ou null"));
    }
}

function validateIds<T extends { id?: unknown }>(
    items: T[] | undefined,
    path: string,
    issues: ContentIssue[],
    seen: Set<string>
): void {
    (items ?? []).forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        if (typeof item?.id !== "string" || item.id.trim() === "") {
            issues.push(issue(`${itemPath}.id`, "id ausente (use um identificador unico e sem espacos)"));
        } else if (seen.has(item.id)) {
            issues.push(issue(`${itemPath}.id`, `id duplicado: "${item.id}"`));
        } else {
            seen.add(item.id);
        }
    });
}

/**
 * Valida o documento carregado e devolve a lista de problemas.
 *
 * O objetivo e didatico: em vez de a tela quebrar silenciosamente, o app
 * mostra um aviso informando exatamente qual campo precisa ser corrigido.
 */
export function validateContent(content: Partial<PortfolioContent>): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const seenIds = new Set<string>();

    const profile = content.profile;
    if (!profile || typeof profile !== "object") {
        issues.push(issue("profile", "perfil nao encontrado (esperado webapp/content/profile.json)"));
    } else {
        if (!profile.name) {
            issues.push(issue("profile.name", "informe o nome"));
        }
        if (!profile.avatar) {
            issues.push(issue("profile.avatar", "informe o caminho da foto (ex.: images/profile.png)"));
        }
        const email = profile.email;
        if (!email || !EMAIL.test(email)) {
            issues.push(issue("profile.email", "e-mail ausente ou invalido"));
        }
        if (!Array.isArray(profile.about) || profile.about.length === 0) {
            issues.push(issue("profile.about", "adicione ao menos um paragrafo de apresentacao"));
        }
        if (!Array.isArray(profile.languages) || profile.languages.length === 0) {
            issues.push(issue("profile.languages", "informe os idiomas falados"));
        }
        if (!Array.isArray(profile.links) || profile.links.length === 0) {
            issues.push(issue("profile.links", "adicione ao menos um link (LinkedIn, GitHub...)"));
        }
        if (profile.links?.some((link) => link && !/^(https?:\/\/|mailto:)/.test(link.url ?? ""))) {
            issues.push(issue("profile.links", "as URLs devem comecar com http://, https:// ou mailto:"));
        }
    }

    validateIds(content.experiences, "experiences", issues, seenIds);
    (content.experiences ?? []).forEach((item, index) => {
        const path = `experiences[${index}]`;
        if (!item?.company) {
            issues.push(issue(`${path}.company`, "informe a empresa"));
        }
        if (!item?.role) {
            issues.push(issue(`${path}.role`, "informe o cargo"));
        }
        validatePeriod(item?.period, `${path}.period`, issues, { allowOpen: true });
    });

    validateIds(content.skills, "skills", issues, seenIds);
    (content.skills ?? []).forEach((item, index) => {
        const path = `skills[${index}]`;
        if (!item?.name) {
            issues.push(issue(`${path}.name`, "informe o nome da competencia"));
        }
        if (typeof item?.level !== "number" || item.level < 1 || item.level > 5) {
            issues.push(issue(`${path}.level`, "nivel deve ser um numero de 1 a 5"));
        }
    });

    validateIds(content.projects, "projects", issues, seenIds);
    (content.projects ?? []).forEach((item, index) => {
        const path = `projects[${index}]`;
        if (!item?.name) {
            issues.push(issue(`${path}.name`, "informe o nome do projeto"));
        }
        if (!Array.isArray(item?.stack) || item.stack.length === 0) {
            issues.push(issue(`${path}.stack`, "informe ao menos uma tecnologia"));
        }
    });

    validateIds(content.certificates, "certificates", issues, seenIds);
    (content.certificates ?? []).forEach((item, index) => {
        const path = `certificates[${index}]`;
        if (!item?.title) {
            issues.push(issue(`${path}.title`, "informe o titulo da certificacao"));
        }
        if (!item?.issuedAt || !FULL_DATE.test(item.issuedAt)) {
            issues.push(issue(`${path}.issuedAt`, "use o formato YYYY-MM-DD"));
        }
        if (item?.expiresAt !== null && item?.expiresAt !== undefined) {
            if (typeof item.expiresAt !== "string" || !FULL_DATE.test(item.expiresAt)) {
                issues.push(issue(`${path}.expiresAt`, "use o formato YYYY-MM-DD ou null quando nao expira"));
            }
        }
    });

    validateIds(content.education, "education", issues, seenIds);
    (content.education ?? []).forEach((item, index) => {
        if (!item?.institution) {
            issues.push(issue(`education[${index}].institution`, "informe a instituicao"));
        }
        if (item?.period) {
            validatePeriod(item.period, `education[${index}].period`, issues);
        }
    });

    validateIds(content.sections, "sections", issues, seenIds);
    (content.sections ?? []).forEach((item, index) => {
        const path = `sections[${index}]`;
        if (!item?.route) {
            issues.push(issue(`${path}.route`, "informe a rota declarada no manifest.json"));
        }
        if (!item?.icon) {
            issues.push(issue(`${path}.icon`, "informe o icone SAP UI5"));
        }
        if (typeof item?.enabled !== "boolean") {
            issues.push(issue(`${path}.enabled`, "informe true ou false"));
        }
    });

    // Repositorios sincronizados do GitHub: sao gravados por ferramenta, mas um
    // sync com --user errado ainda passa pelo validador.
    (content.github?.repos ?? []).forEach((item, index) => {
        const path = `github.repos[${index}]`;
        if (!item?.name) {
            issues.push(issue(`${path}.name`, "informe o nome do repositorio"));
        }
        if (!item?.url || !/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(item.url)) {
            issues.push(issue(`${path}.url`, "a URL deve ser https://github.com/usuario/repositorio"));
        }
        if (item?.pushedAt && !MONTH_PERIOD.test(item.pushedAt)) {
            issues.push(issue(`${path}.pushedAt`, "use o formato YYYY-MM (ex.: 2025-07)"));
        }
    });

    return issues;
}
