import { describe, expect, it } from "vitest";
import {
    ALL,
    filterCertificates,
    filterExperiences,
    filterProjects,
    filterRepos,
    repoLanguages
} from "../webapp/model/content/filters";
import type { Certificate, Experience, GitHubRepo, Project } from "../webapp/model/types";

const exp = (id: string, kind?: "job" | "project"): Experience =>
    ({
        id,
        company: "X",
        role: "R",
        period: { from: "2020-01", to: null },
        summary: "",
        highlights: [],
        stack: [],
        kind
    }) as Experience;

const cert = (id: string, issuedAt: string, expiresAt: string | null): Certificate => ({
    id,
    title: id,
    issuer: "SAP",
    issuedAt,
    expiresAt
});

const repo = (name: string, language?: string): GitHubRepo =>
    ({ name, url: `https://github.com/x/${name}`, language }) as GitHubRepo;

describe("filterExperiences", () => {
    const items = [exp("a", "job"), exp("b", "project"), exp("c")];

    it("devolve tudo com ALL", () => {
        expect(filterExperiences(items, ALL)).toHaveLength(3);
    });

    it("trata experiencia sem kind como vinculo", () => {
        expect(filterExperiences(items, "job").map((item) => item.id)).toEqual(["a", "c"]);
    });
});

describe("filterProjects", () => {
    const project = (id: string, tags: string[], from?: string): Project => ({
        id,
        name: id,
        description: "",
        stack: ["ABAP"],
        tags,
        period: from ? { from, to: `${from}` } : undefined
    });

    it("filtra pela tag e ordena do mais recente", () => {
        const items = [
            project("velho", ["SAP"], "2019-01"),
            project("novo", ["SAP"], "2025-01"),
            project("outro", ["JS"], "2024-01")
        ];
        expect(filterProjects(items, "SAP").map((item) => item.id)).toEqual(["novo", "velho"]);
    });
});

describe("filterCertificates", () => {
    const now = new Date("2025-06-01T12:00:00");
    const items = [
        cert("vigente", "2025-01-10", "2027-01-01"),
        cert("vencida", "2024-02-01", "2025-01-01"),
        cert("sem-prazo", "2024-05-01", null)
    ];

    it("vigentes: so as com prazo ainda valido", () => {
        expect(filterCertificates(items, "valid", now).map((item) => item.id)).toEqual(["vigente"]);
    });

    it("por ano de emissao", () => {
        expect(filterCertificates(items, "2024", now).map((item) => item.id)).toEqual([
            "vencida",
            "sem-prazo"
        ]);
    });
});

describe("filterRepos / repoLanguages", () => {
    const repos = [repo("a", "ABAP"), repo("b", "JavaScript"), repo("c", "JavaScript"), repo("d")];

    it("pagina e informa quantos ficaram de fora", () => {
        expect(filterRepos(repos, ALL, 2)).toEqual({ visible: repos.slice(0, 2), hidden: 2 });
        expect(filterRepos(repos, "JavaScript").hidden).toBe(0);
    });

    it("conta linguagens, da mais usada para a menos usada", () => {
        expect(repoLanguages(repos).map((item) => item.label)).toEqual(["JavaScript (2)", "ABAP (1)"]);
    });
});
