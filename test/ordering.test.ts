import { describe, expect, it } from "vitest";
import { sortEducationByRecency, sortProjectsByRecency } from "../webapp/model/content/ordering";
import type { Education, Project } from "../webapp/model/types";

function education(id: string, from: string, to: string | null): Education {
    return {
        id,
        kind: "education",
        degree: id,
        institution: "Instituicao",
        period: { from, to }
    };
}

describe("sortEducationByRecency", () => {
    it("ordena pela data de fim, da mais recente para a mais antiga", () => {
        const sorted = sortEducationByRecency([
            education("tecnico", "2016", "2018"),
            education("bacharelado", "2019", "2022")
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["bacharelado", "tecnico"]);
    });

    it("coloca curso em andamento antes dos que ja terminaram", () => {
        const sorted = sortEducationByRecency([
            education("antigo", "2010", "2014"),
            education("atual", "2024", null)
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["atual", "antigo"]);
    });

    it("desempata pela data de inicio quando o fim e igual", () => {
        const sorted = sortEducationByRecency([
            education("comecou-cedo", "2020", "2024"),
            education("comecou-depois", "2022", "2024")
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["comecou-depois", "comecou-cedo"]);
    });

    it("desempata pelo id para a ordem nao oscilar com entradas iguais", () => {
        const sorted = sortEducationByRecency([
            education("b", "2022", "2024"),
            education("a", "2022", "2024")
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
    });

    it("nao altera a lista original", () => {
        const original = [education("antigo", "2010", "2014"), education("novo", "2022", "2024")];

        sortEducationByRecency(original);

        expect(original.map((item) => item.id)).toEqual(["antigo", "novo"]);
    });

    it("aceita entrada sem periodo", () => {
        const semPeriodo: Education = { id: "x", kind: "education", degree: "X", institution: "Y" };
        const sorted = sortEducationByRecency([semPeriodo, education("antigo", "2010", "2014")]);

        expect(sorted.map((item) => item.id)).toEqual(["x", "antigo"]);
    });
});
describe("sortProjectsByRecency", () => {
    const project = (id: string, extra: Partial<Project> = {}): Project => ({
        id,
        name: id,
        description: "",
        stack: ["ABAP"],
        tags: [],
        ...extra
    });

    it("poe o projeto atual (sem data) antes dos datados", () => {
        const sorted = sortProjectsByRecency([
            project("cartoes", { period: { from: "2025-04", to: "2025-05" } }),
            project("vale", { current: true }),
            project("antigo", { period: { from: "2018-11", to: "2022-08" } })
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["vale", "cartoes", "antigo"]);
    });

    it("trata periodo sem fim como em andamento", () => {
        const sorted = sortProjectsByRecency([
            project("encerrado", { period: { from: "2024-01", to: "2024-12" } }),
            project("aberto", { period: { from: "2020-01", to: null } })
        ]);

        expect(sorted[0].id).toBe("aberto");
    });

    it("deixa os sem data por ultimo, na ordem do JSON", () => {
        const sorted = sortProjectsByRecency([
            project("sem-data-1"),
            project("datado", { period: { from: "2019-01", to: "2019-06" } }),
            project("sem-data-2")
        ]);

        expect(sorted.map((item) => item.id)).toEqual(["datado", "sem-data-1", "sem-data-2"]);
    });
});
