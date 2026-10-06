import type { ChipItem, PortfolioContent } from "../types";

/** Numeros exibidos nas telas, sempre calculados a partir do JSON. */
export interface PortfolioMetrics {
    /** Meses de experiencia somando todos os vinculos sem contar em dobro. */
    monthsOfExperience: number;
    /** Meses de experiencia convertidos em anos (arredondado para baixo). */
    yearsOfExperience: number;
    /** Empresas diferentes. */
    companies: number;
    /** Projetos cadastrados. */
    projectCount: number;
    /** Projetos marcados como destaque. */
    featuredProjects: number;
    /** Projetos ligados ao ecossistema SAP. */
    sapProjects: number;
    /** Soma das estrelas do GitHub. */
    githubStars: number;
    /** Credenciais cadastradas. */
    certificateCount: number;
    /** Credenciais ainda vigentes. */
    validCertificates: number;
    /** Entidades emissoras diferentes. */
    certificateSources: number;
    /** Competencias cadastradas. */
    skillCount: number;
    /** Competencias com nivel 4 ou 5. */
    advancedSkills: number;
    /** Modulos SAP distintos citados nas experiencias. */
    moduleCount: number;
    /** Tecnologias mais citadas. */
    stacks: string[];
    /**
     * `stacks` como `{ label }`, para os chips do CV.
     *
     * A view nao consegue renderizar uma lista de strings em agregacao
     * (`{this>}` chega vazio no UI5 1.153), entao as chips usam este campo.
     */
    stacksItems: ChipItem[];
    /** Total de tecnologias distintas citadas. */
    stackCount: number;
}

/** Tags que indicam que um projeto usa o ecossistema SAP. */
const SAP_TAGS = ["sap", "fiori", "abap", "ui5", "bpm", "hana", "btp", "successfactors", "sac", "ariba"];

/** Converte "YYYY-MM" em um inteiro monotonico (meses desde o ano 0). */
function toIndex(period: string): number {
    const match = /^(\d{4})-(\d{2})$/.exec(period ?? "");
    return match ? Number(match[1]) * 12 + Number(match[2]) : 0;
}

/** Ultimo mes considerando que um vinculo sem data final esta ativo. */
function currentMonth(now: Date): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Meses entre dois periodos, contando o mes final.
 *
 * De 2020-01 ate 2020-12 sao 12 meses (o mes do fim entra na conta), por isso o
 * `+ 1` - sem ele, um ano inteiro de trabalho seria contado como 11 meses.
 */
export function monthsBetween(from: string, to: string, now: Date = new Date()): number {
    const start = toIndex(from);
    const end = toIndex(to || currentMonth(now)) + 1;
    return Math.max(0, end - start);
}

/**
 * Soma os meses de todas as experiencias sem contar duas vezes o mesmo mes.
 *
 * Ex.: Um projeto de 6 meses dentro da mesma empresa nao vira 6 meses a mais -
 * os intervalos sao unidos antes de somar.
 */
export function totalMonthsOfExperience(content: PortfolioContent, now: Date = new Date()): number {
    const ranges = content.experiences
        .filter((item) => item?.period?.from)
        .map((item) => {
            const start = toIndex(item.period.from);
            const end = toIndex(item.period.to || currentMonth(now)) + 1;
            return { start: Math.min(start, end), end: Math.max(start, end) };
        })
        .filter((range) => range.end > range.start)
        .sort((a, b) => a.start - b.start);

    let total = 0;
    let cursorStart: number | null = null;
    let cursorEnd = 0;

    ranges.forEach((range) => {
        if (cursorStart === null) {
            cursorStart = range.start;
            cursorEnd = range.end;
            return;
        }

        // Continua o intervalo atual.
        if (range.start <= cursorEnd) {
            cursorEnd = Math.max(cursorEnd, range.end);
            return;
        }

        // Ha um intervalo em branco entre os dois: fecha e abre outro.
        total += cursorEnd - cursorStart;
        cursorStart = range.start;
        cursorEnd = range.end;
    });

    if (cursorStart !== null) {
        total += cursorEnd - cursorStart;
    }

    return total;
}

/** Tecnologias mais citadas entre experiencias, projetos e skills. */
export function topStacks(content: PortfolioContent, limit: number): string[] {
    const counter = new Map<string, number>();

    const add = (values: string[] | undefined): void => {
        (values ?? []).forEach((value) => {
            if (value) {
                counter.set(value, (counter.get(value) ?? 0) + 1);
            }
        });
    };

    content.experiences.forEach((item) => {
        add(item.stack);
        add(item.modules);
    });
    content.projects.forEach((item) => add(item.stack));

    return [...counter.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([name]) => name);
}

/** Total de tecnologias distintas citadas em qualquer lugar do portfolio. */
export function countStacks(content: PortfolioContent): number {
    const all = new Set<string>();

    content.experiences.forEach((item) => {
        (item.stack ?? []).forEach((tech) => all.add(tech));
        (item.modules ?? []).forEach((module) => all.add(module));
    });
    content.projects.forEach((item) => (item.stack ?? []).forEach((tech) => all.add(tech)));
    content.skills.forEach((item) => (item.tags ?? []).forEach((tag) => all.add(tag)));

    return all.size;
}

/** Deriva as metricas de exibicao a partir do conteudo carregado. */
export function computeMetrics(content: PortfolioContent, now: Date = new Date()): PortfolioMetrics {
    const monthsOfExperience = totalMonthsOfExperience(content, now);
    const expiresAt = (value: string | null | undefined): number =>
        value ? new Date(`${value}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const isSapProject = (project: PortfolioContent["projects"][number]): boolean =>
        (project.tags ?? []).some((tag) => SAP_TAGS.includes(tag.toLowerCase()));

    const stacks = topStacks(content, 12);

    return {
        monthsOfExperience,
        yearsOfExperience: Math.floor(monthsOfExperience / 12),
        companies: new Set(content.experiences.map((item) => item.company).filter(Boolean)).size,
        projectCount: content.projects.length,
        featuredProjects: content.projects.filter((item) => item.featured).length,
        sapProjects: content.projects.filter(isSapProject).length,
        // Estrelas de todos os repositorios publicos (github.json, do sync). Os
        // projetos do projects.json nem sempre tem repositorio - somar so eles
        // dava 0 com repositorios estrelados na conta.
        githubStars: content.github?.repos?.length
            ? content.github.repos.reduce((sum, repo) => sum + (repo.stars ?? 0), 0)
            : content.projects.reduce((sum, item) => sum + (item.stars ?? 0), 0),
        certificateCount: content.certificates.length,
        validCertificates: content.certificates.filter((item) => expiresAt(item.expiresAt) >= now.getTime())
            .length,
        certificateSources: new Set(content.certificates.map((item) => item.issuer).filter(Boolean)).size,
        skillCount: content.skills.length,
        advancedSkills: content.skills.filter((item) => (item.level ?? 0) >= 4).length,
        moduleCount: new Set(content.experiences.flatMap((item) => item.modules ?? []).filter(Boolean)).size,
        stacks,
        stacksItems: stacks.map((label) => ({ label })),
        stackCount: countStacks(content)
    };
}
