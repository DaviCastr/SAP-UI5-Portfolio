import { describe, expect, it } from "vitest";
import { sortEducationByRecency } from "../webapp/service/ordering";
import type { Education } from "../webapp/service/types";

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