import { describe, expect, it } from "vitest";
import sharedFormatters from "../webapp/controller/formatters";

const { phone, certImage, summary } = sharedFormatters;

describe("phone", () => {
    it("formata o numero do portfolio como o esperado", () => {
        expect(phone("5585988512382")).toBe("+55 (85) 988512382");
    });

    it("aceita o numero sem o codigo do pais", () => {
        expect(phone("85988512382")).toBe("+55 (85) 988512382");
    });

    it("ignora pontuacao e espacos do valor de origem", () => {
        expect(phone("+55 (85) 98851-2382")).toBe("+55 (85) 988512382");
    });

    it("formata celular de outro estado", () => {
        expect(phone("5511988887777")).toBe("+55 (11) 988887777");
    });

    it("formata telefone de 10 digitos sem codigo do pais", () => {
        expect(phone("8533322233")).toBe("(85) 33322233");
    });

    it("devolve o valor original quando nao parece um telefone brasileiro", () => {
        expect(phone("sem numero")).toBe("sem numero");
        expect(phone("")).toBe("");
    });
});

describe("certImage", () => {
    it("usa a imagem da credencial quando existe", () => {
        expect(certImage("images/certificates/x.png")).toBe("images/certificates/x.png");
    });

    it("cai para o placeholder quando a credencial nao tem imagem", () => {
        expect(certImage(undefined)).toBe("images/certificates/placeholder.svg");
    });
});

describe("summary", () => {
    it("nao corta textos curtos", () => {
        expect(summary("Texto curto", 20)).toBe("Texto curto");
    });

    it("corta textos longos com reticencias", () => {
        expect(summary("abcdefghij", 5)).toBe("abcd…");
    });

    it("aceita valor ausente", () => {
        expect(summary(undefined as unknown as string)).toBe("");
    });
});
