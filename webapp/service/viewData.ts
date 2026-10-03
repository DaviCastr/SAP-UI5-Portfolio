import type { ContentService } from "./ContentService";
import type { PortfolioMetrics } from "./metrics";
import type { Certificate, Experience, ExternalLink, Project, SectionDefinition, Skill } from "./types";

/** Competencias agrupadas por categoria (usado na aba Skills). */
export interface SkillGroup {
    category: string;
    icon?: string;
    /** Quantidade de skills da categoria (evita usar /length em bindings). */
    count: number;
    items: Skill[];
}

/** Projetos agrupados por tag (usado nos filtros). */
export interface TagGroup {
    tag: string;
    count: number;
}

/** Certificacoes agrupadas por ano de emissao. */
export interface YearGroup {
    year: string;
    count: number;
}

/**
 * Derivacoes usadas pelas telas.
 *
 * Todas ficam em um unico lugar para que a home, a aba de experiencia, o
 * curriculo e o gerador de PDF contem a mesma informacao - sempre coerente.
 */
export interface PortfolioViewData {
    metrics: PortfolioMetrics;
    navSections: SectionDefinition[];
    navLinks: ExternalLink[];
    footerLinks: ExternalLink[];
    issues: { path: string; message: string }[];
    focusSkills: Skill[];
    recentExperiences: Experience[];
    featuredProjects: Project[];
    recentCertificates: Certificate[];
    skillsByCategory: SkillGroup[];
    skillCategories: TagGroup[];
    projectTags: TagGroup[];
    certificateYears: YearGroup[];
    /** Contagens para os cards de metricas (bindings nao aceitam /length). */
    skillCategoryCount: number;
    projectTagCount: number;
    certificateYearCount: number;
}

/** Agrupa preservando a ordem em que as categorias aparecem no JSON. */
export function groupSkillsByCategory(skills: Skill[]): SkillGroup[] {
    const groups = new Map<string, Skill[]>();

    skills.forEach((skill) => {
        const current = groups.get(skill.category) ?? [];
        current.push(skill);
        groups.set(skill.category, current);
    });

    return [...groups.entries()].map(([category, items]) => ({
        category,
        icon: items[0]?.icon,
        count: items.length,
        items
    }));
}

/** Lista de tags com a contagem de itens, para montar os filtros. */
export function countTags(items: { tags?: string[] }[]): TagGroup[] {
    const counter = new Map<string, number>();

    items.forEach((item) => {
        (item.tags ?? []).forEach((tag) => counter.set(tag, (counter.get(tag) ?? 0) + 1));
    });

    return [...counter.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag, count]) => ({ tag, count }));
}

/** Anos com certificacoes, do mais recente para o mais antigo. */
export function countCertificateYears(certificates: Certificate[]): YearGroup[] {
    const counter = new Map<string, number>();

    certificates.forEach((certificate) => {
        const year = (certificate.issuedAt ?? "").slice(0, 4);
        if (year) {
            counter.set(year, (counter.get(year) ?? 0) + 1);
        }
    });

    return [...counter.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([year, count]) => ({ year, count }));
}

/** Monta o pacote completo de dados derivados para as views. */
export function buildViewData(service: ContentService): PortfolioViewData {
    const content = service.content;
    const links = content.profile.links ?? [];
    const skillsByCategory = groupSkillsByCategory(content.skills);
    const skillCategories = skillsByCategory.map((group) => ({
        tag: group.category,
        count: group.count
    }));
    const projectTags = countTags(content.projects);
    const certificateYears = countCertificateYears(content.certificates);

    return {
        metrics: service.metrics,
        navSections: service.navSections,
        navLinks: links.filter((link) => link.primary),
        footerLinks: links,
        issues: service.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        focusSkills: service.focusSkills.slice(0, 8),
        recentExperiences: content.experiences.filter((item) => item.kind !== "project").slice(0, 3),
        featuredProjects: service.featuredProjects.slice(0, 6),
        recentCertificates: service.featuredCertificates.slice(0, 6),
        skillsByCategory,
        skillCategories,
        projectTags,
        certificateYears,
        skillCategoryCount: skillCategories.length,
        projectTagCount: projectTags.length,
        certificateYearCount: certificateYears.length
    };
}
