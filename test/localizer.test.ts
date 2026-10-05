import { describe, expect, it } from "vitest";
import { localize, localizeText, pickLocalized } from "../webapp/service/Localizer";

describe("pickLocalized", () => {
    it("usa o idioma exato quando existe", () => {
        expect(pickLocalized({ pt: "Consultor", en: "Consultant" }, "en", "pt")).toBe("Consultant");
    });

    it("cai para o idioma base quando so existe pt", () => {
        expect(pickLocalized({ pt: "Consultor" }, "pt-BR", "en")).toBe("Consultor");
    });

    it("prefere o padrao quando o idioma pedido nao existe", () => {
        expect(pickLocalized({ pt: "Consultor", en: "Consultant" }, "de", "pt")).toBe("Consultor");
    });

    it("ignora valores vazios", () => {
        expect(pickLocalized({ pt: "   ", en: "Consultant" }, "pt", "en")).toBe("Consultant");
    });

    it("ultimo recurso: primeiro idioma disponivel em ordem alfabetica", () => {
        expect(pickLocalized({ fr: "Consultant", pt: "Consultor" }, "de", "en")).toBe("Consultant");
    });
});

describe("localizeText", () => {
    it("aceita string simples", () => {
        expect(localizeText("SAP UI5", "en")).toBe("SAP UI5");
    });

    it("resolve objeto traduzido", () => {
        expect(localizeText({ pt: "Projetos", en: "Projects" }, "en")).toBe("Projects");
    });
});

describe("localize", () => {
    it("traduz textos em qualquer nivel, preservando arrays e estrutura", () => {
        const source = {
            profile: {
                role: { pt: "Desenvolvedor", en: "Developer" },
                links: [{ label: { pt: "GitHub", en: "GitHub (EN)" } }]
            },
            experiences: [
                {
                    summary: { pt: "RESUMO", en: "SUMMARY" },
                    highlights: [{ pt: "ITEM", en: "ITEM EN" }]
                }
            ]
        };

        expect(localize(source, "en")).toEqual({
            profile: {
                role: "Developer",
                links: [{ label: "GitHub (EN)" }]
            },
            experiences: [
                {
                    summary: "SUMMARY",
                    highlights: ["ITEM EN"]
                }
            ]
        });
    });

    it("nao confunde um objeto de dados com um texto traduzido", () => {
        const source = { stack: [{ name: "UI5" }, { name: "ABAP" }] };
        expect(localize(source, "en")).toEqual(source);
    });

    it("mantem numeros, booleanos e null", () => {
        const source = { level: 5, featured: true, expiresAt: null };
        expect(localize(source, "pt")).toEqual(source);
    });

    it("preserva objeto de periodo: 'to' nao e lido como idioma", () => {
        const source = { period: { from: "2016-01", to: "2018-12" } };
        expect(localize(source, "pt")).toEqual(source);
        expect(localize(source, "en")).toEqual(source);
    });

it("preserva 'id' de dado em vez de lê-lo como idioma", () => {
const source = { id: "sap-ui5" };
expect(localize(source, "en")).toEqual(source);
});

it("preserva 'id' ao mesmo tempo que traduz o texto vizinho", () => {
const source = { id: "sap-ui5", tag: { pt: "UI5", en: "UI5" } };
expect(localize(source, "en")).toEqual({ id: "sap-ui5", tag: "UI5" });
});
});
