import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { buildCvPdf, type CvPdfImage } from "../../webapp/service/cvPdf";
import type { ContentLocale } from "../../webapp/service/types";
import { loadLocalizedContent, readFlag, REPO_ROOT, run } from "../shared/nodeContent";

/**
 * Gera o PDF do curriculo a partir dos mesmos JSONs da aplicacao.
 *
 * Uso:
 *   npm run cv:pdf
 *   npm run cv:pdf -- --lang=en --out=dist/cv.pdf
 *
 * O layout vive em `webapp/service/cvPdf.ts` e e o mesmo usado pelo botao
 * "Baixar PDF" do site (que gera o arquivo na hora, no navegador). Este script
 * so carrega o conteudo/foto do disco e grava o resultado - o arquivo estatico
 * serve de alternativa caso a geracao no navegador falhe.
 */

/** Foto do perfil em bytes (PNG/JPEG); ausente ou SVG = PDF sem foto. */
async function loadPhoto(avatar: string | undefined): Promise<CvPdfImage | undefined> {
    const ext = extname(avatar ?? "").toLowerCase();
    const format = ext === ".png" ? "PNG" : ext === ".jpg" || ext === ".jpeg" ? "JPEG" : undefined;
    if (!avatar || !format) {
        return undefined;
    }
    try {
        return { data: new Uint8Array(await readFile(resolve(REPO_ROOT, "webapp", avatar))), format };
    } catch {
        return undefined;
    }
}

async function main(): Promise<void> {
    const locale = (readFlag("lang") === "en" ? "en" : "pt") as ContentLocale;
    const outPath = resolve(REPO_ROOT, readFlag("out") ?? "webapp/cv/davi-castro-cv.pdf");

    const content = await loadLocalizedContent(locale);
    const doc = buildCvPdf(content, locale, { photo: await loadPhoto(content.profile.avatar) });

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, new Uint8Array(doc.output("arraybuffer")));
    console.log(`PDF gerado: ${outPath} (${locale.toUpperCase()}, ${doc.getNumberOfPages()} pagina(s))`);
}

void run("cv:pdf", main);
