import { isExpired } from "../dates";
import type { Certificate, Experience, GitHubRepo, Project } from "../types";
import { sortProjectsByRecency } from "./ordering";

/**
 * Filtros das telas, como funcoes puras.
 *
 * O controller so le a escolha do usuario e publica o resultado no model; a
 * regra ("o que e uma certificacao vigente", "em que ordem os projetos
 * aparecem") mora aqui, onde pode ser testada sem UI5.
 */

/** Valor de filtro que significa "sem filtro". */
export const ALL = "all";

/** Experiencias por natureza: "job", "project" ou ALL. Sem `kind` conta como "job". */
export function filterExperiences(items: Experience[], kind: string): Experience[] {
    return kind === ALL ? items : items.filter((item) => (item.kind ?? "job") === kind);
}

/** Projetos com a tag (ou todos), sempre do mais recente para o mais antigo. */
export function filterProjects(items: Project[], tag: string): Project[] {
    return sortProjectsByRecency(tag === ALL ? items : items.filter((item) => item.tags?.includes(tag)));
}

/**
 * Certificacoes: ALL, "valid" (com validade e ainda vigentes) ou um ano ("2025").
 * Credencial sem `expiresAt` nao expira, mas tambem nao entra em "valid": o
 * filtro mostra o que tem prazo e ainda esta dentro dele.
 */
export function filterCertificates(items: Certificate[], filter: string, now = new Date()): Certificate[] {
    if (filter === ALL) {
        return items;
    }
    if (filter === "valid") {
        return items.filter((item) => !!item.expiresAt && !isExpired(item.expiresAt, now));
    }
    return items.filter((item) => (item.issuedAt ?? "").startsWith(filter));
}

/** Repositorios por linguagem, paginados: `visible` + quantos ficaram de fora. */
export function filterRepos(
    repos: GitHubRepo[],
    language: string,
    limit = Number.POSITIVE_INFINITY
): { visible: GitHubRepo[]; hidden: number } {
    const matching = language === ALL ? repos : repos.filter((repo) => repo.language === language);
    const visible = matching.slice(0, limit);
    return { visible, hidden: matching.length - visible.length };
}

/** Icone SAP por linguagem (o SAP-icons nao tem marcas de linguagem). */
const LANGUAGE_ICONS: Record<string, string> = {
    TypeScript: "javascript",
    JavaScript: "javascript",
    HTML: "code",
    CSS: "code",
    "Jupyter Notebook": "source-code",
    ABAP: "log"
};

/** Linguagens dos repositorios para os chips de filtro: "TypeScript (12)", da mais usada. */
export function repoLanguages(
    repos: GitHubRepo[]
): { language: string; count: number; label: string; icon: string }[] {
    const counter = new Map<string, number>();
    repos.forEach((repo) => {
        if (repo.language) {
            counter.set(repo.language, (counter.get(repo.language) ?? 0) + 1);
        }
    });
    return [...counter.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([language, count]) => ({
            language,
            count,
            label: `${language} (${count})`,
            icon: LANGUAGE_ICONS[language] ?? "source-code"
        }));
}
