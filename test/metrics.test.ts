import { describe, expect, it } from "vitest";
import { computeMetrics, countStacks, topStacks, totalMonthsOfExperience } from "../webapp/service/metrics";
import type { Experience } from "../webapp/service/types";
import { buildContent } from "./helpers/content";

/** Cria uma experiencia com apenas o periodo (o resto nao afecta a metrica). */
function job(from: string, to: string | null, id = from): Experience {
    return {
        id,
        company: `Empresa ${id}`,
        role: "Consultor",
        period: { from, to },
        summary: "",
        highlights: [],
        stack: []
    };
}

describe("totalMonthsOfExperience", () => {
    it("soma periodos consecutivos", () => {
        const content = buildContent({ experiences: [job("2020-01", "2020-06"), job("2020-07", "2020-12")] });
        expect(totalMonthsOfExperience(content)).toBe(12);
    });

    it("une periodos sobrepostos sem contar em dobro", () => {
        const content = buildContent({ experiences: [job("2020-01", "2020-06"), job("2020-04", "2020-12")] });
        expect(totalMonthsOfExperience(content)).toBe(12);
    });

    it("soma intervalos separados por uma lacuna", () => {
        const content = buildContent({ experiences: [job("2019-01", "2019-06"), job("2020-01", "2020-06")] });
        expect(totalMonthsOfExperience(content)).toBe(12);
    });

    it("considera o mes atual quando o vinculo esta ativo", () => {
        const content = buildContent({ experiences: [job("2023-01", null)] });
        // De jan/2023 ate jan/2024 ha 13 meses (ambos os meses entram na conta).
        expect(totalMonthsOfExperience(content, new Date("2024-01-15T00:00:00Z"))).toBe(13);
    });

    it("conta um ano fechado como 12 meses", () => {
        const content = buildContent({ experiences: [job("2020-01", "2020-12")] });
        expect(totalMonthsOfExperience(content)).toBe(12);
    });

    it("ignora experiencias sem data de inicio", () => {
        const broken = { ...job("2020-01", "2020-06"), period: { from: "", to: null } };
        const content = buildContent({ experiences: [broken] });
        expect(totalMonthsOfExperience(content)).toBe(0);
    });
});

describe("stacks", () => {
    const content = buildContent({
        experiences: [
            { ...job("2020-01", "2020-12"), stack: ["SAP UI5", "ABAP"], modules: ["MM"] },
            { ...job("2021-01", "2021-12"), stack: ["SAP UI5", "Node.js"], modules: ["SD"] }
        ],
        projects: [{ id: "p1", name: "P1", description: "", stack: ["SAP UI5"], tags: ["fiori"] }],
        skills: [{ id: "s1", name: "UI5", category: "Front-end", level: 5, tags: ["SAP UI5"] }]
    });

    it("ordena as tecnologias mais citadas", () => {
        expect(topStacks(content, 2)).toEqual(["SAP UI5", "ABAP"]);
    });

    it("conta tecnologias distintas de todo o portfolio", () => {
        // SAP UI5, ABAP, Node.js, MM, SD
        expect(countStacks(content)).toBe(5);
    });
});

describe("computeMetrics", () => {
    const content = buildContent({
        experiences: [
            { ...job("2020-01", "2020-12"), company: "SAP", modules: ["MM", "SD"], stack: ["ABAP"] },
            { ...job("2021-01", "2021-12"), company: "SAP", modules: ["MM"], stack: ["ABAP"] }
        ],
        projects: [
            { id: "p1", name: "P1", description: "", stack: [], tags: ["sap"], featured: true, stars: 3 },
            { id: "p2", name: "P2", description: "", stack: [], tags: ["blog"] }
        ],
        skills: [
            { id: "s1", name: "UI5", category: "Front-end", level: 5 },
            { id: "s2", name: "BPM", category: "SAP", level: 4 },
            { id: "s3", name: "SQL", category: "Dados", level: 3 }
        ],
        certificates: [
            {
                id: "c1",
                title: "SAP Certified",
                issuer: "SAP",
                issuedAt: "2024-01-01",
                expiresAt: null
            },
            {
                id: "c2",
                title: "Expirada",
                issuer: "SAP",
                issuedAt: "2020-01-01",
                expiresAt: "2021-01-01"
            }
        ]
    });
    const metrics = computeMetrics(content, new Date("2024-06-15T00:00:00Z"));

    it("conta empresas distintas (mesmo SAP em dois vinculos)", () => {
        expect(metrics.companies).toBe(1);
    });

    it("conta projetos em destaque e do ecossistema SAP", () => {
        expect(metrics.projectCount).toBe(2);
        expect(metrics.featuredProjects).toBe(1);
        expect(metrics.sapProjects).toBe(1);
    });

    it("soma as estrelas do GitHub", () => {
        expect(metrics.githubStars).toBe(3);
    });

    it("conta skills avancadas (nivel 4 ou 5)", () => {
        expect(metrics.skillCount).toBe(3);
        expect(metrics.advancedSkills).toBe(2);
    });

    it("conta modulos SAP distintos", () => {
        expect(metrics.moduleCount).toBe(2);
    });

    it("separa certificacoes vigentes das vencidas", () => {
        expect(metrics.certificateCount).toBe(2);
        expect(metrics.validCertificates).toBe(1);
        expect(metrics.certificateSources).toBe(1);
    });
});
