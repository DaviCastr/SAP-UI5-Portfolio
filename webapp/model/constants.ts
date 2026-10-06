/**
 * Nomes fixos da app num lugar so (como o `constants/` do projeto CAP).
 *
 * Trocar o nome de um model, rota ou filtro passa a ser uma mudanca de uma
 * linha, e o compilador acusa qualquer uso errado (os tipos derivados abaixo
 * aceitam so os valores declarados).
 */

/** Models do componente (ver Component.ts / model/models.ts). */
export const Model = {
    /** Documento do portfolio + dados derivados das views. Tambem e o model padrao. */
    CONTENT: "content",
    /** Estado da interface (tema, idioma, filtros ativos, rota). */
    UI: "ui",
    DEVICE: "device"
} as const;
export type ModelName = (typeof Model)[keyof typeof Model];

/** Rotas do manifest.json (sap.ui5/routing/routes). */
export const Route = {
    HOME: "home",
    ABOUT: "about",
    EXPERIENCE: "experience",
    SKILLS: "skills",
    PROJECTS: "projects",
    CERTIFICATES: "certificates",
    EDUCATION: "education",
    CV: "cv"
} as const;
export type RouteName = (typeof Route)[keyof typeof Route];

/** Valores dos filtros das telas (ver model/content/filters.ts). */
export const Filter = {
    /** Sem filtro. */
    ALL: "all",
    /** Certificacoes: todas menos as vencidas. */
    VALID: "valid",
    /** Experiencia: vinculos (experiences.json). */
    JOB: "job",
    /** Experiencia: projetos (projects.json). */
    PROJECT: "project"
} as const;
