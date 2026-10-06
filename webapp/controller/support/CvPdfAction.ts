import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { PortfolioContent, ContentLocale } from "../../model/types";
import { openPreviewTab, showPdfInTab } from "../../pdf/pdfPreview";
import { loadPdfPhoto } from "../../pdf/pdfPhoto";

/** PDF estatico gerado por `npm run cv:pdf` - alternativa se a geracao falhar. */
const STATIC_PDF_URL = "cv/davi-castro-cv.pdf";

/** Nome AMD do gerador (carregado sob demanda: so quem clica baixa o jsPDF). */
const CV_PDF_MODULE = "davi/portfolio/pdf/cvPdf";

let generating = false;

/**
 * Acao "Ver PDF": gera o curriculo no navegador e abre numa aba de pre-visualizacao.
 *
 * Fluxo:
 *   1. abre a aba JA no clique (depois de um `await` o bloqueador de pop-ups a
 *      barraria) mostrando "Gerando PDF…";
 *   2. carrega o gerador + foto e monta o PDF no idioma ativo;
 *   3. mostra na aba - ou, se ela foi bloqueada, baixa direto;
 *   4. em erro, cai no PDF estatico.
 */
export async function openCvPdf(content: PortfolioContent, locale: ContentLocale): Promise<void> {
    if (generating) {
        return;
    }
    generating = true;
    BusyIndicator.show(0);
    const tab = openPreviewTab(locale);

    try {
        const { buildCvPdf, cvPdfFileName } = await loadGenerator();
        const avatar = content.profile.avatar;
        const photo = await loadPdfPhoto(
            avatar ? sap.ui.require.toUrl(`davi/portfolio/${avatar}`) : undefined
        );
        const doc = buildCvPdf(content, locale, { photo });
        const fileName = cvPdfFileName(content, locale);

        if (tab && !tab.closed) {
            showPdfInTab(tab, doc.output("blob"), {
                fileName,
                title: `${content.profile.name} - CV`,
                locale
            });
        } else {
            doc.save(fileName);
        }
    } catch (error) {
        console.error("Falha ao gerar o PDF no navegador; abrindo o PDF estatico.", error);
        const fallback = new URL(STATIC_PDF_URL, document.baseURI).href;
        if (tab && !tab.closed) {
            tab.location.href = fallback;
        } else {
            window.open(fallback, "_blank");
        }
    } finally {
        BusyIndicator.hide();
        generating = false;
    }
}

/**
 * `import()` relativo vira `sap.ui.require("../...")` no transpile, e o
 * sap.ui.require global so aceita nome absoluto de modulo - dai o require manual.
 */
function loadGenerator(): Promise<typeof import("../../pdf/cvPdf")> {
    return new Promise((resolve, reject) => sap.ui.require([CV_PDF_MODULE], resolve, reject));
}
