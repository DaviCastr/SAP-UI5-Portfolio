import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { loadLocalizedContent } from "../tools/shared/nodeContent";
import { buildCvPdf, cvPdfFileName, formatCvMonth, formatCvPeriod } from "../webapp/pdf/cvPdf";

/**
 * O mesmo gerador roda no botao "Baixar PDF" e no `npm run cv:pdf`. O que
 * importa garantir: uma pagina (sem folha em branco no fim) e o texto no
 * idioma pedido.
 */

/** Conteudo das paginas (streams descomprimidos), onde ficam os textos `(...) Tj`. */
function pageStreams(pdf: ArrayBuffer): string {
    const raw = Buffer.from(pdf);
    const chunks: string[] = [];
    let from = 0;
    for (;;) {
        const start = raw.indexOf("stream\n", from);
        if (start < 0) {
            break;
        }
        const end = raw.indexOf("endstream", start);
        try {
            chunks.push(inflateSync(raw.subarray(start + 7, end)).toString("latin1"));
        } catch {
            // Stream de imagem ou nao comprimido: nao tem texto.
        }
        from = end + 9;
    }
    return chunks.join("\n");
}

describe("cvPdf", () => {
    /** Quantidade de textos escritos numa pagina (o rodape sozinho escreve 1 ou 2). */
    const textOps = (doc: ReturnType<typeof buildCvPdf>, page: number): number =>
        (doc.internal as unknown as { pages: string[][] }).pages[page].filter((op) => op.includes(") Tj"))
            .length;

    it.each(["pt", "en"] as const)(
        "gera o curriculo real sem pagina em branco no fim (%s)",
        async (locale) => {
            const content = await loadLocalizedContent(locale);
            const doc = buildCvPdf(content, locale, { generatedAt: new Date(2026, 9, 5) });
            const pages = doc.getNumberOfPages();

            expect(pages).toBeLessThanOrEqual(2);
            expect(textOps(doc, pages)).toBeGreaterThan(10);
            expect(new Uint8Array(doc.output("arraybuffer")).byteLength).toBeGreaterThan(1000);
        }
    );

    it("cabe em uma pagina quando o conteudo e curto", async () => {
        const content = await loadLocalizedContent("pt");
        const short = {
            ...content,
            experiences: content.experiences.slice(2),
            projects: content.projects.slice(0, 1),
            skills: content.skills.slice(0, 8)
        };

        expect(buildCvPdf(short, "pt").getNumberOfPages()).toBe(1);
    });

    it("escreve os rotulos no idioma ativo", async () => {
        const pt = pageStreams(buildCvPdf(await loadLocalizedContent("pt"), "pt").output("arraybuffer"));
        const en = pageStreams(buildCvPdf(await loadLocalizedContent("en"), "en").output("arraybuffer"));

        expect(pt).toContain("EXPERI");
        expect(pt).not.toContain("SOFT SKILLS");
        expect(en).toContain("SOFT SKILLS");
        expect(en).toContain("Problem Solving");
    });

    it("quebra em mais paginas, sem perder conteudo, quando nao cabe em uma", async () => {
        const content = await loadLocalizedContent("pt");
        const many = Array.from({ length: 8 }, (_, index) => ({
            ...content.experiences[0],
            id: `extra-${index}`
        }));
        const doc = buildCvPdf({ ...content, experiences: many }, "pt");

        expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    });

    it("formata periodos e nome do arquivo", async () => {
        expect(formatCvMonth("2025-06", "pt")).toBe("jun/2025");
        expect(formatCvMonth("2025-06-30", "en")).toBe("Jun 2025");
        expect(formatCvPeriod({ from: "2025-06", to: null }, "pt")).toBe("jun/2025 – atual");
        expect(formatCvPeriod({ from: "2019-01", to: "2022-12" }, "en")).toBe("Jan 2019 – Dec 2022");
        expect(cvPdfFileName(await loadLocalizedContent("pt"), "en")).toBe("davi-castro-cv-en.pdf");
    });
});
