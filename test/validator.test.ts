import { describe, expect, it } from "vitest";
import type { Skill } from "../webapp/model/types";
import { validateContent } from "../webapp/model/content/validator";
import { buildContent } from "./helpers/content";

/** Caminhos dos problemas encontrados (ordem de insercao). */
function paths(content: Parameters<typeof validateContent>[0]): string[] {
    return validateContent(content).map((issue) => issue.path);
}

describe("validateContent", () => {
    it("aceita o documento minimo bem formado", () => {
        expect(paths(buildContent())).toEqual([]);
    });

    it("exige nome, foto, e-mail, apresentacao, idiomas e links", () => {
        const content = buildContent({
            profile: {
                id: "profile",
                name: "",
                role: "",
                headline: "",
                summary: "",
                about: [],
                avatar: "",
                email: "",
                languages: [],
                links: [],
                focusSkills: []
            }
        });

        const found = paths(content);
        expect(found).toContain("profile.name");
        expect(found).toContain("profile.avatar");
        expect(found).toContain("profile.email");
        expect(found).toContain("profile.about");
        expect(found).toContain("profile.languages");
        expect(found).toContain("profile.links");
    });

    it("rejeita e-mail invalido", () => {
        expect(paths(buildContent({ profile: { email: "davi@@gmail.com" } as never }))).toContain(
            "profile.email"
        );
    });

    it("aceita mailto: e http(s) nos links", () => {
        const content = buildContent({
            profile: {
                links: [
                    { id: "email", url: "mailto:davifgeo@gmail.com" },
                    { id: "site", url: "https://davicastro.dev" },
                    { id: "insecure", url: "ftp://exemplo.com" }
                ]
            } as never
        });

        expect(paths(content)).toEqual(["profile.links"]);
    });

    it("avisa ids ausentes ou duplicados", () => {
        const content = buildContent({
            // O ultimo item nas tem id de proposito: e o caso testado.
            skills: [
                { id: "ui5", name: "UI5", category: "Front-end", level: 4 },
                { id: "ui5", name: "UI5 2", category: "Front-end", level: 4 },
                { name: "Sem id", category: "Front-end", level: 4 } as Skill
            ]
        });

        const found = paths(content);
        expect(found).toContain("skills[1].id");
        expect(found).toContain("skills[2].id");
    });

    it("valida o nivel das skills (1 a 5)", () => {
        const content = buildContent({
            skills: [
                { id: "a", name: "A", category: "C", level: 0 },
                { id: "b", name: "B", category: "C", level: 9 }
            ]
        });

        const found = paths(content);
        expect(found).toContain("skills[0].level");
        expect(found).toContain("skills[1].level");
    });

    it("valida o periodo das experiencias e aceita vinculo aberto", () => {
        const content = buildContent({
            experiences: [
                {
                    id: "a",
                    company: "SAP",
                    role: "Consultor",
                    period: { from: "2020-01", to: null },
                    summary: "",
                    highlights: [],
                    stack: []
                },
                {
                    id: "b",
                    company: "SAP",
                    role: "Consultor",
                    period: { from: "20-01", to: "2021-13" },
                    summary: "",
                    highlights: [],
                    stack: []
                },
                {
                    id: "c",
                    company: "SAP",
                    role: "Consultor",
                    period: { from: "2022-05", to: "2021-01" },
                    summary: "",
                    highlights: [],
                    stack: []
                }
            ]
        });

        const found = paths(content);
        expect(found).not.toContain("experiences[0].period.to");
        expect(found).toContain("experiences[1].period.from");
        expect(found).toContain("experiences[1].period.to");
        expect(found).toContain("experiences[2].period.to");
    });

    it("exige ao menos uma tecnologia em cada projeto", () => {
        const content = buildContent({
            projects: [{ id: "p", name: "P", description: "", stack: [], tags: [] }]
        });
        expect(paths(content)).toContain("projects[0].stack");
    });

    it("valida as datas das certificacoes", () => {
        const content = buildContent({
            certificates: [
                { id: "a", title: "A", issuer: "SAP", issuedAt: "2024", expiresAt: "2025-01-01" },
                { id: "b", title: "B", issuer: "SAP", issuedAt: "2024-01-01", expiresAt: "amanha" }
            ]
        });

        const found = paths(content);
        expect(found).toContain("certificates[0].issuedAt");
        expect(found).toContain("certificates[1].expiresAt");
    });

    it("exige rota, icone e enabled nas secoes", () => {
        const content = buildContent({
            sections: [
                { id: "about", nav: "Sobre", icon: "", route: "", order: 1, enabled: true },
                { id: "cv", nav: "CV", icon: "document", route: "cv", order: 2 } as never
            ]
        });

        const found = paths(content);
        expect(found).toContain("sections[0].icon");
        expect(found).toContain("sections[0].route");
        expect(found).toContain("sections[1].enabled");
    });

    it("aceita repositorios sincronizados do GitHub", () => {
        const content = buildContent({
            github: {
                login: "DaviCastr",
                profileUrl: "https://github.com/DaviCastr",
                repos: [
                    {
                        name: "SAP-UI5-Portfolio",
                        url: "https://github.com/DaviCastr/SAP-UI5-Portfolio",
                        language: "TypeScript",
                        stars: 3,
                        pushedAt: "2026-10"
                    }
                ]
            }
        });

        expect(paths(content)).toEqual([]);
    });

    it("rejeita repositorio sem nome, com URL errada ou data invalida", () => {
        const content = buildContent({
            github: {
                login: "DaviCastr",
                profileUrl: "https://github.com/DaviCastr",
                repos: [
                    { name: "", url: "" },
                    { name: "b", url: "https://gitlab.com/DaviCastr/b" },
                    { name: "c", url: "https://github.com/DaviCastr/c", pushedAt: "outubro" }
                ]
            }
        });

        const found = paths(content);
        expect(found).toContain("github.repos[0].name");
        expect(found).toContain("github.repos[0].url");
        expect(found).toContain("github.repos[1].url");
        expect(found).toContain("github.repos[2].pushedAt");
    });
});
