import { describe, expect, it } from "vitest";
import { countCertificateYears, countTags, groupSkillsByCategory } from "../webapp/service/viewData";
import type { Certificate, Skill } from "../webapp/service/types";

function skill(id: string, category: string): Skill {
    return { id, name: id, category, level: 3 };
}

describe("groupSkillsByCategory", () => {
    it("agrupa e conta as skills de cada categoria", () => {
        const groups = groupSkillsByCategory([
            skill("a", "Front-end"),
            skill("b", "SAP"),
            skill("c", "Front-end")
        ]);

        expect(groups.map((group) => group.category)).toEqual(["Front-end", "SAP"]);
        expect(groups[0].count).toBe(2);
        expect(groups[0].items.map((item) => item.id)).toEqual(["a", "c"]);
        expect(groups[1].count).toBe(1);
    });

    it("mantem a ordem em que a categoria aparece no JSON", () => {
        const groups = groupSkillsByCategory([skill("a", "Zzz"), skill("b", "Aaa")]);
        expect(groups.map((group) => group.category)).toEqual(["Zzz", "Aaa"]);
    });
});

describe("countTags", () => {
    it("ordena por quantidade e depois alfabeticamente", () => {
        const groups = countTags([{ tags: ["ui5", "abap"] }, { tags: ["ui5"] }, { tags: ["abap", "cloud"] }]);

        expect(groups[0]).toEqual({ tag: "abap", count: 2 });
        expect(groups[1]).toEqual({ tag: "ui5", count: 2 });
        expect(groups[2]).toEqual({ tag: "cloud", count: 1 });
    });

    it("aceita itens sem tags", () => {
        expect(countTags([{}, { tags: [] }])).toEqual([]);
    });
});

describe("countCertificateYears", () => {
    function certificate(id: string, issuedAt: string): Certificate {
        return { id, title: id, issuer: "SAP", issuedAt, expiresAt: null };
    }

    it("agrupa por ano e ordena do mais novo para o mais antigo", () => {
        const groups = countCertificateYears([
            certificate("a", "2022-05-01"),
            certificate("b", "2024-01-01"),
            certificate("c", "2024-08-01")
        ]);

        expect(groups).toEqual([
            { year: "2024", count: 2 },
            { year: "2022", count: 1 }
        ]);
    });

    it("ignora registros sem data de emissao utilizavel", () => {
        expect(countCertificateYears([certificate("a", "")])).toEqual([]);
    });
});
